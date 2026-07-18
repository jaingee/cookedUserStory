import { categoryConfigById } from "@/lib/config/categories";
import type {
  CategoryConfig,
  ClaimStatus,
  DataOrigin,
  EvidenceRecord,
  MandatoryCheck,
  ProductCategory,
  ProductRecord,
  ProviderName,
  ProviderResult,
  ProviderStatus,
  QualificationStatus,
  RankedProduct,
  Requirement,
  ScoringResult,
} from "@/lib/contracts";

export const providerLabels: Record<ProviderName, string> = {
  aiand: "AI&",
  oxylabs: "Oxylabs",
  doubleword: "Doubleword",
  daytona: "Daytona",
  nosana: "Nosana",
};

export type ProviderDisplay = {
  provider: ProviderName;
  label: string;
  result: ProviderResult<Record<string, string>>;
};

const evidence = (
  id: string,
  sourceTitle: string,
  excerpt: string,
  origin: DataOrigin,
  claimStatus: ClaimStatus = "manufacturer_reported",
  sourceUrl: string | null = "https://example.com/prepared-fixture",
): EvidenceRecord => ({
  id,
  sourceTitle,
  sourceUrl,
  retrievedAt: "2026-07-18T08:30:00+08:00",
  excerpt,
  origin,
  claimStatus,
});

const value = (
  amount: number | string | boolean | null,
  unit: ProductRecord["specifications"][string]["unit"],
  origin: DataOrigin,
  claimStatus: ClaimStatus,
  confidence: "high" | "medium" | "low",
  evidenceIds: string[],
): ProductRecord["specifications"][string] => ({ value: amount, unit, origin, claimStatus, confidence, evidenceIds });

const laptopProducts: ProductRecord[] = [
  {
    id: "laptop-novabook-pro-14",
    category: "laptop",
    manufacturer: "Nova",
    model: "Book Pro 14",
    displayName: "Nova Book Pro 14",
    productUrl: "https://example.com/novabook-pro-14",
    price: { amount: 1699, currency: "SGD" },
    specifications: {
      price_sgd: value(1699, "SGD", "prepared_fixture", "retailer_reported", "high", ["novabook-price"]),
      ram_gb: value(16, "GB", "prepared_fixture", "manufacturer_reported", "high", ["novabook-spec"]),
      storage_gb: value(512, "GB", "prepared_fixture", "manufacturer_reported", "high", ["novabook-spec"]),
      battery_life_h: value(12, "h", "prepared_fixture", "manufacturer_reported", "medium", ["novabook-spec"]),
      weight_kg: value(1.35, "kg", "prepared_fixture", "manufacturer_reported", "high", ["novabook-spec"]),
      geekbench_6_multicore: value(10900, "Geekbench 6 multicore points", "prepared_fixture", "calculated", "medium", ["novabook-bench"]),
    },
    evidence: [
      evidence("novabook-price", "Prepared retailer listing", "Fixture price: S$1,699, captured for the MVP demo.", "prepared_fixture", "retailer_reported"),
      evidence("novabook-spec", "Prepared manufacturer specification", "16 GB RAM, 512 GB SSD, 12-hour battery, 1.35 kg.", "prepared_fixture"),
      evidence("novabook-bench", "Prepared benchmark note", "Synthetic benchmark fixture for consistent local scoring.", "synthetic_fixture", "calculated"),
    ],
  },
  {
    id: "laptop-pixelforge-16",
    category: "laptop",
    manufacturer: "PixelForge",
    model: "Creator 16",
    displayName: "PixelForge Creator 16",
    productUrl: "https://example.com/pixelforge-creator-16",
    price: { amount: 2099, currency: "SGD" },
    specifications: {
      price_sgd: value(2099, "SGD", "cached_provider", "retailer_reported", "medium", ["pixelforge-price"]),
      ram_gb: value(32, "GB", "cached_provider", "manufacturer_reported", "high", ["pixelforge-spec"]),
      storage_gb: value(1024, "GB", "cached_provider", "manufacturer_reported", "high", ["pixelforge-spec"]),
      battery_life_h: value(8, "h", "cached_provider", "manufacturer_reported", "medium", ["pixelforge-spec"]),
      weight_kg: value(2.1, "kg", "cached_provider", "manufacturer_reported", "high", ["pixelforge-spec"]),
      geekbench_6_multicore: value(13500, "Geekbench 6 multicore points", "cached_provider", "manufacturer_reported", "low", ["pixelforge-spec"]),
    },
    evidence: [
      evidence("pixelforge-price", "Cached retailer listing", "Cached price: S$2,099; the budget requirement is not met.", "cached_provider", "retailer_reported"),
      evidence("pixelforge-spec", "Cached manufacturer specification", "32 GB RAM, 1 TB SSD, 8-hour battery, 2.1 kg.", "cached_provider"),
    ],
  },
  {
    id: "laptop-northstar-travel-13",
    category: "laptop",
    manufacturer: "Northstar",
    model: "Travel 13",
    displayName: "Northstar Travel 13",
    productUrl: "https://example.com/northstar-travel-13",
    price: { amount: 1599, currency: "SGD" },
    specifications: {
      price_sgd: value(1599, "SGD", "synthetic_fixture", "estimated", "medium", ["northstar-fixture"]),
      ram_gb: value(16, "GB", "synthetic_fixture", "manufacturer_reported", "medium", ["northstar-fixture"]),
      storage_gb: value(null, "GB", "synthetic_fixture", "missing", "low", []),
      battery_life_h: value(10, "h", "synthetic_fixture", "estimated", "low", ["northstar-fixture"]),
      weight_kg: value(1.1, "kg", "synthetic_fixture", "estimated", "low", ["northstar-fixture"]),
      geekbench_6_multicore: value(9800, "Geekbench 6 multicore points", "synthetic_fixture", "conflicting", "low", ["northstar-fixture"]),
    },
    evidence: [
      evidence("northstar-fixture", "Synthetic comparison fixture", "Prepared fixture: storage capacity is intentionally unresolved for the demo.", "synthetic_fixture", "conflicting", null),
    ],
  },
];

