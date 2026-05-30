import Link from "next/link";
import { notFound } from "next/navigation";
import { ClearLogo } from "@/components/shared/clear-logo";
import { ConfirmStreamClient } from "@/components/stream/confirm-stream-client";
import { getStreamForConfirmPage } from "@/lib/db/queries/stream";

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
    <div className="min-h-screen flex flex-col items-center justify-center p-6 gap-8">
      {/* Clear branding */}
      <ClearLogo
        iconSize={36}
        showWordmark
        wordmarkClassName="text-2xl text-slate-800 dark:text-slate-100"
        className="flex items-center gap-2.5"
      />

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

      {/* Soft acquisition CTA — shown on all states */}
      <p className="text-center text-sm text-slate-400 dark:text-slate-500">
        Track your own debts on Clear.{" "}
        <Link
          href="/login?intent=signup"
          className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
          scroll={false}
        >
          Join for free →
        </Link>
      </p>
    </div>
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
