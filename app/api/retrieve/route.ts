import { NextResponse } from "next/server";

import { isKnownProductId, retrieveRequestSchema } from "@/lib/retrieval/oxylabs";
import { retrieveOxylabsProduct } from "@/lib/providers/oxylabs.server";

function routeError(code: "invalid_json" | "invalid_request" | "unknown_product" | "internal_error", status: number) {
  return NextResponse.json({ error: { code } }, { status });
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return routeError("invalid_json", 400);
  }

  const parsed = retrieveRequestSchema.safeParse(body);
  if (!parsed.success) {
    return routeError("invalid_request", 422);
  }
  if (!isKnownProductId(parsed.data.productId)) {
    return routeError("unknown_product", 422);
  }

  try {
    const result = await retrieveOxylabsProduct(parsed.data.productId);
    return NextResponse.json({ result }, { status: 200 });
  } catch {
    return routeError("internal_error", 500);
  }
}
