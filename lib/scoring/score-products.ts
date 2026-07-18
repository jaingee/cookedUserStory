import type { ScoringInput, ScoringResult } from "@/lib/contracts";

function asciiCompare(left: string, right: string): number {
  const length = Math.min(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const leftCode = left.charCodeAt(index);
    const rightCode = right.charCodeAt(index);
    if (leftCode !== rightCode) {
      return leftCode < rightCode ? -1 : 1;
    }
  }
  return left.length === right.length ? 0 : left.length < right.length ? -1 : 1;
}

function stableStringify(value: unknown): string {
  if (value === null) {
    return "null";
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? JSON.stringify(value) : "null";
  }
  if (typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => asciiCompare(left, right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`);
    return `{${entries.join(",")}}`;
  }
  return "null";
}

function sha256(value: string): string {
  const bytes = new TextEncoder().encode(value);
  const constants = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];
  const paddedLength = (((bytes.length + 9) + 63) >> 6) << 6;
  const padded = new Uint8Array(paddedLength);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const bitLength = bytes.length * 8;
  const highLength = Math.floor(bitLength / 0x100000000);
  const lowLength = bitLength >>> 0;
  padded[padded.length - 8] = (highLength >>> 24) & 0xff;
  padded[padded.length - 7] = (highLength >>> 16) & 0xff;
  padded[padded.length - 6] = (highLength >>> 8) & 0xff;
  padded[padded.length - 5] = highLength & 0xff;
  padded[padded.length - 4] = (lowLength >>> 24) & 0xff;
  padded[padded.length - 3] = (lowLength >>> 16) & 0xff;
  padded[padded.length - 2] = (lowLength >>> 8) & 0xff;
  padded[padded.length - 1] = lowLength & 0xff;

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  for (let offset = 0; offset < padded.length; offset += 64) {
    const words = new Uint32Array(64);
    for (let index = 0; index < 16; index += 1) {
      const position = offset + index * 4;
      words[index] = ((padded[position]! << 24) | (padded[position + 1]! << 16) | (padded[position + 2]! << 8) | padded[position + 3]!) >>> 0;
    }
    for (let index = 16; index < 64; index += 1) {
      const lower = words[index - 15]!;
      const upper = words[index - 2]!;
      const smallSigma0 = ((lower >>> 7) | (lower << 25)) ^ ((lower >>> 18) | (lower << 14)) ^ (lower >>> 3);
      const smallSigma1 = ((upper >>> 17) | (upper << 15)) ^ ((upper >>> 19) | (upper << 13)) ^ (upper >>> 10);
      words[index] = (words[index - 16]! + smallSigma0 + words[index - 7]! + smallSigma1) >>> 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;
    for (let index = 0; index < 64; index += 1) {
      const bigSigma1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      const choose = (e & f) ^ (~e & g);
      const temporary1 = (h + bigSigma1 + choose + constants[index]! + words[index]!) >>> 0;
      const bigSigma0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const temporary2 = (bigSigma0 + majority) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + temporary1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temporary1 + temporary2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  return [h0, h1, h2, h3, h4, h5, h6, h7]
    .map((part) => part.toString(16).padStart(8, "0"))
    .join("");
}

export function canonicalInputDigest(input: ScoringInput): string {
  return sha256(stableStringify(input));
}

export function scoreProducts(input: ScoringInput): ScoringResult {
  type RecordValue = Record<string, unknown>;
  type Criterion = { mode: "higher_is_better" | "lower_is_better" | "threshold"; valueType: "number" | "string" | "boolean"; unit: string; defaultWeight: number };
  type Candidate = { value: unknown; unit: unknown; claimStatus: unknown; origin: unknown; valid: boolean };
  type RankedProduct = ScoringResult["rankedProducts"][number] & { valueIndex: number | null };
  type OutputUnit = RankedProduct["mandatoryChecks"][number]["unit"];
  type Evaluation = { product: RecordValue; productId: string; sourceIndex: number; qualification: "qualified" | "disqualified" | "needs_confirmation"; failures: string[]; unknowns: string[]; mandatoryChecks: RankedProduct["mandatoryChecks"]; weightedScoreRaw: number; evidenceCompleteness: number; validPrice: number | null; rankedProduct: RankedProduct };

  const criteriaByCategory: Record<string, Record<string, Criterion>> = {
    laptop: {
      price_sgd: { mode: "lower_is_better", valueType: "number", unit: "SGD", defaultWeight: 30 },
      ram_gb: { mode: "higher_is_better", valueType: "number", unit: "GB", defaultWeight: 20 },
      storage_gb: { mode: "higher_is_better", valueType: "number", unit: "GB", defaultWeight: 0 },
      battery_life_h: { mode: "higher_is_better", valueType: "number", unit: "h", defaultWeight: 20 },
      weight_kg: { mode: "lower_is_better", valueType: "number", unit: "kg", defaultWeight: 15 },
      geekbench_6_multicore: { mode: "higher_is_better", valueType: "number", unit: "Geekbench 6 multicore points", defaultWeight: 15 },
    },
    air_purifier: {
      price_sgd: { mode: "lower_is_better", valueType: "number", unit: "SGD", defaultWeight: 25 },
      cadr_m3h: { mode: "higher_is_better", valueType: "number", unit: "m3/h", defaultWeight: 25 },
      coverage_m2: { mode: "higher_is_better", valueType: "number", unit: "m2", defaultWeight: 20 },
      noise_dba: { mode: "lower_is_better", valueType: "number", unit: "dB(A)", defaultWeight: 15 },
      annual_filter_cost_sgd: { mode: "lower_is_better", valueType: "number", unit: "SGD/year", defaultWeight: 10 },
      power_consumption_w: { mode: "lower_is_better", valueType: "number", unit: "W", defaultWeight: 5 },
    },
    lab_oven: {
      price_sgd: { mode: "lower_is_better", valueType: "number", unit: "SGD", defaultWeight: 25 },
      max_temperature_c: { mode: "higher_is_better", valueType: "number", unit: "°C", defaultWeight: 25 },
      chamber_volume_l: { mode: "higher_is_better", valueType: "number", unit: "L", defaultWeight: 20 },
      electrical_profile: { mode: "threshold", valueType: "string", unit: "electrical_profile", defaultWeight: 0 },
      temperature_uniformity_c: { mode: "lower_is_better", valueType: "number", unit: "±°C", defaultWeight: 20 },
      power_consumption_w: { mode: "lower_is_better", valueType: "number", unit: "W", defaultWeight: 10 },
    },
  };
  const defaultWeightsByCategory: Record<string, Record<string, number>> = {
    laptop: { price_sgd: 30, ram_gb: 20, battery_life_h: 20, weight_kg: 15, geekbench_6_multicore: 15 },
    air_purifier: { price_sgd: 25, cadr_m3h: 25, coverage_m2: 20, noise_dba: 15, annual_filter_cost_sgd: 10, power_consumption_w: 5 },
    lab_oven: { price_sgd: 25, max_temperature_c: 25, chamber_volume_l: 20, temperature_uniformity_c: 20, power_consumption_w: 10 },
  };
  const mandatoryOperatorsByCategory: Record<string, Record<string, string[]>> = {
    laptop: { price_sgd: ["lte"], ram_gb: ["gte"], storage_gb: ["gte"] },
    air_purifier: { price_sgd: ["lte"], cadr_m3h: ["gte"], coverage_m2: ["gte"] },
    lab_oven: { price_sgd: ["lte"], max_temperature_c: ["gte"], chamber_volume_l: ["gte"], electrical_profile: ["eq"] },
  };
  const supportedOrigins = new Set(["live_provider", "cached_provider", "prepared_fixture", "synthetic_fixture", "local_calculation"]);
  const supportedClaimStatuses = new Set(["manufacturer_reported", "retailer_reported", "third_party_reported", "user_supplied", "estimated", "calculated", "missing", "conflicting"]);
  const unsupportedClaimStatuses = new Set(["missing", "conflicting", "estimated"]);
  const rawInput = input as unknown as RecordValue;
  const category = typeof rawInput.category === "string" && criteriaByCategory[rawInput.category] ? rawInput.category : "laptop";
  const criteria = criteriaByCategory[category]!;
  const requirements = Array.isArray(rawInput.requirements) ? rawInput.requirements.filter((value): value is RecordValue => typeof value === "object" && value !== null && !Array.isArray(value)) : [];
  const products = Array.isArray(rawInput.products) ? rawInput.products : [];
  const preferredRequirements = requirements.filter((requirement) => requirement.kind === "preferred");

  const isRecord = (value: unknown): value is RecordValue => typeof value === "object" && value !== null && !Array.isArray(value);
  const isFiniteNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
  const round = (value: number): number => Math.round((value + Number.EPSILON) * 10_000) / 10_000;
  const clamp = (value: number): number => Math.max(0, Math.min(10, value));
  const actualScalar = (value: unknown): number | string | boolean | null => isFiniteNumber(value) || typeof value === "string" || typeof value === "boolean" ? value : null;
  const productIdFor = (product: RecordValue, sourceIndex: number): string => typeof product.id === "string" && product.id.trim() ? product.id : `product-${sourceIndex + 1}`;

  const candidateFor = (product: RecordValue, criterionKey: string, criterion: Criterion | undefined): Candidate => {
    if (!criterion) {
      return { value: null, unit: null, claimStatus: "missing", origin: null, valid: false };
    }
    if (criterionKey === "price_sgd") {
      const price = isRecord(product.price) ? product.price : null;
      const value = price?.amount;
      const unit = price?.currency;
      const valid = isFiniteNumber(value) && value > 0 && unit === "SGD";
      return { value: value ?? null, unit: unit ?? null, claimStatus: "manufacturer_reported", origin: "prepared_fixture", valid };
    }
    const specifications = isRecord(product.specifications) ? product.specifications : null;
    const specification = specifications && isRecord(specifications[criterionKey]) ? specifications[criterionKey] : null;
    const value = specification?.value ?? null;
    const unit = specification?.unit ?? null;
    const claimStatus = specification?.claimStatus ?? "missing";
    const origin = specification?.origin ?? null;
    const typeMatches = criterion.valueType === "number" ? isFiniteNumber(value) : criterion.valueType === "string" ? typeof value === "string" : typeof value === "boolean";
    const valid = value !== null && typeMatches && unit === criterion.unit && typeof origin === "string" && supportedOrigins.has(origin) && typeof claimStatus === "string" && supportedClaimStatuses.has(claimStatus) && !unsupportedClaimStatuses.has(claimStatus);
    return { value, unit, claimStatus, origin, valid };
  };

  const mandatoryCheckFor = (requirement: RecordValue, product: RecordValue): ScoringResult["rankedProducts"][number]["mandatoryChecks"][number] => {
    const criterionKey = typeof requirement.criterionKey === "string" ? requirement.criterionKey : "unknown-criterion";
    const criterion = criteria[criterionKey];
    const candidate = candidateFor(product, criterionKey, criterion);
    const target = requirement.target;
    const operator = requirement.operator;
    const targetMatches = criterion && target !== null && (criterion.valueType === "number" ? isFiniteNumber(target) : criterion.valueType === "string" ? typeof target === "string" : typeof target === "boolean");
    const allowedOperators = mandatoryOperatorsByCategory[category]?.[criterionKey] ?? [];
    const requirementIsKnown = Boolean(criterion && targetMatches && requirement.unit === criterion.unit && typeof operator === "string" && allowedOperators.includes(operator) && requirement.needsConfirmation !== true);
    let status: "pass" | "fail" | "unknown" = "unknown";
    if (requirementIsKnown && candidate.valid) {
      if (operator === "gte" && typeof candidate.value === "number" && typeof target === "number") status = candidate.value >= target ? "pass" : "fail";
      else if (operator === "lte" && typeof candidate.value === "number" && typeof target === "number") status = candidate.value <= target ? "pass" : "fail";
      else if (operator === "eq") status = candidate.value === target ? "pass" : "fail";
    }
    const id = typeof requirement.id === "string" && requirement.id.trim() ? requirement.id : criterionKey;
    const label = typeof requirement.label === "string" && requirement.label.trim() ? requirement.label : criterionKey;
    const message = status === "pass" ? `${id}: ${label} met.` : status === "fail" ? `${id}: ${label} not met.` : `${id}: ${label} is missing, invalid, conflicting, or needs confirmation.`;
    return {
      requirementId: id,
      criterionKey,
      status,
      actualValue: status === "unknown" && !candidate.valid ? null : actualScalar(candidate.value),
      unit: candidate.unit === criterion?.unit ? criterion.unit as OutputUnit : null,
      message,
    };
  };

  const evidenceCompletenessFor = (product: RecordValue): number => {
    const specifications = isRecord(product.specifications) ? Object.values(product.specifications).filter(isRecord) : [];
    const known = specifications.filter((specification) => specification.value !== null);
    if (known.length === 0) return 0;
    const evidence = Array.isArray(product.evidence) ? product.evidence.filter(isRecord) : [];
    const evidenceIds = new Set(evidence.map((record) => record.id).filter((id): id is string => typeof id === "string"));
    const complete = known.filter((specification) => typeof specification.claimStatus === "string" && !unsupportedClaimStatuses.has(specification.claimStatus) && Array.isArray(specification.evidenceIds) && specification.evidenceIds.length > 0 && specification.evidenceIds.every((id) => typeof id === "string" && evidenceIds.has(id)));
    return complete.length / known.length;
  };

  const suppliedWeights = isRecord(rawInput.preferredWeights) ? rawInput.preferredWeights : {};
  const suppliedByCriterion = new Map<string, number>();
  let suppliedTotal = 0;
  for (const requirement of preferredRequirements) {
    const criterionKey = typeof requirement.criterionKey === "string" ? requirement.criterionKey : "";
    const supplied = suppliedWeights[criterionKey];
    const weight = isFiniteNumber(supplied) && supplied >= 0 ? supplied : 0;
    suppliedByCriterion.set(criterionKey, weight);
    suppliedTotal += weight;
  }
  const defaults = defaultWeightsByCategory[category]!;
  const rawWeights = new Map<string, number>();
  for (const requirement of preferredRequirements) {
    const criterionKey = typeof requirement.criterionKey === "string" ? requirement.criterionKey : "";
    const criterion = criteria[criterionKey];
    const defaultWeight = defaults[criterionKey] ?? criterion?.defaultWeight ?? (isFiniteNumber(requirement.weight) && requirement.weight >= 0 ? requirement.weight : 0);
    rawWeights.set(criterionKey, suppliedTotal > 0 ? suppliedByCriterion.get(criterionKey) ?? 0 : defaultWeight);
  }
  const positiveWeightTotal = [...rawWeights.values()].reduce((sum, weight) => sum + (weight > 0 ? weight : 0), 0);
  const normalizedWeights = new Map<string, number>();
  for (const [criterionKey, weight] of rawWeights) {
    normalizedWeights.set(criterionKey, positiveWeightTotal > 0 && weight > 0 ? weight / positiveWeightTotal : 0);
  }

  const evaluations: Evaluation[] = products.map((productValue, sourceIndex) => {
    const product = isRecord(productValue) ? productValue : {};
    const productId = productIdFor(product, sourceIndex);
    const mandatoryRequirements = requirements.filter((requirement) => requirement.kind === "mandatory");
    const mandatoryChecks = mandatoryRequirements.map((requirement) => mandatoryCheckFor(requirement, product));
    const failures = mandatoryChecks.filter(({ status }) => status === "fail").map(({ message }) => message);
    const unknowns = mandatoryChecks.filter(({ status }) => status === "unknown").map(({ message }) => message);
    const qualification = failures.length > 0 ? "disqualified" : unknowns.length > 0 ? "needs_confirmation" : "qualified";
    const validPrice = candidateFor(product, "price_sgd", criteria.price_sgd).valid ? candidateFor(product, "price_sgd", criteria.price_sgd).value as number : null;
    return {
      product,
      productId,
      sourceIndex,
      qualification,
      failures,
      unknowns,
      mandatoryChecks,
      weightedScoreRaw: 0,
      evidenceCompleteness: evidenceCompletenessFor(product),
      validPrice,
      rankedProduct: {
        productId,
        qualification,
        mandatoryChecks,
        failures,
        unknowns,
        criterionScores: [],
        weightedScore: null,
        rank: null,
        onlyQualifyingOption: false,
        valueIndex: null,
      },
    };
  });

  const qualified = evaluations.filter((evaluation) => evaluation.qualification === "qualified");
  const scoreFor = (evaluation: Evaluation, requirement: RecordValue): { value: number | null; rawScore: number; missing: boolean } => {
    const criterionKey = typeof requirement.criterionKey === "string" ? requirement.criterionKey : "";
    const criterion = criteria[criterionKey];
    const candidate = candidateFor(evaluation.product, criterionKey, criterion);
    if (!criterion || !candidate.valid) return { value: null, rawScore: 0, missing: true };
    if (criterion.mode === "threshold") {
      const thresholdMet = candidate.value === true || (typeof candidate.value === "string" && candidate.value.length > 0);
      return { value: null, rawScore: thresholdMet ? 10 : 0, missing: false };
    }
    if (typeof candidate.value !== "number") return { value: null, rawScore: 0, missing: true };
    const knownValues = qualified.map((other) => candidateFor(other.product, criterionKey, criterion)).filter((other): other is Candidate & { value: number } => other.valid && typeof other.value === "number").map((other) => other.value);
    if (knownValues.length <= 1) return { value: candidate.value, rawScore: 10, missing: false };
    const minimum = Math.min(...knownValues);
    const maximum = Math.max(...knownValues);
    if (minimum === maximum) return { value: candidate.value, rawScore: 10, missing: false };
    const rawScore = criterion.mode === "higher_is_better" ? 10 * (candidate.value - minimum) / (maximum - minimum) : 10 * (maximum - candidate.value) / (maximum - minimum);
    return { value: candidate.value, rawScore: clamp(rawScore), missing: false };
  };

  const qualifiedCount = qualified.length;
  for (const evaluation of qualified) {
    let weightedScoreRaw = 0;
    const criterionScores = preferredRequirements.map((requirement) => {
      const criterionKey = typeof requirement.criterionKey === "string" ? requirement.criterionKey : "";
      const score = scoreFor(evaluation, requirement);
      const normalizedWeight = normalizedWeights.get(criterionKey) ?? 0;
      const weightedScore = score.rawScore * normalizedWeight;
      weightedScoreRaw += weightedScore;
      return {
        criterionKey: criterionKey || "unknown-criterion",
        value: score.value,
        rawScore: round(clamp(score.rawScore)),
        normalizedWeight: round(normalizedWeight),
        weightedScore: round(clamp(weightedScore)),
        missing: score.missing,
      };
    });
    evaluation.weightedScoreRaw = weightedScoreRaw;
    evaluation.rankedProduct = {
      ...evaluation.rankedProduct,
      criterionScores,
      weightedScore: round(clamp(weightedScoreRaw)),
      onlyQualifyingOption: qualifiedCount === 1,
    };
  }

  const compareQualified = (left: Evaluation, right: Evaluation): number => {
    if (left.weightedScoreRaw !== right.weightedScoreRaw) return left.weightedScoreRaw > right.weightedScoreRaw ? -1 : 1;
    if (left.evidenceCompleteness !== right.evidenceCompleteness) return left.evidenceCompleteness > right.evidenceCompleteness ? -1 : 1;
    if (left.validPrice !== null || right.validPrice !== null) {
      if (left.validPrice === null) return 1;
      if (right.validPrice === null) return -1;
      if (left.validPrice !== right.validPrice) return left.validPrice < right.validPrice ? -1 : 1;
    }
    const idComparison = asciiCompare(left.productId, right.productId);
    return idComparison !== 0 ? idComparison : left.sourceIndex - right.sourceIndex;
  };
  const orderedQualified = [...qualified].sort(compareQualified);
  orderedQualified.forEach((evaluation, index) => {
    evaluation.rankedProduct = { ...evaluation.rankedProduct, rank: index + 1 };
  });
  const rankByProductId = new Map(orderedQualified.map((evaluation) => [evaluation.productId, evaluation.rankedProduct.rank]));
  const rankedProducts = [...evaluations]
    .sort((left, right) => {
      const leftRank = rankByProductId.get(left.productId) ?? Number.POSITIVE_INFINITY;
      const rightRank = rankByProductId.get(right.productId) ?? Number.POSITIVE_INFINITY;
      return leftRank === rightRank ? left.sourceIndex - right.sourceIndex : leftRank - rightRank;
    })
    .map((evaluation) => evaluation.rankedProduct);
  const recommendedProductId = orderedQualified[0]?.productId ?? null;
  const warnings: string[] = [];
  if (qualified.length === 0) warnings.push("No product qualifies all mandatory requirements.");
  if (evaluations.some((evaluation) => evaluation.qualification === "needs_confirmation")) warnings.push("Some products need confirmation because mandatory values are missing or uncertain.");
  if (evaluations.some((evaluation) => evaluation.qualification === "disqualified")) warnings.push("Some products failed one or more mandatory requirements.");

  for (const rankedProduct of rankedProducts) {
    const evaluation = evaluations.find((candidate) => candidate.productId === rankedProduct.productId);
    if (!evaluation || evaluation.qualification !== "qualified") continue;
    const price = evaluation.validPrice;
    rankedProduct.valueIndex = price !== null && rankedProduct.weightedScore !== null ? round(rankedProduct.weightedScore * 1000 / price) : null;
  }

  return {
    version: "1.0.0",
    category: category as ScoringResult["category"],
    rankedProducts,
    recommendedProductId,
    noRecommendation: recommendedProductId === null,
    warnings,
  };
}
