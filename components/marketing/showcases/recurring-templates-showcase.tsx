"use client";

import { RefreshCw, CheckCircle2, CalendarCheck } from "lucide-react";
import { FadeIn } from "@/components/shared/fade-in";

/** Extracted from about-landing.tsx for lazy-loading — see lazy-section.tsx. */
export default function RecurringTemplatesShowcase() {
  return (
    <section className="max-w-6xl mx-auto px-6 pb-24">
      <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
        {/* Left: template mockup */}
        <FadeIn direction="left" className="flex-1 w-full max-w-md">
          <div className="glass rounded-2xl p-6 shadow-xl shadow-teal-500/10">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100" style={{ fontFamily: "var(--font-fraunces)" }}>Mumbai Flat</p>
                <p className="text-xs text-slate-400 mt-0.5">Recurring expenses · May 2026</p>
              </div>
              <div className="flex items-center gap-1.5 bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 text-xs font-medium px-2.5 py-1 rounded-full">
                <RefreshCw className="w-3 h-3" /> 7 templates
              </div>
            </div>
            <div className="space-y-2.5">
              {[
                { icon: "🏠", label: "Monthly rent",     amount: "₹30,000", logged: true,  date: "May 1"  },
                { icon: "⚡", label: "Electricity bill", amount: "₹1,800",  logged: true,  date: "May 1"  },
                { icon: "📡", label: "WiFi broadband",   amount: "₹999",    logged: false, date: null     },
                { icon: "🎬", label: "Netflix",          amount: "₹649",    logged: false, date: null     },
                { icon: "🏢", label: "Society maintenance", amount: "₹2,500", logged: false, date: null   },
              ].map((t, i) => (
                <div key={i} className="flex items-center gap-3 glass-sm rounded-xl px-3.5 py-3">
                  <span className="text-lg shrink-0">{t.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{t.label}</p>
                    <p className="text-xs text-slate-400">{t.amount} · monthly</p>
                  </div>
                  {t.logged ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5" /> {t.date}
                    </span>
                  ) : (
                    <div className="inline-flex items-center gap-1 text-xs font-medium text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800/50 px-2.5 py-1 rounded-lg shrink-0">
                      <CalendarCheck className="w-3 h-3" /> Log for May
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </FadeIn>

        {/* Right: copy */}
        <FadeIn direction="right" className="flex-1 text-center lg:text-left">
          <p className="text-sm font-semibold text-teal-600 uppercase tracking-widest mb-3">For nests</p>
          <h2 className="text-4xl sm:text-5xl text-slate-800 dark:text-slate-100 mb-5" style={{ fontFamily: "var(--font-fraunces)" }}>
            Recurring bills,
            <br />
            <span style={{ background: "linear-gradient(135deg, #0D9488 0%, #059669 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              one tap each month.
            </span>
          </h2>
          <p className="text-lg text-slate-500 dark:text-slate-400 leading-relaxed max-w-md mx-auto lg:mx-0">
            Set up recurring templates for rent, electricity, subscriptions. Every month, tap "Log for May" and it's recorded — split exactly as you configured, ready to settle.
          </p>
        </FadeIn>
      </div>
    </section>
  );
}