const purifierProducts: ProductRecord[] = [
  {
    id: "purifier-cleanair-300",
    category: "air_purifier",
    manufacturer: "CleanAir",
    model: "Breeze 300",
    displayName: "CleanAir Breeze 300",
    productUrl: "https://example.com/cleanair-breeze-300",
    price: { amount: 499, currency: "SGD" },
    specifications: {
      price_sgd: value(499, "SGD", "prepared_fixture", "retailer_reported", "high", ["breeze-price"]),
      cadr_m3h: value(360, "m3/h", "prepared_fixture", "manufacturer_reported", "high", ["breeze-spec"]),
      coverage_m2: value(48, "m2", "prepared_fixture", "manufacturer_reported", "high", ["breeze-spec"]),
      noise_dba: value(28, "dB(A)", "prepared_fixture", "manufacturer_reported", "medium", ["breeze-spec"]),
      filter_cost_sgd_year: value(72, "SGD/year", "prepared_fixture", "retailer_reported", "medium", ["breeze-price"]),
      power_consumption_w: value(42, "W", "prepared_fixture", "calculated", "medium", ["breeze-spec"]),
    },
    evidence: [
      evidence("breeze-price", "Prepared retailer listing", "Fixture price: S$499; annual replacement filter estimate: S$72.", "prepared_fixture", "retailer_reported"),
      evidence("breeze-spec", "Prepared manufacturer specification", "CADR 360 m3/h, room coverage 48 m2, quiet mode 28 dB(A).", "prepared_fixture"),
    ],
  },
  {
    id: "purifier-zenpure-max",
    category: "air_purifier",
    manufacturer: "ZenPure",
    model: "Max 500",
    displayName: "ZenPure Max 500",
    productUrl: "https://example.com/zenpure-max-500",
    price: { amount: 699, currency: "SGD" },
    specifications: {
      price_sgd: value(699, "SGD", "cached_provider", "retailer_reported", "high", ["zenpure-price"]),
      cadr_m3h: value(520, "m3/h", "cached_provider", "manufacturer_reported", "high", ["zenpure-spec"]),
      coverage_m2: value(60, "m2", "cached_provider", "manufacturer_reported", "high", ["zenpure-spec"]),
      noise_dba: value(33, "dB(A)", "cached_provider", "manufacturer_reported", "medium", ["zenpure-spec"]),
      filter_cost_sgd_year: value(90, "SGD/year", "cached_provider", "retailer_reported", "medium", ["zenpure-price"]),
      power_consumption_w: value(58, "W", "cached_provider", "manufacturer_reported", "medium", ["zenpure-spec"]),
    },
    evidence: [
      evidence("zenpure-price", "Cached retailer listing", "Cached price: S$699; above the selected budget.", "cached_provider", "retailer_reported"),
      evidence("zenpure-spec", "Cached manufacturer specification", "CADR 520 m3/h, room coverage 60 m2, 33 dB(A).", "cached_provider"),
    ],
  },
  {
    id: "purifier-mistline-400",
    category: "air_purifier",
    manufacturer: "Mistline",
    model: "Quiet 400",
    displayName: "Mistline Quiet 400",
    productUrl: "https://example.com/mistline-quiet-400",
    price: { amount: 429, currency: "SGD" },
    specifications: {
      price_sgd: value(429, "SGD", "synthetic_fixture", "estimated", "medium", ["mistline-fixture"]),
      cadr_m3h: value(null, "m3/h", "synthetic_fixture", "missing", "low", []),
      coverage_m2: value(44, "m2", "synthetic_fixture", "estimated", "low", ["mistline-fixture"]),
      noise_dba: value(25, "dB(A)", "synthetic_fixture", "conflicting", "low", ["mistline-fixture"]),
      filter_cost_sgd_year: value(60, "SGD/year", "synthetic_fixture", "estimated", "low", ["mistline-fixture"]),
      power_consumption_w: value(36, "W", "synthetic_fixture", "estimated", "low", ["mistline-fixture"]),
    },
    evidence: [
      evidence("mistline-fixture", "Synthetic comparison fixture", "CADR remains unresolved; noise data conflicts between prepared notes.", "synthetic_fixture", "conflicting", null),
    ],
  },
];

