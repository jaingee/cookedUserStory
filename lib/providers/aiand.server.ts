import "server-only";

import { z } from "zod";

import {
  productCategorySchema,
  providerResultSchema,
  requirementSchema,
  type ProductCategory,
  type ProviderResult,
  type Requirement,
} from "@/lib/contracts";
import { categoryConfigById } from "@/lib/config/categories";

export const requirementExtractionSchema = z.object({
  category: productCategorySchema,
  summary: z.string().trim().min(1).max(500),
  requirements: z.array(requirementSchema).min(1).max(30),
  assumptions: z.array(z.string().trim().min(1).max(500)).max(20),
});

export type RequirementExtraction = z.infer<typeof requirementExtractionSchema>;

type FetchLike = typeof fetch;
type ProviderOptions = {
  cache?: RequirementExtraction;
  cacheOrigin?: "cached_provider" | "synthetic_fixture";
  fetchImpl?: FetchLike;
};

const providerEnvelopeSchema = providerResultSchema(requirementExtractionSchema);

function envelope(
  status: ProviderResult<RequirementExtraction>["status"],
  origin: ProviderResult<RequirementExtraction>["origin"],
  data: RequirementExtraction | null,
  errorCode?: ProviderResult<RequirementExtraction>["errorCode"],
  warning?: string,
  durationMs?: number,
): ProviderResult<RequirementExtraction> {
  const result = { provider: "aiand" as const, status, origin, data, errorCode, warning, durationMs };
  const parsed = providerEnvelopeSchema.safeParse(result);
  if (!parsed.success) {
    return { provider: "aiand", status: "error", origin: null, data: null, errorCode: "internal_error", warning: "Provider envelope validation failed." };
  }
  return parsed.data;
}

function timeoutMs(): number {
  const parsed = Number(process.env.AIAND_TIMEOUT_MS ?? "10000");
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 10000;
}

function chatCompletionsEndpoint(baseUrl: string): string | null {
  try {
    const url = new URL(baseUrl);
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) return null;
    const path = url.pathname.replace(/\/+$/, "");
    return `${url.origin}${path}/chat/completions`;
  } catch {
    return null;
  }
}

function validateRequirements(data: unknown, categoryHint?: ProductCategory): RequirementExtraction | null {
  const parsed = requirementExtractionSchema.safeParse(data);
  if (!parsed.success || (categoryHint && parsed.data.category !== categoryHint)) return null;

  const config = categoryConfigById[parsed.data.category];
  const criteria = new Map(config.criteria.map((criterion) => [criterion.key, criterion]));
  const ids = new Set<string>();
  for (const requirement of parsed.data.requirements) {
    const criterion = criteria.get(requirement.criterionKey);
    if (!criterion || ids.has(requirement.id) || requirement.unit !== criterion.unit) return null;
    ids.add(requirement.id);
    if (!criterion.supportedRequirementKinds.includes(requirement.kind)) return null;
    if (requirement.kind === "mandatory") {
      if (!requirement.operator || !criterion.allowedMandatoryOperators.includes(requirement.operator)) return null;
      if (!valueMatchesType(requirement.target, criterion.valueType)) return null;
      if (requirement.weight !== 0) return null;
    } else if (requirement.operator !== null || requirement.target !== null || !Number.isFinite(requirement.weight) || requirement.weight < 0) {
      return null;
    }
  }
  return parsed.data;
}

function valueMatchesType(value: Requirement["target"], valueType: "number" | "string" | "boolean"): boolean {
  return value !== null && typeof value === valueType && (valueType !== "number" || Number.isFinite(value));
}

function extractUpstreamPayload(body: unknown): unknown {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  const choices = record.choices;
  if (Array.isArray(choices) && choices[0] && typeof choices[0] === "object") {
    const message = (choices[0] as Record<string, unknown>).message;
    const content = message && typeof message === "object" ? (message as Record<string, unknown>).content : null;
    if (typeof content === "string") {
      try { return JSON.parse(content); } catch { return null; }
    }
    if (Array.isArray(content)) {
      const text = content
        .map((part) => typeof part === "string" ? part : part && typeof part === "object" && typeof (part as Record<string, unknown>).text === "string" ? (part as Record<string, unknown>).text : "")
        .join("")
        .trim();
      if (text) {
        try { return JSON.parse(text); } catch { return null; }
      }
    }
  }
  const output = record.output ?? record.data ?? record.result;
  if (typeof output === "string") {
    try { return JSON.parse(output); } catch { return null; }
  }
  return output ?? body;
}

export async function extractRequirements(
  description: string,
  categoryHint?: ProductCategory,
  options: ProviderOptions = {},
): Promise<ProviderResult<RequirementExtraction>> {
  const started = Date.now();
  const cacheOrigin = options.cacheOrigin ?? "cached_provider";
  const cached = validateRequirements(options.cache, categoryHint);
  const fallback = (errorCode: ProviderResult<RequirementExtraction>["errorCode"], warning: string) =>
    cached
      ? envelope("fallback", cacheOrigin, cached, errorCode, warning, Date.now() - started)
      : envelope("unavailable", null, null, errorCode, warning, Date.now() - started);

  if (process.env.DEMO_PROVIDER_MODE === "cache_only") {
    return fallback("cache_miss", cached ? "Live execution skipped; using sanitized cache." : "Cache-only mode has no usable cache.");
  }

  const apiKey = process.env.AIAND_API_KEY?.trim();
  const baseUrl = process.env.AIAND_BASE_URL?.trim();
  const model = process.env.AIAND_MODEL?.trim();
  if (!apiKey || !baseUrl || !model) return fallback("not_configured", "AI& is not configured.");
  const endpoint = chatCompletionsEndpoint(baseUrl);
  if (!endpoint) return fallback("unsafe_url", "AI& base URL must be a clean HTTPS URL.");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs());
  try {
    const response = await (options.fetchImpl ?? fetch)(endpoint, {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          {
            role: "system",
            content: "Extract a product category and purchasing requirements. Return JSON only matching the requested structure. Use only supported category criteria and never invent product specifications.",
          },
          { role: "user", content: JSON.stringify({ description, categoryHint: categoryHint ?? null }) },
        ],
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });
    if (!response.ok) return fallback("upstream_error", "AI& returned an unsuccessful response.");
    const data = validateRequirements(extractUpstreamPayload(await response.json()), categoryHint);
    return data
      ? envelope("live", "live_provider", data, undefined, undefined, Date.now() - started)
      : fallback("invalid_response", "AI& returned invalid structured data.");
  } catch (error) {
    const timedOut = error instanceof DOMException ? error.name === "AbortError" : error instanceof Error && error.name === "TimeoutError";
    return fallback(timedOut ? "timeout" : "network_error", timedOut ? "AI& request timed out." : "AI& request failed.");
  } finally {
    clearTimeout(timer);
  }
}
