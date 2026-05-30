"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Plus, ChevronLeft, Search, Activity } from "lucide-react";
import { AnimatedList } from "@/components/shared/animated-list";
import { FadeIn } from "@/components/shared/fade-in";
import { CountUp } from "@/components/shared/count-up";
import { StreamPersonCard } from "./stream-person-card";
import { StreamLogSheet } from "./stream-log-sheet";
import { formatCurrency } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { MemberAvatar } from "@/components/shared/member-avatar";
import type { StreamDashboardData, ClosedPersonSummary, StreamActivityEvent } from "@/lib/db/queries/stream";

// Show search when counterpart count exceeds this threshold
const SEARCH_THRESHOLD = 6;

interface Props {
  data: StreamDashboardData;
}

export function StreamDashboardClient({ data }: Props) {
  const [logOpen,       setLogOpen]       = useState(false);
  const [personSearch,  setPersonSearch]  = useState("");

  // Mark streams as viewed — clears the nav badge
  useEffect(() => {
    localStorage.setItem("clear_stream_last_viewed", String(Date.now()));
    localStorage.removeItem("clear_stream_has_badge");
    window.dispatchEvent(new Event("stream-badge-update"));
  }, []);

  const hasNoActive =
    data.owedToMe.length === 0 &&
    data.iOwe.length === 0 &&
    data.pending.length === 0;
  const isEmpty = hasNoActive && data.recentlyClosed.length === 0;

  const totalPeople = data.owedToMe.length + data.iOwe.length;
  const showSearch  = totalPeople > SEARCH_THRESHOLD;
  const net         = data.totalOwedToMe - data.totalIOwe;

  // Filter person lists by search
  const q = personSearch.trim().toLowerCase();
  const filteredOwedToMe = useMemo(
    () => (q ? data.owedToMe.filter((p) => p.name.toLowerCase().includes(q)) : data.owedToMe),
    [data.owedToMe, q],
  );
  const filteredIOwe = useMemo(
    () => (q ? data.iOwe.filter((p) => p.name.toLowerCase().includes(q)) : data.iOwe),
    [data.iOwe, q],
  );

  return (
    <>
      {/* ── Sticky header — mirrors per-person page ───────────────────────── */}
      <div className="sticky top-0 z-40 -mx-6 -mt-6 mb-6 backdrop-blur-sm">
        <div className="flex items-center gap-2 px-4 py-2">
          {/* Back to groups */}
          <Link
            href="/groups"
            className="inline-flex items-center gap-0.5 text-sm text-slate-500 dark:text-slate-400
                       hover:text-slate-700 dark:hover:text-slate-200 transition-colors
                       min-h-[44px] min-w-[44px] shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Groups</span>
          </Link>

          {/* Centred title */}
          <h1
            className="flex-1 text-center text-base font-semibold
                       text-slate-800 dark:text-slate-100 truncate px-2"
            style={{ fontFamily: "var(--font-fraunces)" }}
          >
            Streams
          </h1>

          {/* + button */}
          <button
            onClick={() => setLogOpen(true)}
            aria-label="New entry"
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0
                       bg-gradient-to-br from-indigo-500 to-violet-500
                       hover:from-indigo-600 hover:to-violet-600
                       text-white shadow-sm shadow-indigo-500/25 transition-all
                       active:scale-95"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Empty state ───────────────────────────────────────────────────── */}
      {isEmpty && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500
                          flex items-center justify-center mb-5 shadow-lg shadow-indigo-500/25">
            <StreamIcon className="w-9 h-9 text-white" />
          </div>
          <h2
            className="text-xl text-slate-800 dark:text-slate-100 mb-2"
            style={{ fontFamily: "var(--font-fraunces)" }}
          >
            No Streams yet
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs">
            Log a quick debt — no group needed. "He paid my Uber", "I owe her lunch."
          </p>
          <button
            onClick={() => setLogOpen(true)}
            className="mt-6 inline-flex items-center gap-1.5
                       bg-gradient-to-br from-indigo-500 to-violet-500
                       hover:from-indigo-600 hover:to-violet-600
                       text-white text-sm font-medium rounded-xl px-6 py-2.5
                       shadow-md shadow-indigo-500/25 transition-all"
          >
            Log your first entry
          </button>
        </div>
      )}

      {/* ── "All square" banner ────────────────────────────────────────────── */}
      {hasNoActive && data.recentlyClosed.length > 0 && (
        <FadeIn className="mb-6">
          <div className="glass rounded-2xl px-5 py-4 flex items-center gap-3">
            <span className="text-2xl">🎉</span>
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                You&apos;re all square!
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                No open balances. Your recent history is below.
              </p>
            </div>
          </div>
        </FadeIn>
      )}

      {/* ── Net position cards ─────────────────────────────────────────────── */}
      {!hasNoActive && (
        <FadeIn>
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="glass rounded-2xl px-4 py-4 flex flex-col gap-1">
              <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
                Owed to you
              </p>
              <CountUp
                value={data.totalOwedToMe}
                currency="INR"
                maximumFractionDigits={0}
                className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400"
              />
            </div>
            <div className="glass rounded-2xl px-4 py-4 flex flex-col gap-1">
              <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
                You owe
              </p>
              <CountUp
                value={data.totalIOwe}
                currency="INR"
                maximumFractionDigits={0}
                className="text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400"
              />
            </div>
          </div>

          {Math.abs(net) >= 1 && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 text-center">
              Net:{" "}
              <span className={net > 0
                ? "font-semibold text-emerald-600 dark:text-emerald-400"
                : "font-semibold text-amber-600 dark:text-amber-400"}
              >
                {net > 0 ? "you're up" : "you're down"}{" "}
                {new Intl.NumberFormat("en-IN", {
                  style: "currency", currency: "INR", maximumFractionDigits: 0,
                }).format(Math.abs(net))}
              </span>
              {net > 0 ? " 🟢" : " 🔴"}
            </p>
          )}
        </FadeIn>
      )}

      {/* ── Search (only when > SEARCH_THRESHOLD counterparts) ─────────────── */}
      {showSearch && !isEmpty && (
        <FadeIn className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search people…"
              value={personSearch}
              onChange={(e) => setPersonSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl
                         border border-slate-200 dark:border-slate-700
                         bg-white/60 dark:bg-slate-800/60
                         text-sm text-slate-800 dark:text-slate-100
                         placeholder:text-slate-400 focus:outline-none
                         focus:ring-2 focus:ring-indigo-400/50 dark:focus:ring-indigo-600/50
                         transition"
            />
          </div>
        </FadeIn>
      )}

      {/* ── Owed to you ────────────────────────────────────────────────────── */}
      {filteredOwedToMe.length > 0 && (
        <FadeIn delay={60} className="mb-8">
          <SectionHeader icon="emerald" label="Owed to you" />
          <AnimatedList className="space-y-2">
            {filteredOwedToMe.map((p) => (
              <StreamPersonCard key={p.personId} person={p} variant="owed-to-me" />
            ))}
          </AnimatedList>
        </FadeIn>
      )}

      {/* ── You owe ─────────────────────────────────────────────────────────── */}
      {filteredIOwe.length > 0 && (
        <FadeIn delay={120} className="mb-8">
          <SectionHeader icon="amber" label="You owe" />
          <AnimatedList className="space-y-2">
            {filteredIOwe.map((p) => (
              <StreamPersonCard key={p.personId} person={p} variant="i-owe" />
            ))}
          </AnimatedList>
        </FadeIn>
      )}

      {/* No search results */}
      {showSearch && q && filteredOwedToMe.length === 0 && filteredIOwe.length === 0 && (
        <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-8">
          No results for &ldquo;{personSearch}&rdquo;
        </p>
      )}

      {/* ── Waiting for confirmation ───────────────────────────────────────── */}
      {data.pending.length > 0 && (
        <FadeIn delay={180} className="mb-8">
          <SectionHeader icon="slate" label="Waiting for confirmation" />
          <div className="space-y-2 opacity-60">
            {data.pending.map((record) => (
              <div
                key={record.id}
                className="glass-sm rounded-xl px-4 py-3 flex items-center gap-3"
              >
                <span className="text-lg">⏳</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
                    {record.counterpartName}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    {record.note || "No description"} · sent for confirmation
                  </p>
                </div>
                <p className="text-sm font-bold tabular-nums text-slate-500 dark:text-slate-400 shrink-0">
                  {new Intl.NumberFormat("en-IN", {
                    style: "currency", currency: record.currency, maximumFractionDigits: 0,
                  }).format(Math.abs(record.netAmount))}
                </p>
              </div>
            ))}
          </div>
        </FadeIn>
      )}

      {/* ── Past (recently settled/forgiven) ──────────────────────────────── */}
      {data.recentlyClosed.length > 0 && (
        <FadeIn delay={200} className="mb-8">
          <SectionHeader icon="slate" label="Past" />
          <div className="space-y-2 opacity-60">
            {data.recentlyClosed.map((p) => (
              <ClosedPersonRow key={p.personId} person={p} />
            ))}
          </div>
        </FadeIn>
      )}

      {/* ── Activity feed (last 5 events) ─────────────────────────────────── */}
      {data.recentActivity.length > 0 && (
        <FadeIn delay={240} className="mb-8">
          {/* Section header — slate, matches group activity feed */}
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800
                            flex items-center justify-center shrink-0">
              <Activity className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            </div>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Recent activity
            </span>
            <div className="flex-1 h-[1.5px] bg-gradient-to-r
                            from-slate-300/60 to-transparent
                            dark:from-slate-600/50 dark:to-transparent" />
          </div>

          <div className="space-y-1.5">
            {data.recentActivity.map((event) => (
              <ActivityRow key={event.id} event={event} />
            ))}
          </div>
        </FadeIn>
      )}

      <StreamLogSheet isOpen={logOpen} onClose={() => setLogOpen(false)} />
    </>
  );
}

