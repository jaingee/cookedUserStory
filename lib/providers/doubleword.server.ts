import "server-only";

import { z } from "zod";

import {
  claimStatusSchema,
  productCategorySchema,
  providerResultSchema,
  specUnitSchema,
  type ProviderResult,
} from "@/lib/contracts";
import { categoryConfigById } from "@/lib/config/categories";

const scalarValueSchema = z.union([z.number().finite(), z.string().trim().min(1).max(200), z.boolean()]);

export const retrievalArtifactSchema = z.object({
  productId: z.string().trim().min(1).max(100),
  category: productCategorySchema,
  retrievedText: z.string().trim().min(1).max(20_000),
});

const rawClaimSchema = z.object({
  criterionKey: z.string().trim().min(1).max(100),
  value: scalarValueSchema.nullable(),
  unit: specUnitSchema.nullable(),
  claimStatus: claimStatusSchema,
  evidenceText: z.string().trim().min(1).max(500),
});

export const claimExtractionSchema = z.object({
  productId: z.string().trim().min(1).max(100),
  claims: z.array(rawClaimSchema).max(50),
  warnings: z.array(z.string().trim().min(1).max(500)).max(20),
});

export type RetrievalArtifact = z.infer<typeof retrievalArtifactSchema>;
export type ClaimExtraction = z.infer<typeof claimExtractionSchema>;

type FetchLike = typeof fetch;
type ProviderOptions = {
  cache?: ClaimExtraction;
  cacheOrigin?: "cached_provider" | "synthetic_fixture";
  fetchImpl?: FetchLike;
};

const providerEnvelopeSchema = providerResultSchema(claimExtractionSchema);

function envelope(
  status: ProviderResult<ClaimExtraction>["status"],
  origin: ProviderResult<ClaimExtraction>["origin"],
  data: ClaimExtraction | null,
  errorCode?: ProviderResult<ClaimExtraction>["errorCode"],
  warning?: string,
  durationMs?: number,
): ProviderResult<ClaimExtraction> {
  const result = { provider: "doubleword" as const, status, origin, data, errorCode, warning, durationMs };
  const parsed = providerEnvelopeSchema.safeParse(result);
  if (!parsed.success) return { provider: "doubleword", status: "error", origin: null, data: null, errorCode: "internal_error", warning: "Provider envelope validation failed." };
  return parsed.data;
}

function timeoutMs(): number {
  const parsed = Number(process.env.DOUBLEWORD_TIMEOUT_MS ?? "10000");
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 10000;
}

function sanitizeEvidence(text: string): string {
  return text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 500);
}

function validateClaims(data: unknown, artifact: RetrievalArtifact): ClaimExtraction | null {
  const parsed = claimExtractionSchema.safeParse(data);
  if (!parsed.success || parsed.data.productId !== artifact.productId) return null;
  const criteria = new Map(categoryConfigById[artifact.category].criteria.map((criterion) => [criterion.key, criterion]));
  const seen = new Set<string>();
  const claims: ClaimExtraction["claims"] = [];
  const warnings = [...parsed.data.warnings];
  for (const claim of parsed.data.claims) {
    const criterion = criteria.get(claim.criterionKey);
    if (!criterion) {
      warnings.push(`Unsupported criterion omitted: ${claim.criterionKey}.`);
      continue;
    }
    if (seen.has(claim.criterionKey) || (claim.unit !== null && claim.unit !== criterion.unit)) return null;
    seen.add(claim.criterionKey);
    if (claim.value !== null && !valueMatchesType(claim.value, criterion.valueType)) return null;
    const evidenceText = sanitizeEvidence(claim.evidenceText);
    if (!evidenceText) return null;
    claims.push({
      criterionKey: claim.criterionKey,
      value: claim.value,
      unit: claim.value === null ? null : criterion.unit,
      claimStatus: claim.value === null ? "missing" : claim.claimStatus,
      evidenceText,
    });
  }
  return { productId: parsed.data.productId, claims, warnings: warnings.slice(0, 20) };
}

function valueMatchesType(value: number | string | boolean, valueType: "number" | "string" | "boolean"): boolean {
  return typeof value === valueType && (valueType !== "number" || Number.isFinite(value));
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
  }
  const output = record.output ?? record.data ?? record.result;
  if (typeof output === "string") {
    try { return JSON.parse(output); } catch { return null; }
  }
  return output ?? body;
}

export async function extractClaims(
  artifactInput: RetrievalArtifact,
  options: ProviderOptions = {},
): Promise<ProviderResult<ClaimExtraction>> {
  const started = Date.now();
  const artifact = retrievalArtifactSchema.safeParse(artifactInput);
  if (!artifact.success) return envelope("error", null, null, "output_mismatch", "Retrieval artifact is invalid.", Date.now() - started);
  const cache = validateClaims(options.cache, artifact.data);
  const cacheOrigin = options.cacheOrigin ?? "cached_provider";
  const fallback = (errorCode: ProviderResult<ClaimExtraction>["errorCode"], warning: string) =>
    cache
      ? envelope("fallback", cacheOrigin, cache, errorCode, warning, Date.now() - started)
      : envelope("unavailable", null, null, errorCode, warning, Date.now() - started);

  if (process.env.DEMO_PROVIDER_MODE === "cache_only") return fallback("cache_miss", cache ? "Live execution skipped; using sanitized cache." : "Cache-only mode has no usable cache.");

  const apiKey = process.env.DOUBLEWORD_API_KEY?.trim();
  const baseUrl = process.env.DOUBLEWORD_BASE_URL?.trim();
  const model = process.env.DOUBLEWORD_MODEL?.trim();
  if (!apiKey || !baseUrl || !model) return fallback("not_configured", "Doubleword is not configured.");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs());
  try {
    const response = await (options.fetchImpl ?? fetch)(baseUrl, {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ model, input: artifact.data, response_format: { type: "json_object" } }),
      signal: controller.signal,
    });
    if (!response.ok) return fallback("upstream_error", "Doubleword returned an unsuccessful response.");
    const data = validateClaims(extractUpstreamPayload(await response.json()), artifact.data);
    return data
      ? envelope("live", "live_provider", data, undefined, undefined, Date.now() - started)
      : fallback("invalid_response", "Doubleword returned invalid structured data.");
  } catch (error) {
    const timedOut = error instanceof DOMException ? error.name === "AbortError" : error instanceof Error && error.name === "TimeoutError";
    return fallback(timedOut ? "timeout" : "network_error", timedOut ? "Doubleword request timed out." : "Doubleword request failed.");
  } finally {
    clearTimeout(timer);
  }
}
