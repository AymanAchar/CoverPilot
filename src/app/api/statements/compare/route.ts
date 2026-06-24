import { NextRequest, NextResponse } from "next/server";
import type { CompareRequest, CompareResponse } from "@/types";
import { checkCompliance } from "@/lib/compliance";
import { runCalculations } from "@/lib/calculations";
import { DEMO_COMPARISONS } from "@/data/demo-evidence";

export async function POST(req: NextRequest) {
  const body: CompareRequest = await req.json();
  const { facts, statements } = body;

  // Compliance firewall — check all statements before any processing
  for (const stmt of statements) {
    const result = checkCompliance(stmt.text);
    if (result.blocked) {
      const response: CompareResponse = {
        comparisons: [],
        calculations: [],
        blocked: true,
        blockReason: result.reason,
      };
      return NextResponse.json(response);
    }
  }

  let comparisons = DEMO_COMPARISONS;
  if (process.env.OPENAI_API_KEY) {
    try {
      const { compareStatementWithAI } = await import("@/lib/compare");
      // Run AI comparisons in parallel
      comparisons = await Promise.all(
        statements.map((stmt) => compareStatementWithAI(stmt, facts))
      );
    } catch (error) {
      console.warn(
        "AI comparison failed, falling back to seeded demo comparisons",
        error
      );
    }
  }

  const calculations = runCalculations(facts);

  const response: CompareResponse = {
    comparisons,
    calculations,
    blocked: false,
  };
  return NextResponse.json(response);
}
