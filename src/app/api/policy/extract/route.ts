import { NextRequest, NextResponse } from "next/server";
import type { ExtractRequest, ExtractResponse } from "@/types";
import { SEEDED_FACTS, SEEDED_POLICY_ID } from "@/data/seeded-policy";

export async function POST(req: NextRequest) {
  const body: ExtractRequest = await req.json();

  if (body.mode === "seeded" || body.policyId === SEEDED_POLICY_ID) {
    const response: ExtractResponse = { facts: SEEDED_FACTS };
    return NextResponse.json(response);
  }

  // Real PDF extraction placeholder — not needed for demo
  return NextResponse.json(
    { error: "Only seeded mode is supported in this build." },
    { status: 400 }
  );
}
