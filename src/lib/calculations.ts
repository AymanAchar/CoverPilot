import type { CalculationCard, PolicyFact } from "@/types";

// Deterministic calculation engine.
// Same input always gives same output. If data is missing, card says "not-found".

function findFact(facts: PolicyFact[], id: string): PolicyFact | undefined {
  return facts.find((f) => f.id === id);
}

function toNumber(fact?: PolicyFact): number | null {
  if (!fact) return null;
  if (typeof fact.value === "number") return fact.value;
  const parsed = Number(String(fact.value).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function money(value: number): string {
  return `S$${Math.round(value).toLocaleString("en-SG")}`;
}

function solveAnnualIrr(cashflows: number[]): number | null {
  let low = -0.95;
  let high = 1;

  function npv(rate: number) {
    return cashflows.reduce((sum, flow, index) => sum + flow / Math.pow(1 + rate, index), 0);
  }

  let lowValue = npv(low);
  const highValue = npv(high);
  if (lowValue * highValue > 0) return null;

  for (let i = 0; i < 80; i += 1) {
    const mid = (low + high) / 2;
    const value = npv(mid);
    if (Math.abs(value) < 0.0001) return mid;
    if (lowValue * value < 0) {
      high = mid;
    } else {
      low = mid;
      lowValue = value;
    }
  }

  return (low + high) / 2;
}

function projectedReturnCard(
  annualPremium: PolicyFact,
  premiumTerm: PolicyFact | undefined,
  projectedValue: PolicyFact,
  horizon: number
): CalculationCard | null {
  const annualPremiumValue = toNumber(annualPremium);
  const premiumYears = toNumber(premiumTerm);
  const projected = toNumber(projectedValue);
  if (!annualPremiumValue || !projected || !premiumYears) return null;

  const cashflows = Array.from({ length: horizon + 1 }, (_, year) => {
    if (year === 0) return 0;
    const premiumOutflow = year <= premiumYears ? -annualPremiumValue : 0;
    const finalInflow = year === horizon ? projected : 0;
    return premiumOutflow + finalInflow;
  });
  const irr = solveAnnualIrr(cashflows);
  const realProjected = projected / Math.pow(1.025, horizon);

  return {
    id: `calc-projected-irr-yr${horizon}`,
    title: `Implied Projected Return at Year ${horizon}`,
    formula:
      "Annual cash outflows + projected surrender value, solved as an annual IRR",
    result: irr
      ? `${(irr * 100).toFixed(2)}% p.a. nominal implied return; ${money(realProjected)} in today's dollars at 2.5% inflation`
      : `${money(realProjected)} in today's dollars at 2.5% inflation`,
    inputs: [annualPremium, ...(premiumTerm ? [premiumTerm] : []), projectedValue],
    caveat:
      "This uses the extracted projected value as a scenario output. It is not guaranteed and does not account for personal suitability, opportunity cost, or future policy changes.",
  };
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
  const projSvYr25 = findFact(facts, "projected-surrender-yr25");
  const projSvYr30 = findFact(facts, "projected-surrender-yr30");

  // 1. Total distribution cost as % of total premiums payable
  if (annualPremium && distCost && premiumTerm) {
    const totalPremiums =
      (toNumber(annualPremium) ?? 0) * (toNumber(premiumTerm) ?? 0);
    const distCostValue = toNumber(distCost) ?? 0;
    const pct = ((distCostValue / totalPremiums) * 100).toFixed(1);
    cards.push({
      id: "calc-dist-cost-pct",
      title: "Total Distribution Cost as % of Total Premiums",
      formula: "Total Distribution Cost ÷ (Annual Premium × Premium Term) × 100",
      result: `${money(distCostValue)} = ${pct}% of ${money(totalPremiums)} total premiums`,
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
    const total = (toNumber(annualPremium) ?? 0) * (toNumber(premiumTerm) ?? 0);
    cards.push({
      id: "calc-total-premiums",
      title: "Total Premiums Paid Over Premium Term",
      formula: "Annual Premium × Premium Payment Term",
      result: money(total),
      inputs: [annualPremium, premiumTerm],
      caveat:
        "This is the total cash outflow over the premium payment period, assuming no policy changes.",
    });
  }

  // 3. Guaranteed surrender value vs total premiums paid at year 20
  if (annualPremium && premiumTerm && svYr20) {
    const totalPaid = (toNumber(annualPremium) ?? 0) * (toNumber(premiumTerm) ?? 0);
    const sv = toNumber(svYr20) ?? 0;
    const diff = sv - totalPaid;
    const diffStr =
      diff >= 0
        ? `${money(diff)} more than total premiums paid`
        : `${money(Math.abs(diff))} less than total premiums paid`;
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
    const ap = toNumber(annualPremium) ?? 0;
    const term = premiumTerm ? (toNumber(premiumTerm) ?? Infinity) : Infinity;
    const milestones = [
      { year: 5, sv: toNumber(svYr5) ?? 0 },
      { year: 10, sv: toNumber(svYr10) ?? 0 },
      { year: 20, sv: toNumber(svYr20) ?? 0 },
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
    const totalPaid = (toNumber(annualPremium) ?? 0) * (toNumber(premiumTerm) ?? 0);
    const sv = toNumber(projSvYr20) ?? 0;
    const diff = sv - totalPaid;
    cards.push({
      id: "calc-breakeven-projected",
      title: "Projected (Non-Guaranteed) Position at Year 20",
      formula:
        "Projected Surrender Value (Yr 20) − (Annual Premium × Premium Term)",
      result:
        diff >= 0
          ? `${money(diff)} more than total premiums paid (projected)`
          : `${money(Math.abs(diff))} less than total premiums paid (projected)`,
      inputs: [annualPremium, premiumTerm, projSvYr20],
      caveat:
        "Projected values include NON-GUARANTEED bonuses illustrated at 4.25% p.a. and are not assured — actual bonuses depend on the participating fund's performance. The guaranteed position (shown separately) is the contractual floor.",
    });
  }

  const projectedReturn =
    annualPremium && projSvYr20
      ? projectedReturnCard(annualPremium, premiumTerm, projSvYr20, 20)
      : annualPremium && projSvYr25
        ? projectedReturnCard(annualPremium, premiumTerm, projSvYr25, 25)
        : annualPremium && projSvYr30
          ? projectedReturnCard(annualPremium, premiumTerm, projSvYr30, 30)
          : null;

  if (projectedReturn) cards.push(projectedReturn);

  return cards;
}
