import Link from "next/link";

const WORKFLOW = [
  {
    title: "Ask",
    body: "Public-source questions backed by MoneySense and LIA links.",
    href: "/case-review",
  },
  {
    title: "Decode",
    body: "Policy illustration facts become editable, cited fields.",
    href: "/case-review",
  },
  {
    title: "Verify",
    body: "Adviser claims are checked against PI facts and formulas.",
    href: "/case-review",
  },
  {
    title: "Prepare",
    body: "The meeting pack leaves with questions, not recommendations.",
    href: "/case-review",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <header className="border-b cg-hairline">
        <div className="cg-shell flex h-12 items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 bg-[var(--accent)]" />
            <span className="font-display text-xl font-light">CoverPilot</span>
          </div>
          <nav className="flex items-center gap-5 text-sm text-[var(--muted)]">
            <Link href="/case-review" className="hover:text-[var(--foreground)]">
              Case Review
            </Link>
            <Link href="/my-case" className="hover:text-[var(--foreground)]">
              My Case
            </Link>
          </nav>
        </div>
      </header>

      <section className="cg-shell grid gap-10 pb-12 pt-16 lg:grid-cols-[1.1fr_0.9fr] lg:pb-18 lg:pt-20">
        <div className="max-w-[760px]">
          <p className="cg-kicker">Singapore insurance evidence workspace</p>
          <h1 className="font-display mt-5 text-[44px] font-light leading-[1.02] md:text-[76px]">
            Insurance decisions, rebuilt as evidence.
          </h1>
          <p className="mt-6 max-w-[620px] text-base leading-7 text-[var(--muted)]">
            CoverPilot turns public guidance, policy illustrations, adviser
            claims, and meeting notes into one cited case file for Singapore
            insurance conversations.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/case-review" className="primary-button">
              Start case review
            </Link>
            <Link href="/my-case" className="secondary-button">
              Open My Case
            </Link>
          </div>
        </div>

        <div className="cg-focus-panel p-5 lg:mt-10">
          <p className="font-mono text-xs text-[color-mix(in_oklch,var(--background)_70%,transparent)]">
            CP-SG-EVIDENCE
          </p>
          <h2 className="font-display mt-4 text-4xl font-light leading-tight">
            A first-pass insurance reviewer that refuses to advise.
          </h2>
          <div className="mt-8 grid grid-cols-2 gap-3 text-sm">
            <Metric label="Sources" value="MoneySense / LIA" />
            <Metric label="Outputs" value="Facts / Claims / Questions" />
            <Metric label="Guardrail" value="No buy, cancel, switch" />
            <Metric label="Demo" value="One seeded case" />
          </div>
        </div>
      </section>

      <section className="border-y cg-hairline bg-[var(--surface)]">
        <div className="cg-shell py-10">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="cg-kicker">Product loop</p>
              <h2 className="font-display mt-3 text-4xl font-light leading-tight">
                One guided flow, four insurance jobs.
              </h2>
            </div>
            <Link href="/case-review" className="secondary-button">
              Inspect workflow
            </Link>
          </div>
          <div className="cg-process-grid mt-8">
            {WORKFLOW.map((item, index) => (
              <Link key={item.title} href={item.href} className="cg-process-card">
                <span className="cg-process-index">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span>
                  <span className="block text-2xl font-light">{item.title}</span>
                  <span className="mt-3 block text-sm leading-6 text-[var(--muted)]">
                    {item.body}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="cg-shell py-14">
        <div className="grid gap-8 lg:grid-cols-[0.55fr_1.45fr]">
          <div>
            <p className="cg-kicker">Copied and contextualized</p>
            <h2 className="font-display mt-3 text-4xl font-light leading-tight">
              The references are visible in the product shape.
            </h2>
          </div>
          <div className="cg-editorial-rows">
            <ReferenceRow
              index="01"
              title="Top AI financial workflow"
              body="FP Alpha and Conquest-style document intelligence: extract structured facts, surface planning evidence, and keep calculations auditable."
            />
            <ReferenceRow
              index="02"
              title="AI operating layer pattern"
              body="Legora/Casetext-style trust: not a blank chatbot, but a workspace where every answer has source context and every output leaves a trail."
            />
            <ReferenceRow
              index="03"
              title="InsureLobang consumer surface"
              body="FAQ, advice checking, policy breakdown, and meeting prep are consolidated into one Singapore insurance case file."
            />
          </div>
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-t border-[color-mix(in_oklch,var(--background)_35%,transparent)] pt-3">
      <p className="text-xs text-[color-mix(in_oklch,var(--background)_60%,transparent)]">
        {label}
      </p>
      <p className="mt-2 text-sm leading-5">{value}</p>
    </div>
  );
}

function ReferenceRow({
  index,
  title,
  body,
}: {
  index: string;
  title: string;
  body: string;
}) {
  return (
    <div className="cg-editorial-row">
      <div className="cg-empty-column" />
      <div className="cg-card p-5">
        <p className="font-mono text-xs text-[var(--soft)]">{index}</p>
        <h3 className="font-display mt-4 text-3xl font-light leading-tight">
          {title}
        </h3>
      </div>
      <div className="border-t cg-hairline pt-4 text-sm leading-6 text-[var(--muted)]">
        {body}
      </div>
    </div>
  );
}
