import "server-only";

import cachedRealFixture from "@/data/provider-fixtures/nosana/cached-real.json";
import syntheticFixture from "@/data/provider-fixtures/nosana/synthetic.json";
import {
  productCategorySchema,
  providerResultSchema,
  qualificationStatusSchema,
  type ProductCategory,
  type ProviderResult,
  type QualificationStatus,
} from "@/lib/contracts";
import { z } from "zod";

const identifierSchema = z.string().trim().min(1).max(100);

const evidenceWarningSchema = z.object({
  productId: identifierSchema.nullable(),
  criterionKey: identifierSchema.nullable(),
  severity: z.enum(["info", "warning"]),
  message: z.string().trim().min(1).max(500),
  action: z.enum(["confirm", "review_source"]),
}).superRefine((warning, context) => {
  if (/\b(score|rank|weight|qualification|qualifying|recommendation|recommended)\b/i.test(warning.message)) {
    context.addIssue({
      code: "custom",
      path: ["message"],
      message: "Evidence review warnings cannot change scoring or recommendation authority.",
    });
  }
});

export const evidenceReviewSchema = z.object({
  warnings: z.array(evidenceWarningSchema).max(100),
  reviewedAt: z.iso.datetime({ offset: true }),
}).strict();

export type EvidenceWarning = z.infer<typeof evidenceWarningSchema>;
export type EvidenceReview = z.infer<typeof evidenceReviewSchema>;

const evidenceReviewRequestProductSchema = z.object({
  productId: identifierSchema,
  qualification: qualificationStatusSchema,
  unknownKeys: z.array(identifierSchema).max(100),
  conflictingKeys: z.array(identifierSchema).max(100),
  evidenceCount: z.number().int().nonnegative().max(100),
}).strict();

export const evidenceReviewRequestSchema = z.object({
  category: productCategorySchema,
  products: z.array(evidenceReviewRequestProductSchema).min(1).max(50),
}).strict();

export type EvidenceReviewRequest = z.infer<typeof evidenceReviewRequestSchema>;
export type NosanaReviewResult = ProviderResult<EvidenceReview>;

export function isReviewApplicable(review: EvidenceReview, request: EvidenceReviewRequest): boolean {
  const products = new Map(request.products.map((product) => [product.productId, product]));
  return review.warnings.every((warning) => {
    if (warning.productId === null) return true;
    const product = products.get(warning.productId);
    if (!product) return false;
    if (warning.criterionKey === null) return true;
    return product.unknownKeys.includes(warning.criterionKey)
      || product.conflictingKeys.includes(warning.criterionKey);
  });
}

export type NosanaAdapterOptions = {
  env?: Record<string, string | undefined>;
  fetchImpl?: typeof fetch;
  cachedReal?: EvidenceReview | null;
  synthetic?: EvidenceReview | null;
};

const nosanaResultProviderSchema = providerResultSchema(evidenceReviewSchema);
const defaultTimeoutMs = 8_000;

class NosanaTimeoutError extends Error {}

