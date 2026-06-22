"use client";

import { CalendarDays } from "lucide-react";
import { FadeIn } from "@/components/shared/fade-in";

/** Extracted from about-landing.tsx for lazy-loading — see lazy-section.tsx. */
export default function TripTimelineShowcase() {
  return (
    <section className="max-w-6xl mx-auto px-6 pb-24">
      <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">

        {/* Left: timeline mockup */}
        <FadeIn direction="left" className="flex-1 w-full max-w-md">
          <div className="glass rounded-2xl p-5 shadow-xl shadow-cyan-500/10">

            {/* Section header */}
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-6 h-6 rounded-md bg-cyan-50 dark:bg-cyan-900/30 flex items-center justify-center shrink-0">
                <CalendarDays className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400" />
              </div>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Day by day · Goa 2025</span>
              <div className="animate-rule-enter flex-1 h-[1.5px] bg-gradient-to-r from-cyan-200/70 to-transparent dark:from-cyan-800/40 dark:to-transparent" />
            </div>

            {/* ── Day 1 ── */}
            <div className="rounded-2xl px-3 pt-3 pb-2" style={{ backgroundColor: "#2563EB12" }}>
              {/* Header: node · badge · date · total · payers */}
              <div className="flex items-center gap-2 mb-2">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent to-cyan-200/70 dark:to-cyan-800/40" />
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 dark:bg-cyan-500" />
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-900/50 text-cyan-700 dark:text-cyan-300">Day 1/3</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Mon, Jun 2</span>
                  <span className="text-[10px] text-slate-300 dark:text-slate-600">·</span>
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 tabular-nums" style={{ fontFamily: "var(--font-fraunces)" }}>₹6,500</span>
                  <span className="text-[10px] text-slate-300 dark:text-slate-600">·</span>
                  <div className="w-[22px] h-[22px] rounded-full flex items-center justify-center font-bold text-white text-[9px] ring-1 ring-white/20" style={{ backgroundColor: "#06B6D4" }}>P</div>
                  <div className="w-[20px] h-[20px] rounded-full flex items-center justify-center font-bold text-white text-[9px] ring-1 ring-white/20" style={{ backgroundColor: "#8B5CF6" }}>Y</div>
                </div>
                <div className="flex-1 h-px bg-gradient-to-l from-transparent to-cyan-200/70 dark:to-cyan-800/40" />
              </div>
              {/* Category bar: 46% wide, 77% accommodation + 23% food */}
              <div className="relative h-4 bg-slate-100 dark:bg-slate-800/60 rounded-xl overflow-hidden mb-1">
                <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 flex rounded-xl overflow-hidden" style={{ width: "46%" }}>
                  <div className="h-full shrink-0" style={{ width: "77%", backgroundColor: "#2563EB" }} />
                  <div className="h-full shrink-0" style={{ width: "23%", backgroundColor: "#EA580C" }} />
                </div>
              </div>
              <div className="h-4 mb-1.5" />{/* intensity spacer */}
              {/* Expense rows */}
              <div className="space-y-px">
                <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-sm" style={{ background: "linear-gradient(135deg, #60A5FA, #2563EB)" }}>🏨</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-700 dark:text-slate-200 truncate">Hotel check-in</p>
                    <p className="text-[10px] text-slate-400">Priya</p>
                  </div>
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 tabular-nums shrink-0">₹5,000</span>
                </div>
                <p className="text-[10px] text-slate-300 dark:text-slate-600 italic px-2 pb-1">+1 more</p>
              </div>
            </div>

            {/* Connector */}
            <div className="flex justify-center py-0.5 my-0.5">
              <div className="w-px h-3 bg-gradient-to-b from-transparent via-slate-200 dark:via-slate-700/50 to-transparent" />
            </div>

            {/* ── Day 2 · Busiest ── */}
            <div className="rounded-2xl px-3 pt-3 pb-2" style={{ backgroundColor: "#16A34A12" }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent to-amber-300/70 dark:to-amber-700/40" />
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="w-2 h-2 rounded-full bg-amber-400 dark:bg-amber-500" />
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">Day 2/3</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Tue, Jun 3</span>
                  <span className="text-[10px] text-slate-300 dark:text-slate-600">·</span>
                  <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 tabular-nums" style={{ fontFamily: "var(--font-fraunces)" }}>₹14,200</span>
                  <span className="text-[10px] text-slate-300 dark:text-slate-600">·</span>
                  <div className="w-[24px] h-[24px] rounded-full flex items-center justify-center font-bold text-white text-[9px] ring-1 ring-white/20" style={{ backgroundColor: "#16A34A" }}>R</div>
                  <div className="w-[22px] h-[22px] rounded-full flex items-center justify-center font-bold text-white text-[9px] ring-1 ring-white/20" style={{ backgroundColor: "#8B5CF6" }}>Y</div>
                  <div className="w-[20px] h-[20px] rounded-full flex items-center justify-center font-bold text-white text-[9px] ring-1 ring-white/20" style={{ backgroundColor: "#06B6D4" }}>P</div>
                </div>
                <div className="flex-1 h-px bg-gradient-to-l from-transparent to-amber-300/70 dark:to-amber-700/40" />
              </div>
              {/* Category bar: 100% wide, 56% activities + 23% food + 21% transport */}
              <div className="relative h-4 bg-slate-100 dark:bg-slate-800/60 rounded-xl overflow-hidden mb-1">
                <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 flex rounded-xl overflow-hidden" style={{ width: "100%" }}>
                  <div className="h-full shrink-0" style={{ width: "56%", backgroundColor: "#16A34A" }} />
                  <div className="h-full shrink-0" style={{ width: "23%", backgroundColor: "#EA580C" }} />
                  <div className="h-full shrink-0" style={{ width: "21%", backgroundColor: "#9333EA" }} />
                </div>
              </div>
              <p className="text-[10px] font-medium text-amber-500 dark:text-amber-400 text-center tracking-wide mb-1.5">🔥 busiest day</p>
              <div className="space-y-px">
                <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-sm" style={{ background: "linear-gradient(135deg, #4ADE80, #10B981)" }}>🏄</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-700 dark:text-slate-200 truncate">Water sports</p>
                    <p className="text-[10px] text-slate-400">Raj</p>
                  </div>
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 tabular-nums shrink-0">₹8,000</span>
                </div>
                <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-sm" style={{ background: "linear-gradient(135deg, #FB923C, #F87171)" }}>🍺</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-700 dark:text-slate-200 truncate">Beach shack</p>
                    <p className="text-[10px] text-slate-400">You</p>
                  </div>
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 tabular-nums shrink-0">₹3,200</span>
                </div>
                <p className="text-[10px] text-slate-300 dark:text-slate-600 italic px-2 pb-1">+1 more</p>
              </div>
            </div>

            {/* Connector */}
            <div className="flex justify-center py-0.5 my-0.5">
              <div className="w-px h-3 bg-gradient-to-b from-transparent via-slate-200 dark:via-slate-700/50 to-transparent" />
            </div>

            {/* ── Day 3 · Light ── */}
            <div className="rounded-2xl px-3 pt-3 pb-2" style={{ backgroundColor: "#DB277712" }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent to-cyan-200/70 dark:to-cyan-800/40" />
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 dark:bg-cyan-500" />
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-900/50 text-cyan-700 dark:text-cyan-300">Day 3/3</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Wed, Jun 4</span>
                  <span className="text-[10px] text-slate-300 dark:text-slate-600">·</span>
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 tabular-nums" style={{ fontFamily: "var(--font-fraunces)" }}>₹3,800</span>
                  <span className="text-[10px] text-slate-300 dark:text-slate-600">·</span>
                  <div className="w-[22px] h-[22px] rounded-full flex items-center justify-center font-bold text-white text-[9px] ring-1 ring-white/20" style={{ backgroundColor: "#F59E0B" }}>A</div>
                  <div className="w-[20px] h-[20px] rounded-full flex items-center justify-center font-bold text-white text-[9px] ring-1 ring-white/20" style={{ backgroundColor: "#EC4899" }}>M</div>
                </div>
                <div className="flex-1 h-px bg-gradient-to-l from-transparent to-cyan-200/70 dark:to-cyan-800/40" />
              </div>
              {/* Category bar: 27% wide, 66% shopping + 34% food */}
              <div className="relative h-4 bg-slate-100 dark:bg-slate-800/60 rounded-xl overflow-hidden mb-1">
                <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 flex rounded-xl overflow-hidden" style={{ width: "27%" }}>
                  <div className="h-full shrink-0" style={{ width: "66%", backgroundColor: "#DB2777" }} />
                  <div className="h-full shrink-0" style={{ width: "34%", backgroundColor: "#EA580C" }} />
                </div>
              </div>
              <p className="text-[10px] font-medium text-teal-500 dark:text-teal-400 text-center tracking-wide mb-1.5">light day</p>
              <div className="space-y-px">
                <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-sm" style={{ background: "linear-gradient(135deg, #F472B6, #F43F5E)" }}>🛍️</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-700 dark:text-slate-200 truncate">Souvenirs</p>
                    <p className="text-[10px] text-slate-400">Anil</p>
                  </div>
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 tabular-nums shrink-0">₹2,500</span>
                </div>
                <p className="text-[10px] text-slate-300 dark:text-slate-600 italic px-2 pb-1">+1 more</p>
              </div>
            </div>

          </div>
        </FadeIn>

        {/* Right: copy */}
        <FadeIn direction="right" className="flex-1 text-center lg:text-left">
          <p className="text-sm font-semibold text-cyan-600 uppercase tracking-widest mb-3">For trips</p>
          <h2 className="text-4xl sm:text-5xl text-slate-800 dark:text-slate-100 mb-5" style={{ fontFamily: "var(--font-fraunces)" }}>
            Every day,
            <br />
            <span style={{ background: "linear-gradient(135deg, #0891B2 0%, #14B8A6 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              in its moment.
            </span>
          </h2>
          <p className="text-lg text-slate-500 dark:text-slate-400 leading-relaxed max-w-md mx-auto lg:mx-0 mb-6">
            The timeline places every expense on the day it happened — no digging, no sorting. See the shape of your trip at a glance and understand where the money went.
          </p>
          <ul className="space-y-3 text-left max-w-md mx-auto lg:mx-0">
            {[
              { icon: "📅", label: "Day-by-day grouping", desc: "Every expense lands on its day — scroll through the trip like a story." },
              { icon: "🔥", label: "Busiest day highlight", desc: "The big-spend day is automatically flagged so it's never buried." },
              { icon: "🎨", label: "Category colour bars", desc: "See whether a day was mostly transport, food, or accommodation — instantly." },
              { icon: "👤", label: "Per-payer chips", desc: "Colour-coded initials sized by each person's share of the day." },
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
