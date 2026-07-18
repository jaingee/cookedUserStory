import { NextResponse } from "next/server";
import { z } from "zod";

import { productCategorySchema } from "@/lib/contracts";
import { syntheticAiandFixture } from "@/data/provider-fixtures/aiand/synthetic";
import { extractRequirements } from "@/lib/providers/aiand.server";

const requestSchema = z.object({
  description: z.string().trim().min(10).max(1000),
  categoryHint: productCategorySchema.optional(),
}).strict();

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed JSON." }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid requirements request." }, { status: 422 });

  try {
    const result = await extractRequirements(parsed.data.description, parsed.data.categoryHint, {
      cache: syntheticAiandFixture,
      cacheOrigin: "synthetic_fixture",
    });
    return NextResponse.json({ result }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
