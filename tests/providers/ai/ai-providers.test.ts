import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { POST as requirementsPost } from "@/app/api/requirements/route";
import { POST as extractPost } from "@/app/api/extract/route";
import { extractRequirements, requirementExtractionSchema, type RequirementExtraction } from "@/lib/providers/aiand.server";
import { claimExtractionSchema, extractClaims, type ClaimExtraction, type RetrievalArtifact } from "@/lib/providers/doubleword.server";

const validAiData: RequirementExtraction = {
  category: "laptop",
  summary: "A development laptop for travel under the stated budget.",
  requirements: [{ id: "ai-max-price", criterionKey: "price_sgd", label: "Maximum price", kind: "mandatory", operator: "lte", target: 1800, unit: "SGD", weight: 0, source: "ai_extracted", needsConfirmation: false }],
  assumptions: [],
};

const validArtifact: RetrievalArtifact = { productId: "laptop-one", category: "laptop", retrievedText: "Price S$1,499. RAM 16 GB. Weight 1.4 kg." };
const validClaims: ClaimExtraction = { productId: "laptop-one", claims: [{ criterionKey: "ram_gb", value: 16, unit: "GB", claimStatus: "manufacturer_reported", evidenceText: "RAM: 16 GB" }], warnings: [] };

describe("AI& provider", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.DEMO_PROVIDER_MODE = "";
    process.env.AIAND_API_KEY = "test-key";
    process.env.AIAND_BASE_URL = "https://aiand.test/v1";
    process.env.AIAND_MODEL = "tested-model";
    process.env.AIAND_TIMEOUT_MS = "100";
  });

  it("accepts a valid live response and validates the extracted requirements", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ output: validAiData }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const result = await extractRequirements("I need a laptop under S$1,800 with at least 16 GB RAM for development.");
    expect(result.status).toBe("live");
    expect(result.origin).toBe("live_provider");
    expect(result.data).toEqual(validAiData);
    expect(requirementExtractionSchema.safeParse(result.data).success).toBe(true);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body));
    expect(url).toBe("https://aiand.test/v1/chat/completions");
    expect(body).not.toHaveProperty("input");
    expect(body.stream).toBe(false);
    expect(body.messages).toHaveLength(2);
    expect(body.messages[0].role).toBe("system");
    expect(body.messages[1].content).toContain("categoryHint");
  });

  it("accepts the documented OpenAI-compatible text-part content shape", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: [{ type: "text", text: JSON.stringify(validAiData) }] } }] }), { status: 200 }));
    const result = await extractRequirements("I need a laptop for development and travel.", undefined, { fetchImpl: fetchMock });
    expect(result.status).toBe("live");
    expect(result.data).toEqual(validAiData);
  });

  it("normalizes trailing slashes on the AI& base URL", async () => {
    process.env.AIAND_BASE_URL = "https://aiand.test/v1///";
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ output: validAiData }), { status: 200 }));
    const result = await extractRequirements("I need a laptop for development and travel.", undefined, { fetchImpl: fetchMock });
    expect(result.status).toBe("live");
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://aiand.test/v1/chat/completions");
  });

  it("rejects a non-HTTPS AI& base URL without making a request", async () => {
    process.env.AIAND_BASE_URL = "http://aiand.test/v1";
    const fetchMock = vi.fn();
    const result = await extractRequirements("I need a laptop for development and travel.", undefined, { fetchImpl: fetchMock });
    expect(result.status).toBe("unavailable");
    expect(result.origin).toBeNull();
    expect(result.errorCode).toBe("unsafe_url");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects invalid model output and returns an unavailable envelope without coercion", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ output: { ...validAiData, requirements: [{ ...validAiData.requirements[0], unit: "dollars" }] } }), { status: 200 })));
    const result = await extractRequirements("I need a laptop for development and travel.");
    expect(result.status).toBe("unavailable");
    expect(result.origin).toBeNull();
    expect(result.data).toBeNull();
    expect(result.errorCode).toBe("invalid_response");
  });

  it("uses an injected sanitized cache on timeout without retrying", async () => {
    const fetchMock = vi.fn().mockRejectedValue(Object.assign(new Error("timeout"), { name: "TimeoutError" }));
    const result = await extractRequirements("I need a laptop for development and travel.", undefined, { cache: validAiData, fetchImpl: fetchMock });
    expect(result.status).toBe("fallback");
    expect(result.origin).toBe("cached_provider");
    expect(result.data).toEqual(validAiData);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not call the network without credentials", async () => {
    delete process.env.AIAND_API_KEY;
    const fetchMock = vi.fn();
    const result = await extractRequirements("I need a laptop for development and travel.", undefined, { fetchImpl: fetchMock });
    expect(result.status).toBe("unavailable");
    expect(result.errorCode).toBe("not_configured");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uses cache-only mode and never calls the network", async () => {
    process.env.DEMO_PROVIDER_MODE = "cache_only";
    const fetchMock = vi.fn();
    const result = await extractRequirements("I need a laptop for development and travel.", undefined, { cache: validAiData, fetchImpl: fetchMock });
    expect(result.status).toBe("fallback");
    expect(result.origin).toBe("cached_provider");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns a cache miss when cache-only mode has no usable cache", async () => {
    process.env.DEMO_PROVIDER_MODE = "cache_only";
    const result = await extractRequirements("I need a laptop for development and travel.", undefined, { fetchImpl: vi.fn() });
    expect(result.status).toBe("unavailable");
    expect(result.errorCode).toBe("cache_miss");
    expect(result.data).toBeNull();
  });
});

