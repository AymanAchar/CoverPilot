"use client";

import { useState } from "react";
import type {
  CalculationCard,
  ReportResponse,
  SourceComparison,
  UserStatement,
} from "@/types";
import Link from "next/link";
import { buildMeetingReadiness } from "@/lib/advice-workflows";
import {
  createCaseEvent,
  loadCheckWorkspace,
  loadPolicyWorkspace,
  updateCaseWorkspace,
  type PolicyWorkspaceSource,
} from "@/lib/workspace-session";

const LOADING_STEPS = [
  "Reading policy…",
  "Extracting facts…",
  "Comparing statements…",
  "Calculating figures…",
  "Preparing your questions…",
];

export default function PreparePage() {
  const [policyWorkspace] = useState(() => loadPolicyWorkspace());
  const [checkWorkspace] = useState(() => loadCheckWorkspace());
  const [report, setReport] = useState<ReportResponse["report"] | null>(null);
  const [loadingStep, setLoadingStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facts] = useState(() => policyWorkspace?.facts ?? []);
  const [statements] = useState<UserStatement[]>(
    () => checkWorkspace?.statements ?? []
  );
  const [policySource] = useState<PolicyWorkspaceSource>(
    () => policyWorkspace?.source ?? "sample"
  );
  const [savedComparisons] = useState<SourceComparison[] | null>(
    () => checkWorkspace?.comparisons ?? null
  );
  const [savedCalculations] = useState<CalculationCard[] | null>(
    () => checkWorkspace?.calculations ?? null
  );
  const readiness = buildMeetingReadiness(
    facts,
    savedComparisons ?? [],
    savedCalculations ?? []
  );

  async function generateReport() {
    setError(null);
    setReport(null);
    setLoadingStep(LOADING_STEPS[0]);

    const stepTimer = window.setInterval(() => {
      setLoadingStep((prev) => {
        const idx = LOADING_STEPS.indexOf(prev ?? "");
        return LOADING_STEPS[Math.min(idx + 1, LOADING_STEPS.length - 1)];
      });
    }, 1400);

    try {
      let comparisons = savedComparisons;
      let calculations = savedCalculations;

      if (!comparisons || !calculations) {
        const compareRes = await fetch("/api/statements/compare", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ facts, statements }),
        });
        if (!compareRes.ok) throw new Error("Comparison failed. Please try again.");
        const compareData = await compareRes.json();
        if (compareData.blocked) throw new Error(compareData.blockReason);
        comparisons = compareData.comparisons;
        calculations = compareData.calculations;
      }

      const reportRes = await fetch("/api/report/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          facts,
          comparisons,
          calculations,
        }),
      });
      if (!reportRes.ok) throw new Error("Report generation failed. Please try again.");
      const reportData: ReportResponse = await reportRes.json();
      updateCaseWorkspace((current) => ({
        ...current,
        facts,
        factsSource: policySource,
        statements,
        comparisons: comparisons ?? [],
        calculations: calculations ?? [],
        report: reportData.report,
        events: [
          ...current.events,
          createCaseEvent(
            "Meeting pack prepared",
            `${reportData.report.questionsForLicensedAdviser.length} questions were saved from the Prepare page.`
          ),
        ],
      }));
      setReport(reportData.report);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      clearInterval(stepTimer);
      setLoadingStep(null);
    }
  }

  return (
    <main className="cp-page">
      <div className="cp-shell">
        <header className="cp-nav">
          <Link href="/" className="font-display text-2xl font-light">
            Claro
          </Link>
          <nav className="cp-nav-links">
            <Link href="/check">Check</Link>
            <Link href="/decode">Decode</Link>
            <Link href="/needs">Needs</Link>
            <Link href="/my-case">My Case</Link>
          </nav>
        </header>

        <div className="cp-workspace">
          <section className="cp-route-header">
            <div>
              <p className="cg-kicker">Prepare</p>
              <h1 className="cp-route-title">Prepare for the adviser meeting.</h1>
            </div>
            <p className="cp-route-copy">
            Turn your document and checked claims into a readiness pack:
            what to bring, what to clarify in the meeting, and what to save
            afterwards.
          </p>
            <div className="cp-empty">
              {facts.length} policy facts. {statements.length} checked claim(s).
            </div>
          </section>

          <section className="cp-stack">
            <section className="cp-panel cp-panel-pad space-y-5">
              <div>
                <p className="cp-source-label">Meeting readiness</p>
                <h2 className="text-2xl font-medium tracking-[-0.01em]">
                  Before, during, and after the FA conversation
                </h2>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  This is the Zocks/Jump-style workflow layer: Claro turns
                  documents and claims into an action pack without crossing into
                  buy, keep, cancel, switch, or recommendation advice.
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <ReadinessColumn title="Before" items={readiness.before} />
                <ReadinessColumn title="During" items={readiness.during} />
                <ReadinessColumn title="After" items={readiness.after} />
              </div>
            </section>

        {!report && (facts.length === 0 || statements.length === 0) && (
              <div className="cp-panel cp-panel-pad space-y-4">
                <p className="text-sm font-medium">
              Prepare needs a document and at least one checked adviser claim.
            </p>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              This page should not invent a sample meeting pack before you have
              added your own material.
            </p>
                <ol className="space-y-2 text-sm leading-6 text-[var(--muted)]">
                  <li>
                    <span className="text-[var(--foreground)]">1.</span>{" "}
                    Use Decode to load the policy illustration or financial document.
                  </li>
                  <li>
                    <span className="text-[var(--foreground)]">2.</span>{" "}
                    Use Check to split and verify what the adviser said.
                  </li>
                  <li>
                    <span className="text-[var(--foreground)]">3.</span>{" "}
                    Return here to generate the meeting-prep report.
                  </li>
                </ol>
                <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/decode"
                    className="primary-button"
              >
                Understand a document
              </Link>
              <Link
                href="/check"
                    className="secondary-button"
              >
                Check what my adviser said
              </Link>
            </div>
          </div>
        )}

        {!report && facts.length > 0 && statements.length > 0 && (
          <div className="space-y-4">
            <button
              onClick={generateReport}
              disabled={!!loadingStep}
                  className="primary-button disabled:opacity-50"
            >
              {loadingStep ?? "Generate meeting-prep report"}
            </button>

            {loadingStep && (
                  <div className="cp-panel cp-panel-pad space-y-2">
                {LOADING_STEPS.map((step) => {
                  const current = LOADING_STEPS.indexOf(loadingStep);
                  const idx = LOADING_STEPS.indexOf(step);
                  return (
                    <div key={step} className="flex items-center gap-3 text-sm">
                      {idx < current ? (
                            <span className="w-12 text-[var(--success)]">Done</span>
                      ) : idx === current ? (
                            <span className="inline-block h-4 w-4 animate-spin rounded-full border border-[var(--line)] border-t-[var(--foreground)]" />
                      ) : (
                            <span className="h-4 w-4 rounded-full border border-[var(--line)]" />
                      )}
                          <span className={idx <= current ? "text-[var(--foreground)]" : "text-[var(--soft)]"}>
                        {step}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {error && (
                  <div className="cp-error">
                    <p>{error}</p>
              </div>
            )}
          </div>
        )}

        {report && (
          <div className="space-y-8">
            <section className="space-y-3">
                  <h2 className="border-b border-[var(--line)] pb-2 text-lg font-semibold">
                Policy Facts
              </h2>
              {report.policySummary.slice(0, 6).map((fact) => (
                <div key={fact.id} className="flex justify-between gap-4 text-sm">
                      <span className="text-[var(--muted)]">{fact.label}</span>
                  <span className="font-medium text-right">
                    {String(fact.value)}
                    {fact.unit ? ` ${fact.unit}` : ""}
                  </span>
                </div>
              ))}
            </section>

            <section className="space-y-3">
                  <h2 className="border-b border-[var(--line)] pb-2 text-lg font-semibold">
                Calculations
              </h2>
              {report.calculations.map((c) => (
                <div
                  key={c.id}
                      className="cp-panel cp-panel-pad"
                >
                      <p className="text-sm text-[var(--muted)]">{c.title}</p>
                      <p className="mt-1 text-xl font-semibold">{c.result}</p>
                      <p className="mt-1 text-xs text-[var(--muted)]">{c.caveat}</p>
                </div>
              ))}
            </section>

            <section className="space-y-3">
                  <h2 className="border-b border-[var(--line)] pb-2 text-lg font-semibold">
                Questions for Your Licensed Adviser
              </h2>
              <ol className="space-y-2">
                {report.questionsForLicensedAdviser.map((q, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                        <span className="shrink-0 text-[var(--muted)]">{i + 1}.</span>
                        <span>{q}</span>
                  </li>
                ))}
              </ol>
            </section>

                <div className="cp-empty">
                  <p>{report.complianceNotice}</p>
            </div>
          </div>
        )}
          </section>
        </div>
      </div>
    </main>
  );
}

function ReadinessColumn({
  title,
  items,
}: {
  title: string;
  items: Array<{ title: string; detail: string; action: string }>;
}) {
  return (
    <div className="cp-readiness-column">
      <p className="cp-source-label">{title}</p>
      <div className="space-y-3">
        {items.map((item) => (
          <article key={`${title}-${item.title}`} className="space-y-2">
            <h3 className="text-sm font-medium">{item.title}</h3>
            <p className="text-xs leading-5 text-[var(--muted)]">{item.detail}</p>
            <p className="text-xs leading-5">{item.action}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
