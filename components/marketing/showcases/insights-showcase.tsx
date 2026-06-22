"use client";

import { FadeIn } from "@/components/shared/fade-in";

/** Extracted from about-landing.tsx for lazy-loading — see lazy-section.tsx. */
export default function InsightsShowcase() {
  return (
    <section className="max-w-6xl mx-auto px-6 pb-24">
      <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">

        {/* Left: insights mockup */}
        <FadeIn direction="left" className="flex-1 w-full max-w-sm">
          <div className="glass rounded-2xl p-6 shadow-xl shadow-cyan-500/10">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100" style={{ fontFamily: "var(--font-fraunces)" }}>Goa 2025</p>
                <p className="text-xs text-slate-400 mt-0.5">₹25,000 total · 5 members</p>
              </div>
              <span className="text-[10px] font-semibold text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/30 px-2.5 py-1 rounded-full">Insights</span>
            </div>

            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Spending by category</p>
            <div className="space-y-2.5 mb-5">
              {[
                { label: "Accommodation", pct: 48, amount: "₹12,000", color: "bg-cyan-500" },
                { label: "Food & drink",  pct: 28, amount: "₹7,000",  color: "bg-teal-500" },
                { label: "Transport",     pct: 16, amount: "₹4,000",  color: "bg-indigo-500" },
                { label: "Activities",    pct: 8,  amount: "₹2,000",  color: "bg-violet-500" },
              ].map((c) => (
                <div key={c.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-500 dark:text-slate-400">{c.label}</span>
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{c.amount}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-700/60">
                    <div className={`h-1.5 rounded-full ${c.color}`} style={{ width: `${c.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>

            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Member contributions</p>
            <div className="space-y-2">
              {[
                { name: "Priya", amount: "₹8,000", pct: 96 },
                { name: "You",   amount: "₹6,000", pct: 72 },
                { name: "Raj",   amount: "₹4,000", pct: 48 },
                { name: "Anil",  amount: "₹4,000", pct: 48 },
                { name: "Meera", amount: "₹3,000", pct: 36 },
              ].map((m) => (
                <div key={m.name} className="flex items-center gap-2.5">
                  <span className="text-xs text-slate-500 dark:text-slate-400 w-10 shrink-0">{m.name}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-700/60">
                    <div className="h-1.5 rounded-full bg-gradient-to-r from-cyan-500 to-teal-500" style={{ width: `${m.pct}%` }} />
                  </div>
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300 shrink-0 w-14 text-right">{m.amount}</span>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>

        {/* Right: copy */}
        <FadeIn direction="right" className="flex-1 text-center lg:text-left">
          <p className="text-sm font-semibold text-cyan-600 uppercase tracking-widest mb-3">Insights</p>
          <h2 className="text-4xl sm:text-5xl text-slate-800 dark:text-slate-100 mb-5" style={{ fontFamily: "var(--font-fraunces)" }}>
            See the full story
            <br />
            <span style={{ background: "linear-gradient(135deg, #0891B2 0%, #14B8A6 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              of your spending.
            </span>
          </h2>
          <p className="text-lg text-slate-500 dark:text-slate-400 leading-relaxed max-w-md mx-auto lg:mx-0 mb-6">
            Every group has a live analytics dashboard — see where the money went, who paid the most, and how spending tracked day by day.
          </p>
          <ul className="space-y-3 text-left max-w-md mx-auto lg:mx-0">
            {[
              { icon: "📊", label: "Category breakdown", desc: "Food, stays, transport, activities — see the split at a glance." },
              { icon: "📈", label: "Daily spend chart",  desc: "Track spending across the trip and spot the big days." },
              { icon: "👥", label: "Member contributions", desc: "Who fronted the most? See each person's share clearly." },
              { icon: "✨", label: "AI trip narrative",  desc: "ClearOff writes a summary of your trip from the expense history." },
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

      </div>
    </section>
  );
}
