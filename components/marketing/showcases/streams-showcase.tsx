"use client";

import { FadeIn } from "@/components/shared/fade-in";

/** Extracted from about-landing.tsx for lazy-loading — see lazy-section.tsx. */
export default function StreamsShowcase() {
  return (
    <section className="max-w-6xl mx-auto px-6 pb-24">
      <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">

        {/* Left: copy */}
        <FadeIn direction="left" className="flex-1 text-center lg:text-left">
          <p className="text-sm font-semibold text-indigo-600 uppercase tracking-widest mb-3">Streams</p>
          <h2 className="text-4xl sm:text-5xl text-slate-800 dark:text-slate-100 mb-5" style={{ fontFamily: "var(--font-fraunces)" }}>
            Track 1:1 money
            <br />
            <span style={{ background: "linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              with anyone.
            </span>
          </h2>
          <p className="text-lg text-slate-500 dark:text-slate-400 leading-relaxed max-w-md mx-auto lg:mx-0 mb-6">
            No group needed. Log direct debts between you and one other person — even if they don&apos;t have ClearOff yet. Guest confirmation, partial settle, or forgive anytime.
          </p>
          <ul className="space-y-3 text-left max-w-md mx-auto lg:mx-0">
            {[
              { icon: "⇌", label: "Bilateral spine view",    desc: "Every IOU shown chronologically — who paid what, confirmed and pending." },
              { icon: "✅", label: "Guest confirmation",      desc: "Share a link — the other person confirms or disputes, no ClearOff account needed." },
              { icon: "💚", label: "Partial settle or forgive", desc: "Settle just part of the net amount, or write off a debt entirely in one tap." },
              { icon: "⚡", label: "Swipe quick actions",     desc: "Swipe left on any entry to Mark Paid, Share, or Forgive instantly." },
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

        {/* Right: bilateral spine mockup */}
        <FadeIn direction="right" className="flex-1 w-full max-w-sm">
          <div className="glass rounded-2xl p-5 shadow-xl shadow-indigo-500/10">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100 dark:border-slate-700/40">
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100" style={{ fontFamily: "var(--font-fraunces)" }}>Stream · Priya</p>
                <p className="text-xs text-slate-400 mt-0.5">5 entries · net ₹1,200 owed to you</p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400">₹1,200 owed</span>
            </div>

            {/* Bilateral spine */}
            <div className="relative">
              <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 bg-slate-100 dark:bg-slate-700/50" />
              <div className="space-y-3">
                {[
                  { side: "right", label: "Priya covered cab",      amount: "₹800", status: "confirmed", date: "Jun 2" },
                  { side: "left",  label: "You paid lunch",          amount: "₹400", status: "pending",   date: "Jun 1" },
                  { side: "right", label: "Priya bought coffee",     amount: "₹320", status: "confirmed", date: "May 30" },
                  { side: "left",  label: "You covered groceries",   amount: "₹680", status: "confirmed", date: "May 28" },
                ].map((e, i) => (
                  <div key={i} className={`flex items-center gap-2 relative ${e.side === "right" ? "flex-row-reverse" : ""}`}>
                    <div
                      className="flex-1 rounded-xl px-3 py-2 text-xs"
                      style={{
                        background: e.side === "right" ? "rgba(99,102,241,0.06)" : "rgba(6,182,212,0.06)",
                        border: `1px solid ${e.side === "right" ? "rgba(99,102,241,0.18)" : "rgba(6,182,212,0.18)"}`,
                        ...(e.side === "right" ? { marginLeft: 12 } : { marginRight: 12 }),
                      }}
                    >
                      <p className="font-medium text-slate-700 dark:text-slate-200 truncate">{e.label}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="font-bold" style={{ color: e.side === "right" ? "#6366F1" : "#0891B2" }}>{e.amount}</span>
                        <span style={{ color: e.status === "confirmed" ? "#10B981" : "#F59E0B" }}>
                          {e.status === "confirmed" ? "✓ confirmed" : "⏳ pending"}
                        </span>
                      </div>
                    </div>
                    <div
                      className="w-3 h-3 rounded-full shrink-0 z-10 absolute left-1/2 -translate-x-1/2"
                      style={{ background: e.status === "confirmed" ? "#10B981" : "#F59E0B", boxShadow: `0 0 6px ${e.status === "confirmed" ? "rgba(16,185,129,0.5)" : "rgba(245,158,11,0.5)"}` }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Settle CTA */}
            <div className="mt-4 flex gap-2">
              <div className="flex-1 text-xs font-semibold text-white py-2.5 rounded-xl text-center" style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)" }}>
                Settle ₹1,200 →
              </div>
              <div className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-500 dark:text-slate-400">
                Forgive
              </div>
            </div>
          </div>
        </FadeIn>

      </div>
    </section>
  );
}
