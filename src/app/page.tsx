"use client";

import { useMemo, useState } from "react";
import { SEEDED_FACTS, SEEDED_STATEMENTS } from "@/data/seeded-policy";
import {
  DEMO_ASK,
  DEMO_COMPARISONS,
  DEMO_DISCUSSION_PROMPTS,
  DEMO_PREP_QUESTIONS,
  DEMO_UNSAFE_PROMPTS,
  DEMO_USER_CONTEXT,
} from "@/data/demo-evidence";
import { OFFICIAL_SOURCES } from "@/data/official-sources(actual)";
import { checkCompliance, COMPLIANCE_NOTICE } from "@/lib/compliance";
import { runCalculations } from "@/lib/calculations";
import type { CalculationCard, CompareResponse, SourceComparison } from "@/types";

const STATE_LABELS: Record<SourceComparison["state"], string> = {
  "matches-document": "Found in document",
  "partially-matches": "Partially found",
  "not-found": "Not found in document",
  "needs-source-reconciliation": "Needs reconciliation",
  "calculation-differs": "Calculation differs",
};

const STATE_STYLES: Record<SourceComparison["state"], string> = {
  "matches-document": "border-emerald-300 bg-emerald-50 text-emerald-900",
  "partially-matches": "border-amber-300 bg-amber-50 text-amber-900",
  "not-found": "border-slate-300 bg-slate-50 text-slate-800",
  "needs-source-reconciliation": "border-orange-300 bg-orange-50 text-orange-900",
  "calculation-differs": "border-rose-300 bg-rose-50 text-rose-900",
};

const MODULES = [
  ["Ask", "Official-source answer"],
  ["Decode", "Policy fact extraction"],
  ["Verify", "Adviser claim check"],
  ["Review", "Discussion prompts"],
  ["Prepare", "Meeting pack"],
  ["History", "Evidence record"],
];

