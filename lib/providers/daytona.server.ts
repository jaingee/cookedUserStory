import "server-only";

import { createHash } from "node:crypto";
import { Daytona } from "@daytona/sdk";
import { z } from "zod";

import {
  providerResultSchema,
  scoringInputSchema,
  scoringResultSchema,
  type ProviderResult,
  type ScoringInput,
  type ScoringResult,
} from "@/lib/contracts";

const digestSchema = z.string().regex(/^sha256:[0-9a-f]{64}$/);

export const daytonaVerificationRequestSchema = z.object({
  scorerSource: z.string().min(1).max(200_000),
  input: scoringInputSchema,
  expectedResult: scoringResultSchema,
  expectedEngineVersion: z.string().trim().min(1).max(100).optional(),
}).strict();

export type DaytonaVerificationRequest = z.infer<typeof daytonaVerificationRequestSchema>;

const comparisonSchema = z.object({
  engineVersion: z.boolean(),
  inputDigest: z.boolean(),
  normalizedWeights: z.boolean(),
  qualificationResults: z.boolean(),
  criterionScores: z.boolean(),
  weightedScores: z.boolean(),
  ranks: z.boolean(),
  recommendation: z.boolean(),
});

export const daytonaProofSchema = z.object({
  engineVersion: z.string().trim().min(1).max(100),
  inputDigest: digestSchema,
  expectedResultDigest: digestSchema,
  returnedResultDigest: digestSchema.nullable(),
  match: z.boolean(),
  comparisons: comparisonSchema,
  capturedAt: z.iso.datetime({ offset: true }),
  durationMs: z.number().finite().nonnegative(),
});

export type DaytonaProof = z.infer<typeof daytonaProofSchema>;
export type DaytonaVerificationResult = ProviderResult<DaytonaProof>;

export type DaytonaSandbox = {
  process: {
    codeRun: (code: string, params?: Record<string, unknown>, timeoutSeconds?: number) => Promise<unknown>;
  };
  delete: (timeoutMs?: number, wait?: boolean) => Promise<void>;
};

export type DaytonaClient = {
  create: (params: Record<string, unknown>) => Promise<DaytonaSandbox>;
};

export type DaytonaAdapterOptions = {
  env?: Record<string, string | undefined>;
  client?: DaytonaClient;
  now?: () => Date;
};

const daytonaResultProviderSchema = providerResultSchema(daytonaProofSchema);

const defaultTimeoutMs = 15_000;

class DaytonaTimeoutError extends Error {}

class DaytonaInvalidResponseError extends Error {}

