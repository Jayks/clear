"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeftRight, ChevronRight, Plus } from "lucide-react";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { StreamLogSheet } from "./stream-log-sheet";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { StreamSummaryData, PersonSummary } from "@/lib/db/queries/stream";

interface Props {
  summary: StreamSummaryData;
}

export function StreamSummaryStripClient({ summary }: Props) {
  const [logOpen, setLogOpen] = useState(false);
  const hasActive  = summary.topRecords.length > 0;
  const hasHistory = summary.hasAnyHistory;

  return (
    <>
      <div className="mb-5">
        {/* ── Section header ───────────────────────────────────────────────── */}
        <div className="flex items-center gap-2.5 mb-2.5">
          <div className="w-6 h-6 rounded-md bg-indigo-50 dark:bg-indigo-900/30
                          flex items-center justify-center shrink-0">
            <ArrowLeftRight className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Streams
          </span>
          <div className="flex-1 h-[1.5px] bg-gradient-to-r
                          from-indigo-200/70 to-transparent
                          dark:from-indigo-800/40 dark:to-transparent" />

          {/* + icon — log a new entry */}
          <button
            onClick={() => setLogOpen(true)}
            aria-label="Log entry"
            className="w-6 h-6 rounded-md flex items-center justify-center shrink-0
                       text-indigo-600 dark:text-indigo-400
                       hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>

          {/* See all link */}
          {(hasActive || hasHistory) && (
            <Link
              href="/stream"
              className="text-xs font-medium text-slate-400 dark:text-slate-500
                         hover:text-indigo-500 dark:hover:text-indigo-400
                         transition-colors pl-1 min-h-[44px] md:min-h-0 flex items-center"
            >
              See all →
            </Link>
          )}
        </div>

        {/* ── State: fresh (no history at all) ──────────────────────────────── */}
        {!hasActive && !hasHistory && (
          <div className="glass rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500
                            flex items-center justify-center shrink-0">
              <ArrowLeftRight className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                No group needed
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Log informal debts — "he covered my Uber", "I owe her lunch"
              </p>
            </div>
            <button
              onClick={() => setLogOpen(true)}
              className="shrink-0 text-xs font-semibold text-indigo-600 dark:text-indigo-400
                         hover:underline min-h-[44px] md:min-h-0 flex items-center"
            >
              Try it →
            </button>
          </div>
        )}

        {/* ── State: all clear (has history, no active) ─────────────────────── */}
        {!hasActive && hasHistory && (
          <Link
            href="/stream"
            className="glass rounded-xl px-4 py-3 flex items-center gap-3
                       hover:shadow-md transition-all"
          >
            <span className="text-xl shrink-0">🎉</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                You&apos;re all square!
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                No open balances — tap to view history
              </p>
            </div>
            <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0">→</span>
          </Link>
        )}

        {/* ── State: active streams — compact vertical list ─────────────────── */}
        {hasActive && (
          <div className="space-y-0.5">
            {summary.topRecords.slice(0, 3).map((record) => (
              <CompactPersonRow key={record.personId} record={record} />
            ))}
            {summary.hasMore && (
              <Link
                href="/stream"
                className="block text-center text-xs text-slate-400 dark:text-slate-500
                           hover:text-indigo-500 dark:hover:text-indigo-400
                           transition-colors py-1.5"
              >
                +{summary.moreCount} more
              </Link>
            )}
          </div>
        )}
      </div>

      <StreamLogSheet isOpen={logOpen} onClose={() => setLogOpen(false)} />
    </>
  );
}

// ── Compact person row ────────────────────────────────────────────────────────

function CompactPersonRow({ record }: { record: PersonSummary }) {
  const owesMe    = record.net > 0;
  const amountStr = formatCurrency(Math.abs(record.net), record.currency);

  return (
    <Link
      href={`/stream/${record.personId}`}
      className="flex items-center gap-3 px-3 py-2 rounded-xl
                 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20
                 transition-colors group"
    >
      <MemberAvatar name={record.name} size="sm" className="shrink-0" />

      {/* Name */}
      <span className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
        {record.name}
      </span>

      {/* Amount */}
      <span
        className={cn(
          "text-sm font-bold tabular-nums shrink-0",
          owesMe
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-amber-600  dark:text-amber-400",
        )}
      >
        {owesMe ? "+" : "−"}{amountStr}
      </span>

      <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0
                               group-hover:text-indigo-400 dark:group-hover:text-indigo-500
                               transition-colors" />
    </Link>
  );
}
