import type { CalculationCard, PolicyFact, SourceComparison, UserContext } from "@/types";

export type ScenarioStressTest = {
  title: string;
  verdict: string;
  detail: string;
  evidence: PolicyFact[];
};

export type ReadinessItem = {
  title: string;
  detail: string;
  action: string;
};

export type NeedsSnapshot = {
  known: ReadinessItem[];
  missing: ReadinessItem[];
  questions: string[];
};

function factById(facts: PolicyFact[], ...ids: string[]) {
  return facts.find((fact) => ids.includes(fact.id));
}

function numberFromFact(fact?: PolicyFact) {
  if (!fact) return null;
  if (typeof fact.value === "number") return fact.value;
  const parsed = Number(String(fact.value).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function yearsFromFact(fact?: PolicyFact) {
  if (!fact) return null;
  const raw = String(fact.value).toLowerCase();
  if (raw.includes("whole")) return null;
  const parsed = Number(raw.replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function money(value: number) {
  return `S$${Math.round(value).toLocaleString("en-SG")}`;
}

function parseMonthlyIncome(income?: string) {
  if (!income) return null;
  const lower = income.toLowerCase();
  const parsed = Number(lower.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  if (lower.includes("year") || lower.includes("annual")) return parsed / 12;
  return parsed;
}

function hasUsefulContext(value?: string) {
  if (!value) return false;
  return !/not provided|not declared|none declared/i.test(value.trim());
}

export function buildScenarioStressTests(
  facts: PolicyFact[],
  context?: UserContext
): ScenarioStressTest[] {
  const annualPremium = factById(facts, "annual-premium");
  const premiumTerm = factById(facts, "premium-term");
  const distributionCost = factById(facts, "distribution-cost");
  const svYr5 = factById(facts, "surrender-value-yr5");
  const svYr10 = factById(facts, "surrender-value-yr10");
  const svYr20 = factById(facts, "surrender-value-yr20");
  const projectedYr20 = factById(facts, "projected-surrender-yr20");
  const annualPremiumValue = numberFromFact(annualPremium);
  const premiumYears = yearsFromFact(premiumTerm);
  const distributionCostValue = numberFromFact(distributionCost);

  const tests: ScenarioStressTest[] = [];

  if (annualPremiumValue && premiumYears) {
    const monthlyIncome = parseMonthlyIncome(context?.income);
    const incomeNote = monthlyIncome
      ? ` The annual premium is about ${((annualPremiumValue / (monthlyIncome * 12)) * 100).toFixed(1)}% of the income context saved in Needs Snapshot.`
      : "";
    tests.push({
      title: "Cash commitment",
      verdict: `${money(annualPremiumValue * premiumYears)} total premium commitment`,
      detail: `This is the document-derived cash outflow if premiums are paid for the full premium payment term. It does not decide affordability, but it gives the user the number to sanity-check against income and emergency savings.${incomeNote}`,
      evidence: [annualPremium, premiumTerm].filter(Boolean) as PolicyFact[],
    });
  }

  if (annualPremiumValue && distributionCostValue && premiumYears) {
    const totalPremiums = annualPremiumValue * premiumYears;
    tests.push({
      title: "Cost load",
      verdict: `${money(distributionCostValue)} is ${(distributionCostValue / totalPremiums * 100).toFixed(1)}% of total premiums`,
      detail:
        "This follows the PortfolioPilot-style hidden-cost pattern, but keeps it document-grounded: Claro shows the disclosed distribution economics without saying whether the policy is good or bad.",
      evidence: [distributionCost, annualPremium, premiumTerm].filter(Boolean) as PolicyFact[],
    });
  }

  const surrenderRows = [
    { year: 5, fact: svYr5 },
    { year: 10, fact: svYr10 },
    { year: 20, fact: svYr20 },
  ].filter((row): row is { year: number; fact: PolicyFact } => !!row.fact);

  if (annualPremiumValue && surrenderRows.length > 0) {
    const rows = surrenderRows
      .map((row) => {
        const value = numberFromFact(row.fact);
        if (value === null) return null;
        const paid = annualPremiumValue * Math.min(row.year, premiumYears ?? row.year);
        const gap = value - paid;
        return `${row.year}y: ${gap >= 0 ? "+" : "-"}${money(Math.abs(gap))}`;
      })
      .filter(Boolean);

    tests.push({
      title: "Early-surrender scenario",
      verdict: rows.join(" / "),
      detail:
        "This shows what the extracted surrender rows imply if the user stops early. It is a stress test for liquidity, not a recommendation to surrender or continue.",
      evidence: surrenderRows.map((row) => row.fact),
    });
  }

  if (projectedYr20 && svYr20) {
    const projected = numberFromFact(projectedYr20);
    const guaranteed = numberFromFact(svYr20);
    if (projected !== null && guaranteed !== null) {
      tests.push({
        title: "Projection dependency",
        verdict: `${money(projected - guaranteed)} gap between projected and guaranteed year-20 value`,
        detail:
          "This separates what is guaranteed from what depends on non-guaranteed assumptions, so the user knows which number needs adviser explanation.",
        evidence: [projectedYr20, svYr20],
      });
    }
  }

  if (tests.length === 0) {
    tests.push({
      title: "Stress test needs more source data",
      verdict: "Not enough premium, cost, or surrender rows found",
      detail:
        "Ask the adviser for the premium table, surrender-value table, and total distribution cost disclosure before relying on the illustration.",
      evidence: [],
    });
  }

  return tests;
}

export function buildMeetingReadiness(
  facts: PolicyFact[],
  comparisons: SourceComparison[],
  calculations: CalculationCard[]
): {
  before: ReadinessItem[];
  during: ReadinessItem[];
  after: ReadinessItem[];
} {
  const missingCost = !factById(facts, "distribution-cost");
  const missingSurrender =
    !factById(facts, "surrender-value-yr5") &&
    !factById(facts, "surrender-value-yr10") &&
    !factById(facts, "surrender-value-yr20");
  const unresolvedClaims = comparisons.filter(
    (comparison) =>
      comparison.state === "not-found" ||
      comparison.state === "partially-matches" ||
      comparison.state === "needs-source-reconciliation" ||
      comparison.state === "calculation-differs"
  );

  return {
    before: [
      {
        title: "Bring the source documents",
        detail:
          facts.length > 0
            ? `${facts.length} policy facts are loaded into this case.`
            : "No policy facts are loaded yet.",
        action:
          "Have the policy illustration, product summary, benefit illustration, and fee disclosure available before the meeting.",
      },
      {
        title: "Mark missing tables",
        detail:
          missingCost || missingSurrender
            ? "Claro could not see every key table in the current evidence."
            : "Premium, cost, and surrender-related evidence is present.",
        action:
          "Ask the adviser to point to any missing total distribution cost or surrender-value table.",
      },
    ],
    during: [
      {
        title: "Resolve unsupported claims",
        detail:
          unresolvedClaims.length > 0
            ? `${unresolvedClaims.length} adviser claim(s) need source reconciliation.`
            : "No unresolved adviser claims are currently saved.",
        action:
          unresolvedClaims[0]?.clarificationQuestion ??
          "Ask the adviser to point to the exact page, row, or assumption behind each important claim.",
      },
      {
        title: "Walk through the stress test",
        detail:
          calculations.length > 0
            ? `${calculations.length} deterministic calculation(s) are ready.`
            : "No deterministic calculations are saved yet.",
        action:
          "Confirm total premium commitment, guaranteed surrender values, projected values, and what happens if payment stops early.",
      },
    ],
    after: [
      {
        title: "Save the evidence trail",
        detail:
          "Keep the document facts, claims, calculations, and follow-up questions together.",
        action:
          "Update My Case after the meeting so the next decision starts from the same source of truth.",
      },
      {
        title: "Escalate decisions to a licensed adviser",
        detail:
          "Claro can structure evidence, but it cannot decide what to buy, keep, cancel, switch, or recommend.",
        action:
          "Use the pack to ask better questions, then rely on licensed advice for regulated recommendations.",
      },
    ],
  };
}

export function buildNeedsSnapshot(context: UserContext, facts: PolicyFact[] = []): NeedsSnapshot {
  const known: ReadinessItem[] = [];
  const missing: ReadinessItem[] = [];

  const fields: Array<[keyof UserContext, string, string]> = [
    ["age", "Life stage", "Age affects what questions to ask about policy term, dependents, and affordability."],
    ["income", "Cash flow", "Income helps frame premium sustainability and emergency-fund pressure."],
    ["dependents", "Dependants", "Dependants affect what protection questions need to be clarified."],
    ["currentCover", "Existing cover", "Existing cover helps avoid reviewing a policy in isolation."],
    ["concern", "Main concern", "The main concern decides which adviser claims should be checked first."],
  ];

  fields.forEach(([key, title, detail]) => {
    const value = context[key]?.trim();
    if (value) {
      known.push({ title, detail: value, action: detail });
    } else {
      missing.push({
        title,
        detail: "Not provided yet.",
        action: detail,
      });
    }
  });

  const sumAssured = factById(facts, "sum-assured", "death-benefit");
  const annualPremium = factById(facts, "annual-premium");
  if (sumAssured) {
    known.push({
      title: "Document-stated protection",
      detail: `${sumAssured.label}: ${sumAssured.value}${sumAssured.unit ? ` ${sumAssured.unit}` : ""}`,
      action:
        "Ask whether this amount maps to death, critical illness, TPD, or a mix of benefits.",
    });
  }
  if (annualPremium) {
    known.push({
      title: "Document-stated premium",
      detail: `${annualPremium.label}: ${annualPremium.value}${annualPremium.unit ? ` ${annualPremium.unit}` : ""}`,
      action:
        "Ask whether the premium remains level, changes over time, or depends on riders.",
    });
  }

  const questions = [
    "What financial goal is this product meant to solve: protection, savings, investment exposure, estate planning, or a mix?",
  ];

  if (hasUsefulContext(context.dependents)) {
    questions.push(
      `How does this proposal account for the dependant context you entered: ${context.dependents}?`
    );
  } else {
    questions.push(
      "Does anyone depend on your income, and would that change the protection questions you need answered?"
    );
  }

  if (hasUsefulContext(context.currentCover)) {
    questions.push(
      `How does this proposal interact with your existing cover: ${context.currentCover}?`
    );
  } else {
    questions.push(
      "What existing insurance, employer benefits, CPF nomination, or savings should be considered before judging whether there is a real gap?"
    );
  }

  if (hasUsefulContext(context.income)) {
    questions.push(
      `If your income changes from ${context.income}, what happens to premium sustainability and policy flexibility?`
    );
  } else {
    questions.push(
      "What percentage of monthly income would the premium represent, and is that sustainable if income changes?"
    );
  }

  if (hasUsefulContext(context.concern)) {
    questions.push(
      `Which document page directly addresses your main concern: ${context.concern}?`
    );
  }

  if (annualPremium) {
    questions.push(
      "Is the premium level fixed for the payment term, and what happens if payment is paused, reduced, or missed?"
    );
  }

  if (sumAssured) {
    questions.push(
      "Which life events or claim conditions trigger the document-stated protection amount?"
    );
  }

  questions.push(
    "Which part of the proposal is guaranteed, and which part depends on projections, bonuses, or market performance?",
    "What documents should I read before signing: policy illustration, product summary, benefit illustration, exclusions, and fee disclosure?"
  );

  return {
    known,
    missing,
    questions,
  };
}
