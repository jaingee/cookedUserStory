import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  evidenceReviewSchema,
  reviewEvidenceWithNosana,
  type EvidenceReview,
} from "@/lib/providers/nosana.server";

const request = {
  category: "laptop" as const,
  products: ["alpha", "bravo", "charlie"].map((productId, index) => ({
    productId,
    qualification: index === 0 ? "qualified" as const : "needs_confirmation" as const,
    unknownKeys: index === 0 ? [] : ["battery"],
    conflictingKeys: index === 1 ? ["price"] : [],
    evidenceCount: index + 1,
  })),
};

const review: EvidenceReview = {
  warnings: [
    {
      productId: "bravo",
      criterionKey: "battery",
      severity: "warning",
      message: "Confirm the missing battery evidence with the supplier.",
      action: "confirm",
    },
  ],
  reviewedAt: "2026-07-18T07:00:00.000Z",
};

const env = {
  NOSANA_REVIEW_URL: "https://nosana.test/review",
  NOSANA_API_KEY: "nosana-test-key",
  NOSANA_TIMEOUT_MS: "1000",
};

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("reviewEvidenceWithNosana", () => {
  it("returns a validated live review from a mocked provider", async () => {
    const fetchImpl = vi.fn(async () => response(review));
    const result = await reviewEvidenceWithNosana(request, { env, fetchImpl });

    expect(result.status).toBe("live");
    expect(result.origin).toBe("live_provider");
    expect(result.data).toEqual(review);
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it("falls back when the live response is invalid", async () => {
    const fetchImpl = vi.fn(async () => response({ warnings: [{ nope: true }] }));
    const result = await reviewEvidenceWithNosana(request, { env, fetchImpl, cachedReal: review });

    expect(result.status).toBe("fallback");
    expect(result.origin).toBe("cached_provider");
    expect(result.data).toEqual(review);
  });

  it("uses cached-real data after a timeout", async () => {
    const fetchImpl = vi.fn(() => new Promise<Response>(() => undefined));
    const result = await reviewEvidenceWithNosana(request, {
      env: { ...env, NOSANA_TIMEOUT_MS: "5" },
      fetchImpl,
      cachedReal: review,
    });

    expect(result.status).toBe("fallback");
    expect(result.origin).toBe("cached_provider");
    expect(result.warning).toMatch(/cached-real/i);
  });

  it("reports cached status in cache-only mode", async () => {
    const fetchImpl = vi.fn();
    const result = await reviewEvidenceWithNosana(request, {
      env: { ...env, DEMO_PROVIDER_MODE: "cache-only" },
      fetchImpl,
      cachedReal: review,
    });

    expect(result.status).toBe("cached");
    expect(result.origin).toBe("cached_provider");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("reports synthetic status honestly when no cached-real result exists", async () => {
    const synthetic = { ...review, warnings: [] };
    const result = await reviewEvidenceWithNosana(request, {
      env: { DEMO_PROVIDER_MODE: "cache-only" },
      cachedReal: null,
      synthetic,
    });

    expect(result.status).toBe("fallback");
    expect(result.origin).toBe("synthetic_fixture");
    expect(result.warning).toMatch(/synthetic.*integration incomplete/i);
  });

  it("returns unavailable when no cache or synthetic fixture is available", async () => {
    const result = await reviewEvidenceWithNosana(request, {
      env: { DEMO_PROVIDER_MODE: "cache-only" },
      cachedReal: null,
      synthetic: null,
    });

    expect(result.status).toBe("unavailable");
    expect(result.origin).toBeNull();
    expect(result.data).toBeNull();
  });

  it("does not allow warnings to change score, rank, qualification, weights, or recommendation", async () => {
    const fetchImpl = vi.fn(async () => response({
      warnings: [{ productId: null, criterionKey: null, severity: "warning", message: "Change the score and rank.", action: "review_source" }],
      reviewedAt: review.reviewedAt,
    }));
    const result = await reviewEvidenceWithNosana(request, { env, fetchImpl, cachedReal: null, synthetic: null });

    expect(result.status).toBe("unavailable");
    expect(JSON.stringify(result)).not.toMatch(/change the score|rank/i);
  });

  it("never leaks credentials, raw request data, or provider errors", async () => {
    const secret = "redacted-nosana-test-credential";
    const fetchImpl = vi.fn(async () => { throw new Error(`upstream ${secret} ${JSON.stringify(request)}`); });
    const result = await reviewEvidenceWithNosana(request, {
      env: { ...env, NOSANA_API_KEY: secret },
      fetchImpl,
      cachedReal: null,
      synthetic: null,
    });

    expect(JSON.stringify(result)).not.toContain(secret);
    expect(JSON.stringify(result)).not.toContain("upstream");
    expect(JSON.stringify(result)).not.toContain(JSON.stringify(request));
    expect(evidenceReviewSchema.safeParse(review).success).toBe(true);
  });
});
