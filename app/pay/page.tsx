import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDefaultUpiId } from "@/lib/db/queries/upi";
import { ClearLogo } from "@/components/shared/clear-logo";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { PayClient } from "./pay-client";

/**
 * React cache() deduplicates this call within a single render pass —
 * generateMetadata and PayPage both call it with the same userId,
 * so only ONE Admin API round-trip is made per request.
 */
const getPayeeUser = cache(async (userId: string) => {
  try {
    const { data, error } = await createAdminClient().auth.admin.getUserById(userId);
    if (error || !data.user) return null;
    return data.user;
  } catch {
    return null;
  }
});

interface PageProps {
  searchParams: Promise<{
    to?: string;
    am?: string;
    cu?: string;
    tn?: string;
    ref?: string;
  }>;
}

// ── Metadata (OG + Twitter card) ────────────────────────────────────────────

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams;
  const amount      = params.am ? Number(params.am) : 0;
  const currency    = params.cu ?? "INR";
  const contextName = params.tn ?? "";

  let payeeName = "Someone";
  if (params.to) {
    const user = await getPayeeUser(params.to);
    payeeName = (user?.user_metadata?.full_name as string | undefined) ?? payeeName;
  }

  const sym   = currency === "INR" ? "₹" : currency;
  const title = `${sym}${Number(amount).toLocaleString("en-IN")} payment request`;
  const desc  = contextName
    ? `${payeeName} is requesting ${sym}${Number(amount).toLocaleString("en-IN")} for ${contextName}`
    : `${payeeName} is requesting ${sym}${Number(amount).toLocaleString("en-IN")} via Clear`;

  // Explicit OG image URL so WhatsApp/Telegram get the payment params.
  // opengraph-image.tsx receives these as searchParams in production.
  // In Turbopack dev, searchParams isn't passed — the image falls back to defaults.
  const appUrl    = process.env.NEXT_PUBLIC_APP_URL ?? "https://getclear.app";
  const ogImgUrl  = new URL("/pay/opengraph-image", appUrl);
  if (params.to) ogImgUrl.searchParams.set("to", params.to);
  if (params.am) ogImgUrl.searchParams.set("am", params.am);
  if (params.cu) ogImgUrl.searchParams.set("cu", params.cu);
  if (params.tn) ogImgUrl.searchParams.set("tn", params.tn);

  return {
    title,
    description: desc,
    openGraph: {
      title,
      description: desc,
      images: [{ url: ogImgUrl.toString(), width: 1200, height: 630 }],
    },
    twitter: {
      card:        "summary_large_image",
      title,
      description: desc,
      images:      [ogImgUrl.toString()],
    },
  };
}

// ── Page ────────────────────────────────────────────────────────────────────

export default async function PayPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const userId = params.to;
  if (!userId) notFound();

  const amount      = params.am ? Number(params.am) : 0;
  const currency    = params.cu ?? "INR";
  const contextName = params.tn ?? "";
  const refGroupId  = params.ref;

  // ── Fetch payee identity — deduplicated with generateMetadata via cache() ──
  const payeeUser = await getPayeeUser(userId);
  if (!payeeUser) notFound();

  const payeeName =
    (payeeUser.user_metadata?.full_name as string | undefined) ?? "Clear User";

  // ── Fetch payee's default UPI ID ──────────────────────────────────────
  const defaultUpiId = await getDefaultUpiId(userId);

  const sym     = currency === "INR" ? "₹" : currency;
  const backUrl = refGroupId ? `/groups/${refGroupId}/settle` : "/groups";
  const appUrl  = process.env.NEXT_PUBLIC_APP_URL ?? "https://getclear.app";

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-cyan-50/30 dark:from-slate-950 dark:to-slate-900">

      {/* ── Top nav ────────────────────────────────────────────────────── */}
      <nav className="flex items-center justify-between px-5 py-4 border-b border-slate-100/80 dark:border-slate-800/60">
        <Link href="/">
          <ClearLogo iconSize={26} showWordmark />
        </Link>
        <Link
          href="/login"
          className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
        >
          Sign in →
        </Link>
      </nav>

      {/* ── Main ───────────────────────────────────────────────────────── */}
      <main className="flex-1 flex items-start justify-center px-4 pt-10 pb-16">
        <div className="w-full max-w-sm space-y-4">

          {/* ── Payee + amount card ─────────────────────────────────────── */}
          <div className="glass rounded-2xl p-6 text-center space-y-4">
            {/* Avatar */}
            <div className="flex justify-center">
              <MemberAvatar name={payeeName} size="lg" />
            </div>

            {/* Name + verified badge */}
            <div>
              <p className="font-semibold text-slate-800 dark:text-slate-100">
                {payeeName}
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                ✓ Verified Clear user
              </p>
            </div>

            {/* Divider */}
            <div className="h-px bg-slate-100 dark:bg-slate-700/60" />

            {/* Amount */}
            <div>
              <p
                className="text-5xl font-bold text-slate-900 dark:text-slate-50 tracking-tight"
                style={{ fontFamily: "var(--font-fraunces)" }}
              >
                {sym}{Number(amount).toLocaleString("en-IN")}
              </p>
              {contextName && (
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">
                  for <span className="font-medium text-slate-600 dark:text-slate-300">{contextName}</span>
                </p>
              )}
            </div>
          </div>

          {/* ── Payment actions (client) ────────────────────────────────── */}
          <PayClient
            payeeName={payeeName}
            vpa={defaultUpiId?.upiId ?? null}
            amount={amount}
            currency={currency}
            contextName={contextName || "Clear"}
            backUrl={backUrl}
            appUrl={appUrl}
          />

          {/* ── Footer ──────────────────────────────────────────────────── */}
          <p className="text-center text-[11px] text-slate-400 dark:text-slate-600 pt-2">
            Powered by{" "}
            <Link href="/" className="text-cyan-600 dark:text-cyan-500 hover:underline">
              Clear
            </Link>{" "}
            — group expense tracking
          </p>
        </div>
      </main>
    </div>
  );
}
