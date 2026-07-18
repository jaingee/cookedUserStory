import { NextResponse } from "next/server";
import { z } from "zod";

import { syntheticDoublewordFixture } from "@/data/provider-fixtures/doubleword/synthetic";
import { extractClaims, retrievalArtifactSchema } from "@/lib/providers/doubleword.server";

const requestSchema = z.object({ artifact: retrievalArtifactSchema }).strict();

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed JSON." }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid extraction request." }, { status: 422 });

  try {
    const cache = parsed.data.artifact.productId === syntheticDoublewordFixture.productId ? syntheticDoublewordFixture : undefined;
    const result = await extractClaims(parsed.data.artifact, { cache, cacheOrigin: "synthetic_fixture" });
    return NextResponse.json({ result }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
