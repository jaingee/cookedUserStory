import { spawnSync } from "node:child_process";

import { describe, expect, it } from "vitest";

import { categoryConfigs } from "@/lib/config/categories";
import {
  calculateEvidenceCompleteness,
  ensureExactlyThreeProductsPerCategory,
  loadAllProductFixtures,
  loadProductsForCategory,
  resolveEvidenceReference,
  validateProductFixtures,
} from "@/lib/domain/products";
import { canonicalInputDigest, scoreProducts } from "@/lib/scoring/score-products";
import { scoringResultSchema, type ProductRecord, type Requirement, type ScoringInput } from "@/lib/contracts";

const evidence = {
  id: "evidence-1",
  sourceUrl: null,
  sourceTitle: "Test fixture",
  retrievedAt: "2026-07-18T00:00:00.000Z",
  excerpt: "A short prepared fixture excerpt.",
  origin: "prepared_fixture" as const,
  claimStatus: "user_supplied" as const,
};

function product(overrides: Partial<ProductRecord> = {}): ProductRecord {
  return {
    id: "product-a",
    category: "laptop",
    manufacturer: "Example",
    model: "Reference",
    displayName: "Example Reference",
    productUrl: null,
    price: { amount: 1000, currency: "SGD" },
    specifications: {
      ram_gb: {
        value: 16,
        unit: "GB",
        origin: "prepared_fixture",
        claimStatus: "user_supplied",
        confidence: "high",
        evidenceIds: [evidence.id],
      },
      storage_gb: {
        value: 512,
        unit: "GB",
        origin: "prepared_fixture",
        claimStatus: "user_supplied",
        confidence: "high",
        evidenceIds: [evidence.id],
      },
      battery_life_h: {
        value: 10,
        unit: "h",
        origin: "prepared_fixture",
        claimStatus: "user_supplied",
        confidence: "high",
        evidenceIds: [evidence.id],
      },
    },
    evidence: [evidence],
    ...overrides,
  };
}

const requirements: Requirement[] = [
  {
    id: "max-price",
    criterionKey: "price_sgd",
    label: "Maximum price",
    kind: "mandatory",
    operator: "lte",
    target: 2000,
    unit: "SGD",
    weight: 0,
    source: "user",
    needsConfirmation: false,
  },
  {
    id: "min-ram",
    criterionKey: "ram_gb",
    label: "Minimum RAM",
    kind: "mandatory",
    operator: "gte",
    target: 16,
    unit: "GB",
    weight: 0,
    source: "user",
    needsConfirmation: false,
  },
  {
    id: "prefer-battery",
    criterionKey: "battery_life_h",
    label: "Prefer battery life",
    kind: "preferred",
    operator: null,
    target: null,
    unit: "h",
    weight: 20,
    source: "user",
    needsConfirmation: false,
  },
  {
    id: "prefer-price",
    criterionKey: "price_sgd",
    label: "Prefer lower price",
    kind: "preferred",
    operator: null,
    target: null,
    unit: "SGD",
    weight: 30,
    source: "user",
    needsConfirmation: false,
  },
];

function input(overrides: Partial<ScoringInput> = {}): ScoringInput {
  const base = product();
  return {
    version: "1.0.0",
    category: "laptop",
    requirements,
    products: [
      product({ id: "product-a", price: { amount: 1000, currency: "SGD" } }),
      product({
        id: "product-b",
        price: { amount: 1200, currency: "SGD" },
        specifications: { ...base.specifications, battery_life_h: { ...base.specifications.battery_life_h, value: 12 } },
      }),
      product({
        id: "product-c",
        price: { amount: 1400, currency: "SGD" },
        specifications: { ...base.specifications, battery_life_h: { ...base.specifications.battery_life_h, value: 8 } },
      }),
    ],
    preferredWeights: { battery_life_h: 20 },
    ...overrides,
  };
}

