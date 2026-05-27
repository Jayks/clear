export default function ChangelogLoading() {
  return (
    <div className="overflow-x-clip">

      {/* Nav skeleton */}
      <div className="glass-nav sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-14" />
      </div>

      {/* Hero skeleton */}
      <div className="text-center pt-20 pb-12 px-6">
        <div className="inline-block w-40 h-7 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse mb-6" />
        <div className="h-10 w-72 mx-auto rounded-xl bg-slate-200 dark:bg-slate-700 animate-pulse mb-4" />
        <div className="h-5 w-80 mx-auto rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
      </div>

      {/* Timeline skeleton — 3 cards */}
      <section className="max-w-3xl mx-auto px-6 pb-24 space-y-10">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex gap-5 sm:gap-7">
            {/* Dot */}
            <div className="hidden sm:block w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse shrink-0" />
            {/* Card */}
            <div className="glass rounded-2xl p-5 sm:p-6 flex-1 space-y-4">
              {/* Header row */}
              <div className="flex items-center gap-3">
                <div className="h-5 w-10 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
                <div className="h-5 w-32 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
                <div className="flex-1" />
                <div className="h-4 w-20 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
                <div className="h-5 w-16 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
              </div>
              {/* Headline */}
              <div className="h-4 w-3/4 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
              {/* Description */}
              <div className="space-y-2">
                <div className="h-3 w-full rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
                <div className="h-3 w-5/6 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
              </div>
              {/* Feature grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[0, 1, 2].map((j) => (
                  <div
                    key={j}
                    className="glass-sm rounded-xl px-3.5 py-3 space-y-2"
                    style={{ opacity: 1 - j * 0.15 }}
                  >
                    <div className="h-3.5 w-2/3 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
                    <div className="h-3 w-full rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
                    <div className="h-3 w-4/5 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </section>

    </div>
  );
}
