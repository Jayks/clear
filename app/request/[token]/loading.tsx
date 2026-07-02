/**
 * Loading skeleton for /request/[token] (public guest payment-request page).
 * Mirrors the actual RequestPage/RequestClient structure:
 *   1. Clear branding (logo + wordmark)
 *   2. Glass card: context label, "You owe ₹X to Name" line, UPI/alt-method buttons
 */
export default function RequestLoading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 gap-8 animate-pulse">
      {/* Branding */}
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-700/60" />
        <div className="h-6 w-24 rounded bg-slate-200 dark:bg-slate-700/60" />
      </div>

      {/* Main card */}
      <div className="glass rounded-2xl w-full max-w-sm p-6 space-y-5">
        {/* Context header */}
        <div className="space-y-2">
          <div className="h-2.5 w-20 rounded bg-slate-200 dark:bg-slate-700/60" />
          <div className="h-7 w-4/5 rounded-md bg-slate-200 dark:bg-slate-700/60" />
        </div>

        {/* UPI action row */}
        <div className="flex gap-2">
          <div className="flex-1 h-14 rounded-xl bg-slate-200 dark:bg-slate-700/60" />
          <div className="flex-1 h-14 rounded-xl bg-slate-200 dark:bg-slate-700/60" />
          <div className="flex-1 h-14 rounded-xl bg-slate-200 dark:bg-slate-700/60" />
        </div>

        {/* Alt method / confirm button */}
        <div className="h-11 w-full rounded-xl bg-slate-200 dark:bg-slate-700/60" />
      </div>

      {/* Soft acquisition CTA */}
      <div className="h-3 w-56 rounded bg-slate-200 dark:bg-slate-700/50" />
    </div>
  );
}
