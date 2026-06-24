import type { PolicyFact, UserStatement } from "@/types";
import { OFFICIAL_SOURCE_FACTS } from "@/data/official-sources(actual)";

export type FinancialTopicId =
  | "policy-review-checklist"
  | "distribution-cost"
  | "surrender-liquidity"
  | "guaranteed-vs-projected"
  | "coverage-adequacy"
  | "claims-exclusions"
  | "adviser-process"
  | "general-document";

export type FinancialTopic = {
  id: FinancialTopicId;
  label: string;
  category: UserStatement["category"];
  cues: RegExp[];
  sourceFactIds: string[];
  policyFactIds: string[];
  userFacingFrame: string;
  adviserQuestion: string;
};

export const FINANCIAL_TOPICS: FinancialTopic[] = [
  {
    id: "policy-review-checklist",
    label: "Policy review checklist before signing",
    category: "other",
    cues: [/before signing|before i sign|what should i check|whole life policy|review this policy/i],
    sourceFactIds: [
      "ms-policy-illustration",
      "ms-distribution-cost",
      "ms-guaranteed-vs-non-guaranteed",
      "lia-illustrated-rate",
      "lia-total-distribution-cost",
    ],
    policyFactIds: [
      "annual-premium",
      "premium-term",
      "sum-assured",
      "distribution-cost",
      "surrender-value-yr20",
      "projected-surrender-yr20",
      "non-guaranteed-notice",
    ],
    userFacingFrame:
      "Before signing, the useful checks are the premium commitment, coverage amount, distribution cost, surrender values, guaranteed versus non-guaranteed projections, exclusions, and the adviser's basis for recommending this product.",
    adviserQuestion:
      "Can you walk me through the premium commitment, distribution cost, surrender values, guaranteed versus non-guaranteed figures, exclusions, and alternatives considered before I decide?",
  },
  {
    id: "distribution-cost",
    label: "Cost, fees, commissions, and distribution cost",
    category: "cost",
    cues: [/cost|cheap|low-cost|expensive|fee|charge|commission|distribution/i],
    sourceFactIds: [
      "ms-distribution-cost",
      "ms-policy-illustration",
      "lia-total-distribution-cost",
    ],
    policyFactIds: ["annual-premium", "premium-term", "distribution-cost"],
    userFacingFrame:
      "Cost claims need the policy premium, the premium term, and the LIA distribution-cost disclosure. The document can show these figures, but it cannot decide whether the cost is low without a benchmark.",
    adviserQuestion:
      "Which exact distribution-cost row, premium term, and benchmark are you using when describing the policy cost?",
  },
  {
    id: "surrender-liquidity",
    label: "Liquidity, surrender value, and access to money",
    category: "liquidity",
    cues: [/access|withdraw|liquid|cash out|surrender|take money|get money back/i],
    sourceFactIds: ["ms-distribution-cost", "ms-policy-illustration"],
    policyFactIds: [
      "surrender-value-yr5",
      "surrender-value-yr10",
      "surrender-value-yr20",
      "annual-premium",
      "premium-term",
    ],
    userFacingFrame:
      "Liquidity claims need the surrender-value schedule and premiums paid to date. A policy can allow surrender while still returning less than premiums paid in earlier years.",
    adviserQuestion:
      "For each policy year I might surrender, what would I receive and how does that compare with premiums paid to date?",
  },
  {
    id: "guaranteed-vs-projected",
    label: "Guaranteed versus projected returns",
    category: "returns",
    cues: [/return|project|interest|savings|grow|yield|guarantee|guaranteed|bonus/i],
    sourceFactIds: [
      "ms-guaranteed-vs-non-guaranteed",
      "lia-illustrated-rate",
      "ms-policy-illustration",
    ],
    policyFactIds: [
      "surrender-value-yr20",
      "projected-surrender-yr20",
      "non-guaranteed-notice",
    ],
    userFacingFrame:
      "Return claims need a split between guaranteed values and projected non-guaranteed values. Illustrated rates are not promises of future fund performance.",
    adviserQuestion:
      "Can you separate the guaranteed amount from the projected non-guaranteed amount and show which part your statement relies on?",
  },
  {
    id: "coverage-adequacy",
    label: "Coverage amount and protection",
    category: "coverage",
    cues: [/cover|coverage|protection|sum assured|death benefit|critical illness|ci|enough/i],
    sourceFactIds: ["ms-policy-illustration"],
    policyFactIds: ["sum-assured", "policy-term", "exclusion-suicide"],
    userFacingFrame:
      "Coverage claims need the benefit amount, benefit conditions, and exclusions. Whether the coverage is enough depends on the buyer's personal liabilities and existing cover.",
    adviserQuestion:
      "How did you calculate this coverage amount against my liabilities, dependents, income, existing assets, and existing insurance?",
  },
  {
    id: "claims-exclusions",
    label: "Claims conditions, exclusions, and waiting periods",
    category: "exclusion",
    cues: [/claim|exclude|exclusion|waiting|condition|covered if|not covered/i],
    sourceFactIds: ["ms-policy-illustration"],
    policyFactIds: ["exclusion-suicide", "sum-assured"],
    userFacingFrame:
      "Claims claims need the benefit schedule, exclusions, waiting periods, and policy contract wording. A policy illustration may not contain every claims condition.",
    adviserQuestion:
      "Which exact exclusions, waiting periods, and claim conditions apply to this benefit in the policy contract?",
  },
  {
    id: "adviser-process",
    label: "Adviser process, comparison, and basis for advice",
    category: "other",
    cues: [/compare|alternative|why this|basis|needs analysis|fact find|budget|afford/i],
    sourceFactIds: ["ms-policy-illustration", "lia-total-distribution-cost"],
    policyFactIds: ["annual-premium", "sum-assured", "distribution-cost"],
    userFacingFrame:
      "Process claims need a clear trail showing what need was identified, what alternatives were considered, and what trade-offs were explained.",
    adviserQuestion:
      "What alternatives did you compare this against, and what trade-offs led you to present this option?",
  },
  {
    id: "general-document",
    label: "General financial document check",
    category: "other",
    cues: [/.*/],
    sourceFactIds: ["ms-policy-illustration"],
    policyFactIds: ["annual-premium", "sum-assured", "distribution-cost"],
    userFacingFrame:
      "General claims need direct document support. If the statement is not in the policy facts, ask the adviser to point to the exact page or clause.",
    adviserQuestion:
      "Can you point me to the exact policy illustration page or clause that supports this statement?",
  },
];

