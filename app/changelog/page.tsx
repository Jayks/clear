import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ChevronLeft } from "lucide-react";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { ClearLogo } from "@/components/shared/clear-logo";
import { FadeIn } from "@/components/shared/fade-in";
import { changelog, type ChangelogRelease, type TagVariant } from "@/lib/changelog";

export const metadata: Metadata = { title: "What's New — Clear" };

// ── TagChip — complete class strings per variant (no dynamic interpolation) ──
const TAG_CLASSES: Record<TagVariant, string> = {
  cyan: "bg-cyan-50 dark:bg-cyan-950/30 text-cyan-600 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800",
  violet: "bg-violet-50 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-800",
  emerald: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800",
  amber: "bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50",
  slate: "bg-slate-100 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700",
};

function TagChip({ tag, variant }: { tag: string; variant: TagVariant }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide ${TAG_CLASSES[variant]}`}>
      {tag}
    </span>
  );
}

function ReleaseCard({ release, index }: { release: ChangelogRelease; index: number }) {
  return (
    <FadeIn delay={index * 60} direction="up">
      <div className="flex gap-5 sm:gap-7">

        {/* Timeline dot — version circle */}
        <div className="hidden sm:flex flex-col items-center shrink-0">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white text-[10px] font-bold z-10 shadow-md shrink-0"
            style={{ background: "linear-gradient(135deg, #06B6D4 0%, #0891B2 50%, #0D9488 100%)" }}
          >
            {release.version}
          </div>
        </div>

        {/* Card */}
        <div className="glass rounded-2xl p-5 sm:p-6 flex-1 min-w-0">
          {/* Header */}
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-3">
            <span
              className="text-lg font-bold text-slate-800 dark:text-slate-100 shrink-0"
              style={{ fontFamily: "var(--font-fraunces)" }}
            >
              {release.version}
            </span>
            <span
              className="text-lg font-normal text-slate-600 dark:text-slate-300"
              style={{ fontFamily: "var(--font-fraunces)" }}
            >
              {release.name}
            </span>
            <span className="flex-1" />
            <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0">{release.date}</span>
            <TagChip tag={release.tag} variant={release.tagVariant} />
          </div>

          {/* Headline + description */}
          <p className="font-semibold text-slate-700 dark:text-slate-200 text-sm mb-1.5">
            {release.headline}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
            {release.description}
          </p>

          {/* Feature grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {release.features.map((feature) => (
              <div
                key={feature.title}
                className="glass-sm rounded-xl px-3.5 py-3"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base leading-none">{feature.icon}</span>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    {feature.title}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </FadeIn>
  );
}

export default function ChangelogPage() {
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
      <section className="text-center pt-20 pb-12 px-6">
        <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-200 mb-6 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-br from-cyan-500 to-teal-500 shrink-0" />
          Built fast · Shipped often
        </div>
        <h1
          className="text-4xl sm:text-5xl font-normal text-slate-800 dark:text-slate-100 mb-4"
          style={{ fontFamily: "var(--font-fraunces)" }}
        >
          What&apos;s New in Clear
        </h1>
        <p className="text-lg text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          Everything shipped since day one — from the core splitting engine to the full social layer.
        </p>
      </section>

      {/* ── Timeline ─────────────────────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 pb-24">
        {/* Vertical gradient line — desktop only */}
        <div className="relative">
          <div
            className="absolute top-5 hidden sm:block w-px"
            style={{
              left: "19px",
              bottom: "40px",
              background: "linear-gradient(to bottom, #06B6D4, #0D9488, transparent)",
            }}
          />

          <div className="space-y-10">
            {changelog.map((release, index) => (
              <ReleaseCard key={release.id} release={release} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer CTA ───────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="glass rounded-2xl p-8 text-center">
          <p
            className="text-2xl text-slate-800 dark:text-slate-100 mb-2"
            style={{ fontFamily: "var(--font-fraunces)" }}
          >
            Start using Clear today
          </p>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
            30-day free trial · No credit card required · Google sign-in
          </p>
          <Link
            href="/login?intent=signup"
            className="inline-flex items-center gap-2 bg-gradient-to-br from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white font-semibold py-3 px-8 rounded-xl shadow-md shadow-cyan-500/20 transition-all hover:-translate-y-0.5"
          >
            Get started free <ArrowRight className="w-4 h-4" />
          </Link>
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
            <Link href="/pricing" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">Pricing</Link>
            <Link href="/terms" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">Privacy</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
