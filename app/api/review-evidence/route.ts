import { NextResponse } from "next/server";

import {
  evidenceReviewRequestSchema,
  reviewEvidenceWithNosana,
} from "@/lib/providers/nosana.server";

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed JSON." }, { status: 400 });
  }

  const parsed = evidenceReviewRequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid evidence review request." }, { status: 422 });

  try {
    const result = await reviewEvidenceWithNosana(parsed.data);
    return NextResponse.json({ result }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Evidence review failed." }, { status: 500 });
  }
}