function timeoutFrom(env: Record<string, string | undefined>): number {
  const parsed = Number(env.DAYTONA_TIMEOUT_MS ?? defaultTimeoutMs);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(Math.floor(parsed), 120_000) : defaultTimeoutMs;
}

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => compareAscii(left, right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableSerialize(entry)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function compareAscii(left: string, right: string): number {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

function digest(value: unknown): string {
  return `sha256:${createHash("sha256").update(stableSerialize(value)).digest("hex")}`;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new DaytonaTimeoutError()), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function sourceContractIssue(source: string): string | null {
  if (/\bimport\b/i.test(source)) return "Daytona scorer source must not contain imports.";
  if (/\brequire\s*\(/i.test(source)) return "Daytona scorer source must not call require().";
  if (/\bprocess\.env\b/i.test(source)) return "Daytona scorer source must not access process.env.";
  if (/\bfetch\s*\(/i.test(source)) return "Daytona scorer source must not call fetch().";
  if (!/\b(?:function\s+|(?:const|let|var)\s+)(?:scoreProducts|score|calculateScore)\b/.test(source)) {
    return "Daytona scorer source must define scoreProducts (legacy score aliases are accepted).";
  }
  return null;
}

function buildExecutionProgram(source: string, input: ScoringInput, inputDigest: string): string {
  return `
${source}
const __canonicalInput = ${JSON.stringify(input)};
const __scorer = typeof scoreProducts === "function"
  ? scoreProducts
  : typeof score === "function"
    ? score
    : typeof calculateScore === "function"
      ? calculateScore
      : null;
if (!__scorer) throw new Error("scorer function missing");
const __returned = await __scorer(__canonicalInput);
const __result = __returned && typeof __returned === "object" && "result" in __returned ? __returned.result : __returned;
const __engineVersion = __returned && typeof __returned === "object" && typeof __returned.engineVersion === "string"
  ? __returned.engineVersion
  : typeof ENGINE_VERSION === "string" ? ENGINE_VERSION : "1.0.0";
console.log(JSON.stringify({ engineVersion: __engineVersion, inputDigest: ${JSON.stringify(inputDigest)}, result: __result }));
`;
}

function outputText(raw: unknown): string {
  if (typeof raw === "string") return raw;
  if (!raw || typeof raw !== "object") return "";
  const response = raw as Record<string, unknown>;
  const artifacts = response.artifacts;
  if (artifacts && typeof artifacts === "object" && typeof (artifacts as Record<string, unknown>).stdout === "string") {
    return (artifacts as Record<string, unknown>).stdout as string;
  }
  if (typeof response.result === "string") return response.result;
  return "";
}

type ParsedDaytonaOutput = {
  engineVersion: string;
  inputDigest: string;
  result: ScoringResult;
};

function parseDaytonaOutput(raw: unknown, fallbackInputDigest: string): ParsedDaytonaOutput {
  const text = outputText(raw).trim();
  const candidates = [text, ...text.split(/\r?\n/).reverse()];
  let parsed: unknown;
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      parsed = JSON.parse(candidate);
      break;
    } catch {
      // Try the next line without retaining provider output.
    }
  }
  if (!parsed || typeof parsed !== "object") throw new DaytonaInvalidResponseError();
  const envelope = parsed as Record<string, unknown>;
  const candidateResult = envelope.result ?? envelope.scoringResult ?? parsed;
  const validatedResult = scoringResultSchema.safeParse(candidateResult);
  if (!validatedResult.success) throw new DaytonaInvalidResponseError();
  const engineVersion = typeof envelope.engineVersion === "string" && envelope.engineVersion.trim()
    ? envelope.engineVersion.trim()
    : "1.0.0";
  const returnedInputDigest = typeof envelope.inputDigest === "string" && digestSchema.safeParse(envelope.inputDigest).success
    ? envelope.inputDigest
    : fallbackInputDigest;
  return { engineVersion, inputDigest: returnedInputDigest, result: validatedResult.data };
}

function normalizedWeights(result: ScoringResult): Record<string, number> {
  return Object.fromEntries(result.rankedProducts
    .flatMap((product) => product.criterionScores.map((score) => [
      `${product.productId}:${score.criterionKey}`,
      score.normalizedWeight,
    ] as const))
    .sort(([left], [right]) => compareAscii(left, right)));
}

function qualificationResults(result: ScoringResult): Record<string, string> {
  return Object.fromEntries(result.rankedProducts
    .map((product) => [product.productId, product.qualification] as const)
    .sort(([left], [right]) => compareAscii(left, right)));
}

function criterionScores(result: ScoringResult): unknown[] {
  return result.rankedProducts
    .flatMap((product) => product.criterionScores.map((score) => ({ productId: product.productId, ...score })))
    .sort((left, right) => compareAscii(`${left.productId}:${left.criterionKey}`, `${right.productId}:${right.criterionKey}`));
}

function weightedScores(result: ScoringResult): Record<string, number | null> {
  return Object.fromEntries(result.rankedProducts
    .map((product) => [product.productId, product.weightedScore] as const)
    .sort(([left], [right]) => compareAscii(left, right)));
}

function ranks(result: ScoringResult): Record<string, number | null> {
  return Object.fromEntries(result.rankedProducts
    .map((product) => [product.productId, product.rank] as const)
    .sort(([left], [right]) => compareAscii(left, right)));
}

function compareResults(
  expected: ScoringResult,
  returned: ParsedDaytonaOutput,
  expectedEngineVersion: string,
  expectedInputDigest: string,
): DaytonaProof["comparisons"] {
  return {
    engineVersion: returned.engineVersion === expectedEngineVersion,
    inputDigest: returned.inputDigest === expectedInputDigest,
    normalizedWeights: stableSerialize(normalizedWeights(expected)) === stableSerialize(normalizedWeights(returned.result)),
    qualificationResults: stableSerialize(qualificationResults(expected)) === stableSerialize(qualificationResults(returned.result)),
    criterionScores: stableSerialize(criterionScores(expected)) === stableSerialize(criterionScores(returned.result)),
    weightedScores: stableSerialize(weightedScores(expected)) === stableSerialize(weightedScores(returned.result)),
    ranks: stableSerialize(ranks(expected)) === stableSerialize(ranks(returned.result)),
    recommendation: expected.recommendedProductId === returned.result.recommendedProductId
      && expected.noRecommendation === returned.result.noRecommendation,
  };
}

function allComparisonsMatch(comparisons: DaytonaProof["comparisons"]): boolean {
  return Object.values(comparisons).every(Boolean);
}

function localFallback(
  request: DaytonaVerificationRequest,
  errorCode: "not_configured" | "timeout" | "network_error" | "upstream_error" | "invalid_response" | "output_mismatch" | "unavailable" | "unsafe_url",
  warning: string,
  durationMs: number,
  now: Date,
  returnedResultDigest: string | null = null,
  comparisons: DaytonaProof["comparisons"] = {
    engineVersion: false,
    inputDigest: false,
    normalizedWeights: false,
    qualificationResults: false,
    criterionScores: false,
    weightedScores: false,
    ranks: false,
    recommendation: false,
  },
): DaytonaVerificationResult {
  const parsed = daytonaVerificationRequestSchema.parse(request);
  const proof: DaytonaProof = {
    engineVersion: parsed.expectedEngineVersion ?? "1.0.0",
    inputDigest: digest(parsed.input),
    expectedResultDigest: digest(parsed.expectedResult),
    returnedResultDigest,
    match: false,
    comparisons,
    capturedAt: now.toISOString(),
    durationMs,
  };
  return daytonaResultProviderSchema.parse({
    provider: "daytona",
    status: "fallback",
    origin: "local_calculation",
    data: proof,
    durationMs,
    warning,
    errorCode,
  });
}

function errorResult(errorCode: "invalid_response" | "internal_error", warning: string, durationMs: number): DaytonaVerificationResult {
  return daytonaResultProviderSchema.parse({
    provider: "daytona",
    status: "error",
    origin: null,
    data: null,
    durationMs,
    warning,
    errorCode,
  });
}

function makeClient(env: Record<string, string | undefined>): DaytonaClient {
  return new Daytona({
    apiKey: env.DAYTONA_API_KEY,
    apiUrl: env.DAYTONA_API_URL,
    target: env.DAYTONA_TARGET,
    otelEnabled: false,
  }) as unknown as DaytonaClient;
}

function cleanApiUrl(value: string | undefined): string | undefined | null {
  const raw = value?.trim();
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) return null;
    url.pathname = url.pathname.replace(/\/+$/, "") || "/";
    return url.toString();
  } catch {
    return null;
  }
}

