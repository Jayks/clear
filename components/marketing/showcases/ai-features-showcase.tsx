"use client";

import { Sparkles, CheckCircle2 } from "lucide-react";
import { FadeIn } from "@/components/shared/fade-in";

/** Extracted from about-landing.tsx for lazy-loading — see lazy-section.tsx. */
export default function AiFeaturesShowcase() {
  return (
    <section className="max-w-6xl mx-auto px-6 pb-24">
      <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">

        {/* Left: copy */}
        <FadeIn direction="left" className="flex-1 text-center lg:text-left">
          <p className="text-sm font-semibold text-cyan-600 uppercase tracking-widest mb-3">AI-powered</p>
          <h2 className="text-4xl sm:text-5xl text-slate-800 dark:text-slate-100 mb-5" style={{ fontFamily: "var(--font-fraunces)" }}>
            Type it like you'd
            <br />
            <span style={{ background: "linear-gradient(135deg, #0891B2 0%, #14B8A6 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              say it out loud.
            </span>
          </h2>
          <p className="text-lg text-slate-500 dark:text-slate-400 leading-relaxed max-w-md mx-auto lg:mx-0 mb-6">
            Describe an expense the way you'd text a friend — AI extracts the amount, payer, and split instantly. Or paste your whole group chat and import every expense at once.
          </p>
          <ul className="space-y-3 text-left max-w-md mx-auto lg:mx-0">
            {[
              { icon: "✨", label: "Natural language", desc: "\"Priya paid 4500 for dinner split with all\" — done." },
              { icon: "💬", label: "Chat import", desc: "Paste a WhatsApp or iMessage thread — AI picks out every expense." },
              { icon: "🎤", label: "Voice input", desc: "Tap the mic and say the expense — no typing needed." },
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

        {/* Right: AI parsing mockup */}
        <FadeIn direction="right" className="flex-1 w-full max-w-sm">
          <div className="glass rounded-2xl p-6 shadow-xl shadow-cyan-500/10">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #0891B2, #14B8A6)" }}>
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Quick add</p>
            </div>

            <div className="glass-sm rounded-xl px-4 py-3 mb-3 border border-slate-200/60 dark:border-slate-700/40">
              <p className="text-sm text-slate-700 dark:text-slate-200">Priya paid dinner at Taj 4500 split with Raj and Kiran</p>
              <div className="flex items-center gap-1 mt-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-[10px] text-slate-400">Parsing…</span>
              </div>
            </div>

            <div className="bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-100 dark:border-cyan-900/50 rounded-xl p-4 mb-3">
              <div className="flex items-center gap-1.5 mb-3">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600" />
                <span className="text-[10px] font-semibold text-cyan-600 uppercase tracking-wide">AI parsed</span>
              </div>
              <div className="space-y-2">
                {[
                  { label: "Description", value: "Dinner at Taj" },
                  { label: "Amount",      value: "₹4,500" },
                  { label: "Paid by",     value: "Priya" },
                  { label: "Split",       value: "Equal · 3 members" },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">{row.label}</span>
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 glass-sm rounded-xl px-3.5 py-2.5 border border-white/60 dark:border-slate-700/40">
              <span className="text-base shrink-0">💬</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-700 dark:text-slate-200">Chat import</p>
                <p className="text-[10px] text-slate-400 truncate">Paste thread → 6 expenses detected</p>
              </div>
              <CheckCircle2 className="w-3.5 h-3.5 text-teal-500 shrink-0" />
            </div>
          </div>
        </FadeIn>

      </div>
    </section>
  );
}
