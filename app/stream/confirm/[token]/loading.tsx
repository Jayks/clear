/**
 * Loading skeleton for /stream/confirm/[token] (public guest Stream confirmation).
 * Mirrors the actual ConfirmStreamPage/ConfirmStreamClient structure:
 *   1. Clear branding (logo + wordmark)
 *   2. Glass card: context line, entry summary, Confirm/Dispute buttons
 */
export default function ConfirmStreamLoading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 gap-8 animate-pulse">
      {/* Branding */}
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-700/60" />
        <div className="h-6 w-24 rounded bg-slate-200 dark:bg-slate-700/60" />
      </div>

      {/* Main card */}
      <div className="glass rounded-2xl w-full max-w-sm p-6 space-y-5">
        <div className="space-y-2">
          <div className="h-2.5 w-24 rounded bg-slate-200 dark:bg-slate-700/60" />
          <div className="h-7 w-4/5 rounded-md bg-slate-200 dark:bg-slate-700/60" />
          <div className="h-3 w-1/2 rounded bg-slate-200/70 dark:bg-slate-700/40" />
        </div>

        {/* Confirm / Dispute buttons */}
        <div className="flex gap-2">
          <div className="flex-1 h-11 rounded-xl bg-slate-200 dark:bg-slate-700/60" />
          <div className="flex-1 h-11 rounded-xl bg-slate-200 dark:bg-slate-700/60" />
        </div>
      </div>
    </div>
  );
}