const ovenProducts: ProductRecord[] = [
  {
    id: "oven-thermadyne-60",
    category: "lab_oven",
    manufacturer: "Thermadyne",
    model: "Precision 60",
    displayName: "Thermadyne Precision 60",
    productUrl: "https://example.com/thermadyne-precision-60",
    price: { amount: 7450, currency: "SGD" },
    specifications: {
      price_sgd: value(7450, "SGD", "prepared_fixture", "retailer_reported", "high", ["thermadyne-price"]),
      max_temperature_c: value(300, "°C", "prepared_fixture", "manufacturer_reported", "high", ["thermadyne-spec"]),
      chamber_volume_l: value(60, "L", "prepared_fixture", "manufacturer_reported", "high", ["thermadyne-spec"]),
      electrical_profile: value("230V_50HZ_SINGLE_PHASE", "electrical_profile", "prepared_fixture", "manufacturer_reported", "high", ["thermadyne-spec"]),
      temperature_uniformity_c: value(2.5, "±°C", "prepared_fixture", "manufacturer_reported", "medium", ["thermadyne-spec"]),
      power_consumption_w: value(2200, "W", "prepared_fixture", "calculated", "medium", ["thermadyne-spec"]),
    },
    evidence: [
      evidence("thermadyne-price", "Prepared equipment listing", "Fixture price: S$7,450.", "prepared_fixture", "retailer_reported"),
      evidence("thermadyne-spec", "Prepared manufacturer specification", "300 °C, 60 L chamber, 230 V single-phase, ±2.5 °C uniformity.", "prepared_fixture"),
    ],
  },
  {
    id: "oven-heatcraft-75",
    category: "lab_oven",
    manufacturer: "HeatCraft",
    model: "Pro 75",
    displayName: "HeatCraft Pro 75",
    productUrl: "https://example.com/heatcraft-pro-75",
    price: { amount: 8950, currency: "SGD" },
    specifications: {
      price_sgd: value(8950, "SGD", "cached_provider", "retailer_reported", "high", ["heatcraft-price"]),
      max_temperature_c: value(350, "°C", "cached_provider", "manufacturer_reported", "high", ["heatcraft-spec"]),
      chamber_volume_l: value(75, "L", "cached_provider", "manufacturer_reported", "high", ["heatcraft-spec"]),
      electrical_profile: value("230V_50HZ_SINGLE_PHASE", "electrical_profile", "cached_provider", "manufacturer_reported", "high", ["heatcraft-spec"]),
      temperature_uniformity_c: value(1.8, "±°C", "cached_provider", "manufacturer_reported", "medium", ["heatcraft-spec"]),
      power_consumption_w: value(2800, "W", "cached_provider", "manufacturer_reported", "medium", ["heatcraft-spec"]),
    },
    evidence: [
      evidence("heatcraft-price", "Cached equipment listing", "Cached price: S$8,950; above the selected budget.", "cached_provider", "retailer_reported"),
      evidence("heatcraft-spec", "Cached manufacturer specification", "350 °C, 75 L chamber, 230 V single-phase, ±1.8 °C uniformity.", "cached_provider"),
    ],
  },
  {
    id: "oven-labforge-50",
    category: "lab_oven",
    manufacturer: "LabForge",
    model: "Core 50",
    displayName: "LabForge Core 50",
    productUrl: "https://example.com/labforge-core-50",
    price: { amount: 6200, currency: "SGD" },
    specifications: {
      price_sgd: value(6200, "SGD", "synthetic_fixture", "estimated", "medium", ["labforge-fixture"]),
      max_temperature_c: value(250, "°C", "synthetic_fixture", "estimated", "low", ["labforge-fixture"]),
      chamber_volume_l: value(50, "L", "synthetic_fixture", "manufacturer_reported", "low", ["labforge-fixture"]),
      electrical_profile: value(null, "electrical_profile", "synthetic_fixture", "missing", "low", []),
      temperature_uniformity_c: value(3.2, "±°C", "synthetic_fixture", "conflicting", "low", ["labforge-fixture"]),
      power_consumption_w: value(1900, "W", "synthetic_fixture", "estimated", "low", ["labforge-fixture"]),
    },
    evidence: [
      evidence("labforge-fixture", "Synthetic comparison fixture", "Electrical profile is not confirmed; uniformity notes conflict.", "synthetic_fixture", "conflicting", null),
    ],
  },
];

