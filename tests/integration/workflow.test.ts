import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { categoryConfigById } from "@/lib/config/categories";
import { scoringResultSchema } from "@/lib/contracts";
import { POST as scorePost } from "@/app/api/score/route";
import { ASUS_ZENBOOK_PRODUCT_ID } from "@/lib/retrieval/oxylabs";
import { syntheticDoublewordFixture } from "@/data/provider-fixtures/doubleword/synthetic";

const payloadFor = (category: "laptop" | "air_purifier" | "lab_oven") => {
  const requirements = categoryConfigById[category].defaultRequirements;
  return {
    category,
    requirements,
    preferredWeights: Object.fromEntries(requirements.filter((r) => r.kind === "preferred").map((r) => [r.criterionKey, r.weight])),
  };
};

const post = (body: unknown) => scorePost(new Request("http://localhost/api/score", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }));

describe("integrated scoring route", () => {
  beforeEach(() => { process.env.DEMO_PROVIDER_MODE = "cache_only"; });

  it("returns 400 for malformed JSON", async () => {
    const response = await scorePost(new Request("http://localhost/api/score", { method: "POST", body: "{" }));
    expect(response.status).toBe(400);
  });

  it("returns 422 for an invalid request", async () => {
    const response = await post({ category: "laptop", requirements: [], preferredWeights: {} });
    expect(response.status).toBe(422);
  });

  it.each([
    ["laptop", "laptop-apple-macbook-air-m4"],
    ["air_purifier", "air-purifier-philips-pureprotect-3200-ac3220-10"],
    ["lab_oven", "lab-oven-memmert-un55"],
  ] as const)("returns three products and the canonical %s recommendation", async (category, expectedProductId) => {
    const response = await post(payloadFor(category));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.products).toHaveLength(3);
    expect(body.result.recommendedProductId).toBe(expectedProductId);
    expect(scoringResultSchema.safeParse(body.result).success).toBe(true);
    expect(body.verification.status).toBe("fallback");
    expect(body.verification.origin).toBe("local_calculation");
  });

  it("keeps the local result when Daytona falls back and re-calculates deterministically", async () => {
    const first = await (await post(payloadFor("laptop"))).json();
    const changed = payloadFor("laptop");
    changed.preferredWeights.price_sgd = 100;
    const second = await (await post(changed)).json();
    expect(first.result).toBeTruthy();
    expect(second.result).toBeTruthy();
    expect(second.verification.data.match).toBe(false);
    expect(second.result.version).toBe("1.0.0");
  });

  it("keeps the ASUS product ID aligned across retrieval and extraction fixtures", () => {
    expect(ASUS_ZENBOOK_PRODUCT_ID).toBe("laptop-asus-zenbook-ux3405ma");
    expect(syntheticDoublewordFixture.productId).toBe(ASUS_ZENBOOK_PRODUCT_ID);
  });
});
