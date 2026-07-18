import { describe, expect, it } from "vitest";

import { categoryConfigSchema } from "@/lib/contracts";
import { categoryConfigs } from "@/lib/config/categories";

describe("category configuration", () => {
  it("validates every category configuration", () => {
    for (const config of categoryConfigs) {
      expect(categoryConfigSchema.safeParse(config).success).toBe(true);
    }
  });

  it("has finite, non-negative preferred weights with a positive total", () => {
    for (const config of categoryConfigs) {
      const preferred = config.criteria.filter((criterion) =>
        criterion.supportedRequirementKinds.includes("preferred"),
      );
      const weights = preferred.map((criterion) => criterion.defaultWeight);

      expect(weights.every((weight) => Number.isFinite(weight) && weight >= 0)).toBe(true);
      expect(weights.reduce((total, weight) => total + weight, 0)).toBeGreaterThan(0);
    }
  });

  it("contains each required category ID exactly once", () => {
    expect(categoryConfigs.map(({ category }) => category)).toEqual([
      "laptop",
      "air_purifier",
      "lab_oven",
    ]);
    expect(new Set(categoryConfigs.map(({ category }) => category)).size).toBe(3);
  });
});
