"use client";

import { ArrowRight, CheckCircle2 } from "lucide-react";
import { FadeIn } from "@/components/shared/fade-in";

/** Extracted from about-landing.tsx for lazy-loading — see lazy-section.tsx. */
export default function SettlementShowcase() {
  return (
    <section className="max-w-6xl mx-auto px-6 pb-24">
      <FadeIn className="text-center mb-12">
        <p className="text-sm font-semibold text-cyan-600 uppercase tracking-widest mb-3">Settlement</p>
        <h2 className="text-4xl sm:text-5xl text-slate-800 dark:text-slate-100 mb-4" style={{ fontFamily: "var(--font-fraunces)" }}>
          One payment each.
          <br />
          <span style={{ background: "linear-gradient(135deg, #0891B2 0%, #14B8A6 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            No chasing.
          </span>
        </h2>
        <p className="text-lg text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
          ClearOff's algorithm collapses any tangle of shared expenses into the minimum number of transfers — no matter how many people.
        </p>
      </FadeIn>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_64px_1fr] gap-4 items-start max-w-3xl mx-auto">
        {/* Before */}
        <FadeIn direction="left" className="glass rounded-2xl p-6">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-4">Goa 2025 · 5 people · 8 expenses</p>
          <div className="space-y-2 mb-4">
            {[
              { name: "Priya", paid: "₹8,000" },
              { name: "You",   paid: "₹6,000" },
              { name: "Raj",   paid: "₹4,000" },
              { name: "Anil",  paid: "₹4,000" },
              { name: "Meera", paid: "₹3,000" },
            ].map((p) => (
              <div key={p.name} className="flex items-center justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">{p.name} paid</span>
                <span className="font-medium text-slate-600 dark:text-slate-300">{p.paid}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 italic border-t border-slate-100 dark:border-slate-700/40 pt-3">How do we settle this fairly?</p>
        </FadeIn>

        {/* Arrow — desktop only, no animation */}
        <div className="hidden sm:flex items-center justify-center pt-16">
          <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg" style={{ background: "linear-gradient(135deg, #0891B2, #14B8A6)" }}>
            <ArrowRight className="w-5 h-5 text-white" />
          </div>
        </div>

        {/* After */}
        <FadeIn direction="right" className="glass rounded-2xl p-6 border border-teal-200/40 dark:border-teal-800/30">
          <p className="text-[10px] font-semibold text-teal-600 dark:text-teal-400 uppercase tracking-widest mb-4">ClearOff says — 3 transfers</p>
          <div className="space-y-3 mb-4">
            {[
              { from: "Meera", to: "Priya", amount: "₹2,000" },
              { from: "Raj",   to: "Priya", amount: "₹1,000" },
              { from: "Anil",  to: "You",   amount: "₹1,000" },
            ].map((t, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200 w-12 shrink-0">{t.from}</span>
                <ArrowRight className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                <span className="text-sm text-slate-600 dark:text-slate-300 flex-1">{t.to}</span>
                <span className="text-sm font-semibold text-teal-600 dark:text-teal-400 shrink-0">{t.amount}</span>
              </div>
            ))}
            <div className="py-3" />
          </div>
          <div className="flex items-center justify-between border-t border-teal-100 dark:border-teal-900/40 pt-3 mb-3">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-teal-500 shrink-0" />
              <p className="text-xs font-semibold text-teal-600 dark:text-teal-400">Everyone's clear</p>
            </div>
            <span className="text-[10px] text-slate-400 italic">Undo within 5s if needed</span>
          </div>
          <div className="flex items-center gap-2 bg-white/60 dark:bg-slate-800/60 rounded-xl px-3 py-2.5 border border-slate-100 dark:border-slate-700/40">
            <span className="text-base shrink-0">💸</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-700 dark:text-slate-200">Pay Priya ₹2,000</p>
              <p className="text-[10px] text-slate-400">Opens GPay · PhonePe · any UPI app</p>
            </div>
            <div className="shrink-0 text-[10px] font-bold text-white px-2.5 py-1 rounded-lg" style={{ background: "linear-gradient(135deg, #06B6D4, #14B8A6)" }}>
              PAY →
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
