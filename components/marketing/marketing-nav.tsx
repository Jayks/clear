import Link from "next/link";
import { ArrowRight, ChevronLeft } from "lucide-react";
import { ClearLogo } from "@/components/shared/clear-logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";

export type MarketingPage = "home" | "about" | "pricing" | "changelog";

// scroll={false} on every /login Link below — without it, Next.js scrolls to
// the {modal} slot when the intercepting /login route mounts (app/CLAUDE.md
// Login modal gotcha).

const LINKS: { page: MarketingPage; href: string; label: string; className?: string }[] = [
  { page: "about", href: "/about", label: "About App" },
  { page: "changelog", href: "/changelog", label: "What's New" },
  { page: "pricing", href: "/pricing", label: "Pricing", className: "hidden md:block" },
];

/**
 * Shared nav for every public marketing page — `/` (AboutLanding), `/about`
 * (CarouselLanding's desktop view), `/pricing`, `/changelog`. Keeps logo
 * placement and the About App / What's New / Pricing / Sign in / Get started
 * cluster identical everywhere instead of four hand-rolled navs slowly
 * drifting apart (June 2026 consistency pass).
 *
 * `current === "home"` is special-cased on mobile width: that content only
 * ever reaches a phone via the carousel's "Home" nav link (`?view=full`,
 * overriding the device check in app/page.tsx — there's otherwise no route
 * to it from a mobile UA), so its mobile nav mirrors what sent it there —
 * Pricing/Sign in/Get started, no About App/What's New tour links — and its
 * logo gets a back-chevron to plain `/`, which returns a mobile UA to the
 * carousel. Desktop's home has no such "back" (it's genuinely the homepage
 * there), so the chevron and the link-set trim are both `sm:`-gated away.
 *
 * Every other page (`about`/`pricing`/`changelog`) collapses to just the
 * chevron-back-to-`/` + `ThemeToggle` below `sm:` — About App/What's
 * New/Pricing/Sign in/Get started were all fighting for the same row as the
 * logo on a real phone width and getting clipped (June 2026). Nothing is
 * actually lost: the chevron returns to `/`, whose own mobile nav has
 * Pricing/Sign in/Get started properly sized for that width, and each page
 * has its own in-body CTA (PlanCards on `/pricing`, the hero buttons on
 * `/about`'s carousel).
 */
export function MarketingNav({ current }: { current: MarketingPage }) {
  if (current === "home") {
    return (
      <nav className="glass-nav sticky top-0 z-50">
        <div className="w-full px-4 sm:px-6 lg:px-10 h-14 flex items-center justify-between">
          <Link href="/" className="flex sm:hidden items-center gap-2 group">
            <ChevronLeft className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" />
            <ClearLogo iconSize={32} showWordmark={false} className="flex items-center gap-2.5" />
          </Link>
          <ClearLogo iconSize={32} wordmarkClassName="text-lg font-semibold text-slate-800 dark:text-slate-100" className="hidden sm:flex items-center gap-2.5" />
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Link href="/about" className="hidden sm:block text-sm font-medium text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-100/70 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white transition-all">
              About App
            </Link>
            <Link href="/changelog" className="hidden sm:block text-sm font-medium text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-100/70 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white transition-all">
              What&apos;s New
            </Link>
            <Link href="/pricing" className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 px-2 sm:px-3 py-1.5 rounded-lg hover:bg-slate-100/70 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white transition-all">
              Pricing
            </Link>
            <span className="hidden sm:block w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />
            <Link
              href="/login"
              scroll={false}
              className="inline-flex items-center text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 px-2 sm:px-4 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-white/80 dark:hover:bg-slate-800/60 hover:-translate-y-0.5 transition-all shadow-sm"
            >
              Sign in
            </Link>
            <Link
              href="/login?intent=signup"
              scroll={false}
              className="inline-flex items-center gap-1.5 bg-gradient-to-br from-[#129DB8] to-[#07788C] hover:from-[#07788C] hover:to-[#08596A] text-white text-xs sm:text-sm font-semibold py-2 px-3 sm:px-4 rounded-xl shadow-md shadow-cyan-500/20 transition-all hover:-translate-y-0.5"
            >
              Get started <ArrowRight className="w-3.5 h-3.5 hidden sm:inline" />
            </Link>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="glass-nav sticky top-0 z-50">
      <div className="w-full px-4 sm:px-6 lg:px-10 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <ChevronLeft className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" />
          <ClearLogo iconSize={32} wordmarkClassName="text-lg font-semibold text-slate-800 dark:text-slate-100" className="flex items-center gap-2.5" />
        </Link>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <div className="hidden sm:flex items-center gap-1">
            {LINKS.filter((l) => l.page !== current).map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`text-sm font-medium text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-100/70 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white transition-all ${l.className ?? ""}`}
              >
                {l.label}
              </Link>
            ))}
            <span className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />
            <Link
              href="/login"
              scroll={false}
              className="inline-flex items-center text-sm font-semibold text-slate-700 dark:text-slate-200 px-4 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-white/80 dark:hover:bg-slate-800/60 hover:-translate-y-0.5 transition-all shadow-sm"
            >
              Sign in
            </Link>
          </div>
          {/* Get started stays visible at every width, unlike the rest of the
              cluster above — it's the one action that should never need more
              than one tap, especially on pages with no fold-visible CTA of
              their own (changelog's "Get started free" sits after every
              release note; pricing's plan cards are better, but consistency
              matters more than relying on each page's own layout). */}
          <Link
            href="/login?intent=signup"
            scroll={false}
            className="inline-flex items-center gap-1.5 bg-gradient-to-br from-[#129DB8] to-[#07788C] hover:from-[#07788C] hover:to-[#08596A] text-white text-xs sm:text-sm font-semibold py-2 px-3 sm:px-4 rounded-xl shadow-md shadow-cyan-500/20 transition-all hover:-translate-y-0.5"
          >
            Get started <ArrowRight className="w-3.5 h-3.5 hidden sm:inline" />
          </Link>
        </div>
      </div>
    </nav>
  );
}