export function topicForText(text: string): FinancialTopic {
  return (
    FINANCIAL_TOPICS.find((topic) =>
      topic.cues.some((cue) => cue.test(text))
    ) ?? FINANCIAL_TOPICS[FINANCIAL_TOPICS.length - 1]
  );
}

export function classifyFinancialStatement(text: string): UserStatement["category"] {
  return topicForText(text).category;
}

export function officialFactsForTopic(topic: FinancialTopic): PolicyFact[] {
  return OFFICIAL_SOURCE_FACTS.filter((fact) =>
    topic.sourceFactIds.includes(fact.id)
  );
}

export function policyFactsForTopic(
  topic: FinancialTopic,
  facts: PolicyFact[]
): PolicyFact[] {
  const selected = topic.policyFactIds
    .map((id) => facts.find((fact) => fact.id === id))
    .filter(Boolean) as PolicyFact[];
  return selected;
}

export function splitFinancialClaims(input: string): UserStatement[] {
  const normalized = input
    .replace(/\s+/g, " ")
    .replace(/\b(and also|also)\b/gi, ".")
    .replace(/\bbut\b/gi, ".")
    .trim();
  const parts = normalized
    .split(/(?:[.!?]\s+|\n+|;\s+|\s+-\s+)/)
    .map((part) => part.trim())
    .filter(Boolean);
  const usableParts = parts.length > 1 ? parts : [normalized].filter(Boolean);

  return usableParts.slice(0, 6).map((text, index) => ({
    id: `claim-${Date.now()}-${index}`,
    text,
    category: classifyFinancialStatement(text),
  }));
}
