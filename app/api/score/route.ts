import { NextResponse } from "next/server";
import { z } from "zod";

import {
  productCategorySchema,
  requirementSchema,
  scoringInputSchema,
  scoringResultSchema,
  type ScoringInput,
} from "@/lib/contracts";
import { loadProductsForCategory } from "@/lib/domain/products";
import { buildStandaloneScorerSource, scoreProducts } from "@/lib/scoring/score-products";
import { verifyScoringWithDaytona } from "@/lib/providers/daytona.server";

const requestSchema = z.object({
  category: productCategorySchema,
  requirements: z.array(requirementSchema).min(1),
  preferredWeights: z.record(z.string().trim().min(1), z.number().finite().nonnegative()),
}).strict();

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed JSON." }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid scoring request." }, { status: 422 });

  try {
    const products = loadProductsForCategory(parsed.data.category);
    const scoringInput: ScoringInput = scoringInputSchema.parse({
      version: "1.0.0",
      category: parsed.data.category,
      requirements: parsed.data.requirements,
      products,
      preferredWeights: parsed.data.preferredWeights,
    });
    const result = scoringResultSchema.parse(scoreProducts(scoringInput));
    const scorerSource = buildStandaloneScorerSource();
    const sourceUsable = /\bscoreProducts\b/.test(scorerSource)
      && !/\bimport\b|\brequire\s*\(|\bprocess\.env\b|\bfetch\s*\(/i.test(scorerSource);
    const verification = await verifyScoringWithDaytona({
      scorerSource: sourceUsable ? scorerSource : "function scoreProducts() { throw new Error('unusable scorer source'); }",
      input: scoringInput,
      expectedResult: result,
      expectedEngineVersion: "1.0.0",
    });
    return NextResponse.json({ products, result, verification }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "The local scoring invariant failed." }, { status: 500 });
  }
}
