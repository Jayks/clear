import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Minus, CheckCircle2, ChevronDown, ChevronLeft } from "lucide-react";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { ClearLogo, ClearIcon } from "@/components/shared/clear-logo";
import { PlanCards } from "./plan-cards";

export const metadata: Metadata = { title: "Pricing — Clear" };

const TABLE_SECTIONS: {
  label: string;
  rows: { feature: string; free: string | boolean; plus: string | boolean }[];
}[] = [
  {
    label: "Groups & Members",
    rows: [
      { feature: "Active groups",      free: "Up to 4",    plus: "Unlimited"  },
      { feature: "Members per group",  free: "Up to 8",    plus: "Up to 50"   },
      { feature: "Expenses per group", free: "Up to 50",   plus: "Up to 500"  },
    ],
  },
  {
    label: "Splitting",
    rows: [
      { feature: "Split modes",         free: "Equal only", plus: "Equal, Exact, %, Shares" },
      { feature: "Recurring templates", free: false,         plus: true },
      { feature: "AI expense parsing",  free: false,         plus: true },
    ],
  },
  {
    label: "Export & Extras",
    rows: [
      { feature: "CSV export",           free: false, plus: true },
      { feature: "Group insights",       free: true,  plus: true },
      { feature: "Email & push alerts",  free: true,  plus: true },
      { feature: "Guest member support", free: true,  plus: true },
      { feature: "UPI pay links",        free: true,  plus: true },
    ],
  },
];

const FAQS = [
  {
    q: "What happens when my trial ends?",
    a: "You drop to the free plan automatically. Your data is safe — all your groups, expenses, and settlement history stay intact. You'll be capped at 4 groups until you upgrade.",
  },
  {
    q: "Does the group admin's plan cover everyone?",
    a: "Yes. If the group creator has Clear Plus, all members in that group get Plus features — non-equal splits, templates, AI parsing, insights — regardless of their own plan.",
  },
  {
    q: "Is a credit card required for the trial?",
    a: "No. Start your 30-day trial with just a Google sign-in. No payment details needed.",
  },
  {
    q: "Can I cancel or downgrade anytime?",
    a: "Yes. Go to Settings → Billing and choose Downgrade to Free. It takes effect immediately.",
  },
  {
    q: "When will paid plans be available?",
    a: "Paid billing is coming soon. For now, your trial gives you full Plus access — no credit card required.",
  },
];

