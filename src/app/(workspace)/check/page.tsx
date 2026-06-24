"use client";

import { useState } from "react";
import type {
  CompareResponse,
  SourceComparison,
  CalculationCard,
  PolicyFact,
  UserStatement,
} from "@/types";
import { SEEDED_FACTS, SEEDED_STATEMENTS } from "@/data/seeded-policy";
import Link from "next/link";
import { checkCompliance } from "@/lib/compliance";
import {
  createCaseEvent,
  loadPolicyWorkspace,
  saveCheckWorkspace,
  updateCaseWorkspace,
  type PolicyWorkspaceSource,
} from "@/lib/workspace-session";
import {
  classifyFinancialStatement,
  splitFinancialClaims,
  topicForText,
} from "@/lib/financial-topic-intelligence";

const STATE_LABELS: Record<SourceComparison["state"], string> = {
  "matches-document": "Found in document",
  "partially-matches": "Partially found",
  "not-found": "No matching section found",
  "needs-source-reconciliation": "Ask adviser to clarify",
  "calculation-differs": "Calculation differs",
};

const STATE_COLORS: Record<SourceComparison["state"], string> = {
  "matches-document": "bg-green-900 text-green-300 border-green-700",
  "partially-matches": "bg-yellow-900 text-yellow-300 border-yellow-700",
  "not-found": "bg-slate-700 text-slate-300 border-slate-600",
  "needs-source-reconciliation": "bg-orange-900 text-orange-300 border-orange-700",
  "calculation-differs": "bg-red-900 text-red-300 border-red-700",
};

const LOADING_STEPS = [
  "Running compliance check…",
  "Comparing statements against document…",
  "Running calculations…",
  "Almost done…",
];

const EXAMPLE_CLAIMS = [
  "This plan is low-cost and most of your premium goes into savings.",
  "The returns are basically guaranteed if you hold it long enough.",
  "You can surrender anytime and still get your money back.",
  "This gives you both protection and investment growth.",
];

