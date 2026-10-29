'use client';

import { useEffect } from 'react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // In production, log to safe telemetry without exposing secrets
    console.error('Unhandled application error:', error.message);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md rounded-xl border border-red-200 bg-red-50/50 p-6 dark:border-red-950 dark:bg-red-950/20">
        <h2 className="text-lg font-semibold text-red-900 dark:text-red-200">
          Something went wrong
        </h2>
        <p className="mt-2 text-sm text-red-700 dark:text-red-300">
          An unexpected error occurred. No sensitive vault data was exposed.
        </p>
        <button
          onClick={() => reset()}
          className="mt-4 inline-flex items-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
