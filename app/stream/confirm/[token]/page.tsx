import { notFound } from "next/navigation";
import { ConfirmStreamClient } from "@/components/stream/confirm-stream-client";
import { getStreamForConfirmPage } from "@/lib/db/queries/stream";
import { BRAND } from "@/lib/brand";
import { PublicPageShell } from "@/components/shared/public-page-shell";

// UUID format validation — avoids a DB round-trip on obviously invalid tokens
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface Props {
  params: Promise<{ token: string }>;
}

export default async function ConfirmStreamPage({ params }: Props) {
  const { token } = await params;

  if (!UUID_RE.test(token)) notFound();

  const data = await getStreamForConfirmPage(token);

  return (
    <PublicPageShell
      footerText={`Track your own debts on ${BRAND.name}.`}
      footerCtaHref="/login?intent=signup"
      footerCtaLabel="Join for free →"
    >
      {/* Main card */}
      <div className="glass rounded-2xl w-full max-w-sm p-6">
        {/* ── Token not found ──────────────────────────────────────────────── */}
        {!data && (
          <StaticState
            emoji="🔗"
            title="Link not found"
            body="This confirmation link doesn't exist or has already been used."
          />
        )}

        {/* ── Link expired ─────────────────────────────────────────────────── */}
        {data?.isExpired && (
          <StaticState
            emoji="⌛"
            title="Link has expired"
            body={`Confirmation links are valid for 48 hours. Ask ${data.creatorName.split(" ")[0]} to send a new one.`}
          />
        )}

        {/* ── Already resolved ─────────────────────────────────────────────── */}
        {data && !data.isExpired && data.isAlreadyResolved && (
          <StaticState
            emoji={data.record.status === "disputed" ? "⚠️" : "✅"}
            title={
              data.record.status === "confirmed" ? "Already confirmed" :
              data.record.status === "disputed"  ? "Already disputed"  :
              data.record.status === "settled"   ? "Already settled"   :
              "Already resolved"
            }
            body="No action needed."
          />
        )}

        {/* ── Active — interactive confirm flow ────────────────────────────── */}
        {data && !data.isExpired && !data.isAlreadyResolved && (
          <ConfirmStreamClient
            token={token}
            amount={Number(data.record.amount)}
            currency={data.record.currency}
            note={data.record.note}
            creatorName={data.creatorName}
            createdAt={data.record.createdAt}
          />
        )}
      </div>
    </PublicPageShell>
  );
}

// ── Static state card (no JS needed) ─────────────────────────────────────────

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
