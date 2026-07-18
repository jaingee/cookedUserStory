import { createHash } from "node:crypto";

import { z } from "zod";

import type { ProviderErrorCode, ProviderResult } from "@/lib/contracts";

export const ASUS_ZENBOOK_PRODUCT_ID = "laptop-asus-zenbook-ux3405" as const;

const targetMap = {
  [ASUS_ZENBOOK_PRODUCT_ID]:
    "https://www.asus.com/sg/laptops/for-home/zenbook/asus-zenbook-14-oled-ux3405/techspec/",
} as const;

export const OXYLABS_TARGETS: Readonly<Record<string, string>> = Object.freeze(targetMap);
export const OXYLABS_ALLOWED_HOSTNAMES = Object.freeze(["www.asus.com"] as const);
export const MAX_RESPONSE_BYTES = 256 * 1024;
export const MAX_EXCERPT_CHARACTERS = 6_000;

export const retrievalArtifactSchema = z.object({
  productId: z.string().trim().min(1).max(100),
  sourceUrl: z.url().max(2_048),
  finalUrl: z.url().max(2_048),
  httpStatus: z.number().int().min(100).max(599),
  retrievedAt: z.iso.datetime({ offset: true }),
  excerpt: z.string().trim().min(1).max(MAX_EXCERPT_CHARACTERS),
  excerptSha256: z.string().regex(/^[a-f0-9]{64}$/),
});

export type RetrievalArtifact = z.infer<typeof retrievalArtifactSchema>;
export type OxylabsProviderResult = ProviderResult<RetrievalArtifact>;

export const retrieveRequestSchema = z
  .object({ productId: z.string().trim().min(1).max(100) })
  .strict();

export type RetrieveRequest = z.infer<typeof retrieveRequestSchema>;

export function isKnownProductId(productId: string): productId is keyof typeof targetMap {
  return Object.prototype.hasOwnProperty.call(targetMap, productId);
}

export function isAllowedTargetUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && OXYLABS_ALLOWED_HOSTNAMES.includes(url.hostname as (typeof OXYLABS_ALLOWED_HOSTNAMES)[number]);
  } catch {
    return false;
  }
}

export function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function decodeHtmlEntities(value: string): string {
  const namedEntities: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };

  return value
    .replace(/&#(x[\da-f]+|\d+);/gi, (_, code: string) => {
      const number = code.toLowerCase().startsWith("x")
        ? Number.parseInt(code.slice(1), 16)
        : Number.parseInt(code, 10);
      return Number.isFinite(number) ? String.fromCodePoint(number) : " ";
    })
    .replace(/&([a-z]+);/gi, (_, name: string) => namedEntities[name.toLowerCase()] ?? " ");
}

export function extractPlainTextExcerpt(html: string): string {
  const withoutUnsafeBlocks = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|template)\b[^>]*>[\s\S]*?<\/\1>/gi, " ");

  return decodeHtmlEntities(withoutUnsafeBlocks.replace(/<[^>]*>/g, " "))
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_EXCERPT_CHARACTERS)
    .trim();
}

export function makeRetrievalArtifact(input: Omit<RetrievalArtifact, "excerptSha256">): RetrievalArtifact {
  return retrievalArtifactSchema.parse({ ...input, excerptSha256: sha256(input.excerpt) });
}

export function unavailableResult(
  errorCode: ProviderErrorCode,
  warning: string,
): OxylabsProviderResult {
  return {
    provider: "oxylabs",
    status: "unavailable",
    origin: null,
    data: null,
    errorCode,
    warning,
  };
}
