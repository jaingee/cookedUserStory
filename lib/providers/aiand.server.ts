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

const AIAND_REQUIREMENT_EXTRACTION_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["category", "summary", "requirements", "assumptions"],
  properties: {
    category: { type: "string", enum: ["laptop", "air_purifier", "lab_oven"] },
    summary: { type: "string", minLength: 1, maxLength: 500 },
    requirements: {
      type: "array",
      minItems: 1,
      maxItems: 30,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "criterionKey", "label", "kind", "operator", "target", "unit", "weight", "source", "needsConfirmation"],
        properties: {
          id: { type: "string", minLength: 1, maxLength: 100 },
          criterionKey: {
            type: "string",
            enum: [
              "price_sgd", "ram_gb", "storage_gb", "battery_life_h", "weight_kg", "geekbench_6_multicore",
              "cadr_m3h", "coverage_m2", "noise_dba", "annual_filter_cost_sgd", "power_consumption_w",
              "max_temperature_c", "chamber_volume_l", "electrical_profile", "temperature_uniformity_c",
            ],
          },
          label: { type: "string", minLength: 1, maxLength: 160 },
          kind: { type: "string", enum: ["mandatory", "preferred"] },
          operator: { enum: ["gte", "lte", "eq", null] },
          target: { type: ["number", "string", "boolean", "null"] },
          unit: {
            enum: ["SGD", "GB", "h", "kg", "Geekbench 6 multicore points", "m3/h", "m2", "dB(A)", "SGD/year", "W", "Â°C", "L", "Â±Â°C", "electrical_profile", null],
          },
          weight: { type: "number", minimum: 0 },
          source: { type: "string", enum: ["user", "ai_extracted", "category_default"] },
          needsConfirmation: { type: "boolean" },
        },
      },
    },
    assumptions: { type: "array", maxItems: 20, items: { type: "string", minLength: 1, maxLength: 500 } },
  },
} as const;

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

type ValidationIssue = { path: string; code: string };

function issuePath(path: PropertyKey[]): string {
  return path.length === 0 ? "$" : path.map((part) => String(part)).join(".");
}

function validateRequirementsDetailed(data: unknown, categoryHint?: ProductCategory): { data: RequirementExtraction | null; issues: ValidationIssue[] } {
  const parsed = requirementExtractionSchema.safeParse(data);
  if (!parsed.success) return { data: null, issues: parsed.error.issues.map((issue) => ({ path: issuePath(issue.path), code: issue.code })) };
  if (categoryHint && parsed.data.category !== categoryHint) return { data: null, issues: [{ path: "category", code: "custom" }] };

  const config = categoryConfigById[parsed.data.category];
  const criteria = new Map(config.criteria.map((criterion) => [criterion.key, criterion]));
  const ids = new Set<string>();
  const issues: ValidationIssue[] = [];
  for (const [index, requirement] of parsed.data.requirements.entries()) {
    const criterion = criteria.get(requirement.criterionKey);
    if (!criterion) issues.push({ path: `requirements.${index}.criterionKey`, code: "custom" });
    if (ids.has(requirement.id)) issues.push({ path: `requirements.${index}.id`, code: "custom" });
    ids.add(requirement.id);
    if (criterion && !criterion.supportedRequirementKinds.includes(requirement.kind)) issues.push({ path: `requirements.${index}.kind`, code: "custom" });
    if (criterion && requirement.unit !== criterion.unit) issues.push({ path: `requirements.${index}.unit`, code: "custom" });
    if (requirement.kind === "mandatory") {
      if (criterion && (!requirement.operator || !criterion.allowedMandatoryOperators.includes(requirement.operator))) issues.push({ path: `requirements.${index}.operator`, code: "custom" });
      if (criterion && !valueMatchesType(requirement.target, criterion.valueType)) issues.push({ path: `requirements.${index}.target`, code: "custom" });
      if (requirement.weight !== 0) issues.push({ path: `requirements.${index}.weight`, code: "custom" });
    } else if (requirement.operator !== null || requirement.target !== null || !Number.isFinite(requirement.weight) || requirement.weight < 0) {
      issues.push({ path: `requirements.${index}`, code: "custom" });
    }
  }
  return issues.length > 0 ? { data: null, issues } : { data: parsed.data, issues: [] };
}

function validateRequirements(data: unknown, categoryHint?: ProductCategory): RequirementExtraction | null {
  return validateRequirementsDetailed(data, categoryHint).data;
}

function validationWarning(issues: ValidationIssue[]): string {
  const summary = issues.slice(0, 12).map((issue) => `${issue.path}:${issue.code}`).join(", ");
  return summary ? `AI& returned invalid structured data. Validation issues: ${summary}.` : "AI& returned invalid structured data.";
}

function valueMatchesType(value: Requirement["target"], valueType: "number" | "string" | "boolean"): boolean {
  return value !== null && typeof value === valueType && (valueType !== "number" || Number.isFinite(value));
}

function parseJsonContent(value: string): unknown {
  const normalized = value.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  try { return JSON.parse(normalized); } catch { return null; }
}

function extractUpstreamPayload(body: unknown): unknown {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  const choices = record.choices;
  if (Array.isArray(choices) && choices[0] && typeof choices[0] === "object") {
    const message = (choices[0] as Record<string, unknown>).message;
    const content = message && typeof message === "object" ? (message as Record<string, unknown>).content : null;
    if (typeof content === "string") {
      return parseJsonContent(content);
    }
    if (Array.isArray(content)) {
      const text = content
        .map((part) => typeof part === "string" ? part : part && typeof part === "object" && typeof (part as Record<string, unknown>).text === "string" ? (part as Record<string, unknown>).text : "")
        .join("")
        .trim();
      if (text) {
        return parseJsonContent(text);
      }
    }
    if (content && typeof content === "object") return content;
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
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "purchase_requirements",
            strict: true,
            schema: AIAND_REQUIREMENT_EXTRACTION_JSON_SCHEMA,
          },
        },
      }),
      signal: controller.signal,
    });
    if (!response.ok) return fallback("upstream_error", "AI& returned an unsuccessful response.");
    const validation = validateRequirementsDetailed(extractUpstreamPayload(await response.json()), categoryHint);
    return validation.data
      ? envelope("live", "live_provider", validation.data, undefined, undefined, Date.now() - started)
      : fallback("invalid_response", validationWarning(validation.issues));
  } catch (error) {
    const timedOut = error instanceof DOMException ? error.name === "AbortError" : error instanceof Error && error.name === "TimeoutError";
    return fallback(timedOut ? "timeout" : "network_error", timedOut ? "AI& request timed out." : "AI& request failed.");
  } finally {
    clearTimeout(timer);
  }
}
