import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md">
        <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Page Not Found
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          The requested page could not be located.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}
