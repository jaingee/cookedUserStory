import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  criterionConfigSchema,
  dataOriginSchema,
  productRecordSchema,
  providerNameSchema,
  providerResultSchema,
  requirementSchema,
} from "@/lib/contracts";

describe("shared contracts", () => {
  it("accepts representative valid contract data", () => {
    expect(
      productRecordSchema.safeParse({
        id: "laptop-example",
        category: "laptop",
        manufacturer: "Example",
        model: "Reference",
        displayName: "Example Reference",
        productUrl: "https://example.com/reference",
        price: { amount: 1499, currency: "SGD" },
        specifications: {
          ram_gb: {
            value: 16,
            unit: "GB",
            origin: "prepared_fixture",
            claimStatus: "manufacturer_reported",
            confidence: "high",
            evidenceIds: ["evidence-1"],
          },
        },
        evidence: [
          {
            id: "evidence-1",
            sourceUrl: "https://example.com/reference",
            sourceTitle: "Example reference",
            retrievedAt: "2026-07-18T00:00:00.000Z",
            excerpt: "A short public product excerpt.",
            origin: "prepared_fixture",
            claimStatus: "manufacturer_reported",
          },
        ],
      }).success,
    ).toBe(true);

    expect(
      requirementSchema.safeParse({
        id: "max-price",
        criterionKey: "price_sgd",
        label: "Maximum price",
        kind: "mandatory",
        operator: "lte",
        target: 1800,
        unit: "SGD",
        weight: 0,
        source: "category_default",
        needsConfirmation: false,
      }).success,
    ).toBe(true);
  });

  it("rejects invalid provider origins", () => {
    expect(dataOriginSchema.safeParse("provider_magic").success).toBe(false);

    const resultSchema = providerResultSchema(z.object({ category: z.literal("laptop") }));
    expect(
      resultSchema.safeParse({
        provider: "aiand",
        status: "live",
        origin: "cached_provider",
        data: { category: "laptop" },
      }).success,
    ).toBe(false);
  });

  it("accepts a valid provider success envelope", () => {
    const resultSchema = providerResultSchema(z.object({ category: z.literal("laptop") }));
    expect(
      resultSchema.safeParse({
        provider: "aiand",
        status: "live",
        origin: "live_provider",
        data: { category: "laptop" },
        durationMs: 125,
      }).success,
    ).toBe(true);
  });

  it("rejects invalid units", () => {
    const result = criterionConfigSchema.safeParse({
      key: "price_sgd",
      label: "Price",
      valueType: "number",
      unit: "dollars-ish",
      supportedRequirementKinds: ["mandatory", "preferred"],
      allowedMandatoryOperators: ["lte"],
      scoringMode: "lower_is_better",
      defaultWeight: 30,
    });

    expect(result.success).toBe(false);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    "rejects non-finite numeric value %s",
    (value) => {
      expect(
        requirementSchema.safeParse({
          id: "invalid-number",
          criterionKey: "price_sgd",
          label: "Maximum price",
          kind: "mandatory",
          operator: "lte",
          target: value,
          unit: "SGD",
          weight: 0,
          source: "category_default",
          needsConfirmation: false,
        }).success,
      ).toBe(false);
    },
  );

  it("rejects invalid negative weights", () => {
    expect(
      criterionConfigSchema.safeParse({
        key: "price_sgd",
        label: "Price",
        valueType: "number",
        unit: "SGD",
        supportedRequirementKinds: ["preferred"],
        allowedMandatoryOperators: [],
        scoringMode: "lower_is_better",
        defaultWeight: -1,
      }).success,
    ).toBe(false);
  });

  it("contains each required provider ID exactly once", () => {
    expect(providerNameSchema.options).toEqual([
      "aiand",
      "oxylabs",
      "doubleword",
      "daytona",
      "nosana",
    ]);
    expect(new Set(providerNameSchema.options).size).toBe(5);
  });
});
