import type { FinancialQuestionResponse, PolicyFact } from "@/types";
import { checkCompliance, COMPLIANCE_NOTICE } from "@/lib/compliance";
import {
  officialFactsForTopic,
  policyFactsForTopic,
  topicForText,
} from "@/lib/financial-topic-intelligence";

const RELATED_ACTIONS: Record<string, FinancialQuestionResponse["relatedActions"]> = {
  "policy-review-checklist": [
    { label: "Decode the policy document", href: "/decode" },
    { label: "Check what my adviser said", href: "/check" },
    { label: "Prepare meeting pack", href: "/prepare" },
  ],
  "distribution-cost": [
    { label: "Check an adviser cost claim", href: "/check" },
    { label: "Decode a policy document", href: "/decode" },
  ],
  "surrender-liquidity": [
    { label: "Check a surrender claim", href: "/check" },
    { label: "Decode a policy document", href: "/decode" },
  ],
  "guaranteed-vs-projected": [
    { label: "Check a returns claim", href: "/check" },
    { label: "Decode guaranteed values", href: "/decode" },
  ],
  "coverage-adequacy": [
    { label: "Prepare adviser questions", href: "/prepare" },
    { label: "Check a coverage claim", href: "/check" },
  ],
  "claims-exclusions": [
    { label: "Check a claims statement", href: "/check" },
    { label: "Decode exclusions from a document", href: "/decode" },
  ],
  "adviser-process": [
    { label: "Prepare meeting pack", href: "/prepare" },
    { label: "Check what was said", href: "/check" },
  ],
  "general-document": [
    { label: "Decode a financial document", href: "/decode" },
    { label: "Check what my adviser said", href: "/check" },
  ],
};

function policyContextSentence(policyFacts: PolicyFact[]) {
  if (policyFacts.length === 0) {
    return "If you add a policy document, CoverPilot can connect this explanation to your actual figures.";
  }
  const labels = policyFacts.slice(0, 3).map((fact) => fact.label.toLowerCase());
  return `For your loaded document, the most relevant facts are ${labels.join(", ")}. Use those as anchors when asking your adviser for clarification.`;
}

export function answerFinancialQuestion(
  question: string,
  facts: PolicyFact[] = []
): FinancialQuestionResponse {
  const compliance = checkCompliance(question);
  if (compliance.blocked) {
    return {
      blocked: true,
      blockReason: `${compliance.reason} ${compliance.redirect}`,
    };
  }

  const topic = topicForText(question);
  const policyFacts = policyFactsForTopic(topic, facts);
  const officialFacts = officialFactsForTopic(topic);
  const sourceFacts = [...policyFacts, ...officialFacts];

  return {
    blocked: false,
    topic: topic.label,
    answer: [
      topic.userFacingFrame,
      policyContextSentence(policyFacts),
      "A safe next step is to turn the question into exact document checks: what page says this, what figure supports it, what assumptions are non-guaranteed, and what trade-off was considered.",
    ],
    sourceFacts,
    questionsForLicensedAdviser: [
      topic.adviserQuestion,
      "Which part of the answer comes from the policy illustration, and which part comes from your judgement as a licensed adviser?",
      "What would change if the illustrated non-guaranteed values do not materialise?",
    ],
    relatedActions: RELATED_ACTIONS[topic.id],
    complianceNotice: COMPLIANCE_NOTICE,
  };
}
