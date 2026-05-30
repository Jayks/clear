"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight, ArrowLeft, ChevronLeft, ChevronRight,
  CheckCircle2, RefreshCw, CalendarCheck, Sparkles,
  BarChart2, TrendingUp, Bell,
} from "lucide-react";
import { ClearLogo, ClearIcon } from "@/components/shared/clear-logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";

// ─── Constants ────────────────────────────────────────────────────────────────
const SLIDE_COUNT = 9;

const SLIDES = [
  { label: "Clear",     short: "Home"        },
  { label: "AI",        short: "AI"          },
  { label: "Timeline",  short: "Timeline"    },
  { label: "Settle",    short: "Settle"      },
  { label: "Debt Flow", short: "Debt Flow"   },
  { label: "Insights",  short: "Insights"    },
  { label: "Nests",     short: "Nests"       },
  { label: "Streams",   short: "Streams"     },
  { label: "Get started", short: "Start"     },
];

// ─── Phone frame ──────────────────────────────────────────────────────────────
function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative mx-auto shrink-0 select-none"
      style={{ width: 238, height: 510 }}
    >
      {/* Outer shell */}
      <div
        className="absolute inset-0 rounded-[38px] shadow-[0_40px_80px_rgba(0,0,0,0.35)] dark:shadow-[0_40px_80px_rgba(0,0,0,0.60)]"
        style={{ background: "linear-gradient(160deg,#2D3748 0%,#1A202C 60%,#171923 100%)" }}
      />
      {/* Volume buttons */}
      <div className="absolute rounded-l-sm" style={{ left: -3, top: 88, width: 3, height: 28, background: "#374151" }} />
      <div className="absolute rounded-l-sm" style={{ left: -3, top: 128, width: 3, height: 44, background: "#374151" }} />
      <div className="absolute rounded-l-sm" style={{ left: -3, top: 180, width: 3, height: 44, background: "#374151" }} />
      {/* Power button */}
      <div className="absolute rounded-r-sm" style={{ right: -3, top: 140, width: 3, height: 56, background: "#374151" }} />
      {/* Screen bezel */}
      <div
        className="absolute overflow-hidden"
        style={{ inset: 9, borderRadius: 31, background: "#0F172A", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)" }}
      >
        {/* Dynamic island */}
        <div
          className="absolute z-20 flex items-center justify-center gap-1.5"
          style={{ top: 10, left: "50%", transform: "translateX(-50%)", width: 84, height: 24, background: "#0F172A", borderRadius: 12 }}
        >
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#1E293B" }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#1E293B" }} />
        </div>
        {/* Status bar */}
        <div className="absolute z-10 flex items-center justify-between px-5" style={{ top: 0, left: 0, right: 0, height: 36 }}>
          <span className="text-white font-semibold" style={{ fontSize: 9 }}>9:41</span>
          <div className="flex items-center gap-1">
            <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
              <rect x="0" y="3" width="2" height="5" rx="0.5" fill="white" fillOpacity="0.4"/>
              <rect x="3" y="2" width="2" height="6" rx="0.5" fill="white" fillOpacity="0.6"/>
              <rect x="6" y="1" width="2" height="7" rx="0.5" fill="white" fillOpacity="0.8"/>
              <rect x="9" y="0" width="2" height="8" rx="0.5" fill="white"/>
            </svg>
            <svg width="14" height="8" viewBox="0 0 14 8" fill="none">
              <rect x="0.5" y="0.5" width="11" height="7" rx="1.5" stroke="white" strokeOpacity="0.4"/>
              <rect x="12" y="2.5" width="1.5" height="3" rx="0.75" fill="white" fillOpacity="0.4"/>
              <rect x="1.5" y="1.5" width="8" height="5" rx="1" fill="white"/>
            </svg>
          </div>
        </div>
        {/* Scrollable app content */}
        <div className="absolute overflow-hidden" style={{ top: 36, left: 0, right: 0, bottom: 0 }}>
          {children}
        </div>
      </div>
      {/* Home indicator */}
      <div
        className="absolute"
        style={{ bottom: 6, left: "50%", transform: "translateX(-50%)", width: 80, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.18)" }}
      />
    </div>
  );
}

// ─── Responsive phone wrapper: clips + scales on mobile ──────────────────────
// Mobile: scale 0.714 → 238→170px wide, 510→364px tall. Clip with overflow-hidden.
function ResponsivePhone({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Mobile */}
      <div className="md:hidden relative overflow-hidden mx-auto" style={{ width: 170, height: 364 }}>
        <div style={{ position: "absolute", top: 0, left: 0, transform: "scale(0.714)", transformOrigin: "top left" }}>
          <PhoneFrame>{children}</PhoneFrame>
        </div>
      </div>
      {/* Desktop */}
      <div className="hidden md:block">
        <PhoneFrame>{children}</PhoneFrame>
      </div>
    </>
  );
}

// ─── Phone app bar (inside phone) ─────────────────────────────────────────────
function AppBar({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <span className="text-white font-semibold" style={{ fontSize: 12, fontFamily: "var(--font-fraunces)" }}>{title}</span>
      {right}
    </div>
  );
}

