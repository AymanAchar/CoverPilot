import { NextRequest, NextResponse } from "next/server";
import type { CompareRequest, CompareResponse, SourceComparison } from "@/types";
import { checkCompliance } from "@/lib/compliance";
import { runCalculations } from "@/lib/calculations";

export async function POST(req: NextRequest) {
  const body: CompareRequest = await req.json();
  const { facts, statements } = body;

  // Run compliance check on all statement texts
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

  const comparisons: SourceComparison[] = statements.map((stmt) => {
    return compareStatement(stmt.id, stmt.text, stmt.category, facts);
  });

  const calculations = runCalculations(facts);

  const response: CompareResponse = {
    comparisons,
    calculations,
    blocked: false,
  };
  return NextResponse.json(response);
}

function compareStatement(
  statementId: string,
  text: string,
  category: string,
  facts: import("@/types").PolicyFact[]
): SourceComparison {
  const lower = text.toLowerCase();

  // Cost statements
  if (category === "cost") {
    const distCost = facts.find((f) => f.id === "distribution-cost");
    const annualPremium = facts.find((f) => f.id === "annual-premium");
    if (distCost && annualPremium) {
      const pct = (
        (Number(distCost.value) / Number(annualPremium.value)) *
        100
      ).toFixed(1);
      return {
        statementId,
        state: "calculation-differs",
        documentEvidence: [distCost, annualPremium],
        explanation: `The policy illustration states a distribution cost of S$${distCost.value} in year 1, which is ${pct}% of the annual premium of S$${annualPremium.value}. Distribution costs reduce the amount invested on your behalf in the first year.`,
        clarificationQuestion: `Can you walk me through the breakdown of costs in each year of this policy, and how distribution costs change after year 1?`,
      };
    }
  }

  // Liquidity statements
  if (category === "liquidity") {
    const sv5 = facts.find((f) => f.id === "surrender-value-yr5");
    const sv10 = facts.find((f) => f.id === "surrender-value-yr10");
    if (sv5 && sv10) {
      return {
        statementId,
        state: "partially-matches",
        documentEvidence: [sv5, sv10],
        explanation: `The policy does have a surrender value, but surrender values in the early years are lower than total premiums paid. The document states a guaranteed surrender value of S$${sv5.value} at year 5 and S$${sv10.value} at year 10. Early surrender may result in a financial loss.`,
        clarificationQuestion: `What is the exact process and cost for surrendering the policy, and are there any lock-in periods or penalties I should know about?`,
      };
    }
  }

  // Returns statements
  if (category === "returns") {
    const projected = facts.find((f) => f.id === "projected-surrender-yr20");
    const guaranteed = facts.find((f) => f.id === "surrender-value-yr20");
    const notice = facts.find((f) => f.id === "non-guaranteed-notice");
    if (projected && guaranteed && notice) {
      return {
        statementId,
        state: "needs-source-reconciliation",
        documentEvidence: [projected, guaranteed, notice],
        explanation: `The document illustrates a projected surrender value of S$${projected.value} at year 20 at a 4.25% p.a. illustrated rate, but states this is not guaranteed. The guaranteed surrender value at year 20 is S$${guaranteed.value}. Actual returns depend on fund performance.`,
        clarificationQuestion: `What has the actual bonus history been for this fund, and what is the guaranteed vs non-guaranteed split of the illustrated returns?`,
      };
    }
  }

  // Coverage statements
  if (category === "coverage") {
    const sumAssured = facts.find((f) => f.id === "sum-assured");
    const exclusion = facts.find((f) => f.id === "exclusion-suicide");
    if (sumAssured) {
      return {
        statementId,
        state: "partially-matches",
        documentEvidence: [sumAssured, ...(exclusion ? [exclusion] : [])],
        explanation: `The policy provides a sum assured of S$${sumAssured.value}. Whether this is sufficient depends on your personal circumstances and coverage needs, which CoverPilot cannot assess. Key exclusions are noted in the document.`,
        clarificationQuestion: `Based on my income, dependants, and existing coverage, how does this sum assured compare to what a licensed adviser would typically recommend for my situation?`,
      };
    }
  }

  // Default: not found
  return {
    statementId,
    state: "not-found",
    documentEvidence: [],
    explanation: `The uploaded document does not contain information that directly addresses this statement. Ask your adviser to point to the specific section that supports this claim.`,
    clarificationQuestion: `Can you show me exactly where in the policy document this is stated?`,
  };
}
