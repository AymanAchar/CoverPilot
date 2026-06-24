import { NextRequest, NextResponse } from "next/server";
import type { FinancialQuestionRequest } from "@/types";
import { answerFinancialQuestion } from "@/lib/financial-qa";
import { applyRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const rateLimited = applyRateLimit(req, {
    scope: "financial-question",
    limit: 60,
    windowMs: 60 * 60 * 1000,
  });
  if (rateLimited) return rateLimited;

  let body: FinancialQuestionRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.question?.trim()) {
    return NextResponse.json({ error: "Question is required" }, { status: 400 });
  }

  return NextResponse.json(
    answerFinancialQuestion(body.question, body.facts ?? [])
  );
}
