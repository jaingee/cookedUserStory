import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  ASUS_ZENBOOK_PRODUCT_ID,
  OXYLABS_TARGETS,
  extractPlainTextExcerpt,
  isAllowedTargetUrl,
} from "@/lib/retrieval/oxylabs";
import { retrieveOxylabsProduct } from "@/lib/providers/oxylabs.server";

afterEach(() => vi.unstubAllEnvs());

function configuredEnv(): void {
  vi.stubEnv("OXYLABS_USERNAME", "customer-test");
  vi.stubEnv("OXYLABS_PASSWORD", "test-password");
  vi.stubEnv("OXYLABS_PROXY_URL", "http://proxy.example:7777");
  vi.stubEnv("OXYLABS_COUNTRY", "sg");
  vi.stubEnv("OXYLABS_TIMEOUT_MS", "100");
  vi.stubEnv("DEMO_PROVIDER_MODE", "auto");
}

describe("Oxylabs retrieval", () => {
  it("resolves the known product to the immutable HTTPS allowlist", () => {
    const target = OXYLABS_TARGETS["laptop-asus-zenbook-ux3405ma"];

    expect(target).toBe(
      "https://www.asus.com/sg/laptops/for-home/zenbook/asus-zenbook-14-oled-ux3405/techspec/",
    );
    expect(isAllowedTargetUrl(target)).toBe(true);
  });

  it("rejects non-HTTPS and unexpected-host targets", () => {
    expect(isAllowedTargetUrl("http://www.asus.com/example")).toBe(false);
    expect(isAllowedTargetUrl("https://evil.example/example")).toBe(false);
  });

  it("extracts bounded plain text without scripts or markup", () => {
    const excerpt = extractPlainTextExcerpt(
      "<html><style>.x{}</style><script>alert('ignore')</script><h1>Zenbook</h1><p>16 GB RAM &amp; 512 GB SSD</p></html>",
    );

    expect(excerpt).toBe("Zenbook 16 GB RAM & 512 GB SSD");
    expect(excerpt).not.toContain("alert");
    expect(excerpt).not.toContain("<");
  });

  it("returns a live provider envelope for the allowlisted product", async () => {
    configuredEnv();
    const result = await retrieveOxylabsProduct(ASUS_ZENBOOK_PRODUCT_ID, {
      fetchFn: async () => new Response("<h1>Zenbook</h1><p>16 GB RAM</p>", { status: 200 }),
    });

    expect(result.status).toBe("live");
    expect(result.origin).toBe("live_provider");
    expect(result.data?.sourceUrl).toBe(OXYLABS_TARGETS[ASUS_ZENBOOK_PRODUCT_ID]);
    expect(result.data?.excerpt).toBe("Zenbook 16 GB RAM");
    expect(result.data?.excerptSha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("rejects an unexpected redirect without leaking upstream details", async () => {
    configuredEnv();
    const result = await retrieveOxylabsProduct(ASUS_ZENBOOK_PRODUCT_ID, {
      fetchFn: async () =>
        new Response(null, {
          status: 302,
          headers: { location: "https://evil.example/collect" },
        }),
    });

    expect(result.status).toBe("fallback");
    expect(result.origin).toBe("synthetic_fixture");
    expect(result.errorCode).toBe("unsafe_url");
    expect(result.warning).toMatch(/Synthetic retrieval fixture used; live Oxylabs attempt failed:/);
    expect(JSON.stringify(result)).not.toContain("test-password");
    expect(JSON.stringify(result)).not.toContain("proxy.example");
  });

  it("rejects a response body over the 256 KB limit", async () => {
    configuredEnv();
    const result = await retrieveOxylabsProduct(ASUS_ZENBOOK_PRODUCT_ID, {
      fetchFn: async () => new Response("x".repeat(256 * 1024 + 1), { status: 200 }),
    });

    expect(result.status).toBe("fallback");
    expect(result.origin).toBe("synthetic_fixture");
    expect(result.errorCode).toBe("upstream_error");
  });

  it("rejects unknown product IDs before transport use", async () => {
    configuredEnv();
    const fetchFn = vi.fn(async () => new Response("should not fetch", { status: 200 }));

    const result = await retrieveOxylabsProduct("https://evil.example", { fetchFn });

    expect(result.status).toBe("unavailable");
    expect(result.errorCode).toBe("unsafe_url");
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("falls back to the synthetic fixture on timeout", async () => {
    configuredEnv();
    vi.stubEnv("OXYLABS_TIMEOUT_MS", "10");

    const result = await retrieveOxylabsProduct(ASUS_ZENBOOK_PRODUCT_ID, {
      fetchFn: () => new Promise<Response>(() => undefined),
    });

    expect(result.status).toBe("fallback");
    expect(result.origin).toBe("synthetic_fixture");
    expect(result.errorCode).toBe("timeout");
    expect(result.warning).toMatch(/Synthetic retrieval fixture used; live Oxylabs attempt failed:/);
  });

  it("uses the cache without transport in cache-only mode", async () => {
    configuredEnv();
    vi.stubEnv("DEMO_PROVIDER_MODE", "cache_only");
    const fetchFn = vi.fn(async () => new Response("should not fetch", { status: 200 }));

    const result = await retrieveOxylabsProduct(ASUS_ZENBOOK_PRODUCT_ID, { fetchFn });

    expect(result.status).toBe("fallback");
    expect(result.origin).toBe("synthetic_fixture");
    expect(result.warning).toBe("Synthetic retrieval fixture used; no valid live Oxylabs artifact was captured.");
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("accepts the legacy cache-only spelling without network access", async () => {
    configuredEnv();
    vi.stubEnv("DEMO_PROVIDER_MODE", "cache-only");
    const fetchFn = vi.fn(async () => new Response("should not fetch", { status: 200 }));

    const result = await retrieveOxylabsProduct("laptop-asus-zenbook-ux3405ma", { fetchFn });

    expect(result.status).toBe("fallback");
    expect(result.origin).toBe("synthetic_fixture");
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("falls back when live credentials are missing", async () => {
    const result = await retrieveOxylabsProduct(ASUS_ZENBOOK_PRODUCT_ID);

    expect(result.status).toBe("fallback");
    expect(result.origin).toBe("synthetic_fixture");
  });
});
