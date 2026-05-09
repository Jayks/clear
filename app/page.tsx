import Link from "next/link";
import Image from "next/image";
import {
  Compass, ArrowRight, Users, TrendingDown, CheckCircle2,
  MapPin, Receipt, Zap, Globe, DivideSquare,
} from "lucide-react";
import { ThemeToggle } from "@/components/shared/theme-toggle";

const HERO_IMAGE = "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=85";
const MIDPAGE_IMAGE = "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1920&q=85";

/* ─── Static data ──────────────────────────────────────────────────────────── */

const features = [
  {
    icon: Compass,
    title: "Built for trips",
    body: "Designed for multi-day group travel. Track hotel rooms, shared dinners, and transport across your whole journey.",
    gradient: "from-cyan-500 to-teal-500",
    glow: "shadow-cyan-500/25",
  },
  {
    icon: DivideSquare,
    title: "Split 4 ways",
    body: "Equal split, exact amounts, percentages, or custom share counts. Handle any expense scenario your group throws at you.",
    gradient: "from-teal-500 to-emerald-500",
    glow: "shadow-teal-500/25",
  },
  {
    icon: TrendingDown,
    title: "Minimum payments",
    body: "Our algorithm finds the fewest transactions to clear all debts — never more than one payment per person in the group.",
    gradient: "from-blue-500 to-cyan-500",
    glow: "shadow-blue-500/25",
  },
];

const steps = [
  {
    n: "01",
    icon: MapPin,
    title: "Create a trip",
    body: "Name it, add dates, pick a cover photo from Unsplash, set your currency.",
  },
  {
    n: "02",
    icon: Users,
    title: "Invite your group",
    body: "Share a link or QR code. Members join instantly — no install required.",
  },
  {
    n: "03",
    icon: Receipt,
    title: "Log expenses",
    body: "Add each expense as it happens. Choose who paid and how to split it.",
  },
  {
    n: "04",
    icon: Zap,
    title: "Settle up",
    body: "See exactly who owes what and mark payments as done with one tap.",
  },
];

const usedFor = [
  "Weekend getaways",
  "International trips",
  "Family vacations",
  "Road trips",
  "Office offsites",
  "Bachelor/bachelorette trips",
  "College reunions",
  "Honeymoons",
];

/* ─── Page ─────────────────────────────────────────────────────────────────── */

