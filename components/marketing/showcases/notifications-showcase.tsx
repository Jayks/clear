"use client";

import { Bell } from "lucide-react";
import { FadeIn } from "@/components/shared/fade-in";

/** Extracted from about-landing.tsx for lazy-loading — see lazy-section.tsx. */
export default function NotificationsShowcase() {
  return (
    <section className="max-w-6xl mx-auto px-6 pb-24">
      <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">

        {/* Left: copy */}
        <FadeIn direction="left" className="flex-1 text-center lg:text-left">
          <p className="text-sm font-semibold text-cyan-600 uppercase tracking-widest mb-3">Notifications</p>
          <h2 className="text-4xl sm:text-5xl text-slate-800 dark:text-slate-100 mb-5" style={{ fontFamily: "var(--font-fraunces)" }}>
            Know the moment
            <br />
            <span style={{ background: "linear-gradient(135deg, #0891B2 0%, #14B8A6 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              money moves.
            </span>
          </h2>
          <p className="text-lg text-slate-500 dark:text-slate-400 leading-relaxed max-w-md mx-auto lg:mx-0 mb-6">
            Every time a group member logs an expense, everyone gets notified — by email and as an instant push alert on their phone. No more "did you add that taxi yet?"
          </p>
          <ul className="space-y-3 text-left max-w-md mx-auto lg:mx-0">
            {[
              { icon: "📧", label: "Email alerts", desc: "Delivered to your inbox with a direct link back to the group" },
              { icon: "🔔", label: "Push notifications", desc: "Instant alerts on Android and installed iOS PWA — even when the app is closed" },
              { icon: "🔕", label: "Per-group mute", desc: "Silence any group from the menu — email and push together" },
              { icon: "💬", label: "Comment & @mention alerts", desc: "Get notified when someone comments on your expense or tags you in a thread" },
              { icon: "⚠️", label: "Dispute alerts", desc: "Know instantly when someone raises a question or dispute on an expense you paid for" },
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

        {/* Right: notification mockup */}
        <FadeIn direction="right" className="flex-1 w-full max-w-sm">
          <div className="glass rounded-2xl p-6 shadow-xl shadow-cyan-500/10">
            {/* Phone top bar */}
            <div className="flex items-center justify-between mb-5">
              <span className="text-xs text-slate-400">9:41 AM</span>
              <div className="flex items-center gap-1.5">
                <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
              </div>
            </div>

            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Notifications</p>

            {/* Push notifications */}
            {[
              { group: "Goa 2025", actor: "Priya", desc: "Welcome dinner", amount: "₹4,500", ago: "just now" },
              { group: "Goa 2025", actor: "Raj", desc: "Airport taxi", amount: "₹2,000", ago: "2m ago" },
              { group: "Mumbai Flat", actor: "Anil", desc: "Electricity bill", amount: "₹1,800", ago: "1h ago" },
            ].map((n, i) => (
              <div key={i} className={`flex items-start gap-3 rounded-2xl p-3.5 mb-2 last:mb-0 ${i === 0 ? "bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-100 dark:border-cyan-900/50" : "bg-white/60 dark:bg-slate-800/60"}`}>
                <div className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center shadow-sm" style={{ background: "linear-gradient(140deg, #22D3EE 0%, #0BB6D4 42%, #0E8FA8 78%, #0B5E70 100%)" }}>
                  <Bell className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">ClearOff · {n.group}</p>
                    <span className="text-[10px] text-slate-400 shrink-0">{n.ago}</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug">
                    {n.actor} logged <span className="font-medium text-slate-700 dark:text-slate-200">{n.amount}</span> for {n.desc}
                  </p>
                </div>
              </div>
            ))}

            {/* Email preview */}
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/40">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2.5">Also in your inbox</p>
              <div className="glass-sm rounded-xl p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center bg-slate-100 dark:bg-slate-800">
                  <span className="text-sm">📧</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">[Goa 2025] Priya logged ₹4,500 for Welcome dinner</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">ClearOff · View in app →</p>
                </div>
              </div>
            </div>
          </div>
        </FadeIn>

      </div>
    </section>
  );
}