function timeoutFrom(env: Record<string, string | undefined>): number {
  const parsed = Number(env.NOSANA_TIMEOUT_MS ?? defaultTimeoutMs);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(Math.floor(parsed), 120_000) : defaultTimeoutMs;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new NosanaTimeoutError()), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function parseFixture(value: unknown): EvidenceReview | null {
  const parsed = evidenceReviewSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function safeUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

function normalizeDemoMode(value: string | undefined): "auto" | "cache_only" {
  const mode = (value ?? "").trim().toLowerCase();
  return ["cache_only", "cache-only", "offline"].includes(mode) ? "cache_only" : "auto";
}

function invalidResult(durationMs: number): NosanaReviewResult {
  return nosanaResultProviderSchema.parse({
    provider: "nosana",
    status: "error",
    origin: null,
    data: null,
    durationMs,
    warning: "Nosana returned an invalid evidence review.",
    errorCode: "invalid_response",
  });
}

function unavailableResult(durationMs: number): NosanaReviewResult {
  return nosanaResultProviderSchema.parse({
    provider: "nosana",
    status: "unavailable",
    origin: null,
    data: null,
    durationMs,
    warning: "Nosana evidence review is unavailable; local product values and scoring were not changed.",
    errorCode: "cache_miss",
  });
}

function cachedResult(review: EvidenceReview, status: "cached" | "fallback", durationMs: number, warning?: string): NosanaReviewResult {
  return nosanaResultProviderSchema.parse({
    provider: "nosana",
    status,
    origin: "cached_provider",
    data: review,
    durationMs,
    ...(warning ? { warning } : {}),
  });
}

function syntheticResult(review: EvidenceReview, durationMs: number): NosanaReviewResult {
  return nosanaResultProviderSchema.parse({
    provider: "nosana",
    status: "fallback",
    origin: "synthetic_fixture",
    data: review,
    durationMs,
    warning: "Nosana used a synthetic fixture for UI continuity; integration incomplete and product values were not changed.",
    errorCode: "cache_miss",
  });
}

async function liveReview(
  request: EvidenceReviewRequest,
  url: string,
  apiKey: string,
  timeoutMs: number,
  fetchImpl: typeof fetch,
): Promise<EvidenceReview> {
  const controller = new AbortController();
  try {
    const response = await withTimeout(fetchImpl(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(request),
      signal: controller.signal,
    }), timeoutMs);
    if (!response.ok) throw new Error("upstream response");
    const body = await response.json();
    const parsed = evidenceReviewSchema.safeParse(body);
    if (!parsed.success) throw new Error("invalid response");
    return parsed.data;
  } finally {
    controller.abort();
  }
}

export async function reviewEvidenceWithNosana(
  request: unknown,
  options: NosanaAdapterOptions = {},
): Promise<NosanaReviewResult> {
  const startedAt = Date.now();
  const env = options.env ?? process.env;
  const validated = evidenceReviewRequestSchema.safeParse(request);
  if (!validated.success) return invalidResult(Date.now() - startedAt);
  const parsed = validated.data;
  const timeoutMs = timeoutFrom(env);
  const cachedCandidate = options.cachedReal === undefined ? parseFixture(cachedRealFixture) : parseFixture(options.cachedReal);
  const cached = cachedCandidate && isReviewApplicable(cachedCandidate, parsed) ? cachedCandidate : null;
  const synthetic = options.synthetic === undefined ? parseFixture(syntheticFixture) : parseFixture(options.synthetic);
  const cacheOnly = normalizeDemoMode(env.DEMO_PROVIDER_MODE) === "cache_only";

  if (cacheOnly) {
    if (cached) return cachedResult(cached, "cached", Date.now() - startedAt);
    if (synthetic) return syntheticResult(synthetic, Date.now() - startedAt);
    return unavailableResult(Date.now() - startedAt);
  }

  const url = safeUrl(env.NOSANA_REVIEW_URL);
  if (url && env.NOSANA_API_KEY) {
    try {
      const review = await liveReview(parsed, url, env.NOSANA_API_KEY, timeoutMs, options.fetchImpl ?? fetch);
      const reviewedAt = evidenceReviewSchema.parse(review);
      return nosanaResultProviderSchema.parse({
        provider: "nosana",
        status: "live",
        origin: "live_provider",
        data: reviewedAt,
        durationMs: Date.now() - startedAt,
      });
    } catch (error: unknown) {
      const warning = error instanceof NosanaTimeoutError
        ? "Nosana timed out; using cached-real evidence review where available."
        : "Nosana live review failed; using a sanitized fallback where available.";
      if (cached) return cachedResult(cached, "fallback", Date.now() - startedAt, warning);
      if (synthetic) return syntheticResult(synthetic, Date.now() - startedAt);
      return unavailableResult(Date.now() - startedAt);
    }
  }

  if (cached) return cachedResult(cached, "fallback", Date.now() - startedAt, "Nosana is not configured; using cached-real evidence review.");
  if (synthetic) return syntheticResult(synthetic, Date.now() - startedAt);
  return unavailableResult(Date.now() - startedAt);
}

export const reviewEvidence = reviewEvidenceWithNosana;
export type { ProductCategory, QualificationStatus };
