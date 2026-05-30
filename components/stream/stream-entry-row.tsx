import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { EnrichedStreamRecord } from "@/lib/db/queries/stream";

interface Props {
  record: EnrichedStreamRecord;
  /** When provided and viewer is creditor, shows a Forgive action button. */
  onForgive?: (streamId: string) => void;
}

// ── Emoji inference from note text ───────────────────────────────────────────

function getEmoji(note: string | null): string {
  if (!note) return "💸";
  const n = note.toLowerCase();
  if (/food|dinner|lunch|breakfast|restaurant|biryani|pizza|eat/.test(n)) return "🍽️";
  if (/uber|ola|cab|auto|taxi|rickshaw|transport|ride/.test(n))            return "🚗";
  if (/coffee|chai|tea|café|cafe/.test(n))                                 return "☕";
  if (/grocer|kirana|vegetable|sabzi|market/.test(n))                      return "🛒";
  if (/movie|film|cinema|show|ticket/.test(n))                             return "🎬";
  if (/petrol|fuel|gas/.test(n))                                           return "⛽";
  if (/medicine|medical|doctor|hospital|pharmacy/.test(n))                 return "💊";
  if (/rent|flat|room|pg|hostel|house/.test(n))                            return "🏠";
  if (/recharge|phone|mobile|internet|wifi/.test(n))                       return "📱";
  return "💸";
}

// ── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  if (status === "confirmed") {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-medium
                       text-emerald-600 dark:text-emerald-400">
        ✓ Confirmed
      </span>
    );
  }
  if (status === "disputed") {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-medium
                       bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-500
                       px-1.5 py-0.5 rounded-full">
        ⚠ Disputed
      </span>
    );
  }
  if (status === "settled") {
    return (
      <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
        ✓ Settled
      </span>
    );
  }
  if (status === "forgiven") {
    return (
      <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
        💚 Forgiven
      </span>
    );
  }
  // pending
  return (
    <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
      ⏳ Pending
    </span>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function StreamEntryRow({ record, onForgive }: Props) {
  const isForgiven  = record.status === "forgiven";
  const isSettled   = record.status === "settled";
  const isMuted     = isForgiven || isSettled;
  const owedToViewer = record.netAmount > 0;

  const date = new Date(record.createdAt).toLocaleDateString("en-IN", {
    month: "short",
    day:   "numeric",
  });

  return (
    <div
      className={cn(
        "glass-sm rounded-xl px-4 py-3 flex items-center gap-3 transition-opacity",
        isMuted && "opacity-50",
      )}
    >
      {/* Emoji + date */}
      <div className="flex flex-col items-center gap-0.5 w-10 shrink-0">
        <span className="text-lg leading-none">{getEmoji(record.note)}</span>
        <span className="text-[10px] text-slate-400 dark:text-slate-500 tabular-nums">
          {date}
        </span>
      </div>

      {/* Description + status */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm font-medium truncate",
            isMuted
              ? "text-slate-400 dark:text-slate-500 line-through"
              : "text-slate-700 dark:text-slate-200",
          )}
        >
          {record.note || "No description"}
        </p>
        <StatusBadge status={record.status} />
      </div>

      {/* Amount + optional forgive */}
      <div className="flex flex-col items-end gap-1 shrink-0">
        <p
          className={cn(
            "text-sm font-bold tabular-nums",
            isMuted
              ? "text-slate-400 dark:text-slate-500"
              : owedToViewer
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-amber-600 dark:text-amber-400",
          )}
        >
          {owedToViewer ? "+" : "−"}
          {formatCurrency(Math.abs(record.netAmount), record.currency)}
        </p>
        {/* Forgive action — only for creditor on active (non-closed) entries */}
        {onForgive && owedToViewer && !isMuted && record.status !== "settled" && (
          <button
            onClick={(e) => { e.stopPropagation(); onForgive(record.id); }}
            className="text-[10px] font-medium text-slate-400 dark:text-slate-500
                       hover:text-emerald-500 dark:hover:text-emerald-400
                       transition-colors leading-none"
          >
            Forgive
          </button>
        )}
      </div>
    </div>
  );
}
