import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center px-6">
      <div className="max-w-2xl w-full text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">CoverPilot</h1>
          <p className="text-slate-400 text-lg">
            Singapore&apos;s AI insurance evidence desk
          </p>
        </div>

        <p className="text-slate-300 text-base leading-relaxed">
          Upload a policy illustration, paste what you heard in the sales
          conversation, and get sourced facts, deterministic calculations, and
          neutral questions — ready for your licensed adviser meeting.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
          <Link
            href="/decode"
            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl p-5 text-left transition-colors"
          >
            <div className="text-2xl mb-2">📄</div>
            <h2 className="font-semibold text-white">Decode</h2>
            <p className="text-slate-400 text-sm mt-1">
              Understand your policy document
            </p>
          </Link>

          <Link
            href="/check"
            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl p-5 text-left transition-colors"
          >
            <div className="text-2xl mb-2">🔍</div>
            <h2 className="font-semibold text-white">Check</h2>
            <p className="text-slate-400 text-sm mt-1">
              Compare statements against source text
            </p>
          </Link>

          <Link
            href="/prepare"
            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl p-5 text-left transition-colors"
          >
            <div className="text-2xl mb-2">📋</div>
            <h2 className="font-semibold text-white">Prepare</h2>
            <p className="text-slate-400 text-sm mt-1">
              Get questions for your adviser meeting
            </p>
          </Link>
        </div>

        <p className="text-slate-500 text-xs pt-4">
          CoverPilot does not recommend what to buy, keep, cancel, or switch.
          Always consult a licensed financial adviser.
        </p>
      </div>
    </main>
  );
}
