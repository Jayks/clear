import { notFound } from "next/navigation";
import { RequestClient } from "./request-client";
import { getPaymentRequestByToken } from "@/lib/db/queries/payment-requests";
import { BRAND } from "@/lib/brand";
import { PublicPageShell } from "@/components/shared/public-page-shell";

// UUID format validation — avoids a DB round-trip on obviously invalid tokens
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface Props {
  params: Promise<{ token: string }>;
}

export default async function RequestPage({ params }: Props) {
  const { token } = await params;

  if (!UUID_RE.test(token)) notFound();

  const data = await getPaymentRequestByToken(token);

  return (
    <PublicPageShell
      footerText={`Track shared expenses on ${BRAND.name}.`}
      footerCtaHref="/login?intent=signup"
      footerCtaLabel="Join for free →"
    >
      {/* Main card */}
      <div className="glass rounded-2xl w-full max-w-sm p-6">

        {/* ── Token not found ─────────────────────────────────────────────── */}
        {!data && (
          <StaticState
            emoji="🔗"
            title="Link not found"
            body="This payment link doesn't exist or has already been used."
          />
        )}

        {/* ── Link expired ────────────────────────────────────────────────── */}
        {data?.isExpired && (
          <StaticState
            emoji="⌛"
            title="Link expired"
            body={`Ask ${data.row.payeeName.split(" ")[0]} to send a new payment link.`}
          />
        )}

        {/* ── Self-reported: waiting for admin confirmation ────────────────── */}
        {data && !data.isExpired && data.isSelfReported && (
          <StaticState
            emoji="⏳"
            title="Got it!"
            body={`Waiting for ${data.row.payeeName.split(" ")[0]} to confirm your payment.`}
          />
        )}

        {/* ── Already resolved ────────────────────────────────────────────── */}
        {data && !data.isExpired && !data.isSelfReported && data.isResolved && (
          <StaticState
            emoji="✅"
            title="No action needed"
            body="This payment has already been recorded."
          />
        )}

        {/* ── Active — full payment UI ─────────────────────────────────────── */}
        {data && !data.isExpired && !data.isSelfReported && !data.isResolved && (
          <RequestClient
            token={token}
            payerName={data.row.payerName}
            payeeName={data.row.payeeName}
            payeeUpiId={data.row.payeeUpiId ?? null}
            amount={data.row.amount !== null ? Number(data.row.amount) : null}
            currency={data.row.currency}
            description={data.row.description ?? null}
            groupName={data.row.groupName}
            contextType={data.row.contextType as "circle" | "trip" | "nest"}
          />
        )}
      </div>
    </PublicPageShell>
  );
}

// ── Static state card (no JS needed) ──────────────────────────────────────────

function StaticState({
  emoji,
  title,
  body,
}: {
  emoji: string;
  title: string;
  body: string;
}) {
  return (
    <div className="text-center py-4 space-y-3">
      <span className="text-4xl block">{emoji}</span>
      <h2
        className="text-xl text-slate-800 dark:text-slate-100"
        style={{ fontFamily: "var(--font-fraunces)" }}
      >
        {title}
      </h2>
      <p className="text-sm text-slate-500 dark:text-slate-400">{body}</p>
    </div>
  );
}
