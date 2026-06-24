import Link from "next/link";

const WORKFLOW = [
  {
    title: "Ask",
    body: "Start with official-source insurance context before a conversation gets technical.",
    href: "/case-review",
  },
  {
    title: "Decode",
    body: "Turn a policy illustration into structured facts with source labels.",
    href: "/case-review",
  },
  {
    title: "Verify",
    body: "Compare adviser claims against document evidence and calculations.",
    href: "/case-review",
  },
  {
    title: "Prepare",
    body: "Generate questions for a licensed adviser without getting financial advice.",
    href: "/case-review",
  },
];

const PROOF_POINTS = [
  "Policy facts stay editable so extraction never becomes a black box.",
  "Every important output is labelled as document-stated, calculated, official-source, user-provided, or not found.",
  "The decision firewall blocks buy, cancel, switch, rank, and suitability prompts.",
  "My Case keeps the evidence record together for the next FA meeting.",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#fdfcfc] text-black">
      <header className="border-b border-[#e5e5e5]">
        <div className="mx-auto flex h-12 max-w-[1240px] items-center justify-between px-5 lg:px-8">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 bg-[conic-gradient(from_180deg,#3d75d8,#75bee5,#20bad0,#2f40d2,#3d75d8)]" />
            <span className="font-display text-xl font-light">CoverPilot</span>
          </div>
          <nav className="flex items-center gap-5 text-sm text-[#777169]">
            <Link href="/case-review" className="hover:text-black">
              Case Review
            </Link>
            <Link href="/my-case" className="hover:text-black">
              My Case
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto grid max-w-[1240px] gap-12 px-5 pb-16 pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:pb-24 lg:pt-28">
        <div>
          <p className="text-sm leading-6 text-[#777169]">
            Singapore insurance evidence workspace
          </p>
          <h1 className="font-display mt-5 max-w-[760px] text-[44px] font-light leading-[1.05] md:text-7xl">
            Bring the policy, the claims, and the questions into one case.
          </h1>
          <p className="mt-6 max-w-[620px] text-base leading-7 text-[#777169]">
            CoverPilot helps consumers prepare for insurance conversations by
            extracting policy facts, checking adviser statements, running
            transparent calculations, and preparing questions for a licensed
            adviser.
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

        <div className="border border-[#e5e5e5] bg-white p-5">
          <p className="font-mono text-xs text-[#a59f97]">CP-SG-EVIDENCE</p>
          <h2 className="mt-3 text-2xl font-medium leading-8">
            One guided flow, four insurance jobs.
          </h2>
          <div className="mt-6 space-y-4">
            {WORKFLOW.map((item, index) => (
              <Link
                key={item.title}
                href={item.href}
                className="grid grid-cols-[48px_1fr] gap-4 border-t border-[#e5e5e5] pt-4"
              >
                <span className="font-mono text-xs text-[#a59f97]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span>
                  <span className="block text-sm font-medium">{item.title}</span>
                  <span className="mt-1 block text-sm leading-6 text-[#777169]">
                    {item.body}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-[#e5e5e5] bg-white">
        <div className="mx-auto grid max-w-[1240px] gap-8 px-5 py-12 lg:grid-cols-[0.75fr_1.25fr] lg:px-8">
          <div>
            <p className="text-sm text-[#777169]">What makes it real</p>
            <h2 className="font-display mt-3 text-4xl font-light leading-tight">
              Evidence before advice.
            </h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {PROOF_POINTS.map((point) => (
              <p
                key={point}
                className="border-t border-[#e5e5e5] pt-4 text-sm leading-6 text-[#777169]"
              >
                {point}
              </p>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1240px] px-5 py-14 lg:px-8">
        <div className="grid gap-5 md:grid-cols-3">
          <ReferenceBlock
            title="Top AI startup pattern"
            body="Like FP Alpha, Conquest, Jump, and Legora, CoverPilot treats documents, claims, and meetings as one workflow system."
          />
          <ReferenceBlock
            title="Singapore pre-AI rerun"
            body="MoneySense, Planner Bee, PolicyPal, and human second opinions proved the need. AI makes first-pass review scalable."
          />
          <ReferenceBlock
            title="InsureLobang inspiration"
            body="FAQ, advice checking, policy breakdown, and gap discussion become one connected evidence workspace."
          />
        </div>
      </section>
    </main>
  );
}

function ReferenceBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className="border border-[#e5e5e5] bg-white p-5">
      <h3 className="text-base font-medium">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-[#777169]">{body}</p>
    </div>
  );
}
