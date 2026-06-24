import Link from "next/link";

const ACTIONS = [
  {
    title: "Check what my adviser said",
    href: "/check",
  },
  {
    title: "Understand a financial document",
    href: "/decode",
  },
  {
    title: "Ask a financial question",
    href: "/ask",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="flex min-h-screen flex-col">
        <header className="cg-shell flex h-16 items-center justify-between">
          <Link href="/" className="font-display text-2xl font-light">
            CoverPilot
          </Link>
          <Link
            href="/my-case"
            className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            My Case
          </Link>
        </header>

        <section className="cg-shell flex flex-1 items-center justify-center py-12">
          <div className="w-full max-w-5xl text-center">
            <p className="cg-kicker">Singapore financial advice clarity</p>
            <h1 className="font-display mx-auto mt-6 max-w-4xl text-[48px] font-light leading-[0.98] md:text-[78px]">
              Understand financial advice before you act on it.
            </h1>

            <div className="mx-auto mt-12 grid max-w-3xl gap-3 md:grid-cols-3">
              {ACTIONS.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="group border border-[var(--line)] bg-[var(--surface)] px-5 py-6 text-left transition hover:border-[var(--foreground)] hover:bg-[#fffefb]"
                >
                  <span className="block min-h-12 text-lg font-medium leading-tight">
                    {action.title}
                  </span>
                  <span className="mt-6 block text-sm text-[var(--muted)] transition group-hover:text-[var(--foreground)]">
                    Start →
                  </span>
                </Link>
              ))}
            </div>

            <p className="mx-auto mt-8 max-w-xl text-sm leading-6 text-[var(--muted)]">
              CoverPilot helps you read, check, and prepare questions. It does
              not tell you what to buy, keep, cancel, or switch.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
