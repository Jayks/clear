"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight, CheckCircle2, RefreshCw, CalendarCheck,
  Sparkles, CalendarDays, ChevronRight,
} from "lucide-react";
import { ClearLogo, ClearIcon } from "@/components/shared/clear-logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";

// ─── Slide height = 100dvh minus top nav (56px) and bottom bar (48px) ────────
const SLIDE_H = "calc(100dvh - 104px)";
const SLIDE_COUNT = 7;

// ─── Slide wrapper ────────────────────────────────────────────────────────────
function Slide({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`snap-start flex shrink-0 overflow-hidden ${className}`}
      style={{ height: SLIDE_H }}
    >
      {children}
    </div>
  );
}

// ─── Section label ────────────────────────────────────────────────────────────
function Label({ children, color = "text-cyan-600 dark:text-cyan-400" }: { children: React.ReactNode; color?: string }) {
  return (
    <p className={`text-xs font-semibold uppercase tracking-widest mb-2 ${color}`}>{children}</p>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function CarouselLanding() {
  const [active, setActive] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    const c = containerRef.current;
    if (!c) return;
    const idx = Math.round(c.scrollTop / c.clientHeight);
    setActive(Math.max(0, Math.min(idx, SLIDE_COUNT - 1)));
  }, []);

  const goTo = useCallback((i: number) => {
    const c = containerRef.current;
    if (!c) return;
    c.scrollTo({ top: i * c.clientHeight, behavior: "smooth" });
    setActive(i);
  }, []);

  useEffect(() => {
    const c = containerRef.current;
    if (!c) return;
    c.addEventListener("scroll", handleScroll, { passive: true });
    return () => c.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  return (
    <div className="fixed inset-0 flex flex-col bg-white dark:bg-slate-950">

      {/* ── Top nav ──────────────────────────────────────────────────────── */}
      <nav className="shrink-0 h-14 flex items-center justify-between px-4 sm:px-6 z-50 border-b border-slate-100/70 dark:border-slate-800/70 bg-white/85 dark:bg-slate-950/85 backdrop-blur-md">
        <ClearLogo
          iconSize={30}
          wordmarkClassName="text-base font-semibold text-slate-800 dark:text-slate-100"
          className="flex items-center gap-2"
        />
        <div className="flex items-center gap-1.5">
          <span className="hidden sm:flex items-center"><ThemeToggle /></span>
          <Link
            href="/login"
            scroll={false}
            className="text-sm font-semibold text-slate-700 dark:text-slate-200 px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/login?intent=signup"
            scroll={false}
            className="inline-flex items-center gap-1.5 bg-gradient-to-br from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white text-sm font-semibold py-2 px-3 sm:px-4 rounded-xl shadow-md shadow-cyan-500/20 transition-all hover:-translate-y-0.5"
          >
            Get started <ArrowRight className="w-3.5 h-3.5 hidden sm:inline" />
          </Link>
        </div>
      </nav>

      {/* ── Carousel ─────────────────────────────────────────────────────── */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-scroll snap-y snap-mandatory md:snap-none"
        style={{ scrollbarWidth: "none" }}
      >

        {/* ── Slide 0: Hero ──────────────────────────────────────────────── */}
        <Slide className="flex-col md:flex-row items-center gap-6 md:gap-10 px-6 md:px-12 lg:px-20 py-8 md:py-0">
          {/* Copy */}
          <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left">
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 mb-5 border border-slate-200 dark:border-slate-700/60 bg-white/60 dark:bg-slate-800/40 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-br from-cyan-500 to-teal-500 animate-pulse shrink-0" />
              Trips &amp; nests · 30-day Plus trial
            </div>
            <h1
              className="text-4xl sm:text-5xl lg:text-[58px] font-normal leading-[1.07] text-slate-800 dark:text-slate-100 mb-5"
              style={{ fontFamily: "var(--font-fraunces)" }}
            >
              Split it.{" "}
              <span style={{ background: "linear-gradient(135deg,#0891B2 0%,#14B8A6 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                Clear it.
              </span>
            </h1>
            <p className="text-lg text-slate-500 dark:text-slate-400 leading-relaxed mb-7 max-w-md">
              Group expenses for trips and home — logged in seconds, settled in the fewest payments possible.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-3 mb-6 w-full sm:w-auto">
              <Link
                href="/login?intent=signup"
                scroll={false}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-br from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white font-semibold text-base py-3 px-8 rounded-2xl shadow-lg shadow-cyan-500/30 transition-all hover:-translate-y-0.5"
              >
                Start for free <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/about"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 font-medium text-base py-3 px-8 rounded-2xl border border-slate-200 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600 bg-white/50 dark:bg-slate-800/30 transition-all"
              >
                See all features <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-1.5">
              {["Google sign-in", "No credit card", "iOS & Android"].map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5 text-sm text-slate-400 dark:text-slate-500">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-500 shrink-0" /> {t}
                </span>
              ))}
            </div>
          </div>

          {/* Mockup */}
          <div className="flex-1 w-full max-w-xs md:max-w-none hidden sm:block">
            <div className="relative" style={{ height: 380 }}>
              <div className="absolute inset-6 rounded-3xl blur-3xl" style={{ background: "radial-gradient(ellipse at center, rgba(6,182,212,0.16) 0%, rgba(20,184,166,0.10) 60%, transparent 100%)" }} />
              {/* Groups list card */}
              <div className="absolute glass rounded-2xl p-5 w-[258px]" style={{ top: 16, left: 0, transform: "rotate(-2.5deg)", zIndex: 1 }}>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Your groups</p>
                  <span className="text-[10px] text-slate-400">4 active</span>
                </div>
                {[
                  { emoji: "🏖️", name: "Goa 2025",     badge: "You owe ₹450",       cls: "text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400" },
                  { emoji: "🏠", name: "Mumbai Flat",   badge: "You're owed ₹1,200", cls: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400" },
                  { emoji: "✈️", name: "Manali Trip",   badge: "Settled ✓",           cls: "text-slate-400 bg-slate-50 dark:bg-slate-800/40" },
                  { emoji: "🏕️", name: "Coorg Weekend", badge: "You owe ₹220",        cls: "text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400" },
                ].map((g, i) => (
                  <div key={i} className="flex items-center gap-2.5 py-2.5 border-b border-slate-100/80 dark:border-slate-700/40 last:border-0">
                    <div className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-sm shrink-0">{g.emoji}</div>
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-200 flex-1">{g.name}</p>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${g.cls}`}>{g.badge}</span>
                  </div>
                ))}
              </div>
              {/* Expense detail card */}
              <div className="absolute glass rounded-2xl p-5 w-[228px]" style={{ bottom: 0, right: 0, transform: "rotate(2.5deg)", zIndex: 2, boxShadow: "0 20px 60px rgba(6,182,212,0.16),0 4px 16px rgba(0,0,0,0.08)" }}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100" style={{ fontFamily: "var(--font-fraunces)" }}>Goa 2025</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">5 members · 8 expenses</p>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-400 to-teal-400 flex items-center justify-center text-base shadow-sm">🏖️</div>
                </div>
                {[
                  { icon: "🍽️", desc: "Welcome dinner", amount: "₹4,500",  by: "Priya" },
                  { icon: "🏨", desc: "Hotel check-in",  amount: "₹12,000", by: "You"   },
                  { icon: "🚕", desc: "Airport taxi",    amount: "₹2,000",  by: "Raj"   },
                ].map((e, i) => (
                  <div key={i} className="flex items-center gap-2.5 py-2.5 border-b border-slate-100/80 dark:border-slate-700/40 last:border-0">
                    <div className="w-6 h-6 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-sm shrink-0">{e.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">{e.desc}</p>
                      <p className="text-[10px] text-slate-400">{e.by}</p>
                    </div>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 shrink-0">{e.amount}</p>
                  </div>
                ))}
              </div>
              {/* Float badge */}
              <div className="animate-float-bob absolute glass-sm rounded-full px-3 py-1.5 shadow-md border border-white/80 flex items-center gap-1.5" style={{ top: 0, right: 20, zIndex: 3 }}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">Trips &amp; nests</span>
              </div>
            </div>
          </div>

          {/* Mobile: single card */}
          <div className="sm:hidden w-full max-w-sm">
            <div className="glass rounded-2xl p-4 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Your groups</p>
                <span className="text-[10px] text-slate-400">4 active</span>
              </div>
              {[
                { emoji: "🏖️", name: "Goa 2025",   badge: "You owe ₹450",       cls: "text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400" },
                { emoji: "🏠", name: "Mumbai Flat", badge: "You're owed ₹1,200", cls: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400" },
                { emoji: "✈️", name: "Manali Trip", badge: "Settled ✓",           cls: "text-slate-400 bg-slate-50 dark:bg-slate-800/40" },
              ].map((g, i) => (
                <div key={i} className="flex items-center gap-2.5 py-2 border-b border-slate-100/80 dark:border-slate-700/40 last:border-0">
                  <div className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-sm shrink-0">{g.emoji}</div>
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-200 flex-1">{g.name}</p>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${g.cls}`}>{g.badge}</span>
                </div>
              ))}
            </div>
          </div>
        </Slide>

        {/* ── Slide 1: AI ────────────────────────────────────────────────── */}
        <Slide className="flex-col md:flex-row items-center gap-8 md:gap-12 px-6 md:px-12 lg:px-20 py-8 md:py-0">
          {/* Copy */}
          <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left order-2 md:order-1">
            <Label>AI-powered</Label>
            <h2
              className="text-3xl sm:text-4xl lg:text-5xl font-normal leading-[1.1] text-slate-800 dark:text-slate-100 mb-4"
              style={{ fontFamily: "var(--font-fraunces)" }}
            >
              Just type how
              <br />
              <span style={{ background: "linear-gradient(135deg,#0891B2 0%,#14B8A6 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                you&apos;d say it.
              </span>
            </h2>
            <p className="text-base sm:text-lg text-slate-500 dark:text-slate-400 leading-relaxed max-w-md mb-6">
              Describe an expense in plain language — AI extracts the amount, payer, and split instantly. Or paste a group chat to import everything at once.
            </p>
            <div className="flex flex-wrap gap-2 justify-center md:justify-start">
              {[{ e: "✨", t: "Natural language" }, { e: "💬", t: "Chat import" }, { e: "🎤", t: "Voice input" }].map((p) => (
                <span key={p.t} className="inline-flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700/60 bg-white/60 dark:bg-slate-800/40">
                  {p.e} {p.t}
                </span>
              ))}
            </div>
          </div>
          {/* Mockup */}
          <div className="flex-1 w-full max-w-xs order-1 md:order-2">
            <div className="glass rounded-2xl p-5 shadow-xl shadow-cyan-500/10">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg,#0891B2,#14B8A6)" }}>
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
                <div className="space-y-1.5">
                  {[
                    { label: "Description", value: "Dinner at Taj" },
                    { label: "Amount",      value: "₹4,500"        },
                    { label: "Paid by",     value: "Priya"         },
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
          </div>
        </Slide>

        {/* ── Slide 2: Settle ────────────────────────────────────────────── */}
        <Slide className="flex-col items-center justify-center px-6 md:px-12 py-8 gap-6">
          <div className="text-center">
            <Label color="text-teal-600 dark:text-teal-400">Settlement</Label>
            <h2
              className="text-3xl sm:text-4xl lg:text-5xl font-normal text-slate-800 dark:text-slate-100"
              style={{ fontFamily: "var(--font-fraunces)" }}
            >
              One payment each.{" "}
              <span style={{ background: "linear-gradient(135deg,#0891B2 0%,#14B8A6 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                No math.
              </span>
            </h2>
            <p className="text-base text-slate-500 dark:text-slate-400 mt-2 max-w-md mx-auto">
              Clear collapses any tangle into the minimum number of transfers — no matter how many people.
            </p>
          </div>
          {/* Before / After cards */}
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_56px_1fr] gap-4 items-center w-full max-w-2xl">
            <div className="glass rounded-2xl p-5">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Goa 2025 · 5 people</p>
              <div className="space-y-2 mb-3">
                {[
                  { name: "Priya", paid: "₹8,000" }, { name: "You",   paid: "₹6,000" },
                  { name: "Raj",   paid: "₹4,000" }, { name: "Anil",  paid: "₹4,000" },
                  { name: "Meera", paid: "₹3,000" },
                ].map((p) => (
                  <div key={p.name} className="flex justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">{p.name} paid</span>
                    <span className="font-medium text-slate-600 dark:text-slate-300">{p.paid}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-400 italic border-t border-slate-100 dark:border-slate-700/40 pt-2.5">How do we settle fairly?</p>
            </div>
            <div className="flex items-center justify-center">
              <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg" style={{ background: "linear-gradient(135deg,#0891B2,#14B8A6)" }}>
                <ArrowRight className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="glass rounded-2xl p-5 border border-teal-200/40 dark:border-teal-800/30">
              <p className="text-[10px] font-semibold text-teal-600 dark:text-teal-400 uppercase tracking-widest mb-3">Clear says — 3 transfers</p>
              <div className="space-y-2.5 mb-4">
                {[
                  { from: "Meera", to: "Priya", amount: "₹2,000" },
                  { from: "Raj",   to: "Priya", amount: "₹1,000" },
                  { from: "Anil",  to: "You",   amount: "₹1,000" },
                ].map((t, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-slate-700 dark:text-slate-200 w-12 shrink-0">{t.from}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                    <span className="text-slate-600 dark:text-slate-300 flex-1">{t.to}</span>
                    <span className="font-semibold text-teal-600 dark:text-teal-400 shrink-0">{t.amount}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 bg-white/60 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/40">
                <span className="text-base shrink-0">💸</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-200">Pay Priya ₹2,000</p>
                  <p className="text-[10px] text-slate-400">Opens GPay · PhonePe · any UPI app</p>
                </div>
                <div className="text-[10px] font-bold text-white px-2.5 py-1 rounded-lg shrink-0" style={{ background: "linear-gradient(135deg,#06B6D4,#14B8A6)" }}>PAY →</div>
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-cyan-400 inline-block" />
            Animated Debt Flow graph shows every balance at a glance
            <Link href="/about#why-clear" className="text-cyan-500 hover:text-cyan-600 font-medium">See demo →</Link>
          </p>
        </Slide>

        {/* ── Slide 3: Trips ─────────────────────────────────────────────── */}
        <Slide className="flex-col md:flex-row items-center gap-8 md:gap-12 px-6 md:px-12 lg:px-20 py-8 md:py-0">
          {/* Timeline mockup */}
          <div className="flex-1 w-full max-w-xs overflow-hidden order-1">
            <div className="glass rounded-2xl p-4 shadow-xl shadow-cyan-500/10">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-5 h-5 rounded-md bg-cyan-50 dark:bg-cyan-900/30 flex items-center justify-center shrink-0">
                  <CalendarDays className="w-3 h-3 text-cyan-500" />
                </div>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Day by day · Goa 2025</span>
                <div className="flex-1 h-px bg-gradient-to-r from-cyan-200/70 to-transparent dark:from-cyan-800/40 dark:to-transparent" />
              </div>
              {/* Day 1 */}
              <div className="rounded-xl px-3 pt-2.5 pb-2 mb-1" style={{ backgroundColor: "#2563EB10" }}>
                <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-900/50 text-cyan-700 dark:text-cyan-300">Day 1/3</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">Mon, Jun 2</span>
                  <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 ml-auto" style={{ fontFamily: "var(--font-fraunces)" }}>₹6,500</span>
                </div>
                <div className="flex items-center gap-2 px-1 py-1.5 rounded-lg">
                  <div className="w-5 h-5 rounded-md flex items-center justify-center text-xs shrink-0" style={{ background: "linear-gradient(135deg,#60A5FA,#2563EB)" }}>🏨</div>
                  <p className="text-xs text-slate-700 dark:text-slate-200 flex-1 truncate">Hotel check-in</p>
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 shrink-0">₹5,000</span>
                </div>
              </div>
              <div className="flex justify-center py-0.5"><div className="w-px h-2.5 bg-gradient-to-b from-transparent via-slate-200 dark:via-slate-700/50 to-transparent" /></div>
              {/* Day 2 */}
              <div className="rounded-xl px-3 pt-2.5 pb-2 mb-1" style={{ backgroundColor: "#16A34A10" }}>
                <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">Day 2/3</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">Tue, Jun 3</span>
                  <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 ml-auto" style={{ fontFamily: "var(--font-fraunces)" }}>₹14,200</span>
                </div>
                <p className="text-[10px] font-medium text-amber-500 text-center mb-1.5">🔥 busiest day</p>
                <div className="flex items-center gap-2 px-1 py-1.5 rounded-lg">
                  <div className="w-5 h-5 rounded-md flex items-center justify-center text-xs shrink-0" style={{ background: "linear-gradient(135deg,#4ADE80,#10B981)" }}>🏄</div>
                  <p className="text-xs text-slate-700 dark:text-slate-200 flex-1 truncate">Water sports</p>
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 shrink-0">₹8,000</span>
                </div>
              </div>
              <div className="flex justify-center py-0.5"><div className="w-px h-2.5 bg-gradient-to-b from-transparent via-slate-200 dark:via-slate-700/50 to-transparent" /></div>
              {/* Day 3 */}
              <div className="rounded-xl px-3 pt-2.5 pb-2" style={{ backgroundColor: "#DB277710" }}>
                <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-900/50 text-cyan-700 dark:text-cyan-300">Day 3/3</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">Wed, Jun 4</span>
                  <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 ml-auto" style={{ fontFamily: "var(--font-fraunces)" }}>₹3,800</span>
                </div>
                <p className="text-[10px] font-medium text-teal-500 text-center mb-1.5">light day</p>
                <div className="flex items-center gap-2 px-1 py-1.5 rounded-lg">
                  <div className="w-5 h-5 rounded-md flex items-center justify-center text-xs shrink-0" style={{ background: "linear-gradient(135deg,#F472B6,#F43F5E)" }}>🛍️</div>
                  <p className="text-xs text-slate-700 dark:text-slate-200 flex-1 truncate">Souvenirs</p>
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 shrink-0">₹2,500</span>
                </div>
              </div>
            </div>
          </div>
          {/* Copy */}
          <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left order-2">
            <Label>Trips</Label>
            <h2
              className="text-3xl sm:text-4xl lg:text-5xl font-normal leading-[1.1] text-slate-800 dark:text-slate-100 mb-4"
              style={{ fontFamily: "var(--font-fraunces)" }}
            >
              Every day,
              <br />
              <span style={{ background: "linear-gradient(135deg,#0891B2 0%,#14B8A6 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                in its moment.
              </span>
            </h2>
            <p className="text-base sm:text-lg text-slate-500 dark:text-slate-400 leading-relaxed max-w-md mb-5">
              Expenses land on the day they happened. Day-by-day grouping, category colour bars, busiest day highlights, and alive status badges.
            </p>
            <div className="space-y-2 text-left w-full max-w-sm">
              {[
                { e: "📅", t: "Day-by-day grouping" },
                { e: "🔥", t: "Busiest day highlight" },
                { e: "✈️", t: "Trip alive badges — Day 3 of 5" },
                { e: "✨", t: "AI travel narrative" },
              ].map((f) => (
                <div key={f.t} className="flex items-center gap-2.5">
                  <span className="text-base shrink-0">{f.e}</span>
                  <span className="text-sm text-slate-600 dark:text-slate-300">{f.t}</span>
                </div>
              ))}
            </div>
          </div>
        </Slide>

        {/* ── Slide 4: Nests ─────────────────────────────────────────────── */}
        <Slide className="flex-col md:flex-row items-center gap-8 md:gap-12 px-6 md:px-12 lg:px-20 py-8 md:py-0">
          {/* Copy */}
          <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left order-2 md:order-1">
            <Label color="text-teal-600 dark:text-teal-400">Nests</Label>
            <h2
              className="text-3xl sm:text-4xl lg:text-5xl font-normal leading-[1.1] text-slate-800 dark:text-slate-100 mb-4"
              style={{ fontFamily: "var(--font-fraunces)" }}
            >
              Household bills,
              <br />
              <span style={{ background: "linear-gradient(135deg,#0D9488 0%,#059669 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                one tap a month.
              </span>
            </h2>
            <p className="text-base sm:text-lg text-slate-500 dark:text-slate-400 leading-relaxed max-w-md mb-5">
              Set up recurring templates for rent, electricity, subscriptions. Every month, log with one tap — split exactly as configured, ready to settle.
            </p>
            <div className="space-y-2 text-left w-full max-w-sm">
              {[
                { e: "🔁", t: "Recurring templates — 1 tap/month" },
                { e: "📅", t: "Expenses grouped by month" },
                { e: "📊", t: "Monthly pace tracker" },
                { e: "🏠", t: "Household categories" },
              ].map((f) => (
                <div key={f.t} className="flex items-center gap-2.5">
                  <span className="text-base shrink-0">{f.e}</span>
                  <span className="text-sm text-slate-600 dark:text-slate-300">{f.t}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Templates mockup */}
          <div className="flex-1 w-full max-w-xs order-1 md:order-2">
            <div className="glass rounded-2xl p-5 shadow-xl shadow-teal-500/10">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100" style={{ fontFamily: "var(--font-fraunces)" }}>Mumbai Flat</p>
                  <p className="text-xs text-slate-400 mt-0.5">Recurring · May 2026</p>
                </div>
                <div className="flex items-center gap-1.5 bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 text-xs font-medium px-2.5 py-1 rounded-full">
                  <RefreshCw className="w-3 h-3" /> 7 templates
                </div>
              </div>
              <div className="space-y-2">
                {[
                  { icon: "🏠", label: "Monthly rent",     amount: "₹30,000", logged: true,  date: "May 1" },
                  { icon: "⚡", label: "Electricity bill", amount: "₹1,800",  logged: true,  date: "May 1" },
                  { icon: "📡", label: "WiFi broadband",   amount: "₹999",    logged: false, date: null    },
                  { icon: "🎬", label: "Netflix",          amount: "₹649",    logged: false, date: null    },
                  { icon: "🏢", label: "Society maint.",   amount: "₹2,500",  logged: false, date: null    },
                ].map((t, i) => (
                  <div key={i} className="flex items-center gap-3 glass-sm rounded-xl px-3 py-2.5">
                    <span className="text-lg shrink-0">{t.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">{t.label}</p>
                      <p className="text-[10px] text-slate-400">{t.amount} · monthly</p>
                    </div>
                    {t.logged ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 shrink-0">
                        <CheckCircle2 className="w-3 h-3" /> {t.date}
                      </span>
                    ) : (
                      <div className="text-[10px] font-medium text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800/50 px-2 py-0.5 rounded-md shrink-0">
                        <CalendarCheck className="w-3 h-3 inline mr-0.5" /> Log
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Slide>

        {/* ── Slide 5: Insights + Streams ────────────────────────────────── */}
        <Slide className="flex-col md:flex-row items-stretch gap-0 px-0 py-0">
          {/* Left — Insights */}
          <div className="flex-1 flex flex-col justify-center px-6 md:px-10 lg:px-14 py-8 md:py-10 border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800/70">
            <Label color="text-amber-600 dark:text-amber-400">Insights</Label>
            <h2
              className="text-2xl sm:text-3xl lg:text-4xl font-normal text-slate-800 dark:text-slate-100 mb-3 leading-[1.15]"
              style={{ fontFamily: "var(--font-fraunces)" }}
            >
              Understand
              <br />
              <span style={{ background: "linear-gradient(135deg,#D97706 0%,#0891B2 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                where it went.
              </span>
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5 max-w-xs">
              Per-group analytics, personal finance view, cross-trip spending story — all automatically.
            </p>
            {/* Mini insights mockup */}
            <div className="glass rounded-xl p-4 max-w-xs">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200" style={{ fontFamily: "var(--font-fraunces)" }}>Goa 2025</p>
                <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-full">Insights</span>
              </div>
              <div className="space-y-2">
                {[
                  { label: "Accommodation", pct: 48, color: "bg-cyan-500" },
                  { label: "Food & drink",  pct: 28, color: "bg-teal-500" },
                  { label: "Transport",     pct: 16, color: "bg-indigo-500" },
                  { label: "Activities",    pct: 8,  color: "bg-violet-500" },
                ].map((c) => (
                  <div key={c.label}>
                    <div className="flex justify-between mb-0.5">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">{c.label}</span>
                      <span className="text-[10px] font-medium text-slate-600 dark:text-slate-300">{c.pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-700/60">
                      <div className={`h-1.5 rounded-full ${c.color}`} style={{ width: `${c.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right — Streams */}
          <div className="flex-1 flex flex-col justify-center px-6 md:px-10 lg:px-14 py-8 md:py-10">
            <Label color="text-indigo-600 dark:text-indigo-400">Streams</Label>
            <h2
              className="text-2xl sm:text-3xl lg:text-4xl font-normal text-slate-800 dark:text-slate-100 mb-3 leading-[1.15]"
              style={{ fontFamily: "var(--font-fraunces)" }}
            >
              Track 1:1 money
              <br />
              <span style={{ background: "linear-gradient(135deg,#6366F1 0%,#8B5CF6 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                with anyone.
              </span>
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5 max-w-xs">
              No group needed. A running ledger between two people — confirm, settle, or forgive. Works even for non-Clear users.
            </p>
            {/* Mini stream spine mockup */}
            <div className="glass rounded-xl p-4 max-w-xs">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">With Priya</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Net: you owe ₹1,200</p>
                </div>
                <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-full">₹1,200 owed</span>
              </div>
              <div className="space-y-2">
                {[
                  { dir: "right", label: "Priya covered cab",   amount: "₹800",   status: "confirmed" },
                  { dir: "left",  label: "You paid lunch",       amount: "₹400",   status: "pending"   },
                  { dir: "right", label: "Priya bought coffee",  amount: "₹320",   status: "confirmed" },
                ].map((e, i) => (
                  <div key={i} className={`flex items-center gap-2 ${e.dir === "right" ? "" : "flex-row-reverse"}`}>
                    <div className={`flex-1 rounded-xl px-3 py-2 ${e.dir === "right" ? "bg-slate-50 dark:bg-slate-800/60" : "bg-indigo-50 dark:bg-indigo-950/30"}`}>
                      <p className="text-[10px] font-medium text-slate-700 dark:text-slate-200 truncate">{e.label}</p>
                      <p className="text-[10px] text-slate-400">{e.amount}</p>
                    </div>
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${e.status === "confirmed" ? "bg-emerald-400" : "bg-amber-400"}`} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Slide>

        {/* ── Slide 6: CTA ───────────────────────────────────────────────── */}
        <Slide className="flex-col items-center justify-center px-6 text-center">
          <div className="relative rounded-3xl overflow-hidden px-8 py-14 sm:py-20 w-full max-w-2xl" style={{ background: "linear-gradient(135deg,#0E7490 0%,#0D9488 50%,#059669 100%)" }}>
            <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-white/10 blur-3xl" />
            <div className="relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-6 border border-white/30">
                <ClearIcon size={44} />
              </div>
              <h2
                className="text-3xl sm:text-5xl text-white mb-3"
                style={{ fontFamily: "var(--font-fraunces)" }}
              >
                Free to start.
              </h2>
              <p className="text-teal-100 text-lg mb-2">30-day Plus trial included. No credit card.</p>
              <p className="text-teal-200/70 text-sm mb-10">Google sign-in · Takes 30 seconds · Installs on iOS &amp; Android</p>
              <Link
                href="/login?intent=signup"
                scroll={false}
                className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-teal-700 font-bold text-base py-3.5 px-10 rounded-2xl shadow-xl shadow-teal-900/30 transition-all hover:-translate-y-0.5"
              >
                Get started free <ArrowRight className="w-4 h-4" />
              </Link>
              <div className="mt-8 flex items-center justify-center gap-4">
                <Link href="/about" className="text-teal-200/80 text-sm hover:text-white transition-colors">
                  See all features →
                </Link>
                <span className="text-teal-300/40">·</span>
                <Link href="/pricing" className="text-teal-200/80 text-sm hover:text-white transition-colors">
                  View pricing →
                </Link>
              </div>
            </div>
          </div>
        </Slide>

      </div>

      {/* ── Bottom bar ───────────────────────────────────────────────────── */}
      <div className="shrink-0 h-12 flex items-center justify-center gap-5 sm:gap-8 bg-white/85 dark:bg-slate-950/85 backdrop-blur-md border-t border-slate-100/70 dark:border-slate-800/70 z-50">
        <Link href="/about" className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
          About Clear
        </Link>
        <span className="w-px h-3 bg-slate-200 dark:bg-slate-700" />
        <Link href="/changelog" className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
          What&apos;s New
        </Link>
        <span className="w-px h-3 bg-slate-200 dark:bg-slate-700" />
        <Link href="/pricing" className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
          Pricing
        </Link>
      </div>

      {/* ── Dots — desktop right ─────────────────────────────────────────── */}
      <div className="fixed right-4 top-1/2 -translate-y-1/2 hidden md:flex flex-col gap-2.5 z-50">
        {Array.from({ length: SLIDE_COUNT }, (_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            aria-label={`Go to slide ${i + 1}`}
            className={`rounded-full transition-all duration-200 ${
              i === active
                ? "w-2 h-5 bg-cyan-500"
                : "w-2 h-2 bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 dark:hover:bg-slate-500"
            }`}
          />
        ))}
      </div>

      {/* ── Dots — mobile bottom (above bottom bar) ──────────────────────── */}
      <div className="fixed bottom-14 left-0 right-0 flex items-center justify-center gap-1.5 md:hidden z-50 pointer-events-none">
        {Array.from({ length: SLIDE_COUNT }, (_, i) => (
          <div
            key={i}
            className={`rounded-full transition-all duration-200 ${
              i === active
                ? "w-4 h-1.5 bg-cyan-500"
                : "w-1.5 h-1.5 bg-slate-300/80 dark:bg-slate-600/80"
            }`}
          />
        ))}
      </div>

    </div>
  );
}
