import type { CalculationCard, PolicyFact } from "@/types";

// Deterministic calculation engine.
// Same input always gives same output. If data is missing, card says "not-found".

function findFact(facts: PolicyFact[], id: string): PolicyFact | undefined {
  return facts.find((f) => f.id === id);
}

export function runCalculations(facts: PolicyFact[]): CalculationCard[] {
  const cards: CalculationCard[] = [];

  const annualPremium = findFact(facts, "annual-premium");
  const distCost = findFact(facts, "distribution-cost");
  const premiumTerm = findFact(facts, "premium-term");
  const svYr5 = findFact(facts, "surrender-value-yr5");
  const svYr10 = findFact(facts, "surrender-value-yr10");
  const svYr20 = findFact(facts, "surrender-value-yr20");
  const projSvYr20 = findFact(facts, "projected-surrender-yr20");

  // 1. Total distribution cost as % of total premiums payable
  if (annualPremium && distCost && premiumTerm) {
    const totalPremiums =
      Number(annualPremium.value) * Number(premiumTerm.value);
    const pct = ((Number(distCost.value) / totalPremiums) * 100).toFixed(1);
    cards.push({
      id: "calc-dist-cost-pct",
      title: "Total Distribution Cost as % of Total Premiums",
      formula: "Total Distribution Cost ÷ (Annual Premium × Premium Term) × 100",
      result: `S$${Number(distCost.value).toLocaleString()} = ${pct}% of S$${totalPremiums.toLocaleString()} total premiums`,
      inputs: [annualPremium, premiumTerm, distCost],
      caveat:
        "Total Distribution Cost is the sum of distribution-related costs over the policy (e.g. commissions and benefits paid to the distribution channel), as disclosed in the policy illustration. It reduces the amount working for you, especially in the early years.",
    });
  } else {
    cards.push({
      id: "calc-dist-cost-pct",
      title: "Total Distribution Cost as % of Total Premiums",
      formula: "Total Distribution Cost ÷ (Annual Premium × Premium Term) × 100",
      result: "not found in uploaded document",
      inputs: [],
      caveat:
        "Required data (total distribution cost, annual premium, or premium term) was not found.",
    });
  }

  // 2. Total premiums paid by year 20
  if (annualPremium && premiumTerm) {
    const total = Number(annualPremium.value) * Number(premiumTerm.value);
    cards.push({
      id: "calc-total-premiums",
      title: "Total Premiums Paid Over Premium Term",
      formula: "Annual Premium × Premium Payment Term",
      result: `S$${total.toLocaleString()}`,
      inputs: [annualPremium, premiumTerm],
      caveat:
        "This is the total cash outflow over the premium payment period, assuming no policy changes.",
    });
  }

  // 3. Guaranteed surrender value vs total premiums paid at year 20
  if (annualPremium && premiumTerm && svYr20) {
    const totalPaid = Number(annualPremium.value) * Number(premiumTerm.value);
    const sv = Number(svYr20.value);
    const diff = sv - totalPaid;
    const diffStr =
      diff >= 0
        ? `S$${diff.toLocaleString()} more than total premiums paid`
        : `S$${Math.abs(diff).toLocaleString()} less than total premiums paid`;
    cards.push({
      id: "calc-sv-vs-premiums-yr20",
      title: "Guaranteed Surrender Value vs Total Premiums at Year 20",
      formula:
        "Guaranteed Surrender Value (Yr 20) − (Annual Premium × Premium Term)",
      result: diffStr,
      inputs: [annualPremium, premiumTerm, svYr20],
      caveat:
        "Guaranteed values only. Non-guaranteed projected values are higher but not assured. Verify against your policy illustration.",
    });
  }

  // 4. Breakeven year (when guaranteed surrender value first exceeds total premiums paid)
  if (annualPremium && svYr5 && svYr10 && svYr20) {
    const ap = Number(annualPremium.value);
    const term = premiumTerm ? Number(premiumTerm.value) : Infinity;
    const milestones = [
      { year: 5, sv: Number(svYr5.value) },
      { year: 10, sv: Number(svYr10.value) },
      { year: 20, sv: Number(svYr20.value) },
    ];
    // Premiums paid to date is capped at the premium term — paying stops after the term ends.
    const breakeven = milestones.find((m) => m.sv >= ap * Math.min(m.year, term));
    cards.push({
      id: "calc-breakeven",
      title: "Estimated Guaranteed Breakeven Range",
      formula: "First year where Guaranteed Surrender Value ≥ Total Premiums Paid",
      result: breakeven
        ? `Between year ${breakeven.year === 5 ? "0 and 5" : breakeven.year === 10 ? "5 and 10" : "10 and 20"}`
        : "After year 20 (based on available data)",
      inputs: [annualPremium, svYr5, svYr10, svYr20],
      caveat:
        "Breakeven is calculated on guaranteed values only. Actual breakeven may differ. Discuss with a licensed adviser.",
    });
  }

  // 5. Projected (non-guaranteed) breakeven vs total premiums at year 20
  if (annualPremium && premiumTerm && projSvYr20) {
    const totalPaid = Number(annualPremium.value) * Number(premiumTerm.value);
    const sv = Number(projSvYr20.value);
    const diff = sv - totalPaid;
    cards.push({
      id: "calc-breakeven-projected",
      title: "Projected (Non-Guaranteed) Position at Year 20",
      formula:
        "Projected Surrender Value (Yr 20) − (Annual Premium × Premium Term)",
      result:
        diff >= 0
          ? `S$${diff.toLocaleString()} more than total premiums paid (projected)`
          : `S$${Math.abs(diff).toLocaleString()} less than total premiums paid (projected)`,
      inputs: [annualPremium, premiumTerm, projSvYr20],
      caveat:
        "Projected values include NON-GUARANTEED bonuses illustrated at 4.25% p.a. and are not assured — actual bonuses depend on the participating fund's performance. The guaranteed position (shown separately) is the contractual floor.",
    });
  }

  return cards;
}
