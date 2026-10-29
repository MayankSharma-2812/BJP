export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100" />
        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
          Loading Last Mile...
        </p>
      </div>
    </div>
  );
}
