import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { ClearLogo } from "@/components/shared/clear-logo";
import { BRAND } from "@/lib/brand";

/**
 * Shared chrome for the legal/compliance pages (Terms, Privacy, Refund,
 * Contact) — Razorpay's live-mode website check looks for exactly these
 * pages to be publicly reachable. Nav + footer mirror app/about and
 * app/pricing's pattern so the marketing site reads as one consistent site.
 */
export function LegalPageShell({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <div className="overflow-x-clip min-h-screen">
      <nav className="glass-nav sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <ChevronLeft className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" />
            <ClearLogo
              iconSize={32}
              wordmarkClassName="text-lg font-semibold text-slate-800 dark:text-slate-100"
              className="flex items-center gap-2.5"
            />
          </Link>
          <ThemeToggle />
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-12 sm:py-16">
        <h1
          className="text-3xl sm:text-4xl font-semibold text-slate-800 dark:text-slate-100 mb-2"
          style={{ fontFamily: "var(--font-fraunces)" }}
        >
          {title}
        </h1>
        <p className="text-sm text-slate-400 dark:text-slate-500 mb-10">Last updated {updated}</p>

        <div className="prose-legal text-sm sm:text-[15px] leading-relaxed text-slate-600 dark:text-slate-300 [&_h2]:text-lg [&_h2]:sm:text-xl [&_h2]:font-semibold [&_h2]:text-slate-800 [&_h2]:dark:text-slate-100 [&_h2]:mt-10 [&_h2]:mb-3 [&_p]:mb-4 [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_li]:leading-relaxed [&_strong]:text-slate-700 [&_strong]:dark:text-slate-200 [&_a]:text-cyan-600 [&_a]:dark:text-cyan-400 [&_a]:underline [&_a]:hover:text-cyan-700">
          {children}
        </div>
      </main>

      <footer className="border-t border-white/40 dark:border-slate-700/40 bg-white/20 dark:bg-slate-900/20 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <ClearLogo
              iconSize={28}
              wordmarkClassName="text-sm font-semibold text-slate-700 dark:text-slate-200"
              className="flex items-center gap-2"
            />
            <span className="text-slate-300 dark:text-slate-600">·</span>
            <span className="text-xs text-slate-400 dark:text-slate-500">{BRAND.tagline}</span>
          </div>
          <div className="flex items-center gap-5 text-xs text-slate-400 dark:text-slate-500">
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
