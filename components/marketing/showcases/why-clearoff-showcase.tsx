"use client";

import { CheckCircle2, X } from "lucide-react";
import { FadeIn } from "@/components/shared/fade-in";

/** Extracted from about-landing.tsx for lazy-loading — see lazy-section.tsx.
 *  Anchor target `id="why-clear"` (the hero's "Why ClearOff?" CTA) lives on
 *  LazySection's own wrapper div, NOT in here — see that file's `id` prop. */
export default function WhyClearOffShowcase() {
  return (
    <section className="max-w-6xl mx-auto px-6 pb-24">
      <FadeIn className="text-center mb-12">
        <p className="text-sm font-semibold text-cyan-600 uppercase tracking-widest mb-3">Why ClearOff?</p>
        <h2 className="text-4xl sm:text-5xl text-slate-800 dark:text-slate-100 mb-4" style={{ fontFamily: "var(--font-fraunces)" }}>
          Not just another
          <br />
          <span style={{ background: "linear-gradient(135deg, #0891B2 0%, #14B8A6 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            expense splitter.
          </span>
        </h2>
      </FadeIn>

      <FadeIn>
        <div className="glass rounded-2xl overflow-hidden mb-10">
          <div className="grid grid-cols-2 border-b border-slate-100 dark:border-slate-700/60">
            <div className="px-6 py-4 border-r border-slate-100 dark:border-slate-700/60">
              <p className="text-sm font-semibold text-slate-400 dark:text-slate-500">Other apps</p>
            </div>
            <div className="px-6 py-4 bg-cyan-50/50 dark:bg-cyan-950/20">
              <p className="text-sm font-semibold text-cyan-600 dark:text-cyan-400">ClearOff ✦</p>
            </div>
          </div>
          {[
            {
              them: "Type every field manually",
              us:   "AI parses amount, payer and split in seconds",
            },
            {
              them: "Everyone must create an account to join",
              us:   "Add guests by name — they claim with Google later",
            },
            {
              them: "Complex chains of IOUs between everyone",
              us:   "Minimum transactions — one payment per person, guaranteed",
            },
            {
              them: "No visual way to see who owes whom",
              us:   "Debt Flow graph — animated money flows, tap any arc to pay instantly",
            },
            {
              them: "Expenses pile up silently",
              us:   "Email + push the moment any money moves",
            },
            {
              them: "Disagreements go to WhatsApp",
              us:   "Raise a dispute in-app — payer accepts, split updates automatically",
            },
            {
              them: "No way to track direct 1:1 debts outside a group",
              us:   "Streams — bilateral ledger for any two people, guest confirmation, partial settle",
            },
            {
              them: "No shared fund or kitty management",
              us:   "Circles — recurring or one-time pool, contribution tracking, WhatsApp reminders",
            },
          ].map((row, i) => (
            <div key={i} className={`grid grid-cols-2 border-b border-slate-100/60 dark:border-slate-700/40 last:border-0 ${i % 2 === 1 ? "bg-slate-50/30 dark:bg-slate-800/20" : ""}`}>
              <div className="px-6 py-4 border-r border-slate-100 dark:border-slate-700/60 flex items-start gap-2.5">
                <X className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0 mt-0.5" />
                <p className="text-sm text-slate-400 dark:text-slate-500">{row.them}</p>
              </div>
              <div className="px-6 py-4 bg-cyan-50/20 dark:bg-cyan-950/10 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
                <p className="text-sm text-slate-700 dark:text-slate-200">{row.us}</p>
              </div>
            </div>
          ))}
        </div>
      </FadeIn>

      <FadeIn delay={80} className="flex flex-wrap items-center justify-center gap-3">
        {[
          "AI expense parsing", "Chat import", "Voice input", "Live split preview",
          "Recurring templates", "Guest members", "QR code invites", "Import members",
          "Per-group insights", "Trip timeline", "Email & push alerts", "UPI pay links",
          "Debt flow graph", "CSV export", "Expense audit trail", "Installs on any device",
          "Inline comments", "In-app dispute resolution",
          "Streams · bilateral 1:1 ledger", "Guest confirmation link", "Partial settle",
          "Circles · shared fund", "Recurring & one-time modes", "WhatsApp group reminder",
          "Ghost members", "Flexi contributions",
        ].map((pill) => (
          <span key={pill} className="glass-sm rounded-full px-4 py-1.5 text-sm text-slate-600 dark:text-slate-300 border border-white/60 dark:border-slate-700/40">
            {pill}
          </span>
        ))}
      </FadeIn>
    </section>
  );
}