export const productsByCategory: Record<ProductCategory, ProductRecord[]> = {
  laptop: laptopProducts,
  air_purifier: purifierProducts,
  lab_oven: ovenProducts,
};

const providerResult = (
  provider: ProviderName,
  status: ProviderStatus,
  origin: ProviderResult<Record<string, string>>["origin"],
  data: Record<string, string> | null,
  warning?: string,
): ProviderResult<Record<string, string>> => ({ provider, status, origin, data, warning });

const providerModes: Record<ProductCategory, Record<ProviderName, ProviderResult<Record<string, string>>>> = {
  laptop: {
    aiand: providerResult("aiand", "live", "live_provider", { note: "Category extraction supplied" }),
    oxylabs: providerResult("oxylabs", "cached", "cached_provider", { note: "Public listing cache" }),
    doubleword: providerResult("doubleword", "fallback", "synthetic_fixture", { note: "Prepared extraction fixture" }),
    daytona: providerResult("daytona", "unavailable", null, null, "No remote scoring runtime configured."),
    nosana: providerResult("nosana", "error", null, null, "Evidence review returned an error."),
  },
  air_purifier: {
    aiand: providerResult("aiand", "cached", "cached_provider", { note: "Cached category extraction" }),
    oxylabs: providerResult("oxylabs", "live", "live_provider", { note: "Live retrieval transport" }),
    doubleword: providerResult("doubleword", "fallback", "prepared_fixture", { note: "Prepared extraction fixture" }),
    daytona: providerResult("daytona", "error", null, null, "Remote scoring is unavailable for this fixture."),
    nosana: providerResult("nosana", "unavailable", null, null, "No evidence review workload configured."),
  },
  lab_oven: {
    aiand: providerResult("aiand", "fallback", "prepared_fixture", { note: "Prepared category extraction" }),
    oxylabs: providerResult("oxylabs", "cached", "cached_provider", { note: "Cached equipment listing" }),
    doubleword: providerResult("doubleword", "live", "live_provider", { note: "Live structured extraction" }),
    daytona: providerResult("daytona", "unavailable", null, null, "No remote scoring runtime configured."),
    nosana: providerResult("nosana", "error", null, null, "Evidence review returned an error."),
  },
};

export const providersForCategory = (category: ProductCategory): ProviderDisplay[] =>
  (Object.keys(providerLabels) as ProviderName[]).map((provider) => ({
    provider,
    label: providerLabels[provider],
    result: providerModes[category][provider],
  }));

export const criteriaForCategory = (category: ProductCategory): CategoryConfig => categoryConfigById[category];

const actualValue = (product: ProductRecord, key: string): number | string | boolean | null =>
  key === "price_sgd" ? product.price.amount : product.specifications[key]?.value ?? null;

const formatActual = (actual: number | string | boolean | null, unit: string | null) =>
  actual === null ? "Unknown" : `${actual}${unit && !["electrical_profile"].includes(unit) ? ` ${unit}` : ""}`;

const checkRequirement = (requirement: Requirement, product: ProductRecord): MandatoryCheck => {
  const actual = actualValue(product, requirement.criterionKey);
  if (actual === null) {
    return {
      requirementId: requirement.id,
      criterionKey: requirement.criterionKey,
      status: "unknown",
      actualValue: null,
      unit: requirement.unit,
      message: `${requirement.label} is unknown for this product.`,
    };
  }

  const target = requirement.target;
  const passed =
    requirement.operator === "gte" && typeof actual === "number" && typeof target === "number"
      ? actual >= target
      : requirement.operator === "lte" && typeof actual === "number" && typeof target === "number"
        ? actual <= target
        : requirement.operator === "eq"
          ? actual === target
          : false;

  return {
    requirementId: requirement.id,
    criterionKey: requirement.criterionKey,
    status: passed ? "pass" : "fail",
    actualValue: actual,
    unit: requirement.unit,
    message: passed
      ? `${requirement.label}: ${formatActual(actual, requirement.unit)} meets ${requirement.operator} ${formatActual(target, requirement.unit)}.`
      : `${requirement.label}: ${formatActual(actual, requirement.unit)} does not meet ${requirement.operator} ${formatActual(target, requirement.unit)}.`,
  };
};

