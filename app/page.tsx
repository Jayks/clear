import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight, Users, CheckCircle2, X,
  MapPin, Home, Receipt, Zap, RefreshCw,
  LayoutGrid, CalendarCheck, Bell, Sparkles,
} from "lucide-react";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { ClearLogo, ClearIcon } from "@/components/shared/clear-logo";
import { FadeIn } from "@/components/shared/fade-in";
import { getCurrentUser } from "@/lib/db/queries/auth";

const HERO_IMAGE    = "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=85";
const NEST_IMAGE    = "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1920&q=85";


const steps = [
  {
    n: "01",
    icon: LayoutGrid,
    title: "Create a group",
    body: "Choose Trip for travel or Nest for home expenses. Add members in seconds.",
  },
  {
    n: "02",
    icon: Users,
    title: "Invite your people",
    body: "Share a link or QR code. Everyone joins instantly — no account needed. Add guests by name; they claim their spot with Google later.",
  },
  {
    n: "03",
    icon: Receipt,
    title: "Log expenses",
    body: "Tap + on any card and type what you spent — AI parses the amount, payer, and split automatically. Or paste a group chat and import all expenses at once.",
  },
  {
    n: "04",
    icon: Zap,
    title: "Settle up",
    body: "See exactly who owes what. Mark payments done with one tap.",
  },
];

const tickerItems = [
  "Weekend getaways", "Flat expenses", "International trips",
  "Roommates", "Road trips", "Office offsites", "Household bills",
  "Trekking groups", "Monthly rent", "Celebrations", "Family vacations",
];

