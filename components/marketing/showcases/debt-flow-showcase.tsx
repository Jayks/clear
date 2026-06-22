"use client";

import { FadeIn } from "@/components/shared/fade-in";
import { SettleFlowDemo } from "@/components/marketing/settle-flow-demo";

/** Extracted from about-landing.tsx for lazy-loading — see lazy-section.tsx. */
export default function DebtFlowShowcase() {
  return (
    <section className="max-w-6xl mx-auto px-6 pb-24">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

        {/* Live animated demo — left on desktop */}
        <FadeIn direction="left">
          <SettleFlowDemo />
        </FadeIn>

        {/* Copy — right on desktop */}
        <FadeIn direction="right" className="text-center lg:text-left">
          <p className="text-sm font-semibold text-cyan-600 uppercase tracking-widest mb-3">Debt Flow</p>
          <h2
            className="text-3xl sm:text-4xl text-slate-800 dark:text-slate-100 mb-4 leading-snug"
            style={{ fontFamily: "var(--font-fraunces)" }}
          >
            See every balance
            <br />
            <span style={{ background: "linear-gradient(135deg, #0891B2 0%, #14B8A6 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              at a glance.
            </span>
          </h2>
          <p className="text-lg text-slate-500 dark:text-slate-400 mb-8">
            The Debt Flow graph maps out who owes whom — animated money flows make it instant to understand, even in a group of ten.
          </p>
          <ul className="space-y-4 text-left max-w-sm mx-auto lg:mx-0">
            {[
              {
                emoji: "💫",
                label: "Animated money flows",
                desc: "Particles pulse from payer to recipient so the direction is always obvious.",
              },
              {
                emoji: "👆",
                label: "Tap arc → jump to payment",
                desc: "Tap any arc and the exact payment card scrolls into view — one tap, done.",
              },
              {
                emoji: "🖐",
                label: "Drag to untangle",
                desc: "Rearrange nodes freely when the graph gets crowded. It springs back neatly.",
              },
            ].map((item) => (
              <li key={item.label} className="flex items-start gap-3">
                <span className="text-xl shrink-0 mt-0.5">{item.emoji}</span>
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