export default function CheckPage() {
  const [policyWorkspace] = useState(() => loadPolicyWorkspace());
  const [facts] = useState<PolicyFact[]>(() => policyWorkspace?.facts ?? SEEDED_FACTS);
  const [policySource] = useState<PolicyWorkspaceSource>(
    () => policyWorkspace?.source ?? "sample"
  );
  const [statements, setStatements] = useState<UserStatement[]>([]);
  const [result, setResult] = useState<CompareResponse | null>(null);
  const [loadingStep, setLoadingStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [claimInput, setClaimInput] = useState("");
  const compliance = checkCompliance(claimInput);

  async function runCheck() {
    if (statements.length === 0) {
      setError("Add at least one checkable point first.");
      return;
    }
    setError(null);
    setResult(null);
    setLoadingStep(LOADING_STEPS[0]);

    const stepTimer = window.setInterval(() => {
      setLoadingStep((prev) => {
        const idx = LOADING_STEPS.indexOf(prev ?? "");
        return LOADING_STEPS[Math.min(idx + 1, LOADING_STEPS.length - 1)];
      });
    }, 1800);

    try {
      const res = await fetch("/api/statements/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ facts, statements }),
      });
      if (!res.ok) throw new Error("Comparison failed. Please try again.");
      const data: CompareResponse = await res.json();
      if (!data.blocked) {
        saveCheckWorkspace(statements, data.comparisons, data.calculations);
        updateCaseWorkspace((current) => ({
          ...current,
          facts,
          factsSource: policySource,
          statements,
          comparisons: data.comparisons,
          calculations: data.calculations,
          report: null,
          events: [
            ...current.events,
            createCaseEvent(
              "Evidence review generated",
              `${data.comparisons.length} claims were checked from the Check page.`
            ),
          ],
        }));
      }
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      clearInterval(stepTimer);
      setLoadingStep(null);
    }
  }

  function splitInputIntoClaims() {
    setError(null);
    if (!claimInput.trim()) {
      setError("Paste what your adviser said first.");
      return;
    }
    if (compliance.blocked) {
      setStatements([]);
      return;
    }
    setResult(null);
    setStatements(splitFinancialClaims(claimInput));
  }

  function updateStatement(id: string, text: string) {
    setStatements((prev) =>
      prev.map((statement) =>
        statement.id === id
          ? { ...statement, text, category: classifyFinancialStatement(text) }
          : statement
      )
    );
  }

  function removeStatement(id: string) {
    setStatements((prev) => prev.filter((statement) => statement.id !== id));
  }

  function loadDemoClaims() {
    setClaimInput(SEEDED_STATEMENTS.map((statement) => statement.text).join("\n"));
    setStatements(SEEDED_STATEMENTS);
    setResult(null);
    setError(null);
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white px-6 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-slate-400 hover:text-white text-sm">
            ← Home
          </Link>
          <Link href="/case-review" className="text-slate-400 hover:text-white text-sm">
            Case Review
          </Link>
          <Link href="/my-case" className="text-slate-400 hover:text-white text-sm">
            My Case
          </Link>
        </div>

        <div>
          <h1 className="text-2xl font-bold">Check what my adviser said</h1>
          <p className="text-slate-400 mt-1">
            Paste a claim from WhatsApp, a meeting, or a sales pitch. CoverPilot
            turns it into checkable points and prepares questions for your next
            conversation.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <p className="text-slate-300 text-sm font-medium">
            Active policy: {facts.length} facts loaded
          </p>
          <p className="text-slate-500 text-xs mt-1">
            {policySource === "uploaded"
              ? "Using facts extracted from the uploaded policy in Decode."
              : policySource === "sample-fallback"
                ? "Using sample facts because the uploaded PDF could not be extracted reliably."
                : "Using the sample policy. Decode a policy first to run this check on uploaded facts."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/decode"
              className="text-xs text-blue-300 underline underline-offset-4 hover:text-blue-200"
            >
              Upload or decode a document first
            </Link>
            <span className="text-slate-700">/</span>
            <button
              onClick={loadDemoClaims}
              className="text-xs text-blue-300 underline underline-offset-4 hover:text-blue-200"
            >
              Use demo claims
            </button>
          </div>
        </div>

        <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div>
            <label htmlFor="claim-input" className="text-sm font-medium text-slate-200">
              What did your adviser say?
            </label>
            <textarea
              id="claim-input"
              value={claimInput}
              onChange={(e) => {
                setClaimInput(e.target.value);
                setResult(null);
              }}
              placeholder="Example: This plan is low-cost, the returns are basically guaranteed, and you can surrender anytime."
              rows={5}
              className="mt-2 w-full resize-none rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {EXAMPLE_CLAIMS.map((claim) => (
              <button
                key={claim}
                onClick={() => {
                  setClaimInput(claim);
                  setStatements(splitFinancialClaims(claim));
                  setResult(null);
                  setError(null);
                }}
                className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:border-blue-500 hover:text-white"
              >
                {claim}
              </button>
            ))}
          </div>

          {compliance.blocked && (
            <div className="rounded-lg border border-amber-800 bg-amber-950 p-4 text-sm">
              <p className="font-medium text-amber-200">
                CoverPilot cannot answer that directly.
              </p>
              <p className="mt-1 text-amber-100">{compliance.reason}</p>
              <p className="mt-2 text-amber-300">{compliance.redirect}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              onClick={splitInputIntoClaims}
              disabled={compliance.blocked}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Split into checkable points
            </button>
            <p className="self-center text-xs text-slate-500">
              You can edit the points before running the check.
            </p>
          </div>
        </div>

        {statements.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-300">Checkable points</p>
              <p className="text-xs text-slate-500">{statements.length} point(s)</p>
            </div>
            {statements.map((s, i) => (
              <div
                key={s.id}
                className="grid gap-3 rounded-lg border border-slate-700 bg-slate-800 p-3 sm:grid-cols-[auto_1fr_auto]"
              >
                  <span className="mt-2 text-sm text-slate-500">{i + 1}.</span>
                <div className="space-y-2">
                  <textarea
                    value={s.text}
                    onChange={(e) => updateStatement(s.id, e.target.value)}
                    rows={2}
                    className="w-full resize-none rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-400">
                      {topicForText(s.text).label}
                    </span>
                    <span className="text-[11px] text-slate-600">
                      CoverPilot checks this with policy facts and public guidance where available.
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => removeStatement(s.id)}
                  className="self-start rounded border border-slate-700 px-3 py-2 text-xs text-slate-400 hover:border-red-700 hover:text-red-300"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={runCheck}
          disabled={!!loadingStep || statements.length === 0}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium px-5 py-2.5 rounded-lg transition-colors"
        >
          {loadingStep ?? "Check statements"}
        </button>

        {loadingStep && (
          <div className="flex items-center gap-3 text-slate-400 text-sm">
            <span className="inline-block w-4 h-4 border-2 border-slate-600 border-t-blue-400 rounded-full animate-spin" />
            {loadingStep}
          </div>
        )}

        {error && (
          <div className="bg-red-950 border border-red-800 rounded-lg p-4">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {result?.blocked && (
          <div className="bg-red-950 border border-red-800 rounded-lg p-4 space-y-2">
            <p className="font-semibold text-red-300">CoverPilot cannot answer this</p>
            <p className="text-red-200 text-sm">{result.blockReason}</p>
          </div>
        )}

        {result && !result.blocked && (
          <div className="space-y-4">
            <h2 className="font-semibold text-lg">Statement Comparisons</h2>
            {result.comparisons.map((c) => {
              const stmt = statements.find((s) => s.id === c.statementId);
              return (
                <div
                  key={c.statementId}
                  className="bg-slate-800 border border-slate-700 rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium text-sm">&ldquo;{stmt?.text}&rdquo;</p>
                    <span
                      className={`text-xs px-2 py-0.5 rounded border whitespace-nowrap ${STATE_COLORS[c.state]}`}
                    >
                      {STATE_LABELS[c.state]}
                    </span>
                  </div>
                  <p className="text-slate-300 text-sm">{c.explanation}</p>
                  {c.documentEvidence.length > 0 && (
                    <div className="space-y-1">
                      {c.documentEvidence.map((e) => (
                        <div
                          key={e.id}
                          className="border-l-2 border-slate-600 pl-3 text-xs text-slate-400"
                        >
                          <div className="mb-1 font-mono text-[10px] uppercase tracking-wide text-slate-500">
                            {e.sourceType === "official-source"
                              ? `${e.sourceName ?? "Official source"}${e.verifiedOn ? ` · verified ${e.verifiedOn}` : ""}`
                              : `Policy document${e.page ? ` · p.${e.page}` : ""}`}
                          </div>
                          <blockquote className="italic">
                            {e.quote ?? String(e.value)}
                          </blockquote>
                          {e.sourceUrl && (
                            <a
                              href={e.sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-1 inline-block text-blue-300 underline underline-offset-4 hover:text-blue-200"
                            >
                              View source
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-blue-400 text-sm">
                    Ask your adviser: {c.clarificationQuestion}
                  </p>
                </div>
              );
            })}

            {result.calculations.length > 0 && (
              <>
                <h2 className="font-semibold text-lg pt-2">Calculation Cards</h2>
                {result.calculations.map((calc) => (
                  <CalcCard key={calc.id} calc={calc} />
                ))}
              </>
            )}

            <div className="pt-2">
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/prepare"
                  className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-5 py-2.5 rounded-lg transition-colors inline-block"
                >
                  Prepare meeting pack →
                </Link>
                <Link
                  href="/decode"
                  className="border border-slate-700 bg-slate-900 hover:bg-slate-800 text-white font-medium px-5 py-2.5 rounded-lg transition-colors inline-block"
                >
                  Decode another document
                </Link>
              </div>
              <p className="mt-3 text-xs leading-5 text-slate-500">
                CoverPilot helps you prepare questions. It does not decide
                whether to buy, keep, cancel, or switch a product.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CalcCard({ calc }: { calc: CalculationCard }) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 space-y-2">
      <h3 className="font-medium text-sm">{calc.title}</h3>
      <p className="text-slate-400 text-xs font-mono">{calc.formula}</p>
      <p className="text-xl font-bold text-white">{calc.result}</p>
      <p className="text-slate-500 text-xs">{calc.caveat}</p>
    </div>
  );
}
