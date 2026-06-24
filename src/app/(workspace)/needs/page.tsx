"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { buildNeedsSnapshot } from "@/lib/advice-workflows";
import {
  createCaseEvent,
  DEFAULT_USER_CONTEXT,
  loadCaseWorkspace,
  loadPolicyWorkspace,
  updateCaseWorkspace,
} from "@/lib/workspace-session";
import type { UserContext } from "@/types";

const FIELD_LABELS: Array<{
  key: keyof UserContext;
  label: string;
  placeholder: string;
}> = [
  {
    key: "situation",
    label: "Situation",
    placeholder: "Example: First FA meeting, reviewing whole life policy",
  },
  {
    key: "age",
    label: "Age / life stage",
    placeholder: "Example: 25, first full-time job",
  },
  {
    key: "income",
    label: "Income / cash flow",
    placeholder: "Example: S$4,000/month",
  },
  {
    key: "dependents",
    label: "Dependants",
    placeholder: "Example: No dependants, supporting parents, young children",
  },
  {
    key: "currentCover",
    label: "Existing cover",
    placeholder: "Example: Employer coverage only, existing term plan",
  },
  {
    key: "concern",
    label: "Main concern",
    placeholder: "Example: Not sure if the premium is sustainable",
  },
];

const SAMPLE_CONTEXT: UserContext = {
  situation: "Reviewing a whole life policy before a follow-up FA meeting",
  age: "28, first full-time job",
  income: "S$5,000/month",
  dependents: "No children, but contributes to parents' household expenses",
  currentCover: "Employer medical cover and a small term life policy",
  concern: "I am not sure whether the premium commitment and surrender values were explained clearly.",
};

export default function NeedsPage() {
  const [policyWorkspace] = useState(() => loadPolicyWorkspace());
  const [context, setContext] = useState<UserContext>(() => {
    const saved = loadCaseWorkspace();
    return saved?.context ?? DEFAULT_USER_CONTEXT;
  });
  const [saved, setSaved] = useState(false);
  const facts = useMemo(
    () => policyWorkspace?.facts ?? [],
    [policyWorkspace]
  );
  const snapshot = useMemo(
    () => buildNeedsSnapshot(context, facts),
    [context, facts]
  );

  function updateField(key: keyof UserContext, value: string) {
    setSaved(false);
    setContext((current) => ({ ...current, [key]: value }));
  }

  function saveSnapshot() {
    updateCaseWorkspace((current) => ({
      ...current,
      context,
      facts: facts.length > 0 ? facts : current.facts,
      factsSource: policyWorkspace?.source ?? current.factsSource,
      events: [
        ...current.events,
        createCaseEvent(
          "Needs snapshot prepared",
          "User context was mapped into known inputs, missing context, and adviser questions."
        ),
      ],
    }));
    setSaved(true);
  }

  function useSampleContext() {
    setContext(SAMPLE_CONTEXT);
    setSaved(false);
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
            <Link href="/ask">Ask</Link>
            <Link href="/my-case">My Case</Link>
          </nav>
        </header>

        <div className="cp-workspace">
          <section className="cp-route-header">
            <div>
              <p className="cg-kicker">Needs snapshot</p>
              <h1 className="cp-route-title">Map what your advice should cover.</h1>
            </div>
            <p className="cp-route-copy">
              A non-advisory coverage and context map inspired by Singapore
              pre-AI policy vaults, gap tools, and InsureLobang-style consumer
              clarity. Claro shows what is known, what is missing, and what to ask.
            </p>
            <div className="cp-empty">
              {facts.length > 0
                ? `${facts.length} document facts can be used as context.`
                : "No document loaded yet. You can still map your situation first."}
            </div>
          </section>

          <section className="cp-stack">
            <section className="cp-panel cp-panel-pad space-y-5">
              <div>
                <p className="cp-source-label">Your context</p>
                <h2 className="text-2xl font-medium tracking-[-0.01em]">
                  Build the discussion map
                </h2>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {FIELD_LABELS.map((field) => (
                  <label key={field.key} className="space-y-2">
                    <span className="cp-label">{field.label}</span>
                    <textarea
                      value={context[field.key]}
                      onChange={(event) => updateField(field.key, event.target.value)}
                      placeholder={field.placeholder}
                      rows={3}
                      className="cp-input min-h-24"
                    />
                  </label>
                ))}
              </div>

              <div className="flex flex-wrap gap-3">
                <button onClick={saveSnapshot} className="primary-button">
                  Save to My Case
                </button>
                <button onClick={useSampleContext} className="secondary-button">
                  Use sample context
                </button>
              </div>
              {saved && (
                <p className="text-sm text-[var(--success)]">
                  Needs snapshot saved to My Case.
                </p>
              )}
            </section>

            <section className="grid gap-3 md:grid-cols-2">
              <div className="cp-panel cp-panel-pad space-y-4">
                <div>
                  <p className="cp-source-label">Known inputs</p>
                  <h2 className="text-lg font-medium">What Claro can anchor on</h2>
                </div>
                {snapshot.known.map((item) => (
                  <SnapshotItem key={`known-${item.title}`} item={item} />
                ))}
              </div>

              <div className="cp-panel cp-panel-pad space-y-4">
                <div>
                  <p className="cp-source-label">Missing context</p>
                  <h2 className="text-lg font-medium">What should be clarified</h2>
                </div>
                {snapshot.missing.length > 0 ? (
                  snapshot.missing.map((item) => (
                    <SnapshotItem key={`missing-${item.title}`} item={item} />
                  ))
                ) : (
                  <p className="text-sm leading-6 text-[var(--muted)]">
                    The key context fields are filled. The next step is checking
                    whether the adviser&apos;s recommendation actually addresses them.
                  </p>
                )}
              </div>
            </section>

            <section className="cp-panel cp-panel-pad space-y-4">
              <div>
                <p className="cp-source-label">Adviser questions</p>
                <h2 className="text-lg font-medium">
                  Questions this situation should answer
                </h2>
              </div>
              <ol className="space-y-3">
                {snapshot.questions.map((question, index) => (
                  <li key={question} className="flex gap-3 text-sm leading-6">
                    <span className="font-mono text-xs text-[var(--soft)]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span>{question}</span>
                  </li>
                ))}
              </ol>
              <div className="flex flex-wrap gap-3 pt-2">
                <Link href="/decode" className="secondary-button">
                  Add document
                </Link>
                <Link href="/check" className="secondary-button">
                  Check adviser claim
                </Link>
                <Link href="/prepare" className="primary-button">
                  Prepare meeting pack
                </Link>
              </div>
            </section>
          </section>
        </div>
      </div>
    </main>
  );
}

function SnapshotItem({
  item,
}: {
  item: { title: string; detail: string; action: string };
}) {
  return (
    <article className="cp-snapshot-item">
      <h3 className="text-sm font-medium">{item.title}</h3>
      <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{item.detail}</p>
      <p className="mt-2 text-xs leading-5">{item.action}</p>
    </article>
  );
}
