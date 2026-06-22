"use client";

import { Map } from "lucide-react";
import { FadeIn } from "@/components/shared/fade-in";

/** Extracted from about-landing.tsx for lazy-loading — see lazy-section.tsx. */
export default function MapViewShowcase() {
  return (
    <section className="max-w-6xl mx-auto px-6 pb-24">
      <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">

        {/* Left: map mockup */}
        <FadeIn direction="left" className="flex-1 w-full max-w-md">
          <div className="glass rounded-2xl p-5 shadow-xl shadow-cyan-500/10">

            {/* Section header */}
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-6 h-6 rounded-md bg-cyan-50 dark:bg-cyan-900/30 flex items-center justify-center shrink-0">
                <Map className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400" />
              </div>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Pan-India Explorer · Day 4</span>
              <div className="animate-rule-enter flex-1 h-[1.5px] bg-gradient-to-r from-cyan-200/70 to-transparent dark:from-cyan-800/40 dark:to-transparent" />
            </div>

            {/* Map canvas */}
            <div className="relative rounded-xl overflow-hidden h-56">
              <div className="absolute inset-0 dark:hidden" style={{ background: "linear-gradient(160deg, #ECFEFF 0%, #F0FDFA 50%, #ECFDF5 100%)" }} />
              <div className="absolute inset-0 hidden dark:block" style={{ background: "linear-gradient(160deg, #0B1220 0%, #0A1B1C 50%, #091A14 100%)" }} />

              {/* contour lines + route */}
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 224" fill="none" preserveAspectRatio="none">
                <path d="M-10,40 Q100,10 200,40 T410,30" stroke="currentColor" strokeWidth="1.5" className="text-cyan-900/10 dark:text-white/10" />
                <path d="M-10,90 Q100,60 200,95 T410,85" stroke="currentColor" strokeWidth="1.5" className="text-cyan-900/10 dark:text-white/10" />
                <path d="M-10,150 Q120,120 220,155 T410,140" stroke="currentColor" strokeWidth="1.5" className="text-cyan-900/10 dark:text-white/10" />
                {/* upcoming — dashed amber */}
                <path d="M250,150 Q300,110 350,55" stroke="#F59E0B" strokeWidth="2.5" strokeDasharray="6 5" strokeLinecap="round" opacity="0.75" />
                {/* traveled — solid emerald */}
                <path d="M40,180 Q120,162 180,170 T250,150" stroke="#10B981" strokeWidth="3" strokeLinecap="round" />
              </svg>

              {/* pins */}
              <div className="absolute" style={{ left: 28, top: 165 }}>
                <div className="w-7 h-7 rounded-full bg-white dark:bg-slate-800 shadow-md flex items-center justify-center text-sm ring-2 ring-emerald-400">🏨</div>
              </div>
              <div className="absolute" style={{ left: 164, top: 155 }}>
                <div className="w-7 h-7 rounded-full bg-white dark:bg-slate-800 shadow-md flex items-center justify-center text-sm ring-2 ring-emerald-400">🍽️</div>
              </div>
              <div className="absolute" style={{ left: 238, top: 135 }}>
                <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 shadow-md flex items-center justify-center text-xs font-bold text-cyan-600 dark:text-cyan-400 ring-2 ring-cyan-400">+2</div>
              </div>
              <div className="absolute" style={{ left: 336, top: 44 }}>
                <div className="w-7 h-7 rounded-full bg-white/70 dark:bg-slate-800/70 shadow-md flex items-center justify-center text-sm ring-2 ring-amber-300/70 opacity-70">🏛️</div>
              </div>

              {/* day badge chip */}
              <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 bg-white/90 dark:bg-slate-900/80 backdrop-blur-sm rounded-full px-2.5 py-1 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">Day 4 · Hampi</span>
              </div>
            </div>

            {/* Replay button */}
            <div className="mt-4 w-full inline-flex items-center justify-center gap-2 text-xs font-semibold text-white py-2.5 rounded-xl" style={{ background: "linear-gradient(135deg, #06B6D4, #0D9488)" }}>
              ▶ Replay Journey
            </div>
          </div>
        </FadeIn>

        {/* Right: copy */}
        <FadeIn direction="right" className="flex-1 text-center lg:text-left">
          <p className="text-sm font-semibold text-cyan-600 uppercase tracking-widest mb-3">For trips</p>
          <h2 className="text-4xl sm:text-5xl text-slate-800 dark:text-slate-100 mb-5" style={{ fontFamily: "var(--font-fraunces)" }}>
            Watch your trip
            <br />
            <span style={{ background: "linear-gradient(135deg, #0891B2 0%, #14B8A6 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              unfold on a map.
            </span>
          </h2>
          <p className="text-lg text-slate-500 dark:text-slate-400 leading-relaxed max-w-md mx-auto lg:mx-0 mb-6">
            Every located expense drops a pin automatically. Tap "Replay Journey" for a cinematic, day-by-day flythrough of where the money — and the trip — went.
          </p>
          <ul className="space-y-3 text-left max-w-md mx-auto lg:mx-0">
            {[
              { icon: "📍", label: "Auto-pinned expenses", desc: "GPS from receipt photos drops a pin — no manual tagging needed." },
              { icon: "🎬", label: "Cinema replay", desc: "A guided day-by-day flythrough with a milestone caption at every stop." },
              { icon: "🧭", label: "Traveled vs upcoming", desc: "Solid route = where you've been, dashed = where the trip heads next." },
              { icon: "🔗", label: "Smart clustering", desc: "Nearby expenses group into one pin — zoom in to split them apart." },
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
