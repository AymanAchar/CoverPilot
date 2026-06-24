import { SEEDED_FACTS } from "@/data/seeded-policy";
import type { SourceComparison } from "@/types";

const fact = (id: string) => SEEDED_FACTS.find((item) => item.id === id);

export const DEMO_USER_CONTEXT = {
  name: "25-year-old early-career Singaporean",
  situation: "FA meeting tomorrow",
  income: "S$4,000/month",
  dependents: "No dependents declared",
  currentCover: "Basic employer coverage",
  goal: "Understand whether the proposed policy and adviser claims need clarification",
};

export const DEMO_ASK = {
  question: "What should I check before signing a whole life policy?",
  answer:
    "Start by checking the premium commitment, guaranteed and non-guaranteed values, surrender values, cost of distribution, exclusions, and which parts need a licensed adviser to clarify.",
  source:
    "Grounded in MoneySense and LIA-style public guidance on policy illustrations, distribution cost, and guaranteed versus non-guaranteed values.",
};

export const DEMO_COMPARISONS: SourceComparison[] = [
  {
    statementId: "s1",
    state: "not-found",
    documentEvidence: [fact("distribution-cost"), fact("annual-premium")].filter(
      Boolean
    ) as SourceComparison["documentEvidence"],
    explanation:
      "The uploaded document does not define this policy as low cost. It states an annual premium of S$3,600 and total distribution cost of S$10,800, so the phrase should be clarified against the document figures.",
    clarificationQuestion:
      "When you describe this as low cost, which document figures should I compare against the S$10,800 total distribution cost?",
  },
  {
    statementId: "s2",
    state: "partially-matches",
    documentEvidence: [
      fact("surrender-value-yr5"),
      fact("surrender-value-yr10"),
      fact("surrender-value-yr20"),
    ].filter(Boolean) as SourceComparison["documentEvidence"],
    explanation:
      "The document shows surrender values at future policy years, so access through surrender exists as a policy mechanism. The statement needs clarification because early surrender values may be materially lower than premiums paid.",
    clarificationQuestion:
      "If I surrender early, what would I actually receive in each year compared with the premiums paid up to that point?",
  },
  {
    statementId: "s3",
    state: "needs-source-reconciliation",
    documentEvidence: [
      fact("surrender-value-yr20"),
      fact("projected-surrender-yr20"),
      fact("non-guaranteed-notice"),
    ].filter(Boolean) as SourceComparison["documentEvidence"],
    explanation:
      "The document separates guaranteed surrender value from projected non-guaranteed value. The statement cannot be assessed from the phrase alone because it does not specify which values or assumptions it relies on.",
    clarificationQuestion:
      "Which values are you referring to when calling this a savings plan: guaranteed values, projected non-guaranteed values, or both?",
  },
  {
    statementId: "s4",
    state: "needs-source-reconciliation",
    documentEvidence: [
      fact("projected-surrender-yr20"),
      fact("non-guaranteed-notice"),
    ].filter(Boolean) as SourceComparison["documentEvidence"],
    explanation:
      "The document includes projected values illustrated at 4.25% p.a., but it also states that bonuses and illustrated returns are not guaranteed. The statement should be reconciled with the non-guaranteed notice.",
    clarificationQuestion:
      "Can you separate the guaranteed return-related figures from the non-guaranteed projected figures in this illustration?",
  },
  {
    statementId: "s5",
    state: "not-found",
    documentEvidence: [fact("sum-assured")].filter(
      Boolean
    ) as SourceComparison["documentEvidence"],
    explanation:
      "The document states a S$100,000 sum assured, but it cannot determine whether that is enough protection for this user. Coverage adequacy depends on liabilities, dependents, existing assets, income, and goals.",
    clarificationQuestion:
      "How did you calculate whether S$100,000 is appropriate for my liabilities, dependents, existing assets, income, and goals?",
  },
];

export const DEMO_DISCUSSION_PROMPTS = [
  "The policy document states a S$100,000 death benefit. Ask how this amount was selected relative to liabilities, income, dependents, existing assets, and budget.",
  "The policy has both guaranteed and non-guaranteed illustrated values. Ask which parts of the proposal rely on projections.",
  "The document states total distribution cost of S$10,800. Ask how this cost affects early policy value and the policy objective.",
];

export const DEMO_PREP_QUESTIONS = [
  ...DEMO_COMPARISONS.map((item) => item.clarificationQuestion),
  "Which required documents should I have before deciding, and what should I read first?",
  "Are there exclusions, waiting periods, or premium-change conditions I should understand before signing?",
];

export const DEMO_UNSAFE_PROMPTS = [
  "Should I buy this policy?",
  "Is this plan suitable for me?",
  "Should I cancel my current policy?",
];
