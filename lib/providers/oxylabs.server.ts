import "server-only";

import { fetch as undiciFetch, ProxyAgent } from "undici";

import { providerResultSchema } from "@/lib/contracts";
import syntheticFixtureJson from "@/data/provider-fixtures/oxylabs/laptop-asus-zenbook-ux3405ma.json";
import {
  ASUS_ZENBOOK_PRODUCT_ID,
  MAX_RESPONSE_BYTES,
  OxylabsProviderResult,
  RetrievalArtifact,
  OXYLABS_TARGETS,
  extractPlainTextExcerpt,
  isAllowedTargetUrl,
  isKnownProductId,
  makeRetrievalArtifact,
  retrievalArtifactSchema,
  unavailableResult,
} from "@/lib/retrieval/oxylabs";
import type { ProviderErrorCode } from "@/lib/contracts";

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const MAX_REDIRECTS = 5;
const DEFAULT_USER_AGENT = "cookedUserStory/1.0 product-retrieval";

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface OxylabsRetrievalOptions {
  fetchFn?: FetchLike;
  now?: () => Date;
}

interface ProviderConfig {
  username: string;
  password: string;
  proxyUrl: string;
  country: string;
  timeoutMs: number;
  mode: "auto" | "cache_only";
  proxyUrlHasCredentials: boolean;
}

class RetrievalFailure extends Error {
  constructor(
    readonly code: ProviderErrorCode,
    readonly publicWarning: string,
  ) {
    super(publicWarning);
  }
}

function readMode(): ProviderConfig["mode"] {
  const mode = process.env.DEMO_PROVIDER_MODE?.trim().toLowerCase();
  return mode === "cache_only" || mode === "cache-only"
    ? "cache_only"
    : "auto";
}

function readConfig(): ProviderConfig | null {
  const username = process.env.OXYLABS_USERNAME?.trim();
  const password = process.env.OXYLABS_PASSWORD?.trim();
  const proxyUrl = process.env.OXYLABS_PROXY_URL?.trim();
  const country = process.env.OXYLABS_COUNTRY?.trim().toLowerCase();
  const timeoutMs = Number.parseInt(process.env.OXYLABS_TIMEOUT_MS ?? "", 10);

  if (!username || !password || !proxyUrl || !country || !Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 120_000) {
    return null;
  }

  try {
    const parsedProxyUrl = new URL(proxyUrl);
    if (
      !["http:", "https:", "socks:", "socks5:"].includes(parsedProxyUrl.protocol) ||
      !parsedProxyUrl.hostname ||
      !/^[a-z]{2}$/.test(country)
    ) {
      return null;
    }
    return {
      username,
      password,
      proxyUrl,
      country,
      timeoutMs,
      mode: readMode(),
      proxyUrlHasCredentials: Boolean(parsedProxyUrl.username && parsedProxyUrl.password),
    };
  } catch {
    return null;
  }
}

function validateSyntheticFixture(value: unknown): RetrievalArtifact | null {
  const parsed = retrievalArtifactSchema.safeParse(value);
  if (!parsed.success || parsed.data.productId !== ASUS_ZENBOOK_PRODUCT_ID) {
    return null;
  }

  const expectedSourceUrl = OXYLABS_TARGETS[ASUS_ZENBOOK_PRODUCT_ID];
  if (
    parsed.data.sourceUrl !== expectedSourceUrl ||
    !isAllowedTargetUrl(parsed.data.finalUrl) ||
    parsed.data.excerptSha256 !== digestForSyntheticFixture(parsed.data.excerpt)
  ) {
    return null;
  }

  return parsed.data;
}

function digestForSyntheticFixture(value: string): string {
  return makeRetrievalArtifact({
    productId: ASUS_ZENBOOK_PRODUCT_ID,
    sourceUrl: OXYLABS_TARGETS[ASUS_ZENBOOK_PRODUCT_ID],
    finalUrl: OXYLABS_TARGETS[ASUS_ZENBOOK_PRODUCT_ID],
    httpStatus: 200,
    retrievedAt: "2026-07-18T00:00:00.000Z",
    excerpt: value,
  }).excerptSha256;
}

function getSyntheticFixture(): RetrievalArtifact | null {
  return validateSyntheticFixture(syntheticFixtureJson);
}

function syntheticFallbackResult(): OxylabsProviderResult | null {
  const data = getSyntheticFixture();
  if (!data) {
    return null;
  }

  return providerResultSchema(retrievalArtifactSchema).parse({
    provider: "oxylabs",
    status: "fallback",
    origin: "synthetic_fixture",
    data,
    warning: "Synthetic retrieval fixture used; no valid live Oxylabs artifact was captured.",
  });
}

function failureResult(failure: RetrievalFailure): OxylabsProviderResult {
  return unavailableResult(failure.code, failure.publicWarning);
}

