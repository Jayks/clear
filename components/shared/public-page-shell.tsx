import Link from "next/link";
import { ClearLogo } from "@/components/shared/clear-logo";

/**
 * Shared shell for public, unauthenticated "someone is asking you to do
 * something" pages — /pay, /request/[token], /stream/confirm/[token].
 *
 * These three used to each hand-roll their own chrome (a full top nav +
 * gradient background on /pay vs a centered logo + plain background on the
 * other two) despite being the same conceptual moment for a visitor: land,
 * see what's being asked, act. Unifying the chrome here means the payment/
 * confirmation mechanics inside `children` can keep differing per page
 * (they genuinely do — UPI return-detection vs self-report vs confirm/dispute)
 * without the page *feeling* like three different products.
 *
 * Deliberately does NOT wrap the logo in a `<Link>` — matches the two pages
 * this pattern was extracted from; a payer mid-task shouldn't have an easy
 * accidental way to navigate away from the one thing they came to do.
 */
interface Props {
  children: React.ReactNode;
  /** Soft acquisition line shown below the card, e.g. "Track shared expenses on ClearOff." */
  footerText?: string;
  footerCtaHref?: string;
  footerCtaLabel?: string;
}

export function PublicPageShell({ children, footerText, footerCtaHref, footerCtaLabel }: Props) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 gap-8">
      <ClearLogo
        iconSize={36}
        showWordmark
        wordmarkClassName="text-2xl text-slate-800 dark:text-slate-100"
        className="flex items-center gap-2.5"
      />

      {children}

      {footerText && (
        <p className="text-center text-sm text-slate-400 dark:text-slate-500">
          {footerText}{" "}
          {footerCtaHref && footerCtaLabel && (
            <Link
              href={footerCtaHref}
              className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
              scroll={false}
            >
              {footerCtaLabel}
            </Link>
          )}
        </p>
      )}
    </div>
  );
}