export default function PricingPage() {
  return (
    <div className="overflow-x-hidden">

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav className="glass-nav sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <ChevronLeft className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" />
            <ClearLogo
              iconSize={32}
              wordmarkClassName="text-lg font-semibold text-slate-800 dark:text-slate-100"
              className="flex items-center gap-2.5"
            />
          </Link>
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <span className="hidden sm:block w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1.5" />
            <Link
              href="/login"
              className="hidden sm:inline-flex items-center text-sm font-semibold text-slate-700 dark:text-slate-200 px-4 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-white/80 dark:hover:bg-slate-800/60 hover:-translate-y-0.5 transition-all shadow-sm"
            >
              Sign in
            </Link>
            <Link
              href="/login?intent=signup"
              className="inline-flex items-center gap-1.5 bg-gradient-to-br from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white text-sm font-semibold py-2 px-4 rounded-xl shadow-md shadow-cyan-500/20 transition-all hover:-translate-y-0.5"
            >
              Get started <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="text-center pt-24 pb-12 px-6">
        <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-200 mb-6 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 shrink-0" />
          30-day free trial · No credit card required
        </div>
        <h1
          className="text-4xl sm:text-5xl font-normal text-slate-800 dark:text-slate-100 mb-4"
          style={{ fontFamily: "var(--font-fraunces)" }}
        >
          Simple, transparent pricing.
        </h1>
        <p className="text-lg text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          Start free. Upgrade when your group grows.
        </p>
      </section>

      {/* ── Plan cards ───────────────────────────────────────────────────── */}
      <section className="max-w-2xl mx-auto px-6 pb-20">
        <PlanCards />
      </section>

      {/* ── Feature comparison table ─────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 pb-20">
        <div className="text-center mb-10">
          <h2
            className="text-3xl text-slate-800 dark:text-slate-100 mb-2"
            style={{ fontFamily: "var(--font-fraunces)" }}
          >
            Everything in the box
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Free covers the basics. Plus lifts every limit.
          </p>
        </div>

        <div className="glass rounded-2xl overflow-hidden overflow-x-auto">
          {/* Column headers */}
          <div className="grid grid-cols-[1fr_88px_96px] min-w-[360px] border-b border-slate-100 dark:border-slate-700/60">
            <div className="px-5 py-3.5" />
            <div className="px-3 py-3.5 text-center text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
              Free
            </div>
            <div className="px-3 py-3.5 text-center text-xs font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wide bg-violet-50/60 dark:bg-violet-950/30">
              Plus ✦
            </div>
          </div>

          {TABLE_SECTIONS.map((section) => (
            <div key={section.label}>
              {/* Section label */}
              <div className="px-5 py-2 bg-slate-50/60 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-700/60 min-w-[360px]">
                <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  {section.label}
                </p>
              </div>
              {/* Rows */}
              {section.rows.map((row, i) => (
                <div
                  key={row.feature}
                  className={`grid grid-cols-[1fr_88px_96px] min-w-[360px] border-b border-slate-100/60 dark:border-slate-700/40 last:border-0 ${
                    i % 2 === 1 ? "bg-slate-50/30 dark:bg-slate-800/20" : ""
                  }`}
                >
                  <div className="px-5 py-3 text-sm text-slate-700 dark:text-slate-200">
                    {row.feature}
                  </div>
                  <div className="px-3 py-3 flex items-center justify-center">
                    <TableCell value={row.free} />
                  </div>
                  <div className="px-3 py-3 flex items-center justify-center bg-violet-50/30 dark:bg-violet-950/10">
                    <TableCell value={row.plus} isPlus />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section className="max-w-2xl mx-auto px-6 pb-20">
        <h2
          className="text-3xl text-slate-800 dark:text-slate-100 mb-8 text-center"
          style={{ fontFamily: "var(--font-fraunces)" }}
        >
          Common questions
        </h2>
        <div className="space-y-2">
          {FAQS.map(({ q, a }) => (
            <details key={q} className="group glass rounded-xl">
              <summary className="flex items-center justify-between gap-4 px-5 py-4 cursor-pointer list-none">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{q}</span>
                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 group-open:rotate-180" />
              </summary>
              <p className="px-5 pb-4 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                {a}
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* ── Bottom CTA ───────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pb-28">
        <div
          className="relative rounded-3xl overflow-hidden px-8 py-16 text-center"
          style={{ background: "linear-gradient(135deg, #0E7490 0%, #0D9488 50%, #059669 100%)" }}
        >
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-white/10 blur-3xl" />
          <div className="relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-6 border border-white/30">
              <ClearIcon size={40} />
            </div>
            <h2
              className="text-4xl sm:text-5xl text-white mb-4"
              style={{ fontFamily: "var(--font-fraunces)" }}
            >
              Ready to get clear?
            </h2>
            <p className="text-teal-100 text-lg mb-10 max-w-sm mx-auto">
              Start your free trial today. No credit card required.
            </p>
            <Link
              href="/login?intent=signup"
              className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-teal-700 font-bold text-base py-3.5 px-10 rounded-2xl shadow-xl shadow-teal-900/30 transition-all hover:-translate-y-0.5"
            >
              Start free trial <ArrowRight className="w-4 h-4" />
            </Link>
            <p className="text-teal-200/70 text-sm mt-5">
              Google sign-in · No credit card · Takes 30 seconds
            </p>
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

function TableCell({ value, isPlus = false }: { value: string | boolean; isPlus?: boolean }) {
  if (typeof value === "boolean") {
    return value ? (
      <CheckCircle2 className={`w-4 h-4 ${isPlus ? "text-violet-500" : "text-teal-500"}`} />
    ) : (
      <Minus className="w-4 h-4 text-slate-300 dark:text-slate-600" />
    );
  }
  return (
    <span className={`text-xs font-medium text-center leading-tight ${isPlus ? "text-violet-700 dark:text-violet-300" : "text-slate-500 dark:text-slate-400"}`}>
      {value}
    </span>
  );
}