describe("Doubleword provider", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.DEMO_PROVIDER_MODE = "";
    process.env.DOUBLEWORD_API_KEY = "test-key";
    process.env.DOUBLEWORD_BASE_URL = "https://doubleword.test/v1";
    process.env.DOUBLEWORD_MODEL = "tested-model";
    process.env.DOUBLEWORD_TIMEOUT_MS = "100";
  });

  it("accepts valid structured claims", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ output: validClaims }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const result = await extractClaims(validArtifact);
    expect(result.status).toBe("live");
    expect(result.data).toEqual(validClaims);
    expect(claimExtractionSchema.safeParse(result.data).success).toBe(true);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body));
    expect(url).toBe("https://doubleword.test/v1/chat/completions");
    expect(body).not.toHaveProperty("input");
    expect(body.stream).toBe(false);
    expect(body.messages).toHaveLength(2);
    expect(body.messages[0].role).toBe("system");
    expect(body.messages[1].content).toContain("retrievedText");
  });

  it("accepts the documented OpenAI-compatible text-part content shape", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: [{ type: "text", text: JSON.stringify(validClaims) }] } }] }), { status: 200 }));
    const result = await extractClaims(validArtifact, { fetchImpl: fetchMock });
    expect(result.status).toBe("live");
    expect(result.data).toEqual(validClaims);
  });

  it("normalizes trailing slashes on the Doubleword base URL", async () => {
    process.env.DOUBLEWORD_BASE_URL = "https://doubleword.test/v1///";
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ output: validClaims }), { status: 200 }));
    const result = await extractClaims(validArtifact, { fetchImpl: fetchMock });
    expect(result.status).toBe("live");
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://doubleword.test/v1/chat/completions");
  });

  it("rejects an invalid Doubleword base URL without making a request", async () => {
    process.env.DOUBLEWORD_BASE_URL = "not-a-url";
    const fetchMock = vi.fn();
    const result = await extractClaims(validArtifact, { fetchImpl: fetchMock });
    expect(result.status).toBe("unavailable");
    expect(result.origin).toBeNull();
    expect(result.errorCode).toBe("unsafe_url");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("omits an unsupported criterion, records a warning, and returns no invented value", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ output: { ...validClaims, claims: [{ ...validClaims.claims[0], criterionKey: "secret_field", value: 99 }] } }), { status: 200 })));
    const result = await extractClaims(validArtifact);
    expect(result.status).toBe("live");
    expect(result.data?.claims).toEqual([]);
    expect(result.data?.warnings[0]).toContain("Unsupported criterion omitted");
  });

  it("rejects an invalid unit", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ output: { ...validClaims, claims: [{ ...validClaims.claims[0], unit: "dollars" }] } }), { status: 200 })));
    const result = await extractClaims(validArtifact);
    expect(result.status).toBe("unavailable");
    expect(result.errorCode).toBe("invalid_response");
  });

  it("uses a sanitized cached claim extraction on timeout", async () => {
    const fetchMock = vi.fn().mockRejectedValue(Object.assign(new Error("timeout"), { name: "TimeoutError" }));
    const result = await extractClaims(validArtifact, { cache: validClaims, fetchImpl: fetchMock });
    expect(result.status).toBe("fallback");
    expect(result.origin).toBe("cached_provider");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not call Doubleword in cache-only mode", async () => {
    process.env.DEMO_PROVIDER_MODE = "cache_only";
    const fetchMock = vi.fn();
    const result = await extractClaims(validArtifact, { cache: validClaims, fetchImpl: fetchMock });
    expect(result.status).toBe("fallback");
    expect(result.origin).toBe("cached_provider");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps the synthetic fixture claim user-supplied", async () => {
    const { syntheticDoublewordFixture } = await import("@/data/provider-fixtures/doubleword/synthetic");
    expect(syntheticDoublewordFixture.claims[0]?.claimStatus).toBe("user_supplied");
    expect(syntheticDoublewordFixture.warnings.join(" ")).toContain("Synthetic fixture");
  });
});

describe("provider routes", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.DEMO_PROVIDER_MODE = "cache_only";
    delete process.env.AIAND_API_KEY;
  });

  it("returns 400 for malformed JSON", async () => {
    const request = new Request("http://localhost/api/requirements", { method: "POST", headers: { "content-type": "application/json" }, body: "not-json" });
    expect((await requirementsPost(request)).status).toBe(400);
  });

  it("returns 422 for an invalid requirements request", async () => {
    const request = new Request("http://localhost/api/requirements", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ description: "too short" }) });
    expect((await requirementsPost(request)).status).toBe(422);
  });

  it("returns a safe envelope for extraction and never exposes provider secrets", async () => {
    process.env.DOUBLEWORD_API_KEY = "must-not-appear";
    const request = new Request("http://localhost/api/extract", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ artifact: validArtifact }) });
    const response = await extractPost(request);
    const body = await response.text();
    expect(response.status).toBe(200);
    expect(body).not.toContain("must-not-appear");
    expect(body).not.toContain("authorization");
  });

  it("returns 400 and 422 for malformed and schema-invalid extraction requests", async () => {
    const malformed = new Request("http://localhost/api/extract", { method: "POST", body: "not-json" });
    expect((await extractPost(malformed)).status).toBe(400);
    const invalid = new Request("http://localhost/api/extract", { method: "POST", body: JSON.stringify({ artifact: { productId: "x", category: "laptop", retrievedText: "" } }) });
    expect((await extractPost(invalid)).status).toBe(422);
  });
});