export default function Home() {
  const [comparisons, setComparisons] =
    useState<SourceComparison[]>(DEMO_COMPARISONS);
  const [calculations, setCalculations] = useState<CalculationCard[]>(
    () => runCalculations(SEEDED_FACTS)
  );
  const [running, setRunning] = useState(false);
  const [usedFallback, setUsedFallback] = useState(true);
  const [firewallInput, setFirewallInput] = useState(DEMO_UNSAFE_PROMPTS[0]);
  const [firewallResult, setFirewallResult] = useState(
    () => checkCompliance(DEMO_UNSAFE_PROMPTS[0])
  );

  const openQuestions = useMemo(
    () => [
      ...comparisons.map((item) => item.clarificationQuestion),
      ...DEMO_DISCUSSION_PROMPTS,
    ],
    [comparisons]
  );

  async function runEvidenceReview() {
    setRunning(true);
    setUsedFallback(false);
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 3500);
    try {
      const res = await fetch("/api/statements/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          facts: SEEDED_FACTS,
          statements: SEEDED_STATEMENTS,
        }),
      });
      if (!res.ok) throw new Error("Comparison failed");
      const data: CompareResponse = await res.json();
      if (data.blocked || data.comparisons.length === 0) {
        throw new Error(data.blockReason ?? "No comparison output");
      }
      setComparisons(data.comparisons);
      setCalculations(data.calculations);
    } catch {
      setUsedFallback(true);
      setComparisons(DEMO_COMPARISONS);
      setCalculations(runCalculations(SEEDED_FACTS));
    } finally {
      window.clearTimeout(timeoutId);
      setRunning(false);
    }
  }

  function testFirewall(prompt = firewallInput) {
    setFirewallInput(prompt);
    setFirewallResult(checkCompliance(prompt));
  }

  return (
    <main className="min-h-screen bg-[#f6f3ec] text-slate-950">
      <section className="border-b border-slate-300 bg-[#fbfaf6]">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-8 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
              <span className="rounded-full border border-slate-300 px-3 py-1">
                Independent evidence desk
              </span>
              <span className="rounded-full border border-slate-300 px-3 py-1">
                Singapore insurance
              </span>
              <span className="rounded-full border border-slate-300 px-3 py-1">
                No recommendations
              </span>
            </div>

            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-normal text-slate-950 md:text-6xl">
                Check the insurance conversation against the evidence.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-700">
                CoverPilot is Singapore&apos;s one-stop AI insurance evidence
                desk. Ask questions, decode policies, verify adviser claims,
                and prepare for FA meetings without receiving financial advice.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={runEvidenceReview}
                disabled={running}
                className="rounded-md bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                {running ? "Running evidence review..." : "Run evidence review"}
              </button>
              <a
                href="#report"
                className="rounded-md border border-slate-400 px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-white"
              >
                View meeting pack
              </a>
            </div>
          </div>

          <EvidenceRecord
            usedFallback={usedFallback}
            comparisonCount={comparisons.length}
            calculationCount={calculations.length}
            questionCount={openQuestions.length}
          />
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-5 py-6 lg:grid-cols-[220px_1fr] lg:px-8">
        <aside className="space-y-3">
          <div className="rounded-md border border-slate-300 bg-white p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Product surface
            </p>
            <div className="mt-3 space-y-2">
              {MODULES.map(([name, detail]) => (
                <a
                  key={name}
                  href={`#${name.toLowerCase()}`}
                  className={`block rounded-md border px-3 py-2 text-sm transition hover:bg-slate-50 ${
                    name === "Verify"
                      ? "border-slate-950 bg-slate-950 text-white hover:bg-slate-800"
                      : "border-slate-200 bg-white text-slate-800"
                  }`}
                >
                  <span className="font-semibold">{name}</span>
                  <span
                    className={`block text-xs ${
                      name === "Verify" ? "text-slate-300" : "text-slate-500"
                    }`}
                  >
                    {detail}
                  </span>
                </a>
              ))}
            </div>
          </div>
          <div className="rounded-md border border-slate-300 bg-white p-3 text-xs leading-5 text-slate-600">
            <strong className="text-slate-900">Core thesis:</strong> all modules
            write into one evidence record. Verify is the deep workflow; the
            dashboard proves the one-stop desk.
          </div>
        </aside>

        <div className="space-y-6">
          <section
            id="ask"
            className="grid gap-4 rounded-md border border-slate-300 bg-white p-5 md:grid-cols-[1fr_1fr]"
          >
            <SectionHeader
              eyebrow="Ask"
              title="Official-source answer before the document work starts."
              body="This copies InsureLobang's FAQ surface, but keeps the answer tied to the same evidence record used later."
            />
            <div className="rounded-md bg-[#f6f3ec] p-4">
              <p className="text-sm font-semibold text-slate-900">
                {DEMO_ASK.question}
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-700">
                {DEMO_ASK.answer}
              </p>
              <p className="mt-3 border-t border-slate-300 pt-3 text-xs leading-5 text-slate-500">
                {DEMO_ASK.source}
              </p>
            </div>
          </section>

          <section
            id="decode"
            className="rounded-md border border-slate-300 bg-white p-5"
          >
            <SectionHeader
              eyebrow="Decode"
              title="Policy facts extracted from the sample policy."
              body="This is the document-intelligence layer: policy facts become reusable evidence, not a one-time PDF summary."
            />
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {SEEDED_FACTS.slice(0, 9).map((fact) => (
                <div
                  key={fact.id}
                  className="rounded-md border border-slate-200 bg-slate-50 p-3"
                >
                  <p className="text-xs text-slate-500">{fact.label}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-950">
                    {String(fact.value)}
                    {fact.unit ? ` ${fact.unit}` : ""}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    {fact.sourceType}
                    {fact.page ? `, p.${fact.page}` : ""}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section
            id="verify"
            className="rounded-md border-2 border-slate-950 bg-white p-5"
          >
            <SectionHeader
              eyebrow="Verify"
              title="Adviser claims reconciled against policy evidence."
              body="This is the centerpiece. It copies InsureLobang's Check Advice tool, but grounds the check in document facts, calculations, and official-source context."
            />
            <div className="mt-5 space-y-4">
              {comparisons.map((comparison) => {
                const statement = SEEDED_STATEMENTS.find(
                  (item) => item.id === comparison.statementId
                );
                return (
                  <article
                    key={comparison.statementId}
                    className="rounded-md border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                          Adviser claim
                        </p>
                        <p className="mt-1 font-semibold text-slate-950">
                          &ldquo;{statement?.text}&rdquo;
                        </p>
                      </div>
                      <span
                        className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold ${STATE_STYLES[comparison.state]}`}
                      >
                        {STATE_LABELS[comparison.state]}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-700">
                      {comparison.explanation}
                    </p>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      {comparison.documentEvidence.map((evidence) => (
                        <blockquote
                          key={evidence.id}
                          className="rounded-md border-l-4 border-slate-400 bg-white p-3 text-xs leading-5 text-slate-600"
                        >
                          {evidence.quote}
                          {evidence.page ? ` (p.${evidence.page})` : ""}
                        </blockquote>
                      ))}
                    </div>
                    <p className="mt-3 rounded-md bg-slate-950 p-3 text-sm text-white">
                      Ask your licensed adviser:{" "}
                      {comparison.clarificationQuestion}
                    </p>
                  </article>
                );
              })}
            </div>
          </section>

          <section
            id="review"
            className="grid gap-4 rounded-md border border-slate-300 bg-white p-5 lg:grid-cols-[0.9fr_1.1fr]"
          >
            <SectionHeader
              eyebrow="Review"
              title="Context changes the questions, not the recommendation."
              body="This replaces a legally risky gap conclusion with discussion prompts that the user can bring to a licensed adviser."
            />
            <div className="space-y-3">
              <div className="rounded-md bg-[#f6f3ec] p-4 text-sm leading-6 text-slate-700">
                <p className="font-semibold text-slate-950">
                  {DEMO_USER_CONTEXT.name}
                </p>
                <p>{DEMO_USER_CONTEXT.situation}</p>
                <p>{DEMO_USER_CONTEXT.income}</p>
                <p>{DEMO_USER_CONTEXT.dependents}</p>
                <p>{DEMO_USER_CONTEXT.currentCover}</p>
              </div>
              {DEMO_DISCUSSION_PROMPTS.map((prompt) => (
                <p
                  key={prompt}
                  className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-700"
                >
                  {prompt}
                </p>
              ))}
            </div>
          </section>

          <section
            id="prepare"
            className="rounded-md border border-slate-300 bg-white p-5"
          >
            <SectionHeader
              eyebrow="Prepare"
              title="Meeting pack assembled from the evidence record."
              body="The output is not a recommendation. It is a sourced agenda for the next licensed adviser conversation."
            />
            <div id="report" className="mt-5 grid gap-4 lg:grid-cols-2">
              <div className="space-y-3">
                <h3 className="font-semibold text-slate-950">
                  Cost and value calculations
                </h3>
                {calculations.slice(0, 4).map((calc) => (
                  <div
                    key={calc.id}
                    className="rounded-md border border-slate-200 bg-slate-50 p-3"
                  >
                    <p className="text-sm font-semibold text-slate-950">
                      {calc.title}
                    </p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">
                      {calc.result}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      {calc.formula}
                    </p>
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                <h3 className="font-semibold text-slate-950">
                  Questions for licensed adviser
                </h3>
                {DEMO_PREP_QUESTIONS.slice(0, 7).map((question, index) => (
                  <div
                    key={question}
                    className="flex gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-700"
                  >
                    <span className="font-semibold text-slate-950">
                      {index + 1}.
                    </span>
                    <span>{question}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section
            id="history"
            className="grid gap-4 rounded-md border border-slate-300 bg-white p-5 lg:grid-cols-[1fr_1fr]"
          >
            <div>
              <SectionHeader
                eyebrow="History"
                title="Evidence record kept together."
                body="For the hackathon this is local demo state. The startup path is policy vault, annual review, family coverage map, and employer financial wellness."
              />
              <div className="mt-4 rounded-md bg-[#f6f3ec] p-4 text-sm leading-6 text-slate-700">
                <p>Policy facts: {SEEDED_FACTS.length}</p>
                <p>Adviser claims checked: {comparisons.length}</p>
                <p>Calculations generated: {calculations.length}</p>
                <p>Open adviser questions: {openQuestions.length}</p>
              </div>
            </div>
            <Firewall
              value={firewallInput}
              result={firewallResult}
              onChange={setFirewallInput}
              onTest={testFirewall}
            />
          </section>

          <section className="rounded-md border border-slate-300 bg-slate-950 p-5 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Compliance notice
            </p>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-200">
              {COMPLIANCE_NOTICE}
            </p>
          </section>

          <section className="rounded-md border border-slate-300 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Official-source grounding
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {OFFICIAL_SOURCES.slice(0, 4).map((source) => (
                <div
                  key={source.id}
                  className="rounded-md border border-slate-200 bg-slate-50 p-3"
                >
                  <p className="text-sm font-semibold text-slate-950">
                    {source.body} - {source.topic.replace(/-/g, " ")}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-slate-600">
                    {source.quote}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

function SectionHeader({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        {eyebrow}
      </p>
      <h2 className="mt-2 max-w-2xl text-2xl font-semibold tracking-normal text-slate-950">
        {title}
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{body}</p>
    </div>
  );
}

function EvidenceRecord({
  usedFallback,
  comparisonCount,
  calculationCount,
  questionCount,
}: {
  usedFallback: boolean;
  comparisonCount: number;
  calculationCount: number;
  questionCount: number;
}) {
  return (
    <div className="rounded-md border border-slate-300 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Shared evidence record
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">
            FA meeting tomorrow
          </h2>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${
            usedFallback
              ? "border-amber-300 bg-amber-50 text-amber-900"
              : "border-emerald-300 bg-emerald-50 text-emerald-900"
          }`}
        >
          {usedFallback ? "Demo-safe data" : "Live AI pass"}
        </span>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3">
        <Metric label="Policy facts" value={SEEDED_FACTS.length} />
        <Metric label="Claims checked" value={comparisonCount} />
        <Metric label="Calculations" value={calculationCount} />
        <Metric label="Open questions" value={questionCount} />
      </dl>
      <div className="mt-4 rounded-md bg-[#f6f3ec] p-3 text-sm leading-6 text-slate-700">
        <p className="font-semibold text-slate-950">
          {DEMO_USER_CONTEXT.goal}
        </p>
        <p className="mt-1">
          Every module writes back to this record: official answer, policy
          facts, claim checks, calculations, and adviser questions.
        </p>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold text-slate-950">{value}</dd>
    </div>
  );
}

function Firewall({
  value,
  result,
  onChange,
  onTest,
}: {
  value: string;
  result: ReturnType<typeof checkCompliance>;
  onChange: (value: string) => void;
  onTest: (value?: string) => void;
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        Decision firewall
      </p>
      <h3 className="mt-2 text-xl font-semibold text-slate-950">
        Refuse advice, redirect to evidence.
      </h3>
      <div className="mt-4 flex gap-2">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-slate-950"
        />
        <button
          onClick={() => onTest()}
          className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
        >
          Test
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {DEMO_UNSAFE_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            onClick={() => onTest(prompt)}
            className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs text-slate-700"
          >
            {prompt}
          </button>
        ))}
      </div>
      <div
        className={`mt-4 rounded-md border p-3 text-sm leading-6 ${
          result.blocked
            ? "border-rose-300 bg-rose-50 text-rose-900"
            : "border-emerald-300 bg-emerald-50 text-emerald-900"
        }`}
      >
        {result.blocked ? (
          <>
            <p className="font-semibold">Blocked regulated-advice request</p>
            <p className="mt-1">{result.reason}</p>
            <p className="mt-2 text-rose-800">{result.redirect}</p>
          </>
        ) : (
          <p>
            This input can be handled as factual evidence, document comparison,
            or meeting-prep support.
          </p>
        )}
      </div>
    </div>
  );
}