// ─── Phone bottom nav (inside phone) ─────────────────────────────────────────
function PhoneNav({ active: activeTab = 0 }: { active?: number }) {
  const tabs = [
    { label: "Home",    icon: "⊞" },
    { label: "Streams", icon: "⇌" },
    { label: "Insights", icon: "📈" },
  ];
  return (
    <div
      className="absolute left-0 right-0 bottom-0 flex items-end justify-around pb-1"
      style={{ height: 42, borderTop: "1px solid rgba(255,255,255,0.07)", background: "rgba(15,23,42,0.95)" }}
    >
      {tabs.map((t, i) => (
        <div key={t.label} className="flex flex-col items-center pt-1 gap-0.5">
          <div className="text-xs">{t.icon}</div>
          <span style={{ fontSize: 7.5, color: i === activeTab ? "#22D3EE" : "rgba(148,163,184,0.7)", fontWeight: i === activeTab ? 600 : 400 }}>
            {t.label}
          </span>
          {i === activeTab && (
            <div style={{ width: 16, height: 2, borderRadius: 1, background: "#22D3EE" }} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Slide layout wrapper ─────────────────────────────────────────────────────
function FeatureSlide({
  label, labelColor = "text-cyan-500 dark:text-cyan-400",
  headline, gradientStyle,
  body, bullets,
  phone, phoneRight = true,
}: {
  label: string; labelColor?: string;
  headline: React.ReactNode; gradientStyle?: React.CSSProperties;
  body: string; bullets?: { e: string; t: string }[];
  phone: React.ReactNode; phoneRight?: boolean;
}) {
  return (
    <div className={`snap-start snap-always flex h-full w-full shrink-0 flex-col md:flex-row items-center justify-center gap-3 md:gap-14 px-6 md:px-14 lg:px-20 py-4 md:py-0 ${phoneRight ? "" : "md:flex-row-reverse"}`}>
      {/* Copy */}
      <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left order-2 md:order-1 min-w-0 max-w-sm md:max-w-none">
        <p className={`text-xs font-semibold uppercase tracking-widest mb-1.5 ${labelColor}`}>{label}</p>
        <h2
          className="text-xl md:text-4xl font-normal leading-[1.12] text-slate-800 dark:text-slate-100 mb-2 md:mb-3"
          style={{ fontFamily: "var(--font-fraunces)" }}
        >
          {gradientStyle ? (
            <>
              {typeof headline === "string"
                ? <span style={gradientStyle}>{headline}</span>
                : headline}
            </>
          ) : headline}
        </h2>
        {/* Body + bullets hidden on mobile — phone mockup tells the story */}
        <p className="hidden md:block text-sm sm:text-base text-slate-500 dark:text-slate-400 leading-relaxed mb-4 max-w-xs">{body}</p>
        {bullets && (
          <div className="hidden md:block space-y-1.5">
            {bullets.map((b) => (
              <div key={b.t} className="flex items-center gap-2 justify-center md:justify-start">
                <span className="text-base shrink-0">{b.e}</span>
                <span className="text-sm text-slate-600 dark:text-slate-300">{b.t}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Phone — responsive (scaled on mobile, full on desktop) */}
      <div className="shrink-0 order-1 md:order-2">
        <ResponsivePhone>{phone}</ResponsivePhone>
      </div>
    </div>
  );
}

// ─── Avatar circle ────────────────────────────────────────────────────────────
function Av({ name, color, size = 22 }: { name: string; color: string; size?: number }) {
  return (
    <div
      className="flex items-center justify-center font-bold text-white rounded-full shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.38, background: color }}
    >
      {name[0]}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function CarouselLanding() {
  const [active, setActive] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    const c = containerRef.current;
    if (!c) return;
    const idx = Math.round(c.scrollLeft / c.clientWidth);
    setActive(Math.max(0, Math.min(idx, SLIDE_COUNT - 1)));
  }, []);

  const goTo = useCallback((i: number) => {
    const c = containerRef.current;
    if (!c) return;
    c.scrollTo({ left: i * c.clientWidth, behavior: "smooth" });
    setActive(i);
  }, []);

  useEffect(() => {
    const c = containerRef.current;
    if (!c) return;
    c.addEventListener("scroll", handleScroll, { passive: true });
    return () => c.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  return (
    <div className="fixed inset-0 flex flex-col bg-gradient-to-br from-slate-50 via-white to-cyan-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">

      {/* ── Top nav ──────────────────────────────────────────────────────── */}
      <nav className="shrink-0 h-14 flex items-center justify-between px-4 sm:px-6 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-100/80 dark:border-slate-800/60">
        <ClearLogo
          iconSize={30}
          wordmarkClassName="text-base font-semibold text-slate-800 dark:text-slate-100"
          className="flex items-center gap-2"
        />
        <div className="flex items-center gap-1">
          <span className="hidden sm:flex items-center mr-1"><ThemeToggle /></span>
          <Link
            href="/login"
            scroll={false}
            className="text-sm font-semibold text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/login?intent=signup"
            scroll={false}
            className="inline-flex items-center gap-1.5 bg-gradient-to-br from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white text-sm font-semibold py-2 px-3 sm:px-4 rounded-xl shadow-md shadow-cyan-500/25 transition-all hover:-translate-y-0.5"
          >
            Get started <ArrowRight className="w-3.5 h-3.5 hidden sm:inline" />
          </Link>
        </div>
      </nav>

      {/* ── Horizontal carousel ──────────────────────────────────────────── */}
      <div
        ref={containerRef}
        className="flex-1 flex overflow-x-scroll snap-x snap-mandatory"
        style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" } as React.CSSProperties}
      >

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* SLIDE 0 — Hero / Home screen                                  */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="snap-start snap-always w-full shrink-0 h-full flex flex-col md:flex-row items-center justify-center gap-3 md:gap-14 px-6 md:px-14 lg:px-20 py-4 md:py-0">
          {/* Copy */}
          <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left max-w-sm md:max-w-none order-2 md:order-1">
            <div className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 mb-4 border border-slate-200 dark:border-slate-700/60 bg-white/70 dark:bg-slate-800/50 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-br from-cyan-500 to-teal-500 animate-pulse shrink-0" />
              Trips &amp; nests · 30-day Plus trial
            </div>
            <h1
              className="text-3xl sm:text-4xl lg:text-5xl font-normal leading-[1.08] text-slate-800 dark:text-slate-100 mb-4"
              style={{ fontFamily: "var(--font-fraunces)" }}
            >
              Split it.{" "}
              <span style={{ background: "linear-gradient(135deg,#0891B2 0%,#14B8A6 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                Clear it.
              </span>
            </h1>
            <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 leading-relaxed mb-6 max-w-xs">
              Group expenses for trips and home — logged in seconds, settled in the fewest payments possible.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto mb-5">
              <Link
                href="/login?intent=signup"
                scroll={false}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-br from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white font-semibold text-sm py-2.5 px-7 rounded-2xl shadow-lg shadow-cyan-500/30 transition-all hover:-translate-y-0.5"
              >
                Start for free <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/about"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 text-slate-600 dark:text-slate-300 font-medium text-sm py-2.5 px-7 rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-white/60 dark:bg-slate-800/30 hover:border-slate-300 dark:hover:border-slate-600 transition-all"
              >
                See all features <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-3.5 gap-y-1.5">
              {["Google sign-in", "No credit card", "iOS & Android"].map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                  <CheckCircle2 className="w-3 h-3 text-teal-500 shrink-0" /> {t}
                </span>
              ))}
            </div>
          </div>
          {/* Phone — Home screen */}
          <div className="shrink-0 order-1 md:order-2">
            <ResponsivePhone>
              <div className="h-full flex flex-col bg-white dark:bg-slate-900" style={{ fontSize: 11 }}>
                <AppBar title="Clear" right={
                  <div className="flex items-center gap-2">
                    <Bell className="text-slate-400" style={{ width: 13, height: 13 }} />
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-400 to-teal-400 flex items-center justify-center text-white font-bold" style={{ fontSize: 9 }}>J</div>
                  </div>
                } />
                {/* Greeting */}
                <div className="px-3 pt-2 pb-1.5">
                  <p className="text-white font-medium" style={{ fontSize: 13, fontFamily: "var(--font-fraunces)" }}>Good morning, Jay 👋</p>
                </div>
                {/* Pill nav */}
                <div className="flex gap-1.5 px-3 pb-2">
                  {["Trips", "Nests", "Archived"].map((t, i) => (
                    <div key={t} className="rounded-full px-2.5 py-0.5" style={{ fontSize: 9, background: i === 0 ? "rgba(6,182,212,0.15)" : "rgba(255,255,255,0.06)", color: i === 0 ? "#22D3EE" : "rgba(148,163,184,0.7)", border: i === 0 ? "1px solid rgba(6,182,212,0.3)" : "1px solid rgba(255,255,255,0.08)", fontWeight: i === 0 ? 600 : 400 }}>
                      {t}
                    </div>
                  ))}
                </div>
                {/* Trip cards */}
                <div className="flex-1 px-3 space-y-2 overflow-hidden">
                  {/* Goa card */}
                  <div className="rounded-2xl overflow-hidden" style={{ background: "linear-gradient(135deg,rgba(6,182,212,0.25) 0%,rgba(20,184,166,0.15) 100%)", border: "1px solid rgba(6,182,212,0.2)" }}>
                    <div className="px-3 py-2.5">
                      <div className="flex items-center justify-between mb-1">
                        <div>
                          <p className="text-white font-semibold" style={{ fontSize: 11, fontFamily: "var(--font-fraunces)" }}>🏖️ Goa 2025</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="w-1 h-1 rounded-full bg-cyan-400 animate-pulse" />
                            <span style={{ fontSize: 8, color: "#22D3EE", fontWeight: 600 }}>Day 2 of 5</span>
                          </div>
                        </div>
                        <span className="rounded-full px-2 py-0.5 font-semibold" style={{ fontSize: 8, background: "rgba(251,191,36,0.15)", color: "#FBB24A", border: "1px solid rgba(251,191,36,0.2)" }}>₹450 owed</span>
                      </div>
                      <div className="flex gap-1 mt-1.5">
                        {["P","R","A","M","Y"].map((l, i) => (
                          <div key={i} className="w-4 h-4 rounded-full flex items-center justify-center text-white font-bold" style={{ fontSize: 6, background: ["#0891B2","#7C3AED","#059669","#D97706","#DB2777"][i] }}>{l}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                  {/* Mumbai flat */}
                  <div className="rounded-2xl px-3 py-2.5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-semibold" style={{ fontSize: 11, fontFamily: "var(--font-fraunces)" }}>🏠 Mumbai Flat</p>
                        <p style={{ fontSize: 8, color: "rgba(148,163,184,0.7)" }}>Nest · 4 members</p>
                      </div>
                      <span className="rounded-full px-2 py-0.5 font-semibold" style={{ fontSize: 8, background: "rgba(16,185,129,0.12)", color: "#10B981", border: "1px solid rgba(16,185,129,0.2)" }}>₹1,200 owed</span>
                    </div>
                  </div>
                  {/* Manali */}
                  <div className="rounded-2xl px-3 py-2.5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <div className="flex items-center justify-between">
                      <p className="text-white font-semibold" style={{ fontSize: 11, fontFamily: "var(--font-fraunces)" }}>✈️ Manali Trip</p>
                      <span style={{ fontSize: 8, color: "rgba(148,163,184,0.5)" }}>Settled ✓</span>
                    </div>
                  </div>
                </div>
                {/* FAB */}
                <div className="absolute right-3" style={{ bottom: 50 }}>
                  <div className="w-9 h-9 rounded-full shadow-lg flex items-center justify-center text-white font-bold" style={{ background: "linear-gradient(135deg,#FB923C,#F43F5E)", fontSize: 18, boxShadow: "0 4px 16px rgba(251,146,60,0.5)" }}>+</div>
                </div>
                <PhoneNav active={0} />
              </div>
            </ResponsivePhone>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* SLIDE 1 — AI Quick-add                                        */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <FeatureSlide
          label="AI-powered"
          labelColor="text-cyan-500 dark:text-cyan-400"
          headline={<>Just type how you&apos;d <span style={{ background: "linear-gradient(135deg,#0891B2 0%,#14B8A6 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>say it.</span></>}
          body="Describe an expense naturally — AI extracts amount, payer, and split instantly. Or paste a group chat to import all at once."
          bullets={[
            { e: "✨", t: "Natural language parsing" },
            { e: "💬", t: "WhatsApp chat import" },
            { e: "🎤", t: "Voice input" },
          ]}
          phone={
            <div className="h-full flex flex-col bg-white dark:bg-slate-900">
              {/* Dim overlay to suggest sheet */}
              <div className="flex-1" style={{ background: "rgba(0,0,0,0.35)" }} />
              {/* Quick-add sheet */}
              <div className="rounded-t-3xl" style={{ background: "#0F172A", border: "1px solid rgba(255,255,255,0.08)", borderBottom: "none" }}>
                <div className="flex justify-center pt-2 pb-1">
                  <div className="w-8 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }} />
                </div>
                <div className="px-4 pb-3">
                  <p className="text-white font-semibold mb-2.5" style={{ fontSize: 12, fontFamily: "var(--font-fraunces)" }}>Add expense — Goa 2025</p>
                  {/* Input */}
                  <div className="rounded-xl px-3 py-2.5 mb-3" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(6,182,212,0.3)" }}>
                    <p style={{ fontSize: 10, color: "rgba(255,255,255,0.8)" }}>Priya paid dinner at Taj 4500 split with all</p>
                    <div className="flex items-center gap-1 mt-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                      <span style={{ fontSize: 8.5, color: "#22D3EE" }}>AI parsing…</span>
                    </div>
                  </div>
                  {/* Chips */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {[
                      { label: "₹4,500",         color: "rgba(16,185,129,0.15)",  border: "rgba(16,185,129,0.3)",  text: "#10B981" },
                      { label: "Priya paid",      color: "rgba(6,182,212,0.15)",   border: "rgba(6,182,212,0.3)",   text: "#22D3EE" },
                      { label: "5-way equal",     color: "rgba(139,92,246,0.15)",  border: "rgba(139,92,246,0.3)",  text: "#A78BFA" },
                      { label: "🍽️ Food",         color: "rgba(245,158,11,0.12)",  border: "rgba(245,158,11,0.25)", text: "#FCD34D" },
                    ].map((chip) => (
                      <div key={chip.label} className="flex items-center gap-1 rounded-full px-2 py-0.5" style={{ background: chip.color, border: `1px solid ${chip.border}`, fontSize: 8.5, color: chip.text, fontWeight: 600 }}>
                        <CheckCircle2 style={{ width: 8, height: 8, color: chip.text }} />
                        {chip.label}
                      </div>
                    ))}
                  </div>
                  {/* Save button */}
                  <div className="rounded-xl py-2.5 text-center font-semibold" style={{ background: "linear-gradient(135deg,#0891B2,#14B8A6)", fontSize: 11, color: "white" }}>
                    Save expense ₹4,500
                  </div>
                </div>
              </div>
            </div>
          }
        />

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* SLIDE 2 — Trip Timeline                                       */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <FeatureSlide
          label="Trip timeline"
          labelColor="text-cyan-500 dark:text-cyan-400"
          headline={<>Every day, <span style={{ background: "linear-gradient(135deg,#0891B2 0%,#14B8A6 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>in its moment.</span></>}
          body="Expenses land on the day they happened. Day-by-day grouping, category colour bars, busiest-day flagging — all automatic."
          bullets={[
            { e: "📅", t: "Day-by-day grouping" },
            { e: "🔥", t: "Busiest day highlighted" },
            { e: "✈️", t: "Alive badges — Day 2 of 5" },
            { e: "🎨", t: "Category colour bars" },
          ]}
          phoneRight={false}
          phone={
            <div className="h-full flex flex-col" style={{ background: "#0F172A" }}>
              <AppBar title="Goa 2025 · Expenses" />
              <div className="flex-1 overflow-hidden px-2 pt-2 pb-12 space-y-1.5">
                {/* Day 1 */}
                <div className="rounded-xl px-2.5 pt-2 pb-1.5" style={{ background: "#2563EB10" }}>
                  <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    <span className="rounded-full px-1.5 py-0.5 font-semibold" style={{ fontSize: 8, background: "rgba(6,182,212,0.15)", color: "#22D3EE", border: "1px solid rgba(6,182,212,0.25)" }}>Day 1/3</span>
                    <span style={{ fontSize: 8, color: "rgba(148,163,184,0.7)" }}>Mon Jun 2</span>
                    <span className="ml-auto font-semibold" style={{ fontSize: 9, color: "rgba(226,232,240,0.9)", fontFamily: "var(--font-fraunces)" }}>₹6,500</span>
                  </div>
                  {[
                    { icon: "🏨", desc: "Hotel check-in", amount: "₹5,000", by: "Priya" },
                    { icon: "🚕", desc: "Airport cab",    amount: "₹1,500", by: "You"   },
                  ].map((e, i) => (
                    <div key={i} className="flex items-center gap-2 py-1">
                      <div className="w-5 h-5 rounded-lg flex items-center justify-center text-xs shrink-0" style={{ background: "linear-gradient(135deg,#60A5FA,#2563EB)" }}>{e.icon}</div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate" style={{ fontSize: 9, color: "rgba(226,232,240,0.9)", fontWeight: 500 }}>{e.desc}</p>
                        <p style={{ fontSize: 7.5, color: "rgba(148,163,184,0.6)" }}>{e.by}</p>
                      </div>
                      <span style={{ fontSize: 9, color: "rgba(226,232,240,0.8)", fontWeight: 600, fontFamily: "var(--font-fraunces)" }}>{e.amount}</span>
                    </div>
                  ))}
                </div>
                {/* Connector */}
                <div className="flex justify-center"><div className="w-px h-2" style={{ background: "rgba(255,255,255,0.08)" }} /></div>
                {/* Day 2 — busiest */}
                <div className="rounded-xl px-2.5 pt-2 pb-1.5" style={{ background: "#92400E10" }}>
                  <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    <span className="rounded-full px-1.5 py-0.5 font-semibold" style={{ fontSize: 8, background: "rgba(251,191,36,0.12)", color: "#FCD34D", border: "1px solid rgba(251,191,36,0.2)" }}>Day 2/3</span>
                    <span style={{ fontSize: 8, color: "rgba(148,163,184,0.7)" }}>Tue Jun 3</span>
                    <span className="ml-auto font-semibold" style={{ fontSize: 9, color: "#FCD34D", fontFamily: "var(--font-fraunces)" }}>₹14,200</span>
                  </div>
                  <p className="text-center mb-1" style={{ fontSize: 8, color: "#F59E0B", fontWeight: 600 }}>🔥 busiest day</p>
                  {/* Category bar */}
                  <div className="h-1.5 rounded-full overflow-hidden mb-1.5" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <div className="flex h-full rounded-full">
                      <div style={{ width: "56%", background: "#16A34A" }} />
                      <div style={{ width: "23%", background: "#EA580C" }} />
                      <div style={{ width: "21%", background: "#9333EA" }} />
                    </div>
                  </div>
                  {[
                    { icon: "🏄", desc: "Water sports",  amount: "₹8,000", by: "Raj" },
                    { icon: "🍺", desc: "Beach shack",   amount: "₹3,200", by: "You" },
                    { icon: "🚗", desc: "Cab to beach",  amount: "₹3,000", by: "Priya" },
                  ].map((e, i) => (
                    <div key={i} className="flex items-center gap-2 py-0.5">
                      <div className="w-5 h-5 rounded-lg flex items-center justify-center text-xs shrink-0" style={{ background: "linear-gradient(135deg,#4ADE80,#10B981)" }}>{e.icon}</div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate" style={{ fontSize: 9, color: "rgba(226,232,240,0.9)", fontWeight: 500 }}>{e.desc}</p>
                        <p style={{ fontSize: 7.5, color: "rgba(148,163,184,0.6)" }}>{e.by}</p>
                      </div>
                      <span style={{ fontSize: 9, color: "rgba(226,232,240,0.8)", fontWeight: 600, fontFamily: "var(--font-fraunces)" }}>{e.amount}</span>
                    </div>
                  ))}
                </div>
                {/* Connector */}
                <div className="flex justify-center"><div className="w-px h-2" style={{ background: "rgba(255,255,255,0.08)" }} /></div>
                {/* Day 3 */}
                <div className="rounded-xl px-2.5 pt-2 pb-1.5" style={{ background: "#DB277710" }}>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    <span className="rounded-full px-1.5 py-0.5 font-semibold" style={{ fontSize: 8, background: "rgba(6,182,212,0.15)", color: "#22D3EE", border: "1px solid rgba(6,182,212,0.25)" }}>Day 3/3</span>
                    <span style={{ fontSize: 8, color: "rgba(148,163,184,0.7)" }}>Wed Jun 4</span>
                    <span className="ml-auto font-semibold" style={{ fontSize: 9, color: "rgba(226,232,240,0.9)", fontFamily: "var(--font-fraunces)" }}>₹3,800</span>
                  </div>
                  <div className="flex items-center gap-2 py-1">
                    <div className="w-5 h-5 rounded-lg flex items-center justify-center text-xs shrink-0" style={{ background: "linear-gradient(135deg,#F472B6,#F43F5E)" }}>🛍️</div>
                    <p className="flex-1 truncate" style={{ fontSize: 9, color: "rgba(226,232,240,0.9)", fontWeight: 500 }}>Souvenirs &amp; last dinner</p>
                    <span style={{ fontSize: 9, color: "rgba(226,232,240,0.8)", fontWeight: 600 }}>₹3,800</span>
                  </div>
                </div>
              </div>
              <PhoneNav active={0} />
            </div>
          }
        />

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* SLIDE 3 — Settle Up                                           */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <FeatureSlide
          label="Settle up"
          labelColor="text-emerald-600 dark:text-emerald-400"
          headline={<>One payment each. <span style={{ background: "linear-gradient(135deg,#0891B2 0%,#14B8A6 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>No math.</span></>}
          body="Clear's algorithm collapses any IOU tangle into the minimum number of transfers — no matter how many people. One tap to pay via GPay, PhonePe, or any UPI app."
          bullets={[
            { e: "🧮", t: "Minimum payments guaranteed" },
            { e: "💸", t: "UPI deep links — GPay, PhonePe" },
            { e: "↩️", t: "5-second undo on each settlement" },
            { e: "📊", t: "Personal math at a glance" },
          ]}
          phone={
            <div className="h-full flex flex-col" style={{ background: "#0F172A" }}>
              <AppBar title="Settle up · Goa 2025" />
              <div className="flex-1 overflow-hidden px-2.5 pt-2 pb-12 space-y-2">
                {/* Hero card */}
                <div className="rounded-2xl px-3 py-3 text-center" style={{ background: "linear-gradient(135deg,rgba(251,191,36,0.12),rgba(217,119,6,0.08))", border: "1px solid rgba(251,191,36,0.2)" }}>
                  <p style={{ fontSize: 8.5, color: "rgba(148,163,184,0.7)", marginBottom: 2 }}>YOUR BALANCE</p>
                  <p className="font-bold" style={{ fontSize: 20, color: "#FCD34D", fontFamily: "var(--font-fraunces)" }}>₹2,400 owed</p>
                  <p style={{ fontSize: 8, color: "rgba(148,163,184,0.6)", marginTop: 3 }}>You put in ₹6,000 · fair share ₹5,000</p>
                </div>
                {/* Net balances */}
                <div className="rounded-xl px-3 py-2" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <p className="font-semibold mb-2" style={{ fontSize: 8.5, color: "rgba(226,232,240,0.6)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Net balances</p>
                  {[
                    { name: "Priya",  net: "+₹3,000", cls: "#10B981" },
                    { name: "You",    net: "−₹2,400", cls: "#FCD34D" },
                    { name: "Raj",    net: "−₹1,000", cls: "#FCD34D" },
                    { name: "Anil",   net: "+₹400",   cls: "#10B981" },
                  ].map((b) => (
                    <div key={b.name} className="flex justify-between py-0.5">
                      <span style={{ fontSize: 9, color: "rgba(226,232,240,0.7)" }}>{b.name}</span>
                      <span style={{ fontSize: 9, color: b.cls, fontWeight: 600, fontFamily: "var(--font-fraunces)" }}>{b.net}</span>
                    </div>
                  ))}
                </div>
                {/* Payment cards */}
                <p className="font-semibold" style={{ fontSize: 8.5, color: "rgba(226,232,240,0.5)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Minimum payments</p>
                {[
                  { to: "Priya", amount: "₹1,400" },
                  { to: "Raj",   amount: "₹1,000" },
                ].map((p, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <Av name={p.to} color={["#0891B2","#7C3AED"][i]} size={20} />
                    <div className="flex-1 min-w-0">
                      <p style={{ fontSize: 9, color: "rgba(226,232,240,0.9)", fontWeight: 500 }}>Pay {p.to}</p>
                      <p style={{ fontSize: 7.5, color: "rgba(148,163,184,0.5)" }}>GPay · PhonePe · UPI</p>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-lg px-2 py-1" style={{ background: "linear-gradient(135deg,#06B6D4,#0D9488)" }}>
                      <span className="text-white font-bold" style={{ fontSize: 8.5 }}>{p.amount}</span>
                      <span className="text-white" style={{ fontSize: 8 }}>→</span>
                    </div>
                  </div>
                ))}
              </div>
              <PhoneNav active={0} />
            </div>
          }
        />

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* SLIDE 4 — Debt Flow Graph                                     */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <FeatureSlide
          label="Debt Flow graph"
          labelColor="text-cyan-500 dark:text-cyan-400"
          headline={<>See every balance <span style={{ background: "linear-gradient(135deg,#0891B2 0%,#14B8A6 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>at a glance.</span></>}
          body="The Debt Flow graph maps who owes whom. Tap any arc and the exact payment card scrolls into view. Drag nodes to untangle crowded groups."
          bullets={[
            { e: "💫", t: "Animated money flows" },
            { e: "👆", t: "Tap arc → jump to payment" },
            { e: "🖐", t: "Drag nodes to untangle" },
          ]}
          phoneRight={false}
          phone={
            <div className="h-full flex flex-col" style={{ background: "#0F172A" }}>
              <AppBar title="Debt Flow · Goa 2025" />
              <div className="flex-1 overflow-hidden flex items-center justify-center pb-12">
                {/* Simplified debt flow SVG */}
                <svg viewBox="0 0 200 200" style={{ width: 190, height: 190 }} xmlns="http://www.w3.org/2000/svg">
                  {/* Background glow */}
                  <defs>
                    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#0891B2" stopOpacity="0.12" />
                      <stop offset="100%" stopColor="#0891B2" stopOpacity="0" />
                    </radialGradient>
                  </defs>
                  <circle cx="100" cy="100" r="90" fill="url(#glow)" />

                  {/* Arcs (debts) */}
                  {/* Meera → Priya */}
                  <path d="M 100 30 Q 145 65 155 95" stroke="#22D3EE" strokeWidth="2.5" fill="none" strokeOpacity="0.7" strokeLinecap="round" />
                  <circle r="2.5" fill="#22D3EE" fillOpacity="0.9">
                    <animateMotion path="M 100 30 Q 145 65 155 95" dur="2s" repeatCount="indefinite" />
                  </circle>

                  {/* Raj → Priya */}
                  <path d="M 170 125 Q 155 100 155 95" stroke="#A78BFA" strokeWidth="2" fill="none" strokeOpacity="0.6" strokeLinecap="round" />
                  <circle r="2" fill="#A78BFA" fillOpacity="0.8">
                    <animateMotion path="M 170 125 Q 155 100 155 95" dur="1.6s" repeatCount="indefinite" begin="0.4s" />
                  </circle>

                  {/* Anil → You */}
                  <path d="M 30 125 Q 42 100 45 95" stroke="#34D399" strokeWidth="2" fill="none" strokeOpacity="0.6" strokeLinecap="round" />
                  <circle r="2" fill="#34D399" fillOpacity="0.8">
                    <animateMotion path="M 30 125 Q 42 100 45 95" dur="1.8s" repeatCount="indefinite" begin="0.8s" />
                  </circle>

                  {/* Nodes */}
                  {/* Priya - top */}
                  <circle cx="155" cy="95" r="14" fill="#0F172A" stroke="#0891B2" strokeWidth="2" />
                  <circle cx="155" cy="95" r="11" fill="#0891B2" fillOpacity="0.2" />
                  <text x="155" y="99" textAnchor="middle" fill="#22D3EE" fontSize="10" fontWeight="bold">P</text>
                  <text x="155" y="118" textAnchor="middle" fill="rgba(148,163,184,0.7)" fontSize="7">₹+3k</text>

                  {/* You - left */}
                  <circle cx="45" cy="95" r="14" fill="#0F172A" stroke="#14B8A6" strokeWidth="2" />
                  <circle cx="45" cy="95" r="11" fill="#14B8A6" fillOpacity="0.2" />
                  <text x="45" y="99" textAnchor="middle" fill="#2DD4BF" fontSize="8" fontWeight="bold">You</text>
                  <text x="45" y="118" textAnchor="middle" fill="rgba(148,163,184,0.7)" fontSize="7">₹−2.4k</text>

                  {/* Meera - top */}
                  <circle cx="100" cy="30" r="14" fill="#0F172A" stroke="#D97706" strokeWidth="2" />
                  <circle cx="100" cy="30" r="11" fill="#D97706" fillOpacity="0.15" />
                  <text x="100" y="34" textAnchor="middle" fill="#FCD34D" fontSize="9" fontWeight="bold">M</text>
                  <text x="100" y="53" textAnchor="middle" fill="rgba(148,163,184,0.7)" fontSize="7">₹−2k</text>

                  {/* Raj - right */}
                  <circle cx="170" cy="125" r="14" fill="#0F172A" stroke="#7C3AED" strokeWidth="2" />
                  <circle cx="170" cy="125" r="11" fill="#7C3AED" fillOpacity="0.15" />
                  <text x="170" y="129" textAnchor="middle" fill="#A78BFA" fontSize="10" fontWeight="bold">R</text>
                  <text x="170" y="148" textAnchor="middle" fill="rgba(148,163,184,0.7)" fontSize="7">₹−1k</text>

                  {/* Anil - left */}
                  <circle cx="30" cy="125" r="14" fill="#0F172A" stroke="#059669" strokeWidth="2" />
                  <circle cx="30" cy="125" r="11" fill="#059669" fillOpacity="0.15" />
                  <text x="30" y="129" textAnchor="middle" fill="#34D399" fontSize="9" fontWeight="bold">A</text>
                  <text x="30" y="148" textAnchor="middle" fill="rgba(148,163,184,0.7)" fontSize="7">₹+4k</text>

                  {/* Legend */}
                  <text x="100" y="188" textAnchor="middle" fill="rgba(148,163,184,0.5)" fontSize="7">Tap arc to jump to payment →</text>
                </svg>
              </div>
              <PhoneNav active={0} />
            </div>
          }
        />

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* SLIDE 5 — Insights                                            */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <FeatureSlide
          label="Insights"
          labelColor="text-amber-600 dark:text-amber-400"
          headline={<>Understand <span style={{ background: "linear-gradient(135deg,#D97706 0%,#0891B2 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>where it went.</span></>}
          body="Per-group analytics, personal finance view, cross-trip story. Category breakdowns, daily spend charts, member contributions — all automatic."
          bullets={[
            { e: "📊", t: "Category & daily spend charts" },
            { e: "👥", t: "Member contributions" },
            { e: "✨", t: "AI trip narrative" },
            { e: "🟣", t: "Personal finance view (You tab)" },
          ]}
          phone={
            <div className="h-full flex flex-col" style={{ background: "#0F172A" }}>
              <AppBar title="Insights · Goa 2025" right={<span className="rounded-full px-2 py-0.5 text-amber-400 font-semibold" style={{ fontSize: 8, background: "rgba(217,119,6,0.15)", border: "1px solid rgba(217,119,6,0.25)" }}>Insights</span>} />
              <div className="flex-1 overflow-hidden px-2.5 pt-2 pb-12 space-y-2">
                {/* KPI tiles */}
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="rounded-xl p-2.5" style={{ background: "linear-gradient(135deg,rgba(6,182,212,0.15),rgba(20,184,166,0.08))", border: "1px solid rgba(6,182,212,0.2)" }}>
                    <p style={{ fontSize: 7.5, color: "rgba(148,163,184,0.6)" }}>Total spent</p>
                    <p className="font-bold" style={{ fontSize: 14, color: "#22D3EE", fontFamily: "var(--font-fraunces)" }}>₹25,000</p>
                    <p style={{ fontSize: 7, color: "rgba(148,163,184,0.5)" }}>5 members</p>
                  </div>
                  <div className="rounded-xl p-2.5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <p style={{ fontSize: 7.5, color: "rgba(148,163,184,0.6)" }}>Per person</p>
                    <p className="font-bold" style={{ fontSize: 14, color: "rgba(226,232,240,0.9)", fontFamily: "var(--font-fraunces)" }}>₹5,000</p>
                    <p style={{ fontSize: 7, color: "rgba(148,163,184,0.5)" }}>fair share</p>
                  </div>
                </div>
                {/* Category bars */}
                <div className="rounded-xl px-2.5 py-2" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <p className="font-semibold mb-2" style={{ fontSize: 8, color: "rgba(226,232,240,0.5)", textTransform: "uppercase", letterSpacing: "0.07em" }}>By category</p>
                  {[
                    { label: "Accommodation", pct: 48, color: "#0891B2", amount: "₹12,000" },
                    { label: "Food & drink",  pct: 28, color: "#0D9488", amount: "₹7,000"  },
                    { label: "Transport",     pct: 16, color: "#6366F1", amount: "₹4,000"  },
                    { label: "Activities",   pct: 8,  color: "#7C3AED", amount: "₹2,000"  },
                  ].map((c) => (
                    <div key={c.label} className="mb-1.5">
                      <div className="flex justify-between mb-0.5">
                        <span style={{ fontSize: 8, color: "rgba(148,163,184,0.7)" }}>{c.label}</span>
                        <span style={{ fontSize: 8, color: "rgba(226,232,240,0.7)", fontWeight: 600 }}>{c.amount}</span>
                      </div>
                      <div className="h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.07)" }}>
                        <div className="h-1.5 rounded-full" style={{ width: `${c.pct}%`, background: c.color }} />
                      </div>
                    </div>
                  ))}
                </div>
                {/* Member contributions */}
                <div className="rounded-xl px-2.5 py-2" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <p className="font-semibold mb-2" style={{ fontSize: 8, color: "rgba(226,232,240,0.5)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Contributions</p>
                  {[
                    { name: "Priya", pct: 96, amount: "₹8,000" },
                    { name: "You",   pct: 72, amount: "₹6,000" },
                    { name: "Raj",   pct: 48, amount: "₹4,000" },
                  ].map((m) => (
                    <div key={m.name} className="flex items-center gap-1.5 mb-1">
                      <span className="w-7 shrink-0" style={{ fontSize: 8, color: "rgba(148,163,184,0.7)" }}>{m.name}</span>
                      <div className="flex-1 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.07)" }}>
                        <div className="h-1.5 rounded-full" style={{ width: `${m.pct}%`, background: "linear-gradient(90deg,#0891B2,#14B8A6)" }} />
                      </div>
                      <span className="w-11 text-right shrink-0" style={{ fontSize: 8, color: "rgba(226,232,240,0.7)", fontWeight: 600 }}>{m.amount}</span>
                    </div>
                  ))}
                </div>
              </div>
              <PhoneNav active={2} />
            </div>
          }
        />

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* SLIDE 6 — Nests                                               */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <FeatureSlide
          label="Nests"
          labelColor="text-teal-600 dark:text-teal-400"
          headline={<>Household bills, <span style={{ background: "linear-gradient(135deg,#0D9488 0%,#059669 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>one tap a month.</span></>}
          body="Set up recurring templates for rent, electricity, subscriptions. Every month, log with one tap — split exactly as configured."
          bullets={[
            { e: "🔁", t: "Recurring templates — 1 tap/month" },
            { e: "📅", t: "Expenses grouped by month" },
            { e: "📈", t: "Monthly pace tracker" },
            { e: "🏠", t: "Household-specific categories" },
          ]}
          phoneRight={false}
          phone={
            <div className="h-full flex flex-col" style={{ background: "#0F172A" }}>
              <AppBar title="Mumbai Flat · May 2026" right={<RefreshCw style={{ width: 11, height: 11, color: "#2DD4BF" }} />} />
              <div className="flex-1 overflow-hidden px-2.5 pt-2 pb-12 space-y-2">
                {/* Summary */}
                <div className="rounded-xl px-3 py-2.5" style={{ background: "linear-gradient(135deg,rgba(13,148,136,0.15),rgba(5,150,105,0.08))", border: "1px solid rgba(13,148,136,0.25)" }}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p style={{ fontSize: 8, color: "rgba(148,163,184,0.7)" }}>Recurring this month</p>
                      <p className="font-bold" style={{ fontSize: 16, color: "#2DD4BF", fontFamily: "var(--font-fraunces)" }}>₹35,948</p>
                    </div>
                    <div className="text-right">
                      <p style={{ fontSize: 7, color: "rgba(148,163,184,0.5)" }}>2 of 7 logged</p>
                      <div className="w-16 h-1 rounded-full mt-1" style={{ background: "rgba(255,255,255,0.08)" }}>
                        <div className="h-1 rounded-full" style={{ width: "29%", background: "#0D9488" }} />
                      </div>
                    </div>
                  </div>
                </div>
                {/* Templates */}
                <p className="font-semibold" style={{ fontSize: 8, color: "rgba(226,232,240,0.4)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Recurring templates</p>
                <div className="space-y-1.5">
                  {[
                    { icon: "🏠", label: "Monthly rent",     amount: "₹30,000", logged: true,  date: "May 1"  },
                    { icon: "⚡", label: "Electricity",      amount: "₹1,800",  logged: true,  date: "May 1"  },
                    { icon: "📡", label: "WiFi broadband",   amount: "₹999",    logged: false, date: null     },
                    { icon: "🎬", label: "Netflix",          amount: "₹649",    logged: false, date: null     },
                    { icon: "🏢", label: "Society maint.",   amount: "₹2,500",  logged: false, date: null     },
                  ].map((t, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-xl px-2.5 py-2" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                      <span style={{ fontSize: 14 }}>{t.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="truncate" style={{ fontSize: 9, color: "rgba(226,232,240,0.9)", fontWeight: 500 }}>{t.label}</p>
                        <p style={{ fontSize: 7.5, color: "rgba(148,163,184,0.5)" }}>{t.amount} · monthly</p>
                      </div>
                      {t.logged ? (
                        <div className="flex items-center gap-1 shrink-0">
                          <CheckCircle2 style={{ width: 10, height: 10, color: "#10B981" }} />
                          <span style={{ fontSize: 8, color: "#10B981", fontWeight: 600 }}>{t.date}</span>
                        </div>
                      ) : (
                        <div className="rounded-md px-2 py-0.5 flex items-center gap-1 shrink-0" style={{ background: "rgba(6,182,212,0.12)", border: "1px solid rgba(6,182,212,0.25)" }}>
                          <CalendarCheck style={{ width: 8, height: 8, color: "#22D3EE" }} />
                          <span style={{ fontSize: 8, color: "#22D3EE", fontWeight: 600 }}>Log</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <PhoneNav active={0} />
            </div>
          }
        />

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* SLIDE 7 — Streams                                             */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <FeatureSlide
          label="Streams"
          labelColor="text-indigo-500 dark:text-indigo-400"
          headline={<>Track 1:1 money <span style={{ background: "linear-gradient(135deg,#6366F1 0%,#8B5CF6 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>with anyone.</span></>}
          body="No group needed. A running bilateral ledger — log, confirm, partially settle, or forgive. Works even for people who don't have Clear yet."
          bullets={[
            { e: "📒", t: "Bilateral spine view" },
            { e: "✅", t: "Guest confirmation link" },
            { e: "💚", t: "Partial settle or forgive" },
            { e: "⚡", t: "Swipe left for quick actions" },
          ]}
          phone={
            <div className="h-full flex flex-col" style={{ background: "#0F172A" }}>
              <AppBar title="With Priya" right={
                <span className="rounded-full px-2 py-0.5 font-bold" style={{ fontSize: 8, background: "rgba(251,191,36,0.12)", color: "#FCD34D", border: "1px solid rgba(251,191,36,0.2)" }}>₹1,200 owed</span>
              } />
              <div className="flex-1 overflow-hidden px-2.5 pt-2 pb-12 space-y-2">
                {/* Hero balance */}
                <div className="rounded-xl px-3 py-2.5" style={{ background: "linear-gradient(135deg,rgba(99,102,241,0.15),rgba(139,92,246,0.08))", border: "1px solid rgba(99,102,241,0.25)" }}>
                  <p style={{ fontSize: 7.5, color: "rgba(148,163,184,0.6)" }}>Net balance</p>
                  <p className="font-bold" style={{ fontSize: 18, color: "#FCD34D", fontFamily: "var(--font-fraunces)" }}>₹1,200 owed</p>
                  <div className="flex gap-3 mt-1.5">
                    {[
                      { label: "Confirmed", amt: "₹800",  color: "#10B981" },
                      { label: "Pending",   amt: "₹400",  color: "#FCD34D" },
                    ].map((s) => (
                      <div key={s.label}>
                        <p style={{ fontSize: 7, color: "rgba(148,163,184,0.5)" }}>{s.label}</p>
                        <p style={{ fontSize: 9, color: s.color, fontWeight: 700 }}>{s.amt}</p>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Spine entries */}
                <p className="font-semibold" style={{ fontSize: 8, color: "rgba(226,232,240,0.4)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Recent entries</p>
                {/* Centre spine */}
                <div className="relative space-y-1.5">
                  {/* Left spine line */}
                  <div className="absolute" style={{ left: "50%", top: 0, bottom: 0, width: 1, background: "rgba(255,255,255,0.07)", transform: "translateX(-50%)" }} />
                  {[
                    { side: "right", label: "Priya covered cab",   amount: "₹800",  status: "confirmed", color: "#0891B2" },
                    { side: "left",  label: "You paid lunch",       amount: "₹400",  status: "pending",   color: "#6366F1" },
                    { side: "right", label: "Priya bought coffee",  amount: "₹320",  status: "confirmed", color: "#0891B2" },
                    { side: "left",  label: "You covered groceries",amount: "₹680",  status: "confirmed", color: "#6366F1" },
                  ].map((e, i) => (
                    <div key={i} className={`flex items-center gap-1.5 ${e.side === "right" ? "flex-row-reverse" : ""}`}>
                      {/* Card */}
                      <div className="flex-1 rounded-xl px-2 py-1.5" style={{
                        background: e.side === "right" ? "rgba(8,145,178,0.1)" : "rgba(99,102,241,0.1)",
                        border: `1px solid ${e.side === "right" ? "rgba(8,145,178,0.2)" : "rgba(99,102,241,0.2)"}`,
                        marginLeft: e.side === "right" ? 6 : 0,
                        marginRight: e.side === "left" ? 6 : 0,
                      }}>
                        <p className="truncate" style={{ fontSize: 8.5, color: "rgba(226,232,240,0.85)", fontWeight: 500 }}>{e.label}</p>
                        <div className="flex justify-between items-center mt-0.5">
                          <span style={{ fontSize: 9, color: e.color, fontWeight: 700, fontFamily: "var(--font-fraunces)" }}>{e.amount}</span>
                          <span style={{ fontSize: 7, color: e.status === "confirmed" ? "#10B981" : "#FCD34D" }}>
                            {e.status === "confirmed" ? "✓ confirmed" : "⏳ pending"}
                          </span>
                        </div>
                      </div>
                      {/* Dot on spine */}
                      <div className="w-2.5 h-2.5 rounded-full shrink-0 z-10" style={{ background: e.status === "confirmed" ? "#10B981" : "#F59E0B", boxShadow: `0 0 6px ${e.status === "confirmed" ? "rgba(16,185,129,0.5)" : "rgba(245,158,11,0.5)"}` }} />
                    </div>
                  ))}
                </div>
                {/* Settle button */}
                <button className="w-full rounded-xl py-2 font-semibold text-white text-center" style={{ fontSize: 10, background: "linear-gradient(135deg,#6366F1,#8B5CF6)" }}>
                  Settle with Priya →
                </button>
              </div>
              <PhoneNav active={1} />
            </div>
          }
        />

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* SLIDE 8 — CTA                                                 */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="snap-start snap-always w-full shrink-0 h-full flex flex-col items-center justify-center px-6">
          <div
            className="relative rounded-3xl overflow-hidden px-8 py-14 sm:py-20 w-full max-w-2xl text-center"
            style={{ background: "linear-gradient(135deg,#0E7490 0%,#0D9488 50%,#059669 100%)" }}
          >
            <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-white/10 blur-3xl" />
            <div className="relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-6 border border-white/30">
                <ClearIcon size={44} />
              </div>
              <h2
                className="text-3xl sm:text-5xl text-white mb-3"
                style={{ fontFamily: "var(--font-fraunces)" }}
              >
                Ready to get clear?
              </h2>
              <p className="text-teal-100 text-base sm:text-lg mb-2">30-day Plus trial. No credit card.</p>
              <p className="text-teal-200/60 text-sm mb-10">Google sign-in · 30 seconds to start · iOS &amp; Android</p>
              <Link
                href="/login?intent=signup"
                scroll={false}
                className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-teal-700 font-bold text-base py-3.5 px-10 rounded-2xl shadow-xl shadow-teal-900/30 transition-all hover:-translate-y-0.5"
              >
                Get started free <ArrowRight className="w-4 h-4" />
              </Link>
              <div className="mt-8 flex items-center justify-center gap-5">
                <Link href="/about" className="text-teal-200/70 text-sm hover:text-white transition-colors">
                  See all features →
                </Link>
                <span className="text-teal-300/30">·</span>
                <Link href="/pricing" className="text-teal-200/70 text-sm hover:text-white transition-colors">
                  Pricing →
                </Link>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ── Bottom bar ───────────────────────────────────────────────────── */}
      <div className="shrink-0 h-12 flex items-center justify-between px-4 sm:px-6 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-t border-slate-100/80 dark:border-slate-800/60 z-50">
        {/* Dots */}
        <div className="flex items-center gap-1.5">
          {Array.from({ length: SLIDE_COUNT }, (_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Go to ${SLIDES[i]?.short}`}
              className={`rounded-full transition-all duration-200 ${
                i === active
                  ? "w-5 h-2 bg-cyan-500"
                  : "w-2 h-2 bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 dark:hover:bg-slate-500"
              }`}
            />
          ))}
        </div>
        {/* Slide label + info links */}
        <div className="flex items-center gap-4 sm:gap-5">
          <span className="text-xs font-medium text-slate-400 dark:text-slate-500 hidden sm:inline">
            {SLIDES[active]?.label}
          </span>
          <span className="hidden sm:block w-px h-3 bg-slate-200 dark:bg-slate-700" />
          <Link href="/about" className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
            About
          </Link>
          <Link href="/changelog" className="hidden sm:block text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
            What&apos;s New
          </Link>
          <Link href="/pricing" className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
            Pricing
          </Link>
        </div>
      </div>

      {/* ── Prev / Next arrows (desktop) ─────────────────────────────────── */}
      <button
        onClick={() => goTo(Math.max(0, active - 1))}
        className="fixed left-3 top-1/2 -translate-y-1/2 hidden md:flex w-9 h-9 items-center justify-center rounded-full bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-md hover:bg-white dark:hover:bg-slate-700 transition-all z-50 disabled:opacity-30"
        disabled={active === 0}
        aria-label="Previous"
      >
        <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-300" />
      </button>
      <button
        onClick={() => goTo(Math.min(SLIDE_COUNT - 1, active + 1))}
        className="fixed right-3 top-1/2 -translate-y-1/2 hidden md:flex w-9 h-9 items-center justify-center rounded-full bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-md hover:bg-white dark:hover:bg-slate-700 transition-all z-50 disabled:opacity-30"
        disabled={active === SLIDE_COUNT - 1}
        aria-label="Next"
      >
        <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-300" />
      </button>

    </div>
  );
}