// ── Activity row ──────────────────────────────────────────────────────────────

function ActivityRow({ event }: { event: StreamActivityEvent }) {
  const firstName = event.counterpartName.split(" ")[0];
  const amt       = formatCurrency(event.amount, event.currency);
  const relTime   = formatDistanceToNow(new Date(event.updatedAt), { addSuffix: true });

  // Primary text — describes what happened
  let primaryText: string;
  let secondaryText: string;
  let statusIcon: string;

  switch (event.status) {
    case "pending":
      primaryText   = event.isViewerCreator
        ? `You added an entry with ${firstName}`
        : `${firstName} added an entry with you`;
      secondaryText = `${event.note || "No description"} · ${relTime}`;
      statusIcon    = "💸";
      break;
    case "confirmed":
      primaryText   = event.isViewerCreator
        ? `${firstName} confirmed ${amt}`
        : `You confirmed ${amt} with ${firstName}`;
      secondaryText = `${event.note || "No description"} · ${relTime}`;
      statusIcon    = "✅";
      break;
    case "disputed":
      primaryText   = event.isViewerCreator
        ? `${firstName} disputed ${amt}`
        : `You disputed ${amt} with ${firstName}`;
      secondaryText = `${event.note || "No description"} · ${relTime}`;
      statusIcon    = "⚠️";
      break;
    case "settled":
      primaryText   = `Settled ${amt} with ${firstName}`;
      secondaryText = relTime;
      statusIcon    = "💚";
      break;
    case "forgiven":
      primaryText   = `You forgave ${amt} (${firstName})`;
      secondaryText = relTime;
      statusIcon    = "🤍";
      break;
    default:
      primaryText   = `Stream with ${firstName}`;
      secondaryText = relTime;
      statusIcon    = "💸";
  }

  return (
    <Link
      href={`/stream/${event.personId}`}
      className="glass-sm rounded-xl px-3 py-2.5 flex items-center gap-3
                 hover:shadow-md transition-shadow"
    >
      {/* Avatar with status badge */}
      <div className="relative shrink-0">
        <MemberAvatar name={event.counterpartName} size="sm" />
        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full
                        bg-white dark:bg-slate-900 flex items-center justify-center text-[9px]">
          {statusIcon}
        </div>
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-700 dark:text-slate-200 leading-snug truncate">
          {primaryText}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
          {secondaryText}
        </p>
      </div>

      {/* Amount */}
      <p
        className="text-sm font-semibold text-slate-800 dark:text-slate-100 tabular-nums shrink-0"
        style={{ fontFamily: "var(--font-fraunces)" }}
      >
        {formatCurrency(event.amount, event.currency)}
      </p>
    </Link>
  );
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({ icon, label }: { icon: "emerald" | "amber" | "slate"; label: string }) {
  const styles = {
    emerald: {
      badge: "bg-emerald-50 dark:bg-emerald-900/30",
      icon:  "text-emerald-600 dark:text-emerald-400",
      rule:  "from-emerald-200/70 dark:from-emerald-800/40",
    },
    amber: {
      badge: "bg-amber-50 dark:bg-amber-900/30",
      icon:  "text-amber-600 dark:text-amber-400",
      rule:  "from-amber-200/70 dark:from-amber-800/40",
    },
    slate: {
      badge: "bg-slate-100 dark:bg-slate-800",
      icon:  "text-slate-400 dark:text-slate-500",
      rule:  "from-slate-300/60 dark:from-slate-600/50",
    },
  }[icon];

  return (
    <div className="flex items-center gap-2.5 mb-3">
      <div className={`w-6 h-6 rounded-md ${styles.badge} flex items-center justify-center shrink-0`}>
        <StreamDot className={`w-2.5 h-2.5 ${styles.icon}`} />
      </div>
      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</span>
      <div className={`flex-1 h-[1.5px] bg-gradient-to-r ${styles.rule} to-transparent dark:to-transparent`} />
    </div>
  );
}

// ── Closed person row ─────────────────────────────────────────────────────────

function ClosedPersonRow({ person }: { person: ClosedPersonSummary }) {
  const dateStr = person.closedAt.toLocaleDateString("en-IN", {
    month: "short", day: "numeric",
  });

  return (
    <Link
      href={`/stream/${person.personId}`}
      className="glass-sm rounded-xl px-4 py-3 flex items-center gap-3 hover:opacity-80 transition-opacity"
    >
      <MemberAvatar name={person.name} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400 truncate">
          {person.name}
        </p>
        <p className="text-[11px] text-slate-400 dark:text-slate-500">
          {person.hadForgiven ? "💚 Forgiven" : "✓ Settled"} · {dateStr}
        </p>
      </div>
      <p className="text-xs text-slate-400 dark:text-slate-500 shrink-0">
        View history →
      </p>
    </Link>
  );
}

// ── Inline SVG icons ──────────────────────────────────────────────────────────

function StreamIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M8 3 4 7l4 4M4 7h16M16 21l4-4-4-4m4 4H4" />
    </svg>
  );
}

function StreamDot({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <circle cx="12" cy="12" r="8" />
    </svg>
  );
}