describe("product fixtures and domain helpers", () => {
  it("loads and validates exactly three products for every category", () => {
    const fixtures = loadAllProductFixtures();

    expect(validateProductFixtures(fixtures)).toHaveLength(9);
    expect(ensureExactlyThreeProductsPerCategory(fixtures)).toHaveLength(9);
    for (const config of categoryConfigs) {
      expect(loadProductsForCategory(config.category)).toHaveLength(3);
    }
  });

  it("resolves evidence and calculates linked-value completeness", () => {
    const fixture = product();
    expect(resolveEvidenceReference(fixture, evidence.id)).toEqual(evidence);
    expect(calculateEvidenceCompleteness(fixture)).toBe(1);
  });
});

describe("scoreProducts", () => {
  it("qualifies, ranks, and breaks ties deterministically", () => {
    const result = scoreProducts(input());

    expect(result.rankedProducts.filter(({ rank }) => rank !== null).map(({ productId }) => productId)).toEqual([
      "product-b",
      "product-a",
      "product-c",
    ]);
    expect(result.recommendedProductId).toBe("product-b");
  });

  it("gives failure precedence over an unknown mandatory value", () => {
    const base = product();
    const result = scoreProducts(input({
      requirements: [
        ...requirements,
        { ...requirements[0], id: "min-storage", criterionKey: "storage_gb", target: 1024 },
      ],
      products: [
        product({ id: "product-a", specifications: { ...base.specifications, storage_gb: { ...base.specifications.storage_gb, value: null } } }),
        product({ id: "product-b", specifications: { ...base.specifications, ram_gb: { ...base.specifications.ram_gb, value: 8 } } }),
        product({ id: "product-c", specifications: { ...base.specifications, ram_gb: { ...base.specifications.ram_gb, value: null } } }),
      ],
    }));

    expect(result.rankedProducts[0]?.qualification).toBe("needs_confirmation");
    expect(result.rankedProducts[1]?.qualification).toBe("disqualified");
    expect(result.rankedProducts[2]?.qualification).toBe("needs_confirmation");
    expect(result.recommendedProductId).toBeNull();
  });

  it("normalizes weights, falls back to defaults, and keeps missing preferred values at zero", () => {
    const result = scoreProducts(input({ preferredWeights: { battery_life_h: 0 } }));

    expect(result.rankedProducts.every(({ qualification }) => qualification === "qualified")).toBe(true);
    expect(result.rankedProducts[0]?.criterionScores.find(({ criterionKey }) => criterionKey === "battery_life_h")?.normalizedWeight).toBe(0.4);
    expect(result.rankedProducts[0]?.criterionScores.find(({ criterionKey }) => criterionKey === "price_sgd")?.normalizedWeight).toBe(0.6);
    expect(result.rankedProducts[0]?.criterionScores.find(({ criterionKey }) => criterionKey === "battery_life_h")?.missing).toBe(false);
  });

  it("does not qualify products with null mandatory values or invalid prices", () => {
    const base = product();
    const result = scoreProducts(input({
      products: [
        product({ id: "product-a", price: { amount: 0, currency: "SGD" } }),
        product({ id: "product-b", specifications: { ...base.specifications, ram_gb: { ...base.specifications.ram_gb, value: null } } }),
        product({ id: "product-c", price: { amount: null, currency: "SGD" } }),
      ],
    }));

    expect(result.rankedProducts.map(({ qualification }) => qualification)).toEqual([
      "needs_confirmation",
      "needs_confirmation",
      "needs_confirmation",
    ]);
    expect(result.noRecommendation).toBe(true);
  });

  it("never lets a needs-confirmation product win", () => {
    const base = product();
    const result = scoreProducts(input({
      products: [
        product({ id: "product-a", price: { amount: 1000, currency: "SGD" } }),
        product({ id: "product-b", price: { amount: 900, currency: "SGD" }, specifications: { ...base.specifications, ram_gb: { ...base.specifications.ram_gb, value: null } } }),
        product({ id: "product-c", price: { amount: 1100, currency: "SGD" } }),
      ],
    }));

    expect(result.recommendedProductId).not.toBe("product-b");
    expect(result.rankedProducts.find(({ productId }) => productId === "product-b")?.rank).toBeNull();
  });

  it("marks the sole qualified product as onlyQualifyingOption", () => {
    const base = product();
    const result = scoreProducts(input({
      products: [
        product({ id: "product-a" }),
        product({ id: "product-b", specifications: { ...base.specifications, ram_gb: { ...base.specifications.ram_gb, value: 8 } } }),
        product({ id: "product-c", specifications: { ...base.specifications, ram_gb: { ...base.specifications.ram_gb, value: null } } }),
      ],
    }));

    expect(result.recommendedProductId).toBe("product-a");
    expect(result.rankedProducts.find(({ productId }) => productId === "product-a")?.onlyQualifyingOption).toBe(true);
    expect(result.rankedProducts.filter(({ rank }) => rank !== null)).toHaveLength(1);
  });

  it("scores equal higher and lower values as ten", () => {
    const equalRequirements = [
      ...requirements.filter(({ criterionKey }) => criterionKey === "price_sgd" || criterionKey === "ram_gb"),
      { ...requirements[1], id: "prefer-ram", kind: "preferred" as const, operator: null, target: null, weight: 1 },
    ];
    const equalInput = input({ requirements: equalRequirements, preferredWeights: { price_sgd: 1, ram_gb: 1 }, products: [product({ id: "z-product", price: { amount: 1000, currency: "SGD" } }), product({ id: "a-product", price: { amount: 1000, currency: "SGD" } }), product({ id: "m-product", price: { amount: 1000, currency: "SGD" } })] });
    const result = scoreProducts(equalInput);

    expect(result.rankedProducts.every(({ criterionScores }) => criterionScores.every(({ rawScore }) => rawScore === 10))).toBe(true);
    expect(result.rankedProducts.filter(({ rank }) => rank !== null).map(({ productId }) => productId)).toEqual(["a-product", "m-product", "z-product"]);
  });

  it("marks a missing preferred value and treats a conflicting mandatory value as unknown", () => {
    const base = product();
    const result = scoreProducts(input({
      products: [
        product({ id: "product-a", specifications: { ...base.specifications, battery_life_h: { ...base.specifications.battery_life_h, value: null, claimStatus: "missing" } } }),
        product({ id: "product-b", specifications: { ...base.specifications, ram_gb: { ...base.specifications.ram_gb, claimStatus: "conflicting" } } }),
        product({ id: "product-c" }),
      ],
    }));

    expect(result.rankedProducts.find(({ productId }) => productId === "product-a")?.criterionScores.find(({ criterionKey }) => criterionKey === "battery_life_h")?.missing).toBe(true);
    expect(result.rankedProducts.find(({ productId }) => productId === "product-b")?.qualification).toBe("needs_confirmation");
  });

  it("treats a wrong unit as an unknown mandatory value", () => {
    const base = product();
    const malformed = product({ specifications: { ...base.specifications, ram_gb: { ...base.specifications.ram_gb, unit: "kg" as ProductRecord["specifications"][string]["unit"] } } });
    const result = scoreProducts(input({ products: [malformed, product({ id: "product-b" }), product({ id: "product-c" })] }));

    expect(result.rankedProducts.find(({ productId }) => productId === "product-a")?.qualification).toBe("needs_confirmation");
  });

  it("produces a stable digest and repeated byte-equivalent output", () => {
    const first = scoreProducts(input());
    const second = scoreProducts(JSON.parse(JSON.stringify(input())) as ScoringInput);

    expect(canonicalInputDigest(input())).toBe(canonicalInputDigest(JSON.parse(JSON.stringify(input())) as ScoringInput));
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it("has byte-for-byte parity in a clean child Node process", () => {
    const scoringInput = input();
    const direct = scoreProducts(scoringInput);
    const childSource = `const scoreProducts = ${scoreProducts.toString()}; const input = JSON.parse(require('node:fs').readFileSync(0, 'utf8')); process.stdout.write(JSON.stringify(scoreProducts(input)));`;
    const child = spawnSync(process.execPath, ["-e", childSource], {
      input: JSON.stringify(scoringInput),
      encoding: "utf8",
    });

    expect(child.status).toBe(0);
    expect(child.stderr).toBe("");
    const childResult: unknown = JSON.parse(child.stdout);
    expect(scoringResultSchema.safeParse(childResult).success).toBe(true);
    expect(child.stdout).toBe(JSON.stringify(direct));
  });
});
