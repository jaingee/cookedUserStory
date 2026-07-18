import { z } from "zod";

export const productCategorySchema = z.enum([
  "laptop",
  "air_purifier",
  "lab_oven",
]);

export const providerNameSchema = z.enum([
  "aiand",
  "oxylabs",
  "doubleword",
  "daytona",
  "nosana",
]);

export const providerStatusSchema = z.enum([
  "live",
  "cached",
  "fallback",
  "unavailable",
  "error",
]);

export const dataOriginSchema = z.enum([
  "live_provider",
  "cached_provider",
  "prepared_fixture",
  "synthetic_fixture",
  "local_calculation",
]);

export const claimStatusSchema = z.enum([
  "manufacturer_reported",
  "retailer_reported",
  "third_party_reported",
  "user_supplied",
  "estimated",
  "calculated",
  "missing",
  "conflicting",
]);

export const qualificationStatusSchema = z.enum([
  "qualified",
  "disqualified",
  "needs_confirmation",
]);

export const providerErrorCodeSchema = z.enum([
  "not_configured",
  "timeout",
  "network_error",
  "upstream_error",
  "invalid_response",
  "cache_miss",
  "unsafe_url",
  "output_mismatch",
  "unavailable",
  "internal_error",
]);

export const requirementKindSchema = z.enum(["mandatory", "preferred"]);
export const requirementOperatorSchema = z.enum(["gte", "lte", "eq"]);
export const requirementSourceSchema = z.enum([
  "user",
  "ai_extracted",
  "category_default",
]);
export const valueTypeSchema = z.enum(["number", "string", "boolean"]);
export const scoringModeSchema = z.enum([
  "higher_is_better",
  "lower_is_better",
  "threshold",
]);
export const confidenceSchema = z.enum(["high", "medium", "low"]);
export const mandatoryCheckStatusSchema = z.enum(["pass", "fail", "unknown"]);

export const specUnitSchema = z.enum([
  "SGD",
  "GB",
  "h",
  "kg",
  "Geekbench 6 multicore points",
  "m3/h",
  "m2",
  "dB(A)",
  "SGD/year",
  "W",
  "°C",
  "L",
  "±°C",
  "electrical_profile",
]);
