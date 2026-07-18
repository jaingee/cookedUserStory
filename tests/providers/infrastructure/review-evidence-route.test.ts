import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { POST } from "@/app/api/review-evidence/route";

const validRequest = {
  category: "laptop",
  products: [{
    productId: "alpha",
    qualification: "qualified",
    unknownKeys: [],
    conflictingKeys: [],
    evidenceCount: 1,
  }],
};

describe("POST /api/review-evidence", () => {
  it("returns 400 for malformed JSON", async () => {
    const request = new Request("http://localhost/api/review-evidence", {
      method: "POST",
      body: "{",
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("returns 422 for an invalid request", async () => {
    const request = new Request("http://localhost/api/review-evidence", {
      method: "POST",
      body: JSON.stringify({ category: "not-supported" }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(422);
  });

  it("returns a provider envelope for a valid request", async () => {
    const request = new Request("http://localhost/api/review-evidence", {
      method: "POST",
      body: JSON.stringify(validRequest),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.result.provider).toBe("nosana");
    expect(["live", "cached", "fallback", "unavailable", "error"]).toContain(body.result.status);
  });
});
