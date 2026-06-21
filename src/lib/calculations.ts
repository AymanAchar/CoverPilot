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

  // 1. Distribution cost as % of annual premium
  if (annualPremium && distCost) {
    const pct = (
      (Number(distCost.value) / Number(annualPremium.value)) *
      100
    ).toFixed(1);
    cards.push({
      id: "calc-dist-cost-pct",
      title: "Distribution Cost as % of Annual Premium",
      formula: "Distribution Cost ÷ Annual Premium × 100",
      result: `${pct}%`,
      inputs: [annualPremium, distCost],
      caveat:
        "Distribution cost reduces the amount invested on your behalf in year 1. This figure is sourced from the policy illustration.",
    });
  } else {
    cards.push({
      id: "calc-dist-cost-pct",
      title: "Distribution Cost as % of Annual Premium",
      formula: "Distribution Cost ÷ Annual Premium × 100",
      result: "not found in uploaded document",
      inputs: [],
      caveat: "Required data (distribution cost or annual premium) was not found.",
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
    const milestones = [
      { year: 5, sv: Number(svYr5.value) },
      { year: 10, sv: Number(svYr10.value) },
      { year: 20, sv: Number(svYr20.value) },
    ];
    const breakeven = milestones.find((m) => m.sv >= ap * m.year);
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

  return cards;
}
