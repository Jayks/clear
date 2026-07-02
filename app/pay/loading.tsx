/**
 * Loading skeleton for /pay (public UPI payment-request page for a registered user).
 * Mirrors the actual PayPage structure (now on the shared `PublicPageShell`):
 *   1. Clear branding (logo + wordmark)
 *   2. Payee + amount card — avatar, name, verified badge, large amount
 *   3. Payment actions (PayClient) — app-picker row + QR
 */
export default function PayLoading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 gap-8 animate-pulse">
      {/* Branding */}
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-700/60" />
        <div className="h-6 w-24 rounded bg-slate-200 dark:bg-slate-700/60" />
      </div>

      <div className="w-full max-w-sm space-y-4">

        {/* Payee + amount card */}
        <div className="glass rounded-2xl p-6 text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-14 h-14 rounded-full bg-slate-200 dark:bg-slate-700/60" />
          </div>
          <div className="space-y-1.5 flex flex-col items-center">
            <div className="h-4 w-28 rounded bg-slate-200 dark:bg-slate-700/60" />
            <div className="h-3 w-32 rounded bg-slate-200/70 dark:bg-slate-700/40" />
          </div>
          <div className="h-px bg-slate-100 dark:bg-slate-700/60" />
          <div className="flex flex-col items-center gap-1.5">
            <div className="h-10 w-36 rounded-lg bg-slate-200 dark:bg-slate-700/60" />
            <div className="h-3 w-24 rounded bg-slate-200/70 dark:bg-slate-700/40" />
          </div>
        </div>

        {/* Payment actions */}
        <div className="glass rounded-2xl p-5 space-y-3">
          <div className="flex gap-2">
            <div className="flex-1 h-14 rounded-xl bg-slate-200 dark:bg-slate-700/60" />
            <div className="flex-1 h-14 rounded-xl bg-slate-200 dark:bg-slate-700/60" />
            <div className="flex-1 h-14 rounded-xl bg-slate-200 dark:bg-slate-700/60" />
          </div>
          <div className="h-32 w-32 rounded-xl bg-slate-200 dark:bg-slate-700/60 mx-auto" />
        </div>
      </div>

      {/* Footer CTA */}
      <div className="h-3 w-56 rounded bg-slate-200 dark:bg-slate-700/50" />
    </div>
  );
}
