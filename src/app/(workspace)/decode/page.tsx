"use client";

import { useState } from "react";
import type { PolicyFact, ExtractResponse } from "@/types";
import Link from "next/link";

export default function DecodePage() {
  const [facts, setFacts] = useState<PolicyFact[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadSeeded() {
    setLoading(true);
    const res = await fetch("/api/policy/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "seeded" }),
    });
    const data: ExtractResponse = await res.json();
    setFacts(data.facts);
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white px-6 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-slate-400 hover:text-white text-sm">
            ← Home
          </Link>
        </div>

        <div>
          <h1 className="text-2xl font-bold">📄 Decode</h1>
          <p className="text-slate-400 mt-1">
            Extract structured facts from a policy document.
          </p>
        </div>

        {!facts && (
          <div className="space-y-3">
            <button
              onClick={loadSeeded}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium px-5 py-2.5 rounded-lg transition-colors"
            >
              {loading ? "Reading policy…" : "Use sample policy"}
            </button>
            <p className="text-slate-500 text-xs">
              Real PDF upload coming soon. Use the sample policy for the demo.
            </p>
          </div>
        )}

        {facts && (
          <div className="space-y-3">
            <p className="text-slate-400 text-sm">
              {facts.length} facts extracted from the policy document.
            </p>
            {facts.map((fact) => (
              <div
                key={fact.id}
                className="bg-slate-800 border border-slate-700 rounded-lg p-4 space-y-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-sm">{fact.label}</span>
                  <span className="text-xs text-slate-500 bg-slate-700 px-2 py-0.5 rounded">
                    {fact.sourceType}
                  </span>
                </div>
                <p className="text-slate-200">
                  {String(fact.value)}
                  {fact.unit ? ` ${fact.unit}` : ""}
                </p>
                {fact.quote && (
                  <blockquote className="text-slate-400 text-xs border-l-2 border-slate-600 pl-3 mt-1 italic">
                    {fact.quote}
                    {fact.page ? ` (p.${fact.page})` : ""}
                  </blockquote>
                )}
              </div>
            ))}

            <div className="pt-2">
              <Link
                href="/check"
                className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-5 py-2.5 rounded-lg transition-colors inline-block"
              >
                Check statements →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
