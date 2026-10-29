import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <main className="max-w-2xl text-center space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
          Scaffold Initialized • Mayank Sharma &amp; Shyam
        </div>
        <h1 className="text-4xl font-serif tracking-tight sm:text-5xl">
          Last Mile
        </h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-xl mx-auto">
          A zero-knowledge family continuity vault. Client-side encrypted asset records,
          2-of-3 Shamir recovery cards, and an inactivity-triggered state machine.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <Link
            href="/api/health"
            className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Check Health API
          </Link>
          <a
            href="https://github.com/MayankSharma-2812/BJP"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900 transition"
          >
            View Repository
          </a>
        </div>
      </main>
    </div>
  );
}
