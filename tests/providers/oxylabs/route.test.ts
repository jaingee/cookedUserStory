import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { POST } from "@/app/api/retrieve/route";

afterEach(() => vi.unstubAllEnvs());

describe("POST /api/retrieve", () => {
  it("returns 400 for malformed JSON", async () => {
    const response = await POST(new Request("http://localhost/api/retrieve", { body: "{", method: "POST" }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: { code: "invalid_json" } });
  });

  it("returns 422 when an arbitrary URL is supplied", async () => {
    const response = await POST(
      new Request("http://localhost/api/retrieve", {
        body: JSON.stringify({ productId: "laptop-asus-zenbook-ux3405ma", url: "https://evil.example" }),
        headers: { "content-type": "application/json" },
        method: "POST",
      }),
    );

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({ error: { code: "invalid_request" } });
  });

  it("returns 422 for an unknown product ID", async () => {
    const response = await POST(
      new Request("http://localhost/api/retrieve", {
        body: JSON.stringify({ productId: "unknown-product" }),
        headers: { "content-type": "application/json" },
        method: "POST",
      }),
    );

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({ error: { code: "unknown_product" } });
  });
});
