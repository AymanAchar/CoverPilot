"use client";

import Link from "next/link";
import { useState } from "react";
import type { FinancialQuestionResponse, PolicyFact } from "@/types";
import { SEEDED_FACTS } from "@/data/seeded-policy";
import {
  createCaseEvent,
  loadPolicyWorkspace,
  updateCaseWorkspace,
  type PolicyWorkspaceSource,
} from "@/lib/workspace-session";

const EXAMPLE_QUESTIONS = [
  "What should I check before signing a whole life policy?",
  "What does distribution cost mean in a policy illustration?",
  "What is the difference between guaranteed and projected surrender value?",
  "What should I ask if my adviser says I can surrender anytime?",
];

const LOADING_STEPS = [
  "Finding the financial topic…",
  "Pulling policy and public-source context…",
  "Preparing adviser questions…",
];

export default function AskPage() {
  const [policyWorkspace] = useState(() => loadPolicyWorkspace());
  const [facts] = useState<PolicyFact[]>(() => policyWorkspace?.facts ?? SEEDED_FACTS);
  const [policySource] = useState<PolicyWorkspaceSource>(
    () => policyWorkspace?.source ?? "sample"
  );
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<FinancialQuestionResponse | null>(null);
  const [loadingStep, setLoadingStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function askQuestion(nextQuestion = question) {
    if (!nextQuestion.trim()) {
      setError("Ask a financial question first.");
      return;
    }
    setError(null);
    setAnswer(null);
    setLoadingStep(LOADING_STEPS[0]);

    const stepTimer = window.setInterval(() => {
      setLoadingStep((prev) => {
        const idx = LOADING_STEPS.indexOf(prev ?? "");
        return LOADING_STEPS[Math.min(idx + 1, LOADING_STEPS.length - 1)];
      });
    }, 1200);

    try {
      const res = await fetch("/api/questions/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: nextQuestion, facts }),
      });
      if (!res.ok) throw new Error("Could not answer that question yet.");
      const data: FinancialQuestionResponse = await res.json();
      if (!data.blocked) {
        updateCaseWorkspace((current) => ({
          ...current,
          facts,
          factsSource: policySource,
          events: [
            ...current.events,
            createCaseEvent(
              "Financial question answered",
              data.topic
                ? `Question routed to ${data.topic}.`
                : "A financial question was answered."
            ),
          ],
        }));
      }
      setAnswer(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      clearInterval(stepTimer);
      setLoadingStep(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm text-slate-400 hover:text-white">
            ← Home
          </Link>
          <Link href="/check" className="text-sm text-slate-400 hover:text-white">
            Check
          </Link>
          <Link href="/decode" className="text-sm text-slate-400 hover:text-white">
            Decode
          </Link>
          <Link href="/my-case" className="text-sm text-slate-400 hover:text-white">
            My Case
          </Link>
        </div>

        <div>
          <h1 className="text-2xl font-bold">Ask a financial question</h1>
          <p className="mt-1 text-slate-400">
            Ask about Singapore insurance or financial-advisory concepts.
            CoverPilot answers with policy context, public guidance, and
            questions for a licensed adviser.
          </p>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
          <p className="text-sm font-medium text-slate-300">
            Context available: {facts.length} policy facts
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {policySource === "uploaded"
              ? "Using facts extracted from your uploaded document."
              : policySource === "sample-fallback"
                ? "Using sample facts because upload extraction fell back."
                : "Using sample policy facts. Decode your own document to personalise the context."}
          </p>
        </div>

        <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-5">
          <label htmlFor="financial-question" className="text-sm font-medium text-slate-200">
            What do you want to understand?
          </label>
          <textarea
            id="financial-question"
            value={question}
            onChange={(e) => {
              setQuestion(e.target.value);
              setAnswer(null);
            }}
            placeholder="Example: What should I check before signing a whole life policy?"
            rows={5}
            className="w-full resize-none rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none"
          />

          <div className="flex flex-wrap gap-2">
            {EXAMPLE_QUESTIONS.map((example) => (
              <button
                key={example}
                onClick={() => {
                  setQuestion(example);
                  void askQuestion(example);
                }}
                className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:border-blue-500 hover:text-white"
              >
                {example}
              </button>
            ))}
          </div>

          <button
            onClick={() => void askQuestion()}
            disabled={!!loadingStep}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
          >
            {loadingStep ?? "Answer question"}
          </button>
        </div>

        {loadingStep && (
          <div className="flex items-center gap-3 text-sm text-slate-400">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-t-blue-400" />
            {loadingStep}
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-800 bg-red-950 p-4">
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {answer?.blocked && (
          <div className="space-y-2 rounded-lg border border-amber-800 bg-amber-950 p-4">
            <p className="font-semibold text-amber-200">CoverPilot cannot answer that directly</p>
            <p className="text-sm text-amber-100">{answer.blockReason}</p>
          </div>
        )}

        {answer && !answer.blocked && (
          <div className="space-y-5">
            <div className="rounded-lg border border-slate-700 bg-slate-800 p-4">
              <p className="font-mono text-xs uppercase tracking-wide text-slate-500">
                Routed topic
              </p>
              <h2 className="mt-2 text-lg font-semibold">{answer.topic}</h2>
              <div className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
                {answer.answer?.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </div>

            {!!answer.sourceFacts?.length && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold">Sources used</h2>
                {answer.sourceFacts.map((fact) => (
                  <div
                    key={fact.id}
                    className="rounded-lg border border-slate-700 bg-slate-800 p-4 text-sm"
                  >
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="font-medium">{fact.label}</p>
                      <span className="rounded border border-slate-600 px-2 py-0.5 font-mono text-[10px] uppercase text-slate-400">
                        {fact.sourceType === "official-source"
                          ? fact.sourceName
                          : "Policy"}
                      </span>
                    </div>
                    <blockquote className="border-l-2 border-slate-600 pl-3 text-xs italic text-slate-400">
                      {fact.quote ?? String(fact.value)}
                      {fact.page ? ` (p.${fact.page})` : ""}
                    </blockquote>
                    {fact.sourceUrl && (
                      <a
                        href={fact.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-block text-xs text-blue-300 underline underline-offset-4 hover:text-blue-200"
                      >
                        View source
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}

            {!!answer.questionsForLicensedAdviser?.length && (
              <div className="rounded-lg border border-blue-900 bg-blue-950/40 p-4">
                <h2 className="text-lg font-semibold text-blue-100">
                  Ask a licensed adviser
                </h2>
                <ul className="mt-3 space-y-2 text-sm text-blue-100">
                  {answer.questionsForLicensedAdviser.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>
            )}

            {!!answer.relatedActions?.length && (
              <div className="flex flex-wrap gap-3">
                {answer.relatedActions.map((action) => (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
                  >
                    {action.label}
                  </Link>
                ))}
              </div>
            )}

            <p className="text-xs leading-5 text-slate-500">
              {answer.complianceNotice}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
