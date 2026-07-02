/**
 * Loading skeleton for /join/[token] (public group-invite preview).
 * Mirrors the actual JoinPage structure:
 *   1. Cover photo header (h-44) with type badge + group name area
 *   2. Member-count pill
 *   3. "What's inside" expense context strip
 *   4. Join button + sign-in hint line
 */
export default function JoinLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 animate-pulse">
      <div className="w-full max-w-sm">
        <div className="glass rounded-2xl overflow-hidden">
          {/* Cover */}
          <div className="h-44 relative bg-slate-200 dark:bg-slate-700/60">
            <div className="absolute top-3 left-3 w-20 h-5 rounded-full bg-white/30 dark:bg-slate-500/30" />
            <div className="absolute bottom-4 left-4 right-4 space-y-2">
              <div className="h-6 w-2/3 rounded-md bg-white/40 dark:bg-slate-400/30" />
              <div className="h-3.5 w-1/3 rounded bg-white/30 dark:bg-slate-400/20" />
            </div>
          </div>

          <div className="p-5 space-y-4">
            {/* Member-count pill */}
            <div className="h-7 w-32 rounded-full bg-slate-200 dark:bg-slate-700/60" />

            {/* Expense context strip */}
            <div className="glass-sm rounded-xl p-3 space-y-1.5">
              <div className="h-3.5 w-3/4 rounded bg-slate-200 dark:bg-slate-700/60" />
              <div className="h-3 w-1/2 rounded bg-slate-200/70 dark:bg-slate-700/40" />
            </div>

            {/* Description lines */}
            <div className="space-y-1.5">
              <div className="h-3 w-full rounded bg-slate-200/70 dark:bg-slate-700/40" />
              <div className="h-3 w-2/3 rounded bg-slate-200/70 dark:bg-slate-700/40" />
            </div>

            {/* Join button */}
            <div className="h-11 w-full rounded-xl bg-slate-200 dark:bg-slate-700/60" />
          </div>
        </div>

        <div className="h-3 w-48 rounded bg-slate-200 dark:bg-slate-700/50 mx-auto mt-4" />
      </div>
    </div>
  );
}
