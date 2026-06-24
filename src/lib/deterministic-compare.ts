import type { PolicyFact, SourceComparison, UserStatement } from "@/types";
import {
  officialFactsForTopic,
  policyFactsForTopic,
  topicForText,
} from "@/lib/financial-topic-intelligence";

function valueOf(fact?: PolicyFact) {
  if (!fact) return "not found";
  return `${fact.value}${fact.unit ? ` ${fact.unit}` : ""}`;
}

export function compareStatementDeterministically(
  statement: UserStatement,
  facts: PolicyFact[]
): SourceComparison {
  const lower = statement.text.toLowerCase();
  const topic = topicForText(statement.text);
  const topicPolicyFacts = policyFactsForTopic(topic, facts);
  const topicOfficialFacts = officialFactsForTopic(topic);
  const topicEvidence = [...topicPolicyFacts, ...topicOfficialFacts];
  const annualPremium = facts.find((fact) => fact.id === "annual-premium");
  const premiumTerm = facts.find((fact) => fact.id === "premium-term");
  const distributionCost = facts.find((fact) => fact.id === "distribution-cost");
  const sumAssured = facts.find((fact) => fact.id === "sum-assured");
  const guaranteedYear20 = facts.find((fact) => fact.id === "surrender-value-yr20");
  const projectedYear20 = facts.find(
    (fact) => fact.id === "projected-surrender-yr20"
  );
  const nonGuaranteedNotice = facts.find(
    (fact) => fact.id === "non-guaranteed-notice"
  );

  if (statement.category === "cost" || /cost|cheap|expensive|fee|charge|commission/.test(lower)) {
    return {
      statementId: statement.id,
      state: "not-found",
      documentEvidence: topicEvidence,
      explanation: `The policy facts show annual premium ${valueOf(annualPremium)}, premium term ${valueOf(premiumTerm)}, and total distribution cost ${valueOf(distributionCost)}. Public guidance says policy illustrations include premiums, charges, and distribution costs, but the document does not itself define whether those figures are low or high; that comparison needs a benchmark or adviser explanation.`,
      clarificationQuestion: topic.adviserQuestion,
    };
  }

  if (statement.category === "liquidity" || /access|withdraw|cash out|surrender|liquid/.test(lower)) {
    return {
      statementId: statement.id,
      state: "partially-matches",
      documentEvidence: topicEvidence,
      explanation:
        "The policy facts include surrender values, so access through surrender is a policy mechanism. The statement needs qualification because the amount available depends on the policy year and may be below premiums paid, especially earlier in the policy; public guidance also flags that early policy cash value may be low because premiums can be used to offset distribution costs.",
      clarificationQuestion: topic.adviserQuestion,
    };
  }

  if (
    statement.category === "returns" ||
    statement.category === "guarantee" ||
    /return|project|interest|savings|guarantee|guaranteed|yield/.test(lower)
  ) {
    return {
      statementId: statement.id,
      state: projectedYear20 || nonGuaranteedNotice ? "needs-source-reconciliation" : "not-found",
      documentEvidence: topicEvidence,
      explanation: `The policy facts separate guaranteed values (${valueOf(guaranteedYear20)} at year 20 where available) from projected or non-guaranteed values (${valueOf(projectedYear20)} where available). Public guidance says illustrated rates are for illustration and non-guaranteed portions depend on future fund performance, so a returns claim needs to specify whether it relies on guaranteed values, projected values, or both.`,
      clarificationQuestion: topic.adviserQuestion,
    };
  }

  if (statement.category === "coverage" || /cover|coverage|protection|sum assured|death|critical/.test(lower)) {
    return {
      statementId: statement.id,
      state: "not-found",
      documentEvidence: topicEvidence,
      explanation: `The policy facts show sum assured ${valueOf(sumAssured)} where available, plus any extracted exclusions or conditions. The document alone cannot determine whether that coverage is enough for the user's liabilities, dependents, income, existing assets, or goals.`,
      clarificationQuestion: topic.adviserQuestion,
    };
  }

  if (statement.category === "exclusion" || /exclude|exclusion|waiting|claim|condition/.test(lower)) {
    return {
      statementId: statement.id,
      state: topicPolicyFacts.length > 0 ? "partially-matches" : "not-found",
      documentEvidence: topicEvidence,
      explanation:
        "The evidence record surfaces any extracted exclusions or claim conditions, but the statement should be checked against the full policy contract and benefit schedule before relying on it.",
      clarificationQuestion: topic.adviserQuestion,
    };
  }

  return {
    statementId: statement.id,
    state: "not-found",
    documentEvidence: topicEvidence,
    explanation: `${topic.userFacingFrame} The extracted policy facts do not directly support this statement.`,
    clarificationQuestion: topic.adviserQuestion,
  };
}

export function compareStatementsDeterministically(
  statements: UserStatement[],
  facts: PolicyFact[]
): SourceComparison[] {
  return statements.map((statement) =>
    compareStatementDeterministically(statement, facts)
  );
}
