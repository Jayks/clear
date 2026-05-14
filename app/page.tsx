import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight, Users, TrendingDown, CheckCircle2,
  MapPin, Home, Receipt, Zap, DivideSquare, RefreshCw,
  LayoutGrid, CalendarCheck,
} from "lucide-react";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { ClearLogo, ClearIcon } from "@/components/shared/clear-logo";

const HERO_IMAGE    = "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=85";
const NEST_IMAGE    = "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1920&q=85";

const features = [
  {
    icon: MapPin,
    title: "Trips",
    body: "Multi-day travel with your crew — hotels, dinners, taxis, activities. Log as you go and see the story of your trip in insights.",
    gradient: "from-cyan-500 to-teal-500",
    glow: "shadow-cyan-500/25",
  },
  {
    icon: Home,
    title: "Nests",
    body: "Flat expenses, done right. Set recurring templates for rent, electricity, WiFi — log each month with one tap and settle monthly.",
    gradient: "from-teal-500 to-emerald-500",
    glow: "shadow-teal-500/25",
  },
  {
    icon: DivideSquare,
    title: "Split 4 ways",
    body: "Equal split, exact amounts, percentages, or custom shares. Handle any scenario — someone opts out, kids go half, you name it.",
    gradient: "from-blue-500 to-cyan-500",
    glow: "shadow-blue-500/25",
  },
  {
    icon: TrendingDown,
    title: "Minimum payments",
    body: "Our algorithm finds the fewest transactions to clear all debts — never more than one payment per person needed.",
    gradient: "from-indigo-500 to-blue-500",
    glow: "shadow-indigo-500/25",
  },
];