function classifyDaytonaFailure(error: unknown): { errorCode: "network_error" | "upstream_error" | "invalid_response"; warning: string } {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (/401|403|unauthori[sz]ed|forbidden|api.?key|authentication/.test(message)) {
    return { errorCode: "upstream_error", warning: "Daytona authentication failed; local calculation remains authoritative." };
  }
  if (/target/.test(message)) {
    return { errorCode: "upstream_error", warning: "Daytona target configuration was rejected; local calculation remains authoritative." };
  }
  if (/code.?run|execution|process/.test(message)) {
    return { errorCode: "network_error", warning: "Daytona sandbox code execution failed; local calculation remains authoritative." };
  }
  if (/sandbox|create/.test(message)) {
    return { errorCode: "network_error", warning: "Daytona sandbox creation failed; local calculation remains authoritative." };
  }
  return { errorCode: "network_error", warning: "Daytona was unavailable; local calculation remains authoritative." };
}

export async function verifyScoringWithDaytona(
  request: unknown,
  options: DaytonaAdapterOptions = {},
): Promise<DaytonaVerificationResult> {
  const startedAt = Date.now();
  const now = options.now ?? (() => new Date());
  const env = options.env ?? process.env;
  const validated = daytonaVerificationRequestSchema.safeParse(request);
  if (!validated.success) return errorResult("invalid_response", "Daytona verification request was invalid.", Date.now() - startedAt);
  const parsed = validated.data;
  const timeoutMs = timeoutFrom(env);
  const inputDigest = digest(parsed.input);
  const expectedResultDigest = digest(parsed.expectedResult);
  const expectedEngineVersion = parsed.expectedEngineVersion ?? "1.0.0";
  const contractIssue = sourceContractIssue(parsed.scorerSource);
  if (contractIssue) {
    return localFallback(parsed, "invalid_response", `${contractIssue} Local calculation remains authoritative.`, Date.now() - startedAt, now());
  }
  const demoMode = (env.DEMO_PROVIDER_MODE ?? "").trim().toLowerCase();
  if (["cache_only", "cache-only", "offline"].includes(demoMode)) {
    return localFallback(parsed, "not_configured", "Daytona verification was skipped; local calculation remains authoritative.", Date.now() - startedAt, now());
  }
  if (!env.DAYTONA_API_KEY) {
    return localFallback(parsed, "not_configured", "Daytona is not configured; local calculation remains authoritative.", Date.now() - startedAt, now());
  }
  const apiUrl = cleanApiUrl(env.DAYTONA_API_URL);
  if (apiUrl === null) {
    return localFallback(parsed, "unsafe_url", "Daytona API URL must be a clean HTTPS URL; local calculation remains authoritative.", Date.now() - startedAt, now());
  }

  let sandbox: DaytonaSandbox | undefined;
  try {
    const client = options.client ?? makeClient({ ...env, DAYTONA_API_URL: apiUrl });
    sandbox = await withTimeout(client.create({
      language: "typescript",
      ephemeral: true,
      autoDeleteInterval: 0,
      networkBlockAll: true,
      public: false,
      target: env.DAYTONA_TARGET,
      labels: { purpose: "scoring-verification" },
    }), timeoutMs);
    const raw = await withTimeout(
      sandbox.process.codeRun(buildExecutionProgram(parsed.scorerSource, parsed.input, inputDigest), {}, Math.max(1, Math.ceil(timeoutMs / 1000))),
      timeoutMs,
    );
    const returned = parseDaytonaOutput(raw, inputDigest);
    const comparisons = compareResults(parsed.expectedResult, returned, expectedEngineVersion, inputDigest);
    const match = allComparisonsMatch(comparisons);
    const proof: DaytonaProof = {
      engineVersion: returned.engineVersion,
      inputDigest,
      expectedResultDigest,
      returnedResultDigest: digest(returned.result),
      match,
      comparisons,
      capturedAt: now().toISOString(),
      durationMs: Date.now() - startedAt,
    };
    return daytonaResultProviderSchema.parse({
      provider: "daytona",
      status: match ? "live" : "fallback",
      origin: match ? "live_provider" : "local_calculation",
      data: proof,
      durationMs: proof.durationMs,
      ...(match ? {} : {
        warning: "Daytona returned OUTPUT_MISMATCH; local calculation remains authoritative and Daytona did not replace it.",
        errorCode: "output_mismatch",
      }),
    });
  } catch (error: unknown) {
    if (error instanceof DaytonaTimeoutError) {
      return localFallback(parsed, "timeout", "Daytona timed out; local calculation remains authoritative.", Date.now() - startedAt, now());
    }
    if (error instanceof DaytonaInvalidResponseError) {
      return localFallback(parsed, "invalid_response", "Daytona returned an invalid scoring result; local calculation remains authoritative.", Date.now() - startedAt, now());
    }
    const failure = sandbox
      ? { errorCode: "network_error" as const, warning: "Daytona sandbox code execution failed; local calculation remains authoritative." }
      : classifyDaytonaFailure(error);
    return localFallback(parsed, failure.errorCode, failure.warning, Date.now() - startedAt, now());
  } finally {
    if (sandbox) {
      try {
        await withTimeout(sandbox.delete(timeoutMs, true), timeoutMs);
      } catch {
        // Cleanup is best effort and never exposes provider errors.
      }
    }
  }
}

export const verifyWithDaytona = verifyScoringWithDaytona;
