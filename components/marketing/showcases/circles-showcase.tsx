"use client";

import { CheckCircle2, Bell } from "lucide-react";
import { FadeIn } from "@/components/shared/fade-in";

/** Extracted from about-landing.tsx for lazy-loading — see lazy-section.tsx. */
export default function CirclesShowcase() {
  return (
    <section className="max-w-6xl mx-auto px-6 pb-24">
      <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">

        {/* Left: contribution progress mockup */}
        <FadeIn direction="left" className="flex-1 w-full max-w-md">
          <div className="glass rounded-2xl p-6 shadow-xl shadow-violet-500/10">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100" style={{ fontFamily: "var(--font-fraunces)" }}>Bali Trip Fund</p>
                <p className="text-xs text-slate-400 mt-0.5">One-time circle · 6 members · ₹8,000 each</p>
              </div>
              <div className="flex items-center gap-1.5 bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 text-xs font-semibold px-2.5 py-1 rounded-full">
                🪙 Circle
              </div>
            </div>

            {/* Progress */}
            <div className="mb-5">
              <div className="flex items-end justify-between mb-2">
                <div>
                  <p className="text-xs text-slate-400">Collected</p>
                  <p className="text-2xl font-bold text-violet-600 dark:text-violet-400" style={{ fontFamily: "var(--font-fraunces)" }}>₹24,000</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">of ₹50,000 target</p>
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">48% · 3 of 6 paid</p>
                </div>
              </div>
              <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-700/60 overflow-hidden">
                <div className="h-2.5 rounded-full" style={{ width: "48%", background: "linear-gradient(90deg, #8B5CF6, #F43F5E)" }} />
              </div>
            </div>

            {/* Paid */}
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2.5">Paid (3)</p>
            <div className="space-y-1.5 mb-4">
              {[
                { name: "Priya", amt: "₹8,000" },
                { name: "Raj",   amt: "₹8,000" },
                { name: "You",   amt: "₹8,000" },
              ].map((m, i) => (
                <div key={i} className="flex items-center gap-2.5 glass-sm rounded-xl px-3 py-2.5">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-400 to-emerald-400 flex items-center justify-center text-xs font-bold text-white shrink-0">{m.name[0]}</div>
                  <span className="text-sm text-slate-700 dark:text-slate-200 flex-1">{m.name}</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">{m.amt}</span>
                </div>
              ))}
            </div>

            {/* Pending */}
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2.5">Pending (2)</p>
            <div className="space-y-1.5">
              {[
                { name: "Anil" },
                { name: "Meera" },
              ].map((m, i) => (
                <div key={i} className="flex items-center gap-2.5 glass-sm rounded-xl px-3 py-2.5">
                  <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-semibold text-slate-500 dark:text-slate-400 shrink-0">{m.name[0]}</div>
                  <span className="text-sm text-slate-500 dark:text-slate-400 flex-1">{m.name}</span>
                  <div className="inline-flex items-center gap-1 text-xs font-medium text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800/50 px-2.5 py-1 rounded-lg shrink-0">
                    <Bell className="w-3 h-3" /> Remind
                  </div>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>

        {/* Right: copy */}
        <FadeIn direction="right" className="flex-1 text-center lg:text-left">
          <p className="text-sm font-semibold text-violet-600 uppercase tracking-widest mb-3">Circles</p>
          <h2 className="text-4xl sm:text-5xl text-slate-800 dark:text-slate-100 mb-5" style={{ fontFamily: "var(--font-fraunces)" }}>
            Shared fund,
            <br />
            <span style={{ background: "linear-gradient(135deg, #8B5CF6 0%, #F43F5E 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              everyone accountable.
            </span>
          </h2>
          <p className="text-lg text-slate-500 dark:text-slate-400 leading-relaxed max-w-md mx-auto lg:mx-0 mb-6">
            Create a shared pool — recurring monthly or a one-time drive toward a target. Every contribution is tracked, the admin stays in control, and a single tap sends WhatsApp reminders to anyone who hasn&apos;t paid yet.
          </p>
          <ul className="space-y-3 text-left max-w-md mx-auto lg:mx-0">
            {[
              { icon: "🔁", label: "Recurring or one-time",   desc: "Monthly cycles or a single collection drive — both supported from day one." },
              { icon: "🏆", label: "Target + deadline",        desc: "Optional target amount and end date — progress bar keeps everyone aligned." },
              { icon: "📲", label: "WhatsApp group reminder",  desc: "One tap sends a personalised message to all pending members with a progress bar." },
              { icon: "👻", label: "Ghost members",            desc: "Add people by name only — no ClearOff account. Admin records contributions on their behalf." },
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
