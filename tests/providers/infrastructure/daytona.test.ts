import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  daytonaVerificationRequestSchema,
  verifyScoringWithDaytona,
  type DaytonaSandbox,
} from "@/lib/providers/daytona.server";

const input = {
  version: "1.0.0" as const,
  category: "laptop" as const,
  requirements: [
    {
      id: "budget",
      criterionKey: "price",
      label: "Maximum budget",
      kind: "mandatory" as const,
      operator: "lte" as const,
      target: 2000,
      unit: "SGD" as const,
      weight: 0,
      source: "user" as const,
      needsConfirmation: false,
    },
  ],
  products: ["alpha", "bravo", "charlie"].map((id) => ({
    id,
    category: "laptop" as const,
    manufacturer: "Maker",
    model: id,
    displayName: `Maker ${id}`,
    productUrl: null,
    price: { amount: 1000, currency: "SGD" as const },
    specifications: {},
    evidence: [],
  })),
  preferredWeights: { battery: 1 },
};

const result = {
  version: "1.0.0" as const,
  category: "laptop" as const,
  rankedProducts: ["alpha", "bravo", "charlie"].map((productId, index) => ({
    productId,
    qualification: "qualified" as const,
    mandatoryChecks: [],
    failures: [],
    unknowns: [],
    criterionScores: [{
      criterionKey: "battery",
      value: 10 - index,
      rawScore: 10 - index,
      normalizedWeight: 1,
      weightedScore: 10 - index,
      missing: false,
    }],
    weightedScore: 10 - index,
    rank: index + 1,
    onlyQualifyingOption: false,
  })),
  recommendedProductId: "alpha",
  noRecommendation: false,
  warnings: [],
};

const request = {
  scorerSource: `
    const ENGINE_VERSION = "1.0.0";
    function score(input) {
      return ${JSON.stringify(result)};
    }
  `,
  input,
  expectedResult: result,
};

function mockSandbox(output: string | Promise<string>): DaytonaSandbox {
  return {
    process: {
      codeRun: vi.fn(async () => ({ result: await output, exitCode: 0 })),
    },
    delete: vi.fn(async () => undefined),
  };
}

function clientFor(sandbox: DaytonaSandbox) {
  return { create: vi.fn(async () => sandbox) };
}

const env = {
  DAYTONA_API_KEY: "test-key",
  DAYTONA_API_URL: "https://daytona.test/api",
  DAYTONA_TARGET: "test",
  DAYTONA_TIMEOUT_MS: "1000",
};

describe("verifyScoringWithDaytona", () => {
  it("accepts a valid matching scoring result", async () => {
    const sandbox = mockSandbox(JSON.stringify({ engineVersion: "1.0.0", result }));
    const response = await verifyScoringWithDaytona(request, { env, client: clientFor(sandbox) });

    expect(response.status).toBe("live");
    expect(response.origin).toBe("live_provider");
    expect(response.data?.match).toBe(true);
  });

  it("returns local-authoritative fallback for an output mismatch", async () => {
    const mismatched = { ...result, recommendedProductId: "bravo" };
    const sandbox = mockSandbox(JSON.stringify({ engineVersion: "1.0.0", result: mismatched }));
    const response = await verifyScoringWithDaytona(request, { env, client: clientFor(sandbox) });

    expect(response.status).toBe("fallback");
    expect(response.origin).toBe("local_calculation");
    expect(response.errorCode).toBe("output_mismatch");
    expect(response.warning).toMatch(/local calculation remains authoritative/i);
    expect(response.data?.match).toBe(false);
  });

  it("falls back safely on timeout", async () => {
    const sandbox = mockSandbox(new Promise<string>(() => undefined));
    const response = await verifyScoringWithDaytona(request, {
      env: { ...env, DAYTONA_TIMEOUT_MS: "5" },
      client: clientFor(sandbox),
    });

    expect(response.status).toBe("fallback");
    expect(response.errorCode).toBe("timeout");
    expect(response.origin).toBe("local_calculation");
  });

  it("rejects malformed requests before creating a sandbox", async () => {
    const create = vi.fn();
    const response = await verifyScoringWithDaytona({ input }, { env, client: { create } });

    expect(response.status).toBe("error");
    expect(response.errorCode).toBe("invalid_response");
    expect(create).not.toHaveBeenCalled();
    expect(daytonaVerificationRequestSchema.safeParse({ input }).success).toBe(false);
  });

  it("falls back on invalid scoring JSON and invalid scoring results", async () => {
    for (const output of ["not-json", JSON.stringify({ engineVersion: "1.0.0", result: { nope: true } })]) {
      const sandbox = mockSandbox(output);
      const response = await verifyScoringWithDaytona(request, { env, client: clientFor(sandbox) });

      expect(response.status).toBe("fallback");
      expect(response.errorCode).toBe("invalid_response");
      expect(response.origin).toBe("local_calculation");
    }
  });

  it("attempts cleanup after success and after execution error", async () => {
    const successSandbox = mockSandbox(JSON.stringify({ engineVersion: "1.0.0", result }));
    await verifyScoringWithDaytona(request, { env, client: clientFor(successSandbox) });
    expect(successSandbox.delete).toHaveBeenCalled();

    const errorSandbox = mockSandbox(Promise.reject(new Error("provider failure")));
    await verifyScoringWithDaytona(request, { env, client: clientFor(errorSandbox) });
    expect(errorSandbox.delete).toHaveBeenCalled();
  });

  it("never includes credentials, source, payload, or provider errors in the envelope", async () => {
    const secret = "redacted-daytona-test-credential";
    const sandbox = mockSandbox(`provider error ${secret} ${JSON.stringify(request)}`);
    const response = await verifyScoringWithDaytona(request, {
      env: { ...env, DAYTONA_API_KEY: secret },
      client: clientFor(sandbox),
    });

    expect(JSON.stringify(response)).not.toContain(secret);
    expect(JSON.stringify(response)).not.toContain(request.scorerSource);
    expect(JSON.stringify(response)).not.toContain("provider error");
  });
});
