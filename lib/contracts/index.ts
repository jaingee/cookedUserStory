import type { z } from "zod";

export * from "./enums";
export * from "./schemas";

import {
  categoryConfigSchema,
  criterionConfigSchema,
  criterionScoreSchema,
  evidenceRecordSchema,
  mandatoryCheckSchema,
  productRecordSchema,
  providerResultSchema,
  rankedProductSchema,
  requirementSchema,
  scoringInputSchema,
  scoringResultSchema,
  specValueSchema,
} from "./schemas";
import {
  claimStatusSchema,
  dataOriginSchema,
  productCategorySchema,
  providerErrorCodeSchema,
  providerNameSchema,
  providerStatusSchema,
  qualificationStatusSchema,
} from "./enums";

export type ProductCategory = z.infer<typeof productCategorySchema>;
export type ProviderName = z.infer<typeof providerNameSchema>;
export type ProviderStatus = z.infer<typeof providerStatusSchema>;
export type DataOrigin = z.infer<typeof dataOriginSchema>;
export type ClaimStatus = z.infer<typeof claimStatusSchema>;
export type QualificationStatus = z.infer<typeof qualificationStatusSchema>;
export type ProviderErrorCode = z.infer<typeof providerErrorCodeSchema>;
export type ProviderResult<TData> = z.output<ReturnType<typeof providerResultSchema<TData>>>;
export type Requirement = z.infer<typeof requirementSchema>;
export type EvidenceRecord = z.infer<typeof evidenceRecordSchema>;
export type SpecValue = z.infer<typeof specValueSchema>;
export type ProductRecord = z.infer<typeof productRecordSchema>;
export type CriterionConfig = z.infer<typeof criterionConfigSchema>;
export type CategoryConfig = z.infer<typeof categoryConfigSchema>;
export type MandatoryCheck = z.infer<typeof mandatoryCheckSchema>;
export type CriterionScore = z.infer<typeof criterionScoreSchema>;
export type RankedProduct = z.infer<typeof rankedProductSchema>;
export type ScoringInput = z.infer<typeof scoringInputSchema>;
export type ScoringResult = z.infer<typeof scoringResultSchema>;