export default async function LandingPage() {
  const user = await getCurrentUser();
  if (user) redirect("/groups");

  return (
    <div className="overflow-x-hidden">

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav className="glass-nav sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <ClearLogo
            iconSize={32}
            wordmarkClassName="text-lg font-semibold text-slate-800 dark:text-slate-100"
            className="flex items-center gap-2.5"
          />
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            {/* ── Text nav links ── */}
            <Link href="/changelog" className="hidden sm:block text-sm font-medium text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-100/70 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white transition-all">
              What&apos;s New
            </Link>
            <Link href="/pricing" className="text-sm font-medium text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-100/70 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white transition-all">
              Pricing
            </Link>
            {/* ── Divider ── */}
            <span className="hidden sm:block w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1.5" />
            {/* ── CTA buttons ── */}
            <Link href="/login" className="hidden sm:inline-flex items-center text-sm font-semibold text-slate-700 dark:text-slate-200 px-4 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-white/80 dark:hover:bg-slate-800/60 hover:-translate-y-0.5 transition-all shadow-sm">
              Sign in
            </Link>
            <Link href="/login?intent=signup" className="inline-flex items-center gap-1.5 bg-gradient-to-br from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white text-sm font-semibold py-2 px-4 rounded-xl shadow-md shadow-cyan-500/20 transition-all hover:-translate-y-0.5">
              Get started <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <Image src={HERO_IMAGE} alt="Travel with friends" fill priority className="object-cover object-center" />
          <div className="absolute inset-0 dark:hidden" style={{ background: "linear-gradient(105deg, rgba(239,246,255,0.97) 0%, rgba(236,254,255,0.93) 28%, rgba(240,253,250,0.80) 55%, rgba(236,253,245,0.60) 80%, rgba(240,253,250,0.45) 100%)" }} />
          <div className="absolute inset-0 hidden dark:block" style={{ background: "linear-gradient(105deg, rgba(15,23,42,0.93) 0%, rgba(12,21,32,0.88) 28%, rgba(10,26,24,0.78) 55%, rgba(11,31,21,0.55) 80%, rgba(10,26,24,0.40) 100%)" }} />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-6 pt-20 pb-28 lg:pt-28 lg:pb-36">
          <div className="flex flex-col lg:flex-row items-center gap-14 lg:gap-16">

            {/* Left — copy (CSS keyframe stagger, works in RSC) */}
            <div className="flex-1 text-center lg:text-left">
              <div className="animate-hero-1 inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-200 mb-8 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-br from-cyan-500 to-teal-500 animate-pulse shrink-0" />
                Trips & nests · 30-day Plus trial
              </div>

              <h1 className="animate-hero-2 text-5xl sm:text-6xl lg:text-[66px] xl:text-[72px] font-normal leading-[1.06] text-slate-800 dark:text-slate-100 mb-7" style={{ fontFamily: "var(--font-fraunces)" }}>
                Split it.{" "}
                <span style={{ background: "linear-gradient(135deg, #0891B2 0%, #14B8A6 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                  Clear it.
                </span>
              </h1>

              <p className="animate-hero-3 text-lg sm:text-xl text-slate-500 dark:text-slate-400 leading-relaxed mb-10 max-w-lg mx-auto lg:mx-0">
                Group expenses for trips and nests — log, split, and settle up with the{" "}
                <span className="text-slate-700 dark:text-slate-200 font-medium">fewest payments possible.</span>
              </p>

              <div className="animate-hero-4 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 mb-10">
                <Link href="/login?intent=signup" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-br from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white font-semibold text-base py-3.5 px-9 rounded-2xl shadow-lg shadow-cyan-500/30 transition-all hover:shadow-cyan-500/40 hover:-translate-y-0.5">
                  Start for free <ArrowRight className="w-4 h-4" />
                </Link>
                <a href="#why-clear" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 glass text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 font-medium text-base py-3.5 px-9 rounded-2xl transition-all hover:shadow-md">
                  Why Clear?
                </a>
              </div>

              <div className="animate-hero-5 flex flex-wrap items-center justify-center lg:justify-start gap-x-5 gap-y-2">
                {["Google sign-in", "No credit card", "Free plan · 30-day Plus trial", "Email & push alerts", "Installs on iOS & Android", "Dispute resolution"].map((t) => (
                  <span key={t} className="inline-flex items-center gap-1.5 text-sm text-slate-400 dark:text-slate-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-500 shrink-0" /> {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Right — groups overview + expense detail (slides in from right) */}
            <div className="animate-hero-right flex-1 w-full max-w-[420px] lg:max-w-none">

              {/* ── Mobile: stacked ── */}
              <div className="flex flex-col gap-3 sm:hidden">
                {/* Groups list */}
                <div className="glass rounded-2xl p-4 shadow-xl">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Your groups</p>
                    <span className="text-[10px] text-slate-400">4 active</span>
                  </div>
                  {[
                    { emoji: "🏖️", name: "Goa 2025",     badge: "You owe ₹450",      cls: "text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400" },
                    { emoji: "🏠", name: "Mumbai Flat",   badge: "You're owed ₹1,200", cls: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400" },
                    { emoji: "✈️", name: "Manali Trip",   badge: "Settled ✓",          cls: "text-slate-400 bg-slate-50 dark:bg-slate-800/40" },
                  ].map((g, i) => (
                    <div key={i} className="flex items-center gap-2.5 py-2 border-b border-slate-100/80 dark:border-slate-700/40 last:border-0">
                      <div className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-sm shrink-0">{g.emoji}</div>
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-200 flex-1">{g.name}</p>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${g.cls}`}>{g.badge}</span>
                    </div>
                  ))}
                </div>

                {/* Expense detail */}
                <div className="glass rounded-2xl p-4" style={{ boxShadow: "0 12px 40px rgba(6,182,212,0.15)" }}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100" style={{ fontFamily: "var(--font-fraunces)" }}>Goa 2025</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">5 members · 8 expenses</p>
                    </div>
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-400 to-teal-400 flex items-center justify-center text-sm shadow-sm">🏖️</div>
                  </div>
                  {[
                    { icon: "🍽️", desc: "Welcome dinner", amount: "₹4,500",  by: "Priya" },
                    { icon: "🏨", desc: "Hotel check-in",  amount: "₹12,000", by: "You"   },
                    { icon: "🚕", desc: "Airport taxi",    amount: "₹2,000",  by: "Raj"   },
                  ].map((e, i) => (
                    <div key={i} className="flex items-center gap-2.5 py-2 border-b border-slate-100/80 dark:border-slate-700/40 last:border-0">
                      <div className="w-7 h-7 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-sm shrink-0">{e.icon}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">{e.desc}</p>
                        <p className="text-[10px] text-slate-400">{e.by} · 5 splits</p>
                      </div>
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 shrink-0">{e.amount}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── sm+: overlapping absolute layout ── */}
              <div className="hidden sm:block relative" style={{ height: 460 }}>
                <div className="absolute inset-6 rounded-3xl blur-3xl" style={{ background: "radial-gradient(ellipse at center, rgba(6,182,212,0.18) 0%, rgba(20,184,166,0.12) 60%, transparent 100%)" }} />

                {/* Groups list card — behind, left */}
                <div className="absolute glass rounded-2xl p-5 w-[262px]" style={{ top: 20, left: 0, transform: "rotate(-2.5deg)", zIndex: 1 }}>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Your groups</p>
                    <span className="text-[10px] text-slate-400">4 active</span>
                  </div>
                  {[
                    { emoji: "🏖️", name: "Goa 2025",     badge: "You owe ₹450",      cls: "text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400" },
                    { emoji: "🏠", name: "Mumbai Flat",   badge: "You're owed ₹1,200", cls: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400" },
                    { emoji: "✈️", name: "Manali Trip",   badge: "Settled ✓",          cls: "text-slate-400 bg-slate-50 dark:bg-slate-800/40" },
                    { emoji: "🏕️", name: "Coorg Weekend", badge: "You owe ₹220",      cls: "text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400" },
                  ].map((g, i) => (
                    <div key={i} className="flex items-center gap-2.5 py-2.5 border-b border-slate-100/80 dark:border-slate-700/40 last:border-0">
                      <div className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-sm shrink-0">{g.emoji}</div>
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-200 flex-1">{g.name}</p>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${g.cls}`}>{g.badge}</span>
                    </div>
                  ))}
                </div>

                {/* Expense detail card — front, right */}
                <div className="absolute glass rounded-2xl p-5 w-[238px]" style={{ bottom: 0, right: 0, transform: "rotate(2.5deg)", zIndex: 2, boxShadow: "0 20px 60px rgba(6,182,212,0.18), 0 4px 16px rgba(0,0,0,0.08)" }}>
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
                    <div key={i} className="flex items-center gap-3 py-2.5 border-b border-slate-100/80 dark:border-slate-700/40 last:border-0">
                      <div className="w-7 h-7 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-sm shrink-0">{e.icon}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">{e.desc}</p>
                        <p className="text-[11px] text-slate-400">{e.by} · 5 splits</p>
                      </div>
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 shrink-0">{e.amount}</p>
                    </div>
                  ))}
                </div>

                {/* Floating badge — bobs gently after load */}
                <div className="animate-float-bob absolute glass-sm rounded-full px-3 py-1.5 shadow-md border border-white/80 flex items-center gap-1.5" style={{ top: 0, right: 24, zIndex: 3 }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">Trips & nests</span>
                </div>
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* ── Ticker ───────────────────────────────────────────────────────── */}
      <div className="py-5 overflow-hidden border-y border-white/60 dark:border-slate-700/40 bg-white/30 dark:bg-slate-900/20 backdrop-blur-sm">
        <div className="flex gap-8 whitespace-nowrap overflow-hidden">
          <div className="flex gap-8 shrink-0 animate-marquee">
            {tickerItems.concat(tickerItems).map((label, i) => (
              <span key={i} className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400">
                <span className="w-1 h-1 rounded-full bg-cyan-400 shrink-0" />
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-6 py-24">
        <FadeIn className="text-center mb-14">
          <p className="text-sm font-semibold text-cyan-600 uppercase tracking-widest mb-3">How it works</p>
          <h2 className="text-4xl sm:text-5xl text-slate-800 dark:text-slate-100 mb-4" style={{ fontFamily: "var(--font-fraunces)" }}>
            Up and running in minutes
          </h2>
          <p className="text-lg text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
            No setup, no onboarding form. Create a group and go.
          </p>
        </FadeIn>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 relative">
          <div className="absolute top-[38px] left-[12.5%] right-[12.5%] h-px hidden lg:block" style={{ background: "linear-gradient(90deg, transparent, #A5F3FC 20%, #99F6E4 80%, transparent)" }} />
          {steps.map((step, i) => (
            <FadeIn key={step.n} delay={i * 90}>
              <div className="glass rounded-2xl p-6 flex flex-col gap-4 relative">
                <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white text-sm shadow-lg shrink-0 relative z-10" style={{ background: "linear-gradient(135deg, #0891B2, #14B8A6)" }}>
                  {step.n}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <step.icon className="w-4 h-4 text-cyan-500 shrink-0" />
                    <h3 className="text-lg text-slate-800 dark:text-slate-100" style={{ fontFamily: "var(--font-fraunces)" }}>{step.title}</h3>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{step.body}</p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ── Two kinds of groups ───────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <FadeIn className="text-center mb-14">
          <p className="text-sm font-semibold text-cyan-600 uppercase tracking-widest mb-3">Group types</p>
          <h2 className="text-4xl sm:text-5xl text-slate-800 dark:text-slate-100 mb-4" style={{ fontFamily: "var(--font-fraunces)" }}>
            Two kinds of groups.
            <br />
            <span style={{ background: "linear-gradient(135deg, #0891B2 0%, #14B8A6 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              One simple app.
            </span>
          </h2>
          <p className="text-lg text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
            Choose what fits your situation. Both use the same splitting engine and settlement optimizer.
          </p>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Trip card */}
          <FadeIn direction="left" className="glass rounded-3xl overflow-hidden">
            <div className="relative h-48">
              <Image src={HERO_IMAGE} alt="Travel trip" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover object-center" />
              <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(15,23,42,0.2) 0%, rgba(15,23,42,0.65) 100%)" }} />
              <div className="absolute bottom-4 left-5">
                <div className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm border border-white/25 rounded-full px-3 py-1 mb-2">
                  <MapPin className="w-3.5 h-3.5 text-cyan-300" />
                  <span className="text-xs font-semibold text-white">Trip</span>
                </div>
                <p className="text-white text-xl" style={{ fontFamily: "var(--font-fraunces)" }}>For travel</p>
              </div>
            </div>
            <div className="p-6">
              <ul className="space-y-3">
                {[
                  "Hotels, meals, transport — all in one place",
                  "Trip dates, cover photo, shared itinerary",
                  "AI travel narrative and budget tracking",
                  "Daily spend chart and trip insights",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-cyan-500 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </FadeIn>

          {/* Nest card */}
          <FadeIn direction="right" className="glass rounded-3xl overflow-hidden">
            <div className="relative h-48">
              <Image src={NEST_IMAGE} alt="Nest group" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover object-center" />
              <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(15,23,42,0.2) 0%, rgba(15,23,42,0.65) 100%)" }} />
              <div className="absolute bottom-4 left-5">
                <div className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm border border-white/25 rounded-full px-3 py-1 mb-2">
                  <Home className="w-3.5 h-3.5 text-teal-300" />
                  <span className="text-xs font-semibold text-white">Nest</span>
                </div>
                <p className="text-white text-xl" style={{ fontFamily: "var(--font-fraunces)" }}>For home</p>
              </div>
            </div>
            <div className="p-6">
              <ul className="space-y-3">
                {[
                  "Rent, utilities, subscriptions — split monthly",
                  "Recurring templates: log with one tap",
                  "Expenses grouped by month for clarity",
                  "Monthly context on every settle-up",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── Why Clear? ───────────────────────────────────────────────────── */}
      <section id="why-clear" className="max-w-6xl mx-auto px-6 pb-24">
        <FadeIn className="text-center mb-12">
          <p className="text-sm font-semibold text-cyan-600 uppercase tracking-widest mb-3">Why Clear?</p>
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
                <p className="text-sm font-semibold text-cyan-600 dark:text-cyan-400">Clear ✦</p>
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
                them: "Expenses pile up silently",
                us:   "Email + push the moment any money moves",
              },
              {
                them: "Disagreements go to WhatsApp",
                us:   "Raise a dispute in-app — payer accepts, split updates automatically",
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
            "AI expense parsing", "Chat import", "Voice input", "Recurring templates",
            "Guest members", "QR code invites", "Per-group insights", "Email & push alerts",
            "UPI pay links", "CSV export", "Expense audit trail", "Installs on any device",
            "Inline comments", "In-app dispute resolution",
          ].map((pill) => (
            <span key={pill} className="glass-sm rounded-full px-4 py-1.5 text-sm text-slate-600 dark:text-slate-300 border border-white/60 dark:border-slate-700/40">
              {pill}
            </span>
          ))}
        </FadeIn>
      </section>

      {/* ── Recurring templates showcase ─────────────────────────────────── */}
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

      {/* ── AI features showcase ─────────────────────────────────────────── */}
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

      {/* ── Notifications showcase ───────────────────────────────────────── */}
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
                  <div className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center shadow-sm" style={{ background: "linear-gradient(140deg, #0EA5E9 0%, #0891B2 50%, #0D9488 100%)" }}>
                    <Bell className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">Clear · {n.group}</p>
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
                    <p className="text-[10px] text-slate-400 mt-0.5">Clear · View in app →</p>
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>

        </div>
      </section>

      {/* ── Social Layer showcase ───────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">

          {/* Left: copy */}
          <FadeIn direction="left" className="flex-1 text-center lg:text-left">
            <p className="text-sm font-semibold text-cyan-600 uppercase tracking-widest mb-3">Social layer</p>
            <h2 className="text-4xl sm:text-5xl text-slate-800 dark:text-slate-100 mb-5" style={{ fontFamily: "var(--font-fraunces)" }}>
              Settle disagreements{" "}
              <span style={{ background: "linear-gradient(135deg, #0891B2 0%, #14B8A6 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                in the app,
              </span>
              <br />not WhatsApp.
            </h2>
            <p className="text-lg text-slate-500 dark:text-slate-400 leading-relaxed max-w-md mx-auto lg:mx-0 mb-6">
              Question an expense, request a split change, or dispute your share — right on the expense. The payer accepts and the split updates automatically.
            </p>
            <ul className="space-y-3 text-left max-w-md mx-auto lg:mx-0">
              {[
                { icon: "💬", label: "Inline comments", desc: "WhatsApp-style chat bubbles on every expense — @mention members with autocomplete." },
                { icon: "👍", label: "Reactions", desc: "Thumbs up to approve, ❓ to ask a question, ⚠️ to formally dispute." },
                { icon: "⚠️", label: "Dispute resolution", desc: "Four dispute types — auto-resolves the split the moment the payer accepts." },
                { icon: "👁", label: "Read receipts", desc: "See who's viewed an expense with an overlapping avatar stack." },
                { icon: "🔔", label: "Activity alerts", desc: "Push notifications for @mentions, new comments, and dispute outcomes." },
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

          {/* Right: dispute mockup */}
          <FadeIn direction="right" className="flex-1 w-full max-w-sm">
            <div className="glass rounded-2xl p-5 shadow-xl shadow-cyan-500/10">

              {/* Expense header */}
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-100 dark:border-slate-700/40">
                <div className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-base shrink-0">🏨</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Hotel check-in</p>
                  <p className="text-xs text-slate-400">₹12,000 · paid by You · 4 splits</p>
                </div>
                {/* Avatar stack */}
                <div className="flex items-center -space-x-1.5 shrink-0">
                  {["R", "P", "A"].map((initial) => (
                    <div key={initial} className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-400 to-teal-400 flex items-center justify-center text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-900">
                      {initial}
                    </div>
                  ))}
                  <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-semibold text-slate-500 dark:text-slate-400 ring-2 ring-white dark:ring-slate-900">
                    +2
                  </div>
                </div>
              </div>

              {/* Dispute card */}
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 rounded-xl p-3.5 mb-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-sm">⚠️</span>
                  <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">Dispute · change share</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mb-3 leading-relaxed">
                  Raj: I only used the room for 2 nights — can my share be updated?
                </p>
                <div className="flex gap-2">
                  <button className="flex-1 text-xs font-semibold text-white py-1.5 rounded-lg" style={{ background: "linear-gradient(135deg, #06B6D4, #0D9488)" }}>
                    Accept &amp; update split
                  </button>
                  <button className="flex-1 text-xs font-medium text-slate-500 dark:text-slate-400 py-1.5 rounded-lg bg-white/60 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    Decline
                  </button>
                </div>
              </div>

              {/* Chat bubbles */}
              <div className="space-y-2">
                <div className="flex gap-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-400 to-indigo-400 flex items-center justify-center text-[9px] font-bold text-white shrink-0 mt-0.5">P</div>
                  <div className="glass-sm rounded-xl rounded-tl-sm px-3 py-2 max-w-[75%]">
                    <p className="text-xs text-slate-700 dark:text-slate-200">Looks fair to me 👍</p>
                    <p className="text-[9px] text-slate-400 mt-0.5">Priya · 2m ago</p>
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <div className="px-3 py-2 rounded-xl rounded-tr-sm max-w-[75%]" style={{ background: "linear-gradient(135deg, #06B6D4, #0D9488)" }}>
                    <p className="text-xs text-white">I&apos;ll update the split now</p>
                    <p className="text-[9px] text-cyan-100/70 mt-0.5">You · just now</p>
                  </div>
                </div>
              </div>

            </div>
          </FadeIn>

        </div>
      </section>

      {/* ── Insights showcase ────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">

          {/* Left: insights mockup */}
          <FadeIn direction="left" className="flex-1 w-full max-w-sm">
            <div className="glass rounded-2xl p-6 shadow-xl shadow-cyan-500/10">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100" style={{ fontFamily: "var(--font-fraunces)" }}>Goa 2025</p>
                  <p className="text-xs text-slate-400 mt-0.5">₹25,000 total · 5 members</p>
                </div>
                <span className="text-[10px] font-semibold text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/30 px-2.5 py-1 rounded-full">Insights</span>
              </div>

              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Spending by category</p>
              <div className="space-y-2.5 mb-5">
                {[
                  { label: "Accommodation", pct: 48, amount: "₹12,000", color: "bg-cyan-500" },
                  { label: "Food & drink",  pct: 28, amount: "₹7,000",  color: "bg-teal-500" },
                  { label: "Transport",     pct: 16, amount: "₹4,000",  color: "bg-indigo-500" },
                  { label: "Activities",    pct: 8,  amount: "₹2,000",  color: "bg-violet-500" },
                ].map((c) => (
                  <div key={c.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-slate-500 dark:text-slate-400">{c.label}</span>
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{c.amount}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-700/60">
                      <div className={`h-1.5 rounded-full ${c.color}`} style={{ width: `${c.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Member contributions</p>
              <div className="space-y-2">
                {[
                  { name: "Priya", amount: "₹8,000", pct: 96 },
                  { name: "You",   amount: "₹6,000", pct: 72 },
                  { name: "Raj",   amount: "₹4,000", pct: 48 },
                  { name: "Anil",  amount: "₹4,000", pct: 48 },
                  { name: "Meera", amount: "₹3,000", pct: 36 },
                ].map((m) => (
                  <div key={m.name} className="flex items-center gap-2.5">
                    <span className="text-xs text-slate-500 dark:text-slate-400 w-10 shrink-0">{m.name}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-700/60">
                      <div className="h-1.5 rounded-full bg-gradient-to-r from-cyan-500 to-teal-500" style={{ width: `${m.pct}%` }} />
                    </div>
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300 shrink-0 w-14 text-right">{m.amount}</span>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>

          {/* Right: copy */}
          <FadeIn direction="right" className="flex-1 text-center lg:text-left">
            <p className="text-sm font-semibold text-cyan-600 uppercase tracking-widest mb-3">Insights</p>
            <h2 className="text-4xl sm:text-5xl text-slate-800 dark:text-slate-100 mb-5" style={{ fontFamily: "var(--font-fraunces)" }}>
              See the full story
              <br />
              <span style={{ background: "linear-gradient(135deg, #0891B2 0%, #14B8A6 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                of your spending.
              </span>
            </h2>
            <p className="text-lg text-slate-500 dark:text-slate-400 leading-relaxed max-w-md mx-auto lg:mx-0 mb-6">
              Every group has a live analytics dashboard — see where the money went, who paid the most, and how spending tracked day by day.
            </p>
            <ul className="space-y-3 text-left max-w-md mx-auto lg:mx-0">
              {[
                { icon: "📊", label: "Category breakdown", desc: "Food, stays, transport, activities — see the split at a glance." },
                { icon: "📈", label: "Daily spend chart",  desc: "Track spending across the trip and spot the big days." },
                { icon: "👥", label: "Member contributions", desc: "Who fronted the most? See each person's share clearly." },
                { icon: "✨", label: "AI trip narrative",  desc: "Clear writes a summary of your trip from the expense history." },
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

      {/* ── Settlement visualization ─────────────────────────────────────── */}
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
            Clear's algorithm collapses any tangle of shared expenses into the minimum number of transfers — no matter how many people.
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
            <p className="text-[10px] font-semibold text-teal-600 dark:text-teal-400 uppercase tracking-widest mb-4">Clear says — 3 transfers</p>
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
            <div className="flex items-center gap-1.5 border-t border-teal-100 dark:border-teal-900/40 pt-3 mb-3">
              <CheckCircle2 className="w-3.5 h-3.5 text-teal-500 shrink-0" />
              <p className="text-xs font-semibold text-teal-600 dark:text-teal-400">Everyone's clear</p>
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

      {/* ── Plus teaser ──────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pb-16">
        <FadeIn>
          <div className="glass rounded-2xl px-8 py-7 flex flex-col sm:flex-row items-center justify-between gap-6 border border-violet-200/40 dark:border-violet-800/30">
            <div className="text-center sm:text-left">
              <div className="flex items-center gap-2 justify-center sm:justify-start mb-2">
                <span className="text-violet-500 font-bold text-sm">✦ Clear Plus</span>
              </div>
              <p className="text-slate-700 dark:text-slate-200 font-medium mb-1">
                Need more room? Unlock unlimited groups, AI parsing, CSV export, and more.
              </p>
              <p className="text-sm text-slate-400 dark:text-slate-500">From ₹49/mo · 30-day free trial · No credit card required.</p>
            </div>
            <Link
              href="/pricing"
              className="shrink-0 inline-flex items-center gap-2 bg-gradient-to-br from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white font-semibold text-sm py-2.5 px-6 rounded-xl shadow-md shadow-violet-500/20 transition-all hover:-translate-y-0.5 whitespace-nowrap"
            >
              See plans <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </FadeIn>
      </section>

      {/* ── Bottom CTA ───────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pb-28">
        <FadeIn>
          <div className="relative rounded-3xl overflow-hidden px-8 py-16 text-center" style={{ background: "linear-gradient(135deg, #0E7490 0%, #0D9488 50%, #059669 100%)" }}>
            <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-white/10 blur-3xl" />
            <div className="relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-6 border border-white/30">
                <ClearIcon size={40} />
              </div>
              <h2 className="text-4xl sm:text-5xl text-white mb-4" style={{ fontFamily: "var(--font-fraunces)" }}>
                Ready to get clear?
              </h2>
              <p className="text-teal-100 text-lg mb-10 max-w-sm mx-auto">
                Create a trip or a nest in seconds. No credit card required.
              </p>
              <Link href="/login?intent=signup" className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-teal-700 font-bold text-base py-3.5 px-10 rounded-2xl shadow-xl shadow-teal-900/30 transition-all hover:-translate-y-0.5">
                Get started free <ArrowRight className="w-4 h-4" />
              </Link>
              <p className="text-teal-200/70 text-sm mt-5">Google sign-in · No credit card · Takes 30 seconds</p>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/40 dark:border-slate-700/40 bg-white/20 dark:bg-slate-900/20 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <ClearLogo
              iconSize={28}
              wordmarkClassName="text-sm font-semibold text-slate-700 dark:text-slate-200"
              className="flex items-center gap-2"
            />
            <span className="text-slate-300 dark:text-slate-600">·</span>
            <span className="text-xs text-slate-400 dark:text-slate-500">Split it. Clear it.</span>
          </div>
          <div className="flex items-center gap-5 text-xs text-slate-400 dark:text-slate-500">
            <Link href="/login" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">Sign in</Link>
            <Link href="/changelog" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">What&apos;s New</Link>
            <Link href="/pricing" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">Pricing</Link>
            <Link href="/terms" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">Privacy</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
