import { z } from "zod";

import {
  claimStatusSchema,
  confidenceSchema,
  dataOriginSchema,
  mandatoryCheckStatusSchema,
  productCategorySchema,
  providerErrorCodeSchema,
  providerNameSchema,
  providerStatusSchema,
  qualificationStatusSchema,
  requirementKindSchema,
  requirementOperatorSchema,
  requirementSourceSchema,
  scoringModeSchema,
  specUnitSchema,
  valueTypeSchema,
} from "./enums";

const finiteNumberSchema = z.number().finite();
const nonNegativeFiniteNumberSchema = finiteNumberSchema.nonnegative();
const identifierSchema = z.string().trim().min(1).max(100);
const labelSchema = z.string().trim().min(1).max(160);
const scalarValueSchema = z.union([
  finiteNumberSchema,
  z.string().trim().min(1).max(200),
  z.boolean(),
]);

export const providerResultSchema = <TData>(dataSchema: z.ZodType<TData>) =>
  z
    .object({
      provider: providerNameSchema,
      status: providerStatusSchema,
      origin: dataOriginSchema,
      data: dataSchema.nullable(),
      durationMs: nonNegativeFiniteNumberSchema.optional(),
      warning: z.string().trim().min(1).max(500).optional(),
      errorCode: providerErrorCodeSchema.optional(),
    })
    .superRefine((result, context) => {
      if (result.status === "live" && result.origin !== "live_provider") {
        context.addIssue({
          code: "custom",
          path: ["origin"],
          message: "Live provider results must use live_provider origin.",
        });
      }

      if (result.status === "cached" && result.origin !== "cached_provider") {
        context.addIssue({
          code: "custom",
          path: ["origin"],
          message: "Cached provider results must use cached_provider origin.",
        });
      }

      if (["unavailable", "error"].includes(result.status) && result.data !== null) {
        context.addIssue({
          code: "custom",
          path: ["data"],
          message: "Unavailable and error results cannot contain provider data.",
        });
      }
    });

export const requirementSchema = z
  .object({
    id: identifierSchema,
    criterionKey: identifierSchema,
    label: labelSchema,
    kind: requirementKindSchema,
    operator: requirementOperatorSchema.nullable(),
    target: scalarValueSchema.nullable(),
    unit: specUnitSchema.nullable(),
    weight: nonNegativeFiniteNumberSchema,
    source: requirementSourceSchema,
    needsConfirmation: z.boolean(),
  })
  .superRefine((requirement, context) => {
    if (requirement.kind === "mandatory") {
      if (requirement.operator === null) {
        context.addIssue({ code: "custom", path: ["operator"], message: "Mandatory requirements need an operator." });
      }
      if (requirement.target === null) {
        context.addIssue({ code: "custom", path: ["target"], message: "Mandatory requirements need a target." });
      }
      if (requirement.weight !== 0) {
        context.addIssue({ code: "custom", path: ["weight"], message: "Mandatory requirements must have zero weight." });
      }
    } else {
      if (requirement.operator !== null || requirement.target !== null) {
        context.addIssue({
          code: "custom",
          path: ["operator"],
          message: "Preferred requirements are scored by category mode and do not carry a threshold.",
        });
      }
    }
  });

export const evidenceRecordSchema = z.object({
  id: identifierSchema,
  sourceUrl: z.url().max(2_048).nullable(),
  sourceTitle: labelSchema,
  retrievedAt: z.iso.datetime({ offset: true }),
  excerpt: z.string().trim().min(1).max(2_000),
  origin: dataOriginSchema,
  claimStatus: claimStatusSchema,
});

export const specValueSchema = z.object({
  value: scalarValueSchema.nullable(),
  unit: specUnitSchema.nullable(),
  origin: dataOriginSchema,
  claimStatus: claimStatusSchema,
  confidence: confidenceSchema,
  evidenceIds: z.array(identifierSchema).max(20),
});

export const moneySchema = z.object({
  amount: nonNegativeFiniteNumberSchema.nullable(),
  currency: z.literal("SGD"),
});

export const productRecordSchema = z
  .object({
    id: identifierSchema,
    category: productCategorySchema,
    manufacturer: labelSchema,
    model: labelSchema,
    displayName: labelSchema,
    productUrl: z.url().max(2_048).nullable(),
    price: moneySchema,
    specifications: z.record(identifierSchema, specValueSchema),
    evidence: z.array(evidenceRecordSchema).max(50),
  })
  .superRefine((product, context) => {
    const evidenceIds = new Set(product.evidence.map(({ id }) => id));
    if (evidenceIds.size !== product.evidence.length) {
      context.addIssue({ code: "custom", path: ["evidence"], message: "Evidence IDs must be unique." });
    }

    for (const [key, specification] of Object.entries(product.specifications)) {
      for (const evidenceId of specification.evidenceIds) {
        if (!evidenceIds.has(evidenceId)) {
          context.addIssue({
            code: "custom",
            path: ["specifications", key, "evidenceIds"],
            message: `Unknown evidence ID: ${evidenceId}`,
          });
        }
      }
    }
  });