export function scoreDemoProducts(
  category: ProductCategory,
  requirements: Requirement[],
  products: ProductRecord[] = productsByCategory[category],
  editedWeights: Record<string, number> = {},
): ScoringResult {
  const preferred = requirements.filter((requirement) => requirement.kind === "preferred");
  const config = categoryConfigById[category];
  const rawWeights = preferred.map((requirement) => editedWeights[requirement.id] ?? requirement.weight);
  const totalWeight = rawWeights.reduce((sum, weight) => sum + weight, 0);
  const normalizedWeights = new Map(
    preferred.map((requirement, index) => [requirement.id, totalWeight > 0 ? rawWeights[index] / totalWeight : 0]),
  );
  const fallbackTotal = config.criteria.reduce((sum, criterion) => sum + criterion.defaultWeight, 0);

  const rankedProducts: RankedProduct[] = products.map((product) => {
    const mandatoryChecks = requirements.filter((requirement) => requirement.kind === "mandatory").map((requirement) => checkRequirement(requirement, product));
    const failures = mandatoryChecks.filter((check) => check.status === "fail").map((check) => check.message);
    const unknowns = mandatoryChecks.filter((check) => check.status === "unknown").map((check) => check.message);
    const qualification: QualificationStatus = failures.length > 0 ? "disqualified" : unknowns.length > 0 ? "needs_confirmation" : "qualified";
    const criterionScores = preferred.map((requirement) => {
      const criterion = config.criteria.find((candidate) => candidate.key === requirement.criterionKey);
      const criterionValues = products.map((candidate) => actualValue(candidate, requirement.criterionKey)).filter((candidate): candidate is number => typeof candidate === "number");
      const current = actualValue(product, requirement.criterionKey);
      const normalizedWeight = totalWeight > 0 ? normalizedWeights.get(requirement.id) ?? 0 : (criterion?.defaultWeight ?? 0) / fallbackTotal;
      const missing = current === null || typeof current !== "number";
      let rawScore = 0;
      if (!missing && criterion) {
        if (criterion.scoringMode === "threshold") rawScore = 10;
        else if (criterionValues.length && Math.max(...criterionValues) === Math.min(...criterionValues)) rawScore = 10;
        else if (criterionValues.length && typeof current === "number") {
          const min = Math.min(...criterionValues);
          const max = Math.max(...criterionValues);
          rawScore = criterion.scoringMode === "higher_is_better" ? (10 * (current - min)) / (max - min) : (10 * (max - current)) / (max - min);
        }
      }
      return { criterionKey: requirement.criterionKey, value: typeof current === "number" ? current : null, rawScore, normalizedWeight, weightedScore: rawScore * normalizedWeight, missing };
    });
    const weightedScore = qualification === "qualified" ? criterionScores.reduce((sum, score) => sum + score.weightedScore, 0) : null;
    return { productId: product.id, qualification, mandatoryChecks, failures, unknowns, criterionScores, weightedScore, rank: null, onlyQualifyingOption: false };
  });

  const qualified = rankedProducts.filter((product) => product.qualification === "qualified").sort((a, b) => (b.weightedScore ?? -1) - (a.weightedScore ?? -1));
  qualified.forEach((product, index) => {
    product.rank = index + 1;
  });
  rankedProducts.forEach((product) => {
    product.onlyQualifyingOption = qualified.length === 1 && product.qualification === "qualified";
  });
  return {
    version: "1.0.0",
    category,
    rankedProducts,
    recommendedProductId: qualified[0]?.productId ?? null,
    noRecommendation: qualified.length === 0,
    warnings: ["Scores are local calculations over prepared fixtures; provider results are not being presented as live by default."],
  };
}

export const claimLabel = (claimStatus: ClaimStatus) => claimStatus.replaceAll("_", " ");
export const originLabel = (origin: DataOrigin | null) =>
  origin === null ? "Unavailable" : origin.replace("_", " ");
export const confidenceLabel = (confidence: "high" | "medium" | "low") => `${confidence} confidence`;