export default function LandingPage() {
  return (
    <div className="overflow-x-hidden">

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav className="glass-nav sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center shadow-md shadow-cyan-500/25">
              <Compass className="w-4 h-4 text-white" />
            </div>
            <span
              className="text-lg font-semibold text-slate-800 dark:text-slate-100"
              style={{ fontFamily: "var(--font-fraunces)" }}
            >
              Wayfare
            </span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/login"
              className="hidden sm:block text-sm font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 bg-gradient-to-br from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white text-sm font-semibold py-2 px-4 rounded-xl shadow-md shadow-cyan-500/20 transition-all hover:-translate-y-0.5"
            >
              Get started
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Travel background photo */}
        <div className="absolute inset-0">
          <Image
            src={HERO_IMAGE}
            alt="Turquoise beach — travel with friends"
            fill
            priority
            className="object-cover object-center"
          />
          {/* Light mode overlay */}
          <div
            className="absolute inset-0 dark:hidden"
            style={{
              background:
                "linear-gradient(105deg, rgba(239,246,255,0.97) 0%, rgba(236,254,255,0.93) 28%, rgba(240,253,250,0.80) 55%, rgba(236,253,245,0.60) 80%, rgba(240,253,250,0.45) 100%)",
            }}
          />
          {/* Dark mode overlay */}
          <div
            className="absolute inset-0 hidden dark:block"
            style={{
              background:
                "linear-gradient(105deg, rgba(15,23,42,0.93) 0%, rgba(12,21,32,0.88) 28%, rgba(10,26,24,0.78) 55%, rgba(11,31,21,0.55) 80%, rgba(10,26,24,0.40) 100%)",
            }}
          />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-6xl mx-auto px-6 pt-20 pb-28 lg:pt-28 lg:pb-36">
        <div className="flex flex-col lg:flex-row items-center gap-14 lg:gap-16">

          {/* Left — copy */}
          <div className="flex-1 text-center lg:text-left">
            {/* Live badge */}
            <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-200 mb-8 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-br from-cyan-500 to-teal-500 animate-pulse shrink-0" />
              Group expense tracking · Free forever
            </div>

            {/* Headline */}
            <h1
              className="text-5xl sm:text-6xl lg:text-[66px] xl:text-[72px] font-normal leading-[1.06] text-slate-800 dark:text-slate-100 mb-7"
              style={{ fontFamily: "var(--font-fraunces)" }}
            >
              Travel{" "}
              <span
                style={{
                  background: "linear-gradient(135deg, #0891B2 0%, #14B8A6 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                together.
              </span>
              <br />
              Settle easy.
            </h1>

            <p className="text-lg sm:text-xl text-slate-500 dark:text-slate-400 leading-relaxed mb-10 max-w-lg mx-auto lg:mx-0">
              Log every coffee, cab, and hotel room with your group.
              At the end of the trip, Wayfare figures out who pays whom — with the{" "}
              <span className="text-slate-700 dark:text-slate-200 font-medium">fewest payments possible.</span>
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 mb-10">
              <Link
                href="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-br from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white font-semibold text-base py-3.5 px-9 rounded-2xl shadow-lg shadow-cyan-500/30 transition-all hover:shadow-cyan-500/40 hover:-translate-y-0.5 active:translate-y-0"
              >
                Start for free
                <ArrowRight className="w-4.5 h-4.5" />
              </Link>
              <a
                href="#how-it-works"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 glass text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 font-medium text-base py-3.5 px-9 rounded-2xl transition-all hover:shadow-md"
              >
                How it works
              </a>
            </div>

            {/* Social trust */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-5 gap-y-2">
              {["Google sign-in", "No credit card", "Free forever"].map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5 text-sm text-slate-400 dark:text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Right — app mockup */}
          <div className="flex-1 w-full max-w-[380px] lg:max-w-none" style={{ position: "relative", height: 440 }}>
            {/* Glow backdrop */}
            <div
              className="absolute inset-6 rounded-3xl blur-3xl"
              style={{ background: "radial-gradient(ellipse at center, rgba(6,182,212,0.18) 0%, rgba(20,184,166,0.12) 60%, transparent 100%)" }}
            />

            {/* Card 1: expense list (back) */}
            <div
              className="absolute glass rounded-2xl p-5 shadow-xl shadow-slate-300/40 w-[268px]"
              style={{ top: 12, left: 0, transform: "rotate(-3deg)", zIndex: 1 }}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100" style={{ fontFamily: "var(--font-fraunces)" }}>
                    Goa Summer 2025
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-300 mt-0.5">8 members · 30 expenses</p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-teal-400 flex items-center justify-center text-base shadow-sm shadow-cyan-500/20">
                  🏖️
                </div>
              </div>
              {[
                { icon: "🍽️", desc: "Dinner at Thalassa", amount: "₹3,200", by: "Priya", n: 6 },
                { icon: "🏨", desc: "Villa Nilaya", amount: "₹12,500", by: "Arjun", n: 8 },
                { icon: "🚕", desc: "Airport taxi", amount: "₹1,800", by: "You", n: 4 },
              ].map((e, i) => (
                <div key={i} className="flex items-center gap-3 py-2.5 border-b border-slate-100/80 dark:border-slate-700/40 last:border-0">
                  <div className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-sm shrink-0">
                    {e.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">{e.desc}</p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-300">{e.by} · {e.n} splits</p>
                  </div>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 tabular shrink-0">{e.amount}</p>
                </div>
              ))}
            </div>

            {/* Card 2: settle up (front) */}
            <div
              className="absolute glass rounded-2xl p-5 w-56 border border-white/90"
              style={{
                bottom: 0,
                right: 0,
                transform: "rotate(2.5deg)",
                zIndex: 2,
                boxShadow: "0 20px 60px rgba(8,145,178,0.18), 0 4px 16px rgba(0,0,0,0.08), 0 1px 0 rgba(255,255,255,0.9) inset",
              }}
            >
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-300 uppercase tracking-widest mb-3">
                Settle up
              </p>
              <div className="mb-4 pb-4 border-b border-slate-100 dark:border-slate-700/50">
                <p className="text-[11px] text-slate-400 dark:text-slate-300 mb-0.5">You are owed</p>
                <p
                  className="text-[32px] font-semibold leading-none text-emerald-600 tabular"
                  style={{ fontFamily: "var(--font-fraunces)" }}
                >
                  ₹4,830
                </p>
              </div>
              <div className="space-y-2">
                {[
                  { from: "Kavya", amount: "₹2,400" },
                  { from: "Raj", amount: "₹2,430" },
                ].map((t, i) => (
                  <div key={i} className="flex items-center justify-between bg-white/60 dark:bg-slate-800/60 rounded-xl px-2.5 py-2">
                    <div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{t.from} → You</p>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 tabular">{t.amount}</p>
                    </div>
                    <div
                      className="h-6 px-2 rounded-lg flex items-center justify-center shadow-sm shadow-cyan-500/20"
                      style={{ background: "linear-gradient(135deg, #06B6D4, #14B8A6)" }}
                    >
                      <span className="text-[9px] font-bold text-white tracking-wide">✓ PAID</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Floating balance pill */}
            <div
              className="absolute glass-sm rounded-full px-3 py-1.5 shadow-md border border-white/80 flex items-center gap-1.5"
              style={{ top: 0, right: 28, zIndex: 3, transform: "rotate(-1deg)" }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">₹1,24,500 tracked</span>
            </div>
          </div>
        </div>
        </div>{/* /relative z-10 content wrapper */}
      </section>

      {/* ── Scrolling ticker ──────────────────────────────────────────────── */}
      <div className="py-5 overflow-hidden border-y border-white/60 dark:border-slate-700/40 bg-white/30 dark:bg-slate-900/20 backdrop-blur-sm">
        <div className="flex gap-8 animate-none whitespace-nowrap">
          <div className="flex gap-8 shrink-0">
            {usedFor.concat(usedFor).map((label, i) => (
              <span key={i} className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400">
                <Compass className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-14">
          <p className="text-sm font-semibold text-cyan-600 uppercase tracking-widest mb-3">Features</p>
          <h2
            className="text-4xl sm:text-5xl text-slate-800 dark:text-slate-100 mb-4"
            style={{ fontFamily: "var(--font-fraunces)" }}
          >
            Everything your group needs
          </h2>
          <p className="text-lg text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
            Built specifically for trips — not generic bill-splitting.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="glass rounded-2xl p-7 hover:shadow-xl transition-all hover:-translate-y-1 group"
            >
              <div
                className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${f.gradient} flex items-center justify-center mb-5 shadow-lg ${f.glow} group-hover:scale-105 transition-transform`}
              >
                <f.icon className="w-5.5 h-5.5 text-white" />
              </div>
              <h3
                className="text-xl text-slate-800 dark:text-slate-100 mb-3"
                style={{ fontFamily: "var(--font-fraunces)" }}
              >
                {f.title}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>

        {/* Extra feature pills */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          {[
            "8 expense categories",
            "Unsplash cover photos",
            "QR code invites",
            "Guest members (no account)",
            "Expense history",
            "Real-time sync",
            "Per-trip insights",
            "Portfolio view",
          ].map((pill) => (
            <span
              key={pill}
              className="glass-sm rounded-full px-4 py-1.5 text-sm text-slate-600 dark:text-slate-300 border border-white/60 dark:border-slate-700/40"
            >
              {pill}
            </span>
          ))}
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-6 pb-24">
        <div className="text-center mb-14">
          <p className="text-sm font-semibold text-cyan-600 uppercase tracking-widest mb-3">How it works</p>
          <h2
            className="text-4xl sm:text-5xl text-slate-800 dark:text-slate-100 mb-4"
            style={{ fontFamily: "var(--font-fraunces)" }}
          >
            Up and running in minutes
          </h2>
          <p className="text-lg text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
            No setup, no onboarding form. Just create a trip and go.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 relative">
          {/* Connecting line on desktop */}
          <div
            className="absolute top-[38px] left-[12.5%] right-[12.5%] h-px hidden lg:block"
            style={{ background: "linear-gradient(90deg, transparent, #A5F3FC 20%, #99F6E4 80%, transparent)" }}
          />

          {steps.map((step, i) => (
            <div key={step.n} className="glass rounded-2xl p-6 flex flex-col gap-4 relative">
              {/* Step number bubble */}
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white text-sm shadow-lg shrink-0 relative z-10"
                style={{ background: "linear-gradient(135deg, #0891B2, #14B8A6)" }}
              >
                {step.n}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <step.icon className="w-4 h-4 text-cyan-500 shrink-0" />
                  <h3
                    className="text-lg text-slate-800 dark:text-slate-100"
                    style={{ fontFamily: "var(--font-fraunces)" }}
                  >
                    {step.title}
                  </h3>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{step.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Full-bleed travel photo ──────────────────────────────────────── */}
      <section className="relative overflow-hidden" style={{ height: 480 }}>
        <Image
          src={MIDPAGE_IMAGE}
          alt="Stunning mountain lake — the places Wayfare takes you"
          fill
          className="object-cover object-center"
        />
        {/* Rich layered overlay */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(15,23,42,0.25) 0%, rgba(15,23,42,0.45) 50%, rgba(15,23,42,0.70) 100%)",
          }}
        />
        {/* Additional side vignette */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, rgba(15,23,42,0.30) 0%, transparent 30%, transparent 70%, rgba(15,23,42,0.30) 100%)",
          }}
        />

        {/* Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
          {/* Floating glass badge */}
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-7 border border-white/25 bg-white/10 backdrop-blur-md">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-300 animate-pulse" />
            <span className="text-xs font-semibold text-white/90 tracking-wide uppercase">
              Built for every adventure
            </span>
          </div>

          <h2
            className="text-4xl sm:text-5xl lg:text-6xl text-white mb-5 drop-shadow-lg"
            style={{ fontFamily: "var(--font-fraunces)" }}
          >
            The world is waiting.
            <br />
            <span
              style={{
                background: "linear-gradient(135deg, #67E8F9 0%, #5EEAD4 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Split the cost, not the fun.
            </span>
          </h2>

          <p className="text-white/70 text-lg max-w-xl mb-9">
            From weekend escapes to month-long adventures — Wayfare keeps everyone
            on the same page, so you stay focused on the experience.
          </p>

          <Link
            href="/login"
            className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-800 font-semibold py-3 px-8 rounded-2xl shadow-xl transition-all hover:-translate-y-0.5 hover:shadow-2xl"
          >
            Start your first trip
            <ArrowRight className="w-4 h-4" />
          </Link>

          {/* Floating stat badges */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 flex-wrap justify-center px-4">
            {[
              { emoji: "🏖️", label: "Beach trips" },
              { emoji: "🏔️", label: "Treks" },
              { emoji: "✈️", label: "International" },
              { emoji: "🚗", label: "Road trips" },
              { emoji: "🎉", label: "Celebrations" },
            ].map((item) => (
              <span
                key={item.label}
                className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-3 py-1 text-xs font-medium text-white/90"
              >
                {item.emoji} {item.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Social proof / trip types strip ──────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="glass rounded-3xl px-8 py-10 flex flex-col lg:flex-row items-center gap-10">
          <div className="flex-1 text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start gap-1 mb-3">
              {[...Array(5)].map((_, i) => (
                <span key={i} className="text-amber-400 text-lg">★</span>
              ))}
            </div>
            <p
              className="text-2xl sm:text-3xl text-slate-800 dark:text-slate-100 mb-3"
              style={{ fontFamily: "var(--font-fraunces)" }}
            >
              "Finally, no more WhatsApp maths"
            </p>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Stop screenshotting receipts and doing mental arithmetic at 1 AM. Wayfare handles the numbers.
            </p>
          </div>
          <div className="flex-1 grid grid-cols-2 gap-3 w-full max-w-sm lg:max-w-none">
            {[
              { icon: "🏖️", label: "Weekend escapes" },
              { icon: "✈️", label: "International trips" },
              { icon: "🏔️", label: "Trekking groups" },
              { icon: "🎉", label: "Celebrations" },
            ].map((item) => (
              <div
                key={item.label}
                className="glass-sm rounded-xl px-4 py-3 flex items-center gap-2.5 border border-white/60"
              >
                <span className="text-xl">{item.icon}</span>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Split modes detail ────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          {/* Left: split mode cards */}
          <div className="flex-1 grid grid-cols-2 gap-3 w-full max-w-md">
            {[
              { mode: "Equal split", example: "₹3,200 ÷ 4 = ₹800 each", tag: "Most used", color: "from-cyan-500 to-teal-500" },
              { mode: "Exact amounts", example: "You: ₹1,500 · Priya: ₹1,200 · ...", tag: "Precise", color: "from-teal-500 to-emerald-500" },
              { mode: "Percentages", example: "You 40% · Priya 30% · Raj 30%", tag: "Flexible", color: "from-blue-500 to-cyan-500" },
              { mode: "Shares", example: "You 2× · Kids 1× · Senior 1×", tag: "Custom", color: "from-indigo-500 to-blue-500" },
            ].map((s) => (
              <div key={s.mode} className="glass rounded-xl p-4">
                <div
                  className={`inline-flex items-center text-[9px] font-bold text-white uppercase tracking-widest px-2 py-0.5 rounded-full bg-gradient-to-br ${s.color} mb-3`}
                >
                  {s.tag}
                </div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-1" style={{ fontFamily: "var(--font-fraunces)" }}>
                  {s.mode}
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed">{s.example}</p>
              </div>
            ))}
          </div>

          {/* Right: copy */}
          <div className="flex-1 text-center lg:text-left">
            <p className="text-sm font-semibold text-cyan-600 uppercase tracking-widest mb-3">Splitting</p>
            <h2
              className="text-4xl sm:text-5xl text-slate-800 dark:text-slate-100 mb-5"
              style={{ fontFamily: "var(--font-fraunces)" }}
            >
              Every trip is different.
              <br />
              <span
                style={{
                  background: "linear-gradient(135deg, #0891B2 0%, #14B8A6 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Split accordingly.
              </span>
            </h2>
            <p className="text-lg text-slate-500 dark:text-slate-400 leading-relaxed max-w-md mx-auto lg:mx-0">
              Adults and kids split unequally. One person opts out of the expensive restaurant.
              Someone joins halfway. Wayfare handles all of it.
            </p>
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ───────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pb-28">
        <div
          className="relative rounded-3xl overflow-hidden px-8 py-16 text-center"
          style={{ background: "linear-gradient(135deg, #0E7490 0%, #0D9488 50%, #059669 100%)" }}
        >
          {/* Blobs inside CTA */}
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-white/10 blur-3xl" />

          <div className="relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-6 border border-white/30">
              <Globe className="w-7 h-7 text-white" />
            </div>
            <h2
              className="text-4xl sm:text-5xl text-white mb-4"
              style={{ fontFamily: "var(--font-fraunces)" }}
            >
              Ready to hit the road?
            </h2>
            <p className="text-teal-100 text-lg mb-10 max-w-sm mx-auto">
              Create your first trip in seconds. No subscriptions, no catch.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-teal-700 font-bold text-base py-3.5 px-10 rounded-2xl shadow-xl shadow-teal-900/30 transition-all hover:-translate-y-0.5"
            >
              Get started free
              <ArrowRight className="w-4.5 h-4.5" />
            </Link>
            <p className="text-teal-200/70 text-sm mt-5">Google sign-in · No credit card · Takes 30 seconds</p>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/40 dark:border-slate-700/40 bg-white/20 dark:bg-slate-900/20 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center">
              <Compass className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200" style={{ fontFamily: "var(--font-fraunces)" }}>
              Wayfare
            </span>
            <span className="text-slate-300 dark:text-slate-600">·</span>
            <span className="text-xs text-slate-400 dark:text-slate-500">Travel together. Settle easy.</span>
          </div>
          <div className="flex items-center gap-5 text-xs text-slate-400 dark:text-slate-500">
            <Link href="/login" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">Sign in</Link>
            <Link href="/terms" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">Privacy</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
