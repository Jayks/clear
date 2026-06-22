import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight, Users, CheckCircle2, X,
  MapPin, Building2, Receipt, Zap,
  LayoutGrid,
} from "lucide-react";
import { ClearLogo, ClearIcon } from "@/components/shared/clear-logo";
import { BRAND } from "@/lib/brand";
import { FadeIn } from "@/components/shared/fade-in";
import { LazySection } from "@/components/marketing/lazy-section";
import { MarketingNav } from "@/components/marketing/marketing-nav";

const HERO_IMAGE    = "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=85";
const NEST_IMAGE    = "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1920&q=85";


const steps = [
  {
    n: "01",
    icon: LayoutGrid,
    title: "Pick your context",
    body: "Trip for travel, Nest for home bills, Circle for a shared fund, or Streams for direct 1:1 tracking between two people.",
  },
  {
    n: "02",
    icon: Users,
    title: "Invite your people",
    body: "Share a link or QR code. Everyone joins instantly — no account needed. Add guests by name; they claim with Google later. Or import the same crew from a past trip — zero re-typing.",
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

/**
 * Desktop/tablet landing page (`/`) — the comprehensive scrollable tour.
 * Mobile keeps `CarouselLanding` as `/`'s content instead; this component
 * is also what used to live at `/about` before the carousel took over that
 * URL. See `app/CLAUDE.md` Landing Page section for the full split.
 */
export function AboutLanding() {
  return (
    <div className="overflow-x-clip overflow-y-visible">
      {/* overflow-y-visible is deliberate: CSS auto-computes overflow-y:auto
          whenever overflow-x is non-visible and overflow-y is left unset,
          silently turning this div into its own scroll container — which can
          capture touch-drag gestures on mobile instead of letting them bubble
          to the page (the actual cause of "Home from the carousel renders a
          page that won't scroll" on Android Chrome, found 2026-06-22). Pinning
          overflow-y explicitly prevents that auto-coercion while keeping the
          original horizontal-clip protection. */}

      {/* ── Nav — shared across every marketing page, see MarketingNav ── */}
      <MarketingNav current="home" />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <Image src={HERO_IMAGE} alt="Travel with friends" fill priority className="object-cover object-center" />
          <div className="absolute inset-0 dark:hidden" style={{ background: "linear-gradient(105deg, rgba(239,246,255,0.97) 0%, rgba(236,254,255,0.93) 28%, rgba(240,253,250,0.80) 55%, rgba(236,253,245,0.60) 80%, rgba(240,253,250,0.45) 100%)" }} />
          <div className="absolute inset-0 hidden dark:block" style={{ background: "linear-gradient(105deg, rgba(15,23,42,0.93) 0%, rgba(12,21,32,0.88) 28%, rgba(10,26,24,0.78) 55%, rgba(11,31,21,0.55) 80%, rgba(10,26,24,0.40) 100%)" }} />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-6 pt-20 pb-28 lg:pt-16 lg:pb-16">
          <div className="flex flex-col lg:flex-row items-center gap-14 lg:gap-16">

            {/* Left — copy (CSS keyframe stagger, works in RSC) */}
            <div className="flex-1 text-center lg:text-left">
              <div className="animate-hero-1 inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-200 mb-8 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-br from-cyan-500 to-teal-500 animate-pulse shrink-0" />
                Trips · Nests · Streams · Circles · 30-day trial
              </div>

              <h1 className="animate-hero-2 text-5xl sm:text-6xl lg:text-[66px] xl:text-[72px] font-normal leading-[1.06] text-slate-800 dark:text-slate-100 mb-7" style={{ fontFamily: "var(--font-fraunces)" }}>
                Split it.
                <br />
                <span style={{ background: "linear-gradient(135deg, #0891B2 0%, #14B8A6 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                  Clear it off.
                </span>
              </h1>

              <p className="animate-hero-3 text-lg sm:text-xl text-slate-500 dark:text-slate-400 leading-relaxed mb-10 max-w-lg mx-auto lg:mx-0">
                Four financial contexts — trips, home bills, 1:1 debts, and shared funds — all in one place, settled with the{" "}
                <span className="text-slate-700 dark:text-slate-200 font-medium">fewest payments possible.</span>
              </p>

              <div className="animate-hero-4 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 mb-10">
                <Link href="/login?intent=signup" scroll={false} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-br from-[#129DB8] to-[#07788C] hover:from-[#07788C] hover:to-[#08596A] text-white font-semibold text-base py-3.5 px-9 rounded-2xl shadow-lg shadow-cyan-500/30 transition-all hover:shadow-cyan-500/40 hover:-translate-y-0.5">
                  Start for free <ArrowRight className="w-4 h-4" />
                </Link>
                <a href="#why-clear" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 glass text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 font-medium text-base py-3.5 px-9 rounded-2xl transition-all hover:shadow-md">
                  Why ClearOff?
                </a>
              </div>

              <div className="animate-hero-5 flex flex-wrap items-center justify-center lg:justify-start gap-x-5 gap-y-2">
                {["Google sign-in", "No credit card", "Free plan · 30-day Plus trial", "Email & push alerts", "Installs on iOS & Android", "Dispute resolution"].map((t) => (
                  <span key={t} className="inline-flex items-center gap-1.5 text-sm text-slate-400 dark:text-slate-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-500 shrink-0" /> {t}
                  </span>
                ))}
              </div>
              <p className="animate-hero-5 text-xs text-slate-400/80 dark:text-slate-500/80 mt-2.5 text-center lg:text-left">
                Native App Store / Play Store apps coming soon — install today as a web app, same full experience.
              </p>
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
                    { emoji: "☕", name: "Office Coffee Pool", badge: "✓ You've paid",  cls: "text-violet-600 bg-violet-50 dark:bg-violet-950/30 dark:text-violet-400" },
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
                    { emoji: "☕", name: "Office Coffee Pool", badge: "✓ You've paid",  cls: "text-violet-600 bg-violet-50 dark:bg-violet-950/30 dark:text-violet-400" },
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
                  <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">Trips · Nests · Circles</span>
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

      {/* ── Four financial contexts ───────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <FadeIn className="text-center mb-14">
          <p className="text-sm font-semibold text-cyan-600 uppercase tracking-widest mb-3">Financial contexts</p>
          <h2 className="text-4xl sm:text-5xl text-slate-800 dark:text-slate-100 mb-4" style={{ fontFamily: "var(--font-fraunces)" }}>
            Four contexts.
            <br />
            <span style={{ background: "linear-gradient(135deg, #0891B2 0%, #14B8A6 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              One simple app.
            </span>
          </h2>
          <p className="text-lg text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
            Pick the one that fits — or use all four. Same splitting engine and settlement optimizer throughout.
          </p>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Trip card */}
          <FadeIn direction="left" className="glass rounded-3xl overflow-hidden">
            <div className="relative h-44">
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
              <ul className="space-y-2.5">
                {[
                  "Hotels, meals, transport — all in one place",
                  "Day-by-day timeline + AI trip narrative",
                  "Daily spend chart and budget tracking",
                  "Cover photo, dates, shared itinerary",
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
            <div className="relative h-44">
              <Image src={NEST_IMAGE} alt="Nest group" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover object-center" />
              <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(15,23,42,0.2) 0%, rgba(15,23,42,0.65) 100%)" }} />
              <div className="absolute bottom-4 left-5">
                <div className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm border border-white/25 rounded-full px-3 py-1 mb-2">
                  <Building2 className="w-3.5 h-3.5 text-teal-300" />
                  <span className="text-xs font-semibold text-white">Nest</span>
                </div>
                <p className="text-white text-xl" style={{ fontFamily: "var(--font-fraunces)" }}>For home</p>
              </div>
            </div>
            <div className="p-6">
              <ul className="space-y-2.5">
                {[
                  "Rent, utilities, subscriptions — split monthly",
                  "Recurring templates: log with one tap",
                  "Expenses grouped by month for clarity",
                  "Monthly pace tracker + settle-up context",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </FadeIn>

          {/* Streams card */}
          <FadeIn direction="left" className="glass rounded-3xl overflow-hidden">
            <div
              className="relative h-44 flex flex-col justify-end p-5"
              style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #1e1b4b 100%)" }}
            >
              {/* Decorative spine lines */}
              <div className="absolute inset-0 overflow-hidden opacity-20">
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-indigo-400" style={{ transform: "translateX(-50%)" }} />
                {[18, 58, 98, 138].map((y) => (
                  <div key={y} className="absolute flex items-center w-full" style={{ top: y }}>
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent to-indigo-400 mr-5" />
                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-300 shrink-0" />
                    <div className="flex-1 ml-5" />
                  </div>
                ))}
              </div>
              <div className="relative z-10">
                <div className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm border border-white/25 rounded-full px-3 py-1 mb-2">
                  <span className="text-xs text-indigo-300">⇌</span>
                  <span className="text-xs font-semibold text-white">Stream</span>
                </div>
                <p className="text-white text-xl" style={{ fontFamily: "var(--font-fraunces)" }}>1:1 debts</p>
              </div>
            </div>
            <div className="p-6">
              <ul className="space-y-2.5">
                {[
                  "No group needed — track with one person",
                  "Bilateral spine: every IOU chronologically",
                  "Guest confirmation via shareable link",
                  "Partial settle or forgive anytime",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </FadeIn>

          {/* Circles card */}
          <FadeIn direction="right" className="glass rounded-3xl overflow-hidden">
            <div
              className="relative h-44 flex flex-col justify-end p-5"
              style={{ background: "linear-gradient(135deg, #2e1065 0%, #4c1d95 40%, #881337 100%)" }}
            >
              {/* Decorative progress */}
              <div className="absolute inset-0 flex items-center px-6 opacity-25">
                <div className="w-full">
                  <div className="h-3 rounded-full bg-white/20 overflow-hidden mb-3">
                    <div className="h-3 rounded-full" style={{ width: "62%", background: "linear-gradient(90deg,#a78bfa,#fb7185)" }} />
                  </div>
                  <div className="flex gap-1.5">
                    {["P","R","Y","A"].map((l) => (
                      <div key={l} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold">{l}</div>
                    ))}
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white text-xs">+2</div>
                  </div>
                </div>
              </div>
              <div className="relative z-10">
                <div className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm border border-white/25 rounded-full px-3 py-1 mb-2">
                  <span className="text-xs text-violet-300">🪙</span>
                  <span className="text-xs font-semibold text-white">Circle</span>
                </div>
                <p className="text-white text-xl" style={{ fontFamily: "var(--font-fraunces)" }}>Shared fund</p>
              </div>
            </div>
            <div className="p-6">
              <ul className="space-y-2.5">
                {[
                  "Recurring monthly or one-time collection",
                  "Fixed (equal shares) or Flexi (any amount)",
                  "WhatsApp group reminder for stragglers",
                  "Ghost members — no ClearOff account needed",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-violet-500 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── Why ClearOff? ───────────────────────────────────────────────────── */}
      <section id="why-clear" className="max-w-6xl mx-auto px-6 pb-24">
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

      {/* ── Trip timeline showcase — lazy-loaded, see lazy-section.tsx ── */}
      <LazySection sectionId="trip-timeline" minHeight={620} />

      {/* ── Recurring templates showcase — lazy-loaded ── */}
      <LazySection sectionId="recurring-templates" minHeight={460} />

      {/* ── Streams showcase — lazy-loaded ── */}
      <LazySection sectionId="streams" minHeight={480} />

      {/* ── Circles showcase — lazy-loaded ── */}
      <LazySection sectionId="circles" minHeight={620} />

      {/* ── AI features showcase — lazy-loaded ── */}
      <LazySection sectionId="ai-features" minHeight={520} />

      {/* ── Notifications showcase — lazy-loaded ── */}
      <LazySection sectionId="notifications" minHeight={620} />

      {/* ── Social Layer showcase — lazy-loaded ── */}
      <LazySection sectionId="social-layer" minHeight={620} />

      {/* ── Map View showcase — lazy-loaded ── */}
      <LazySection sectionId="map-view" minHeight={620} />

      {/* ── Settlement visualization — lazy-loaded ── */}
      <LazySection sectionId="settlement" minHeight={520} />

      {/* ── Debt Flow graph showcase — lazy-loaded ── */}
      <LazySection sectionId="debt-flow" minHeight={520} />

      {/* ── Insights showcase — lazy-loaded ── */}
      <LazySection sectionId="insights" minHeight={620} />

      {/* ── Plus teaser ──────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pb-16">
        <FadeIn>
          <div className="glass rounded-2xl px-8 py-7 flex flex-col sm:flex-row items-center justify-between gap-6 border border-violet-200/40 dark:border-violet-800/30">
            <div className="text-center sm:text-left">
              <div className="flex items-center gap-2 justify-center sm:justify-start mb-2">
                <span className="text-violet-500 font-bold text-sm">✦ ClearOff Plus</span>
              </div>
              <p className="text-slate-700 dark:text-slate-200 font-medium mb-1">
                Need more room? Unlock unlimited groups, AI parsing, CSV export, and more.
              </p>
              <p className="text-sm text-slate-400 dark:text-slate-500">₹79/mo · or ₹699/yr (₹58/mo) · 30-day free trial · No credit card required.</p>
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
                Create a trip, nest, stream, or circle in seconds. No credit card required.
              </p>
              <Link href="/login?intent=signup" scroll={false} className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-teal-700 font-bold text-base py-3.5 px-10 rounded-2xl shadow-xl shadow-teal-900/30 transition-all hover:-translate-y-0.5">
                Get started free <ArrowRight className="w-4 h-4" />
              </Link>
              <p className="text-teal-200/70 text-sm mt-5">Google sign-in · No credit card · Takes 30 seconds</p>
              <p className="text-teal-200/40 text-xs mt-2">Native iOS &amp; Android apps coming soon — install today as a web app, same full experience.</p>
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
            <span className="text-xs text-slate-400 dark:text-slate-500">{BRAND.tagline}</span>
          </div>
          {/* flex-wrap: these 7 links + gaps never fit one unbroken row on a
              mobile width — without wrap they silently overflowed past the
              page's overflow-x-clip (added for the carousel scroll fix) and
              read as "cut off" rather than scrollable (reported 2026-06-22).
              justify-center keeps wrapped lines tidy instead of ragged-left. */}
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-slate-400 dark:text-slate-500">
            <Link href="/login" scroll={false} className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">Sign in</Link>
            <Link href="/changelog" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">What&apos;s New</Link>
            <Link href="/pricing" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">Pricing</Link>
            <Link href="/terms" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">Privacy</Link>
            <Link href="/refund" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">Refund</Link>
            <Link href="/contact" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">Contact</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
