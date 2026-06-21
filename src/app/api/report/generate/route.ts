import { NextRequest, NextResponse } from "next/server";
import type { ReportRequest, ReportResponse } from "@/types";
import { COMPLIANCE_NOTICE } from "@/lib/compliance";

export async function POST(req: NextRequest) {
  const body: ReportRequest = await req.json();
  const { facts, comparisons, calculations } = body;

  const questionsForLicensedAdviser = [
    ...comparisons.map((c) => c.clarificationQuestion),
    "Can you confirm which values in this illustration are guaranteed and which are projected?",
    "What happens to this policy if I miss a premium payment?",
    "Are there any other charges or fees not shown in the policy illustration?",
  ].filter(Boolean);

  const response: ReportResponse = {
    report: {
      policySummary: facts,
      comparisons,
      calculations,
      questionsForLicensedAdviser,
      complianceNotice: COMPLIANCE_NOTICE,
    },
  };
  return NextResponse.json(response);
}