const steps = [
  {
    n: "01",
    icon: LayoutGrid,
    title: "Create a group",
    body: "Choose Trip for travel or Nest for a shared tab. Add members in seconds.",
  },
  {
    n: "02",
    icon: Users,
    title: "Invite your people",
    body: "Share a link or QR code. Everyone joins instantly — no app install needed.",
  },
  {
    n: "03",
    icon: Receipt,
    title: "Log expenses",
    body: "One-off or recurring. Split equally, by amount, percentage, or shares.",
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

export default function LandingPage() {
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
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/login" className="hidden sm:block text-sm font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 transition-colors">
              Sign in
            </Link>
            <Link href="/login" className="inline-flex items-center gap-1.5 bg-gradient-to-br from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white text-sm font-semibold py-2 px-4 rounded-xl shadow-md shadow-cyan-500/20 transition-all hover:-translate-y-0.5">
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

            {/* Left — copy */}
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-200 mb-8 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-br from-cyan-500 to-teal-500 animate-pulse shrink-0" />
                Trips & shared tabs · Free forever
              </div>

              <h1 className="text-5xl sm:text-6xl lg:text-[66px] xl:text-[72px] font-normal leading-[1.06] text-slate-800 dark:text-slate-100 mb-7" style={{ fontFamily: "var(--font-fraunces)" }}>
                Split it.{" "}
                <span style={{ background: "linear-gradient(135deg, #0891B2 0%, #14B8A6 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                  Clear it.
                </span>
              </h1>

              <p className="text-lg sm:text-xl text-slate-500 dark:text-slate-400 leading-relaxed mb-10 max-w-lg mx-auto lg:mx-0">
                Group expenses for trips and shared tabs — log, split, and settle up with the{" "}
                <span className="text-slate-700 dark:text-slate-200 font-medium">fewest payments possible.</span>
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 mb-10">
                <Link href="/login" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-br from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white font-semibold text-base py-3.5 px-9 rounded-2xl shadow-lg shadow-cyan-500/30 transition-all hover:shadow-cyan-500/40 hover:-translate-y-0.5">
                  Start for free <ArrowRight className="w-4 h-4" />
                </Link>
                <a href="#how-it-works" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 glass text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 font-medium text-base py-3.5 px-9 rounded-2xl transition-all hover:shadow-md">
                  How it works
                </a>
              </div>

              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-5 gap-y-2">
                {["Google sign-in", "No credit card", "Free forever"].map((t) => (
                  <span key={t} className="inline-flex items-center gap-1.5 text-sm text-slate-400 dark:text-slate-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-500 shrink-0" /> {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Right — dual mockup */}
            <div className="flex-1 w-full max-w-[420px] lg:max-w-none">

              {/* ── Mobile: stacked cards, no rotation ── */}
              <div className="flex flex-col gap-3 sm:hidden">
                {/* Trip card */}
                <div className="glass rounded-2xl p-4 shadow-xl">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100" style={{ fontFamily: "var(--font-fraunces)" }}>Goa 2025</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">5 members · 8 expenses</p>
                    </div>
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-400 to-teal-400 flex items-center justify-center text-sm shadow-sm">🏖️</div>
                  </div>
                  {[
                    { icon: "🍽️", desc: "Welcome dinner", amount: "₹4,500", by: "Priya", n: 5 },
                    { icon: "🏨", desc: "Hotel check-in", amount: "₹12,000", by: "You", n: 5 },
                    { icon: "🚕", desc: "Airport taxi", amount: "₹2,000", by: "Raj", n: 5 },
                  ].map((e, i) => (
                    <div key={i} className="flex items-center gap-2.5 py-2 border-b border-slate-100/80 dark:border-slate-700/40 last:border-0">
                      <div className="w-7 h-7 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-sm shrink-0">{e.icon}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">{e.desc}</p>
                        <p className="text-[10px] text-slate-400">{e.by} · {e.n} splits</p>
                      </div>
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 shrink-0">{e.amount}</p>
                    </div>
                  ))}
                </div>

                {/* Nest card */}
                <div className="glass rounded-2xl p-4" style={{ boxShadow: "0 12px 40px rgba(20,184,166,0.15)" }}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Recurring</p>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mt-0.5" style={{ fontFamily: "var(--font-fraunces)" }}>Mumbai Flat</p>
                    </div>
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-400 flex items-center justify-center text-sm shadow-sm">🏠</div>
                  </div>
                  <div className="space-y-1.5">
                    {[
                      { icon: "🏠", label: "Monthly rent",  amount: "₹30,000", logged: true  },
                      { icon: "⚡", label: "Electricity",    amount: "₹1,800",  logged: false },
                      { icon: "📡", label: "WiFi broadband", amount: "₹999",    logged: false },
                    ].map((t, i) => (
                      <div key={i} className="flex items-center gap-2 bg-white/50 dark:bg-slate-800/50 rounded-xl px-2.5 py-1.5">
                        <span className="text-sm shrink-0">{t.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-medium text-slate-700 dark:text-slate-200 truncate">{t.label}</p>
                          <p className="text-[10px] text-slate-400">{t.amount}</p>
                        </div>
                        {t.logged ? (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-emerald-600 shrink-0">
                            <CheckCircle2 className="w-3 h-3" /> May
                          </span>
                        ) : (
                          <div className="h-5 px-1.5 rounded-md flex items-center justify-center shadow-sm" style={{ background: "linear-gradient(135deg, #06B6D4, #14B8A6)" }}>
                            <span className="text-[8px] font-bold text-white tracking-wide">LOG</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── sm+: overlapping absolute layout ── */}
              <div className="hidden sm:block relative" style={{ height: 460 }}>
                <div className="absolute inset-6 rounded-3xl blur-3xl" style={{ background: "radial-gradient(ellipse at center, rgba(6,182,212,0.18) 0%, rgba(20,184,166,0.12) 60%, transparent 100%)" }} />

                {/* Trip expense card */}
                <div className="absolute glass rounded-2xl p-5 shadow-xl w-[258px]" style={{ top: 16, left: 0, transform: "rotate(-3deg)", zIndex: 1 }}>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100" style={{ fontFamily: "var(--font-fraunces)" }}>Goa 2025</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">5 members · 8 expenses</p>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-teal-400 flex items-center justify-center text-base shadow-sm">🏖️</div>
                  </div>
                  {[
                    { icon: "🍽️", desc: "Welcome dinner", amount: "₹4,500", by: "Priya", n: 5 },
                    { icon: "🏨", desc: "Hotel check-in", amount: "₹12,000", by: "You", n: 5 },
                    { icon: "🚕", desc: "Airport taxi", amount: "₹2,000", by: "Raj", n: 5 },
                  ].map((e, i) => (
                    <div key={i} className="flex items-center gap-3 py-2.5 border-b border-slate-100/80 dark:border-slate-700/40 last:border-0">
                      <div className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-sm shrink-0">{e.icon}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">{e.desc}</p>
                        <p className="text-[11px] text-slate-400">{e.by} · {e.n} splits</p>
                      </div>
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 tabular shrink-0">{e.amount}</p>
                    </div>
                  ))}
                </div>

                {/* Nest template card */}
                <div className="absolute glass rounded-2xl p-5 w-[232px] border border-white/90" style={{ bottom: 0, right: 0, transform: "rotate(2.5deg)", zIndex: 2, boxShadow: "0 20px 60px rgba(20,184,166,0.18), 0 4px 16px rgba(0,0,0,0.08)" }}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Recurring</p>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mt-0.5" style={{ fontFamily: "var(--font-fraunces)" }}>Mumbai Flat</p>
                    </div>
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-400 flex items-center justify-center text-base shadow-sm">🏠</div>
                  </div>
                  <div className="space-y-2">
                    {[
                      { icon: "🏠", label: "Monthly rent",   amount: "₹30,000", logged: true  },
                      { icon: "⚡", label: "Electricity",     amount: "₹1,800",  logged: false },
                      { icon: "📡", label: "WiFi broadband",  amount: "₹999",    logged: false },
                    ].map((t, i) => (
                      <div key={i} className="flex items-center gap-2 bg-white/50 dark:bg-slate-800/50 rounded-xl px-2.5 py-2">
                        <span className="text-sm shrink-0">{t.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-medium text-slate-700 dark:text-slate-200 truncate">{t.label}</p>
                          <p className="text-[10px] text-slate-400">{t.amount}</p>
                        </div>
                        {t.logged ? (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-emerald-600 shrink-0">
                            <CheckCircle2 className="w-3 h-3" /> May
                          </span>
                        ) : (
                          <div className="h-5 px-1.5 rounded-md flex items-center justify-center shadow-sm" style={{ background: "linear-gradient(135deg, #06B6D4, #14B8A6)" }}>
                            <span className="text-[8px] font-bold text-white tracking-wide">LOG</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Floating badge */}
                <div className="absolute glass-sm rounded-full px-3 py-1.5 shadow-md border border-white/80 flex items-center gap-1.5" style={{ top: 0, right: 24, zIndex: 3, transform: "rotate(-1deg)" }}>
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
        <div className="flex gap-8 whitespace-nowrap">
          <div className="flex gap-8 shrink-0 animate-none">
            {tickerItems.concat(tickerItems).map((label, i) => (
              <span key={i} className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400">
                <span className="w-1 h-1 rounded-full bg-cyan-400 shrink-0" />
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Two kinds of groups ───────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-14">
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
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Trip card */}
          <div className="glass rounded-3xl overflow-hidden">
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
          </div>

          {/* Nest card */}
          <div className="glass rounded-3xl overflow-hidden">
            <div className="relative h-48">
              <Image src={NEST_IMAGE} alt="Shared tab nest" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover object-center" />
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
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section id="features" className="max-w-6xl mx-auto px-6 pb-24">
        <div className="text-center mb-14">
          <p className="text-sm font-semibold text-cyan-600 uppercase tracking-widest mb-3">Features</p>
          <h2 className="text-4xl sm:text-5xl text-slate-800 dark:text-slate-100 mb-4" style={{ fontFamily: "var(--font-fraunces)" }}>
            Everything your group needs
          </h2>
          <p className="text-lg text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
            Whether you're settling a road trip or splitting the rent — Clear handles it.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((f) => (
            <div key={f.title} className="glass rounded-2xl p-7 hover:shadow-xl transition-all hover:-translate-y-1 group">
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${f.gradient} flex items-center justify-center mb-5 shadow-lg ${f.glow} group-hover:scale-105 transition-transform`}>
                <f.icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl text-slate-800 dark:text-slate-100 mb-3" style={{ fontFamily: "var(--font-fraunces)" }}>{f.title}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>

        {/* Feature pills */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          {[
            "Recurring templates", "Monthly grouping", "QR code invites",
            "Guest members", "Real-time sync", "Per-group insights",
            "Portfolio view", "UPI pay links", "CSV export", "AI expense parsing",
          ].map((pill) => (
            <span key={pill} className="glass-sm rounded-full px-4 py-1.5 text-sm text-slate-600 dark:text-slate-300 border border-white/60 dark:border-slate-700/40">
              {pill}
            </span>
          ))}
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-6 pb-24">
        <div className="text-center mb-14">
          <p className="text-sm font-semibold text-cyan-600 uppercase tracking-widest mb-3">How it works</p>
          <h2 className="text-4xl sm:text-5xl text-slate-800 dark:text-slate-100 mb-4" style={{ fontFamily: "var(--font-fraunces)" }}>
            Up and running in minutes
          </h2>
          <p className="text-lg text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
            No setup, no onboarding form. Create a group and go.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 relative">
          <div className="absolute top-[38px] left-[12.5%] right-[12.5%] h-px hidden lg:block" style={{ background: "linear-gradient(90deg, transparent, #A5F3FC 20%, #99F6E4 80%, transparent)" }} />
          {steps.map((step) => (
            <div key={step.n} className="glass rounded-2xl p-6 flex flex-col gap-4 relative">
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
          ))}
        </div>
      </section>

      {/* ── Recurring templates showcase ─────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          {/* Left: template mockup */}
          <div className="flex-1 w-full max-w-md">
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
          </div>

          {/* Right: copy */}
          <div className="flex-1 text-center lg:text-left">
            <p className="text-sm font-semibold text-teal-600 uppercase tracking-widest mb-3">For shared tabs</p>
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
          </div>
        </div>
      </section>

      {/* ── Split modes ───────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          <div className="flex-1 grid grid-cols-2 gap-3 w-full max-w-md order-2 lg:order-1">
            {[
              { mode: "Equal split",   example: "₹3,200 ÷ 4 = ₹800 each",              tag: "Most used", color: "from-cyan-500 to-teal-500" },
              { mode: "Exact amounts", example: "You: ₹1,500 · Priya: ₹1,200 · ...",   tag: "Precise",   color: "from-teal-500 to-emerald-500" },
              { mode: "Percentages",   example: "You 40% · Priya 30% · Raj 30%",        tag: "Flexible",  color: "from-blue-500 to-cyan-500" },
              { mode: "Shares",        example: "Adults 2× · Kids 1× · Senior 1×",      tag: "Custom",    color: "from-indigo-500 to-blue-500" },
            ].map((s) => (
              <div key={s.mode} className="glass rounded-xl p-4">
                <div className={`inline-flex items-center text-[9px] font-bold text-white uppercase tracking-widest px-2 py-0.5 rounded-full bg-gradient-to-br ${s.color} mb-3`}>
                  {s.tag}
                </div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-1" style={{ fontFamily: "var(--font-fraunces)" }}>{s.mode}</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed">{s.example}</p>
              </div>
            ))}
          </div>

          <div className="flex-1 text-center lg:text-left order-1 lg:order-2">
            <p className="text-sm font-semibold text-cyan-600 uppercase tracking-widest mb-3">Splitting</p>
            <h2 className="text-4xl sm:text-5xl text-slate-800 dark:text-slate-100 mb-5" style={{ fontFamily: "var(--font-fraunces)" }}>
              Every group is different.
              <br />
              <span style={{ background: "linear-gradient(135deg, #0891B2 0%, #14B8A6 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                Split accordingly.
              </span>
            </h2>
            <p className="text-lg text-slate-500 dark:text-slate-400 leading-relaxed max-w-md mx-auto lg:mx-0">
              Someone opts out of the expensive restaurant. Kids go half. One flatmate pays more rent for the bigger room. Clear handles all of it.
            </p>
          </div>
        </div>
      </section>

      {/* ── Social proof ─────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="glass rounded-3xl px-8 py-10 flex flex-col lg:flex-row items-center gap-10">
          <div className="flex-1 text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start gap-1 mb-3">
              {[...Array(5)].map((_, i) => <span key={i} className="text-amber-400 text-lg">★</span>)}
            </div>
            <p className="text-2xl sm:text-3xl text-slate-800 dark:text-slate-100 mb-3" style={{ fontFamily: "var(--font-fraunces)" }}>
              "Finally, no more WhatsApp maths"
            </p>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Stop screenshotting receipts and doing mental arithmetic at 1 AM. Clear handles the numbers.
            </p>
          </div>
          <div className="flex-1 grid grid-cols-2 gap-3 w-full max-w-sm lg:max-w-none">
            {[
              { icon: "🏖️", label: "Weekend trips" },
              { icon: "🏠", label: "Flat expenses" },
              { icon: "✈️", label: "International" },
              { icon: "👨‍👩‍👧", label: "Shared tabs" },
            ].map((item) => (
              <div key={item.label} className="glass-sm rounded-xl px-4 py-3 flex items-center gap-2.5 border border-white/60">
                <span className="text-xl">{item.icon}</span>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ───────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pb-28">
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
              Create a trip or a nest in seconds. No subscriptions, no catch.
            </p>
            <Link href="/login" className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-teal-700 font-bold text-base py-3.5 px-10 rounded-2xl shadow-xl shadow-teal-900/30 transition-all hover:-translate-y-0.5">
              Get started free <ArrowRight className="w-4 h-4" />
            </Link>
            <p className="text-teal-200/70 text-sm mt-5">Google sign-in · No credit card · Takes 30 seconds</p>
          </div>
        </div>
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
            <Link href="/terms" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">Privacy</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