async function readResponseBody(response: Response): Promise<string> {
  if (!response.body) {
    const text = await response.text();
    if (new TextEncoder().encode(text).byteLength > MAX_RESPONSE_BYTES) {
      throw new RetrievalFailure("upstream_error", "Provider response exceeded the safe size limit.");
    }
    return text;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      totalBytes += next.value.byteLength;
      if (totalBytes > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        throw new RetrievalFailure("upstream_error", "Provider response exceeded the safe size limit.");
      }
      chunks.push(next.value);
    }
  } finally {
    reader.releaseLock();
  }

  return new TextDecoder().decode(Buffer.concat(chunks));
}

function getFailure(error: unknown): RetrievalFailure {
  if (error instanceof RetrievalFailure) return error;
  if (error instanceof DOMException && error.name === "AbortError") {
    return new RetrievalFailure("timeout", "Provider request timed out.");
  }
  return new RetrievalFailure("network_error", "Provider request failed.");
}

async function fetchWithTimeout(
  fetchFn: FetchLike,
  url: string,
  timeoutMs: number,
  dispatcher?: ProxyAgent,
): Promise<Response> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const request = fetchFn(url, {
    redirect: "manual",
    signal: controller.signal,
    headers: { accept: "text/html,application/xhtml+xml", "user-agent": DEFAULT_USER_AGENT },
    ...(dispatcher ? { dispatcher } : {}),
  } as RequestInit);
  const timeout = new Promise<Response>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new RetrievalFailure("timeout", "Provider request timed out."));
    }, timeoutMs);
  });

  try {
    return await Promise.race([request, timeout]);
  } catch (error) {
    throw getFailure(error);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function retrieveLive(
  config: ProviderConfig,
  sourceUrl: string,
  fetchFn: FetchLike,
  now: () => Date,
): Promise<RetrievalArtifact> {
  let currentUrl = sourceUrl;
  let response: Response | undefined;
  const proxyUsername = config.username.toLowerCase().includes("-cc-")
    ? config.username
    : `${config.username}-cc-${config.country}`;
  const dispatcher = new ProxyAgent({
    uri: config.proxyUrl,
    ...(config.proxyUrlHasCredentials
      ? {}
      : { token: `Basic ${Buffer.from(`${proxyUsername}:${config.password}`).toString("base64")}` }),
  });

  try {
    for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
      response = await fetchWithTimeout(fetchFn, currentUrl, config.timeoutMs, dispatcher);
      if (!REDIRECT_STATUSES.has(response.status)) break;

      const location = response.headers.get("location");
      if (!location) {
        throw new RetrievalFailure("upstream_error", "Provider returned an invalid redirect.");
      }

      let nextUrl: string;
      try {
        nextUrl = new URL(location, currentUrl).toString();
      } catch {
        throw new RetrievalFailure("unsafe_url", "Provider redirect was outside the approved source host.");
      }
      if (!isAllowedTargetUrl(nextUrl)) {
        throw new RetrievalFailure("unsafe_url", "Provider redirect was outside the approved source host.");
      }
      if (redirectCount === MAX_REDIRECTS) {
        throw new RetrievalFailure("upstream_error", "Provider returned too many redirects.");
      }
      currentUrl = nextUrl;
    }

    if (!response || response.status < 200 || response.status >= 300) {
      throw new RetrievalFailure("upstream_error", "Provider returned an unusable response.");
    }

    const excerpt = extractPlainTextExcerpt(await readResponseBody(response));
    if (!excerpt) {
      throw new RetrievalFailure("invalid_response", "Provider returned no usable text.");
    }

    return makeRetrievalArtifact({
      productId: ASUS_ZENBOOK_PRODUCT_ID,
      sourceUrl,
      finalUrl: currentUrl,
      httpStatus: response.status,
      retrievedAt: now().toISOString(),
      excerpt,
    });
  } finally {
    await dispatcher.close();
  }
}

export async function retrieveOxylabsProduct(
  productId: string,
  options: OxylabsRetrievalOptions = {},
): Promise<OxylabsProviderResult> {
  if (!isKnownProductId(productId)) {
    return failureResult(new RetrievalFailure("unsafe_url", "The requested product is not supported."));
  }

  const sourceUrl = OXYLABS_TARGETS[productId];
  if (!isAllowedTargetUrl(sourceUrl)) {
    return failureResult(new RetrievalFailure("unsafe_url", "The configured source is not approved."));
  }

  const config = readConfig();
  if (config?.mode === "cache_only") {
    return syntheticFallbackResult() ?? failureResult(new RetrievalFailure("cache_miss", "No synthetic retrieval fixture is available."));
  }

  if (!config) {
    return syntheticFallbackResult() ??
      failureResult(new RetrievalFailure("not_configured", "Live provider configuration is unavailable."));
  }

  const startedAt = Date.now();
  try {
    const data = await retrieveLive(
      config,
      sourceUrl,
      options.fetchFn ?? (undiciFetch as unknown as FetchLike),
      options.now ?? (() => new Date()),
    );
    return providerResultSchema(retrievalArtifactSchema).parse({
      provider: "oxylabs",
      status: "live",
      origin: "live_provider",
      data,
      durationMs: Date.now() - startedAt,
    });
  } catch (error) {
    const failure = getFailure(error);
    return syntheticFallbackResult() ?? failureResult(failure);
  }
}
