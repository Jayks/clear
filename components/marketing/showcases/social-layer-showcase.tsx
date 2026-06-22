"use client";

import { FadeIn } from "@/components/shared/fade-in";

/** Extracted from about-landing.tsx for lazy-loading — see lazy-section.tsx. */
export default function SocialLayerShowcase() {
  return (
    <section className="max-w-6xl mx-auto px-6 pb-24">
      <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">

        {/* Left: copy */}
        <FadeIn direction="left" className="flex-1 text-center lg:text-left">
          <p className="text-sm font-semibold text-cyan-600 uppercase tracking-widest mb-3">Social layer</p>
          <h2 className="text-4xl sm:text-5xl text-slate-800 dark:text-slate-100 mb-5" style={{ fontFamily: "var(--font-fraunces)" }}>
            Settle disagreements{" "}
            <span style={{ background: "linear-gradient(135deg, #0891B2 0%, #14B8A6 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              in the app,
            </span>
            <br />not WhatsApp.
          </h2>
          <p className="text-lg text-slate-500 dark:text-slate-400 leading-relaxed max-w-md mx-auto lg:mx-0 mb-6">
            Question an expense, request a split change, or dispute your share — right on the expense. The payer accepts and the split updates automatically.
          </p>
          <ul className="space-y-3 text-left max-w-md mx-auto lg:mx-0">
            {[
              { icon: "💬", label: "Inline comments", desc: "WhatsApp-style chat bubbles on every expense — @mention members with autocomplete." },
              { icon: "👍", label: "Reactions", desc: "Thumbs up to approve, ❓ to ask a question, ⚠️ to formally dispute." },
              { icon: "⚠️", label: "Dispute resolution", desc: "Four dispute types — auto-resolves the split the moment the payer accepts." },
              { icon: "👁", label: "Read receipts", desc: "See who's viewed an expense with an overlapping avatar stack." },
              { icon: "🔔", label: "Activity alerts", desc: "Push notifications for @mentions, new comments, and dispute outcomes." },
            ].map((item) => (
              <li key={item.label} className="flex items-start gap-3">
                <span className="text-xl shrink-0 mt-0.5">{item.icon}</span>
                <div>
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{item.label} </span>
                  <span className="text-sm text-slate-500 dark:text-slate-400">{item.desc}</span>
                </div>
              </li>
            ))}
          </ul>
        </FadeIn>

        {/* Right: dispute mockup */}
        <FadeIn direction="right" className="flex-1 w-full max-w-sm">
          <div className="glass rounded-2xl p-5 shadow-xl shadow-cyan-500/10">

            {/* Expense header */}
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-100 dark:border-slate-700/40">
              <div className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-base shrink-0">🏨</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Hotel check-in</p>
                <p className="text-xs text-slate-400">₹12,000 · paid by You · 4 splits</p>
              </div>
              {/* Avatar stack */}
              <div className="flex items-center -space-x-1.5 shrink-0">
                {["R", "P", "A"].map((initial) => (
                  <div key={initial} className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-400 to-teal-400 flex items-center justify-center text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-900">
                    {initial}
                  </div>
                ))}
                <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-semibold text-slate-500 dark:text-slate-400 ring-2 ring-white dark:ring-slate-900">
                  +2
                </div>
              </div>
            </div>

            {/* Dispute card */}
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 rounded-xl p-3.5 mb-4">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-sm">⚠️</span>
                <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">Dispute · change share</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mb-3 leading-relaxed">
                Raj: I only used the room for 2 nights — can my share be updated?
              </p>
              <div className="flex gap-2">
                <button className="flex-1 text-xs font-semibold text-white py-1.5 rounded-lg" style={{ background: "linear-gradient(135deg, #06B6D4, #0D9488)" }}>
                  Accept &amp; update split
                </button>
                <button className="flex-1 text-xs font-medium text-slate-500 dark:text-slate-400 py-1.5 rounded-lg bg-white/60 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  Decline
                </button>
              </div>
            </div>

            {/* Chat bubbles */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-400 to-indigo-400 flex items-center justify-center text-[9px] font-bold text-white shrink-0 mt-0.5">P</div>
                <div className="glass-sm rounded-xl rounded-tl-sm px-3 py-2 max-w-[75%]">
                  <p className="text-xs text-slate-700 dark:text-slate-200">Looks fair to me 👍</p>
                  <p className="text-[9px] text-slate-400 mt-0.5">Priya · 2m ago</p>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <div className="px-3 py-2 rounded-xl rounded-tr-sm max-w-[75%]" style={{ background: "linear-gradient(135deg, #06B6D4, #0D9488)" }}>
                  <p className="text-xs text-white">I&apos;ll update the split now</p>
                  <p className="text-[9px] text-cyan-100/70 mt-0.5">You · just now</p>
                </div>
              </div>
            </div>

          </div>
        </FadeIn>

      </div>
    </section>
  );
}