export const criterionConfigSchema = z
  .object({
    key: identifierSchema,
    label: labelSchema,
    valueType: valueTypeSchema,
    unit: specUnitSchema,
    supportedRequirementKinds: z.array(requirementKindSchema).min(1).max(2),
    allowedMandatoryOperators: z.array(requirementOperatorSchema).max(3),
    scoringMode: scoringModeSchema,
    defaultWeight: nonNegativeFiniteNumberSchema,
  })
  .superRefine((criterion, context) => {
    if (new Set(criterion.supportedRequirementKinds).size !== criterion.supportedRequirementKinds.length) {
      context.addIssue({ code: "custom", path: ["supportedRequirementKinds"], message: "Requirement kinds must be unique." });
    }
    if (new Set(criterion.allowedMandatoryOperators).size !== criterion.allowedMandatoryOperators.length) {
      context.addIssue({ code: "custom", path: ["allowedMandatoryOperators"], message: "Mandatory operators must be unique." });
    }

    const supportsMandatory = criterion.supportedRequirementKinds.includes("mandatory");
    const supportsPreferred = criterion.supportedRequirementKinds.includes("preferred");
    if (supportsMandatory !== (criterion.allowedMandatoryOperators.length > 0)) {
      context.addIssue({
        code: "custom",
        path: ["allowedMandatoryOperators"],
        message: "Mandatory support and allowed mandatory operators must agree.",
      });
    }
    if (!supportsPreferred && criterion.defaultWeight !== 0) {
      context.addIssue({
        code: "custom",
        path: ["defaultWeight"],
        message: "Criteria without preferred support must have zero default weight.",
      });
    }
    if (criterion.valueType !== "number" && criterion.scoringMode !== "threshold") {
      context.addIssue({
        code: "custom",
        path: ["scoringMode"],
        message: "String and boolean criteria support threshold scoring only.",
      });
    }
  });

export const categoryConfigSchema = z
  .object({
    category: productCategorySchema,
    label: labelSchema,
    examplePrompt: z.string().trim().min(1).max(500),
    criteria: z.array(criterionConfigSchema).min(1),
    defaultRequirements: z.array(requirementSchema).min(1),
  })
  .superRefine((config, context) => {
    const criterionByKey = new Map(config.criteria.map((criterion) => [criterion.key, criterion]));
    if (criterionByKey.size !== config.criteria.length) {
      context.addIssue({ code: "custom", path: ["criteria"], message: "Criterion keys must be unique." });
    }

    const requirementIds = new Set<string>();
    for (const [index, requirement] of config.defaultRequirements.entries()) {
      if (requirementIds.has(requirement.id)) {
        context.addIssue({ code: "custom", path: ["defaultRequirements", index, "id"], message: "Requirement IDs must be unique." });
      }
      requirementIds.add(requirement.id);

      const criterion = criterionByKey.get(requirement.criterionKey);
      if (!criterion) {
        context.addIssue({ code: "custom", path: ["defaultRequirements", index, "criterionKey"], message: "Requirement criterion does not exist." });
        continue;
      }
      if (!criterion.supportedRequirementKinds.includes(requirement.kind)) {
        context.addIssue({ code: "custom", path: ["defaultRequirements", index, "kind"], message: "Requirement kind is not supported by its criterion." });
      }
      if (requirement.kind === "mandatory" && requirement.operator !== null && !criterion.allowedMandatoryOperators.includes(requirement.operator)) {
        context.addIssue({ code: "custom", path: ["defaultRequirements", index, "operator"], message: "Mandatory operator is not allowed for its criterion." });
      }
      if (requirement.unit !== criterion.unit) {
        context.addIssue({ code: "custom", path: ["defaultRequirements", index, "unit"], message: "Requirement and criterion units must match." });
      }
      if (requirement.kind === "preferred" && requirement.weight !== criterion.defaultWeight) {
        context.addIssue({ code: "custom", path: ["defaultRequirements", index, "weight"], message: "Preferred default weight must match its criterion." });
      }
    }
  });

export const mandatoryCheckSchema = z.object({
  requirementId: identifierSchema,
  criterionKey: identifierSchema,
  status: mandatoryCheckStatusSchema,
  actualValue: scalarValueSchema.nullable(),
  unit: specUnitSchema.nullable(),
  message: z.string().trim().min(1).max(500),
});

export const criterionScoreSchema = z.object({
  criterionKey: identifierSchema,
  value: finiteNumberSchema.nullable(),
  rawScore: finiteNumberSchema.min(0).max(10),
  normalizedWeight: finiteNumberSchema.min(0).max(1),
  weightedScore: finiteNumberSchema.min(0).max(10),
  missing: z.boolean(),
});

export const rankedProductSchema = z.object({
  productId: identifierSchema,
  qualification: qualificationStatusSchema,
  mandatoryChecks: z.array(mandatoryCheckSchema),
  failures: z.array(z.string().trim().min(1).max(500)),
  unknowns: z.array(z.string().trim().min(1).max(500)),
  criterionScores: z.array(criterionScoreSchema),
  weightedScore: finiteNumberSchema.min(0).max(10).nullable(),
  rank: z.number().int().positive().nullable(),
  onlyQualifyingOption: z.boolean(),
});

export const scoringInputSchema = z.object({
  version: z.literal("1.0.0"),
  category: productCategorySchema,
  requirements: z.array(requirementSchema).min(1),
  products: z.array(productRecordSchema).length(3),
  preferredWeights: z.record(identifierSchema, nonNegativeFiniteNumberSchema),
});

export const scoringResultSchema = z.object({
  version: z.literal("1.0.0"),
  category: productCategorySchema,
  rankedProducts: z.array(rankedProductSchema),
  recommendedProductId: identifierSchema.nullable(),
  noRecommendation: z.boolean(),
  warnings: z.array(z.string().trim().min(1).max(500)),
});
