"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Plus, MoreHorizontal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { FadeIn } from "@/components/shared/fade-in";
import { CountUp } from "@/components/shared/count-up";
import { StreamLogSheet } from "./stream-log-sheet";
import { StreamSettleSheet } from "./stream-settle-sheet";
import { StreamForgiveSheet } from "./stream-forgive-sheet";
import { StreamSpineView } from "./stream-spine-view";
import { StreamSettledCelebration } from "./stream-settled-celebration";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import type { EnrichedStreamRecord, PersonDetails } from "@/lib/db/queries/stream";

interface Props {
  records:          EnrichedStreamRecord[];
  person:           PersonDetails;
  /** Full active net (pending + confirmed + disputed). Same value shown on dashboard. */
  net:              number;
  currency:         string;
  currentUserName?: string;
}

const LAST_VISIT_KEY = (id: string) => `clear_stream_last_visit_${id}`;

export function StreamPersonPageClient({ records, person, net, currency, currentUserName }: Props) {
  const [logOpen,     setLogOpen]     = useState(false);
  const [settleOpen,  setSettleOpen]  = useState(false);
  const [forgiveOpen, setForgiveOpen] = useState(false);
  const [menuOpen,    setMenuOpen]    = useState(false);

  const [forgiveStreamId, setForgiveStreamId] = useState<string | null>(null);
  const [forgiveAmount,   setForgiveAmount]   = useState(0);
  const [forgiveNote,     setForgiveNote]     = useState<string | null>(null);
  const [forgiveAll,      setForgiveAll]      = useState(false);

  // Scroll to top + mark last visit on every person-page open
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    localStorage.setItem(LAST_VISIT_KEY(person.personId), String(Date.now()));
  }, [person.personId]);

  // ── Balance breakdown (from full `net` prop — consistent with dashboard) ──
  const confirmedNet = records
    .filter((r) => r.status === "confirmed")
    .reduce((s, r) => s + r.netAmount, 0);

  const pendingNet = records
    .filter((r) => r.status === "pending")
    .reduce((s, r) => s + r.netAmount, 0);

  const disputedAmount = records
    .filter((r) => r.status === "disputed")
    .reduce((s, r) => s + Math.abs(r.netAmount), 0);

  const hasActiveBalance = Math.abs(net) >= 0.01;
  const theyOweMe        = net > 0;
  const firstName        = person.name.split(" ")[0];
  const isAllSquare      = !hasActiveBalance && records.length > 0;

  // Build compact breakdown chips shown below the main number
  const breakdownParts: string[] = [];
  if (Math.abs(confirmedNet) >= 0.01) {
    const sign = confirmedNet > 0 ? "+" : "−";
    breakdownParts.push(`${sign}${formatCurrency(Math.abs(confirmedNet), currency)} confirmed`);
  }
  if (Math.abs(pendingNet) >= 0.01) {
    const sign = pendingNet > 0 ? "+" : "−";
    breakdownParts.push(`${sign}${formatCurrency(Math.abs(pendingNet), currency)} pending`);
  }
  if (disputedAmount >= 0.01) {
    breakdownParts.push(`⚠ ${formatCurrency(disputedAmount, currency)} disputed`);
  }

  // Only show breakdown when it's informative (i.e. the full net differs from confirmed-only)
  const showBreakdown = breakdownParts.length > 1 || disputedAmount >= 0.01;

  function openForgiveEntry(record: EnrichedStreamRecord) {
    setForgiveStreamId(record.id);
    setForgiveAmount(Math.abs(record.netAmount));
    setForgiveNote(record.note);
    setForgiveAll(false);
    setForgiveOpen(true);
  }

  function openForgiveAll() {
    setForgiveStreamId(null);
    setForgiveAmount(Math.abs(net));
    setForgiveNote(null);
    setForgiveAll(true);
    setForgiveOpen(true);
    setMenuOpen(false);
  }

  return (
    <>
      {isAllSquare && <StreamSettledCelebration personId={person.personId} />}

      {/* ── Sticky page header (mirrors GroupMobileNav pattern) ────────────── */}
      <div className="sticky top-0 z-40 -mx-6 -mt-6 mb-6 backdrop-blur-sm">
        <div className="flex items-center gap-2 px-4 py-2">
          {/* Back */}
          <Link
            href="/stream"
            className="inline-flex items-center gap-0.5 text-sm text-slate-500 dark:text-slate-400
                       hover:text-slate-700 dark:hover:text-slate-200 transition-colors
                       min-h-[44px] min-w-[44px] shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Streams</span>
          </Link>

          {/* Person name — centre */}
          <h1
            className="flex-1 text-center text-base font-semibold text-slate-800 dark:text-slate-100
                       truncate px-2"
            style={{ fontFamily: "var(--font-fraunces)" }}
          >
            {person.name}
          </h1>

          {/* [···] menu */}
          <div className="relative shrink-0">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="w-11 h-11 rounded-xl flex items-center justify-center
                         text-slate-400 hover:text-slate-600 dark:hover:text-slate-200
                         hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>

            <AnimatePresence>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.96 }}
                    transition={{ duration: 0.12 }}
                    className="absolute right-0 top-11 z-40 w-52 glass rounded-xl shadow-xl
                               border border-white/60 dark:border-slate-700/60 overflow-hidden"
                  >
                    <button
                      onClick={() => { setMenuOpen(false); setLogOpen(true); }}
                      className="w-full px-4 py-3 text-sm text-left text-slate-700 dark:text-slate-200
                                 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition-colors"
                    >
                      New entry
                    </button>
                    {hasActiveBalance && theyOweMe && (
                      <button
                        onClick={openForgiveAll}
                        className="w-full px-4 py-3 text-sm text-left text-emerald-600 dark:text-emerald-400
                                   hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition-colors
                                   border-t border-slate-100 dark:border-slate-800"
                      >
                        Forgive all outstanding 💚
                      </button>
                    )}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ── Balance hero ───────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38, ease: [0.25, 0.1, 0.25, 1] }}
        className="glass rounded-2xl px-6 py-7 text-center mb-6"
      >
        {hasActiveBalance ? (
          <>
            {/* Direction label */}
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
              {theyOweMe ? `${firstName} owes you` : `You owe ${firstName}`}
            </p>

            {/* Big number — full active net, same as dashboard */}
            <CountUp
              value={Math.abs(net)}
              currency={currency}
              maximumFractionDigits={0}
              className={cn(
                "text-5xl font-bold tabular-nums block",
                showBreakdown ? "mb-2" : "mb-4",
                theyOweMe
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-amber-600  dark:text-amber-400",
              )}
            />

            {/* Breakdown — only shown when there's useful detail */}
            {showBreakdown && (
              <div className="flex flex-wrap justify-center gap-x-2 gap-y-0.5 mb-4">
                {breakdownParts.map((part, i) => (
                  <span
                    key={i}
                    className={cn(
                      "text-xs",
                      part.startsWith("⚠")
                        ? "text-amber-500 dark:text-amber-400 font-medium"
                        : "text-slate-400 dark:text-slate-500",
                    )}
                  >
                    {part}
                  </span>
                ))}
              </div>
            )}

            <button
              onClick={() => setSettleOpen(true)}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl
                         bg-gradient-to-br from-emerald-500 to-teal-500
                         hover:from-emerald-600 hover:to-teal-600
                         text-white text-sm font-semibold transition-all
                         shadow-md shadow-emerald-500/20"
            >
              Settle Up →
            </button>
          </>
        ) : (
          <>
            <div className="text-4xl mb-3">🎉</div>
            <p
              className="text-xl text-slate-800 dark:text-slate-100"
              style={{ fontFamily: "var(--font-fraunces)" }}
            >
              All square!
            </p>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
              No open balance with {firstName}
            </p>
          </>
        )}
      </motion.div>

      {/* ── Spine view ─────────────────────────────────────────────────────── */}
      {records.length > 0 ? (
        <FadeIn>
          {/* Context line for brand-new relationships */}
          {records.length < 3 && hasActiveBalance && (
            <p className="text-xs text-slate-400 dark:text-slate-500 text-center mb-4">
              Building your history with {firstName} — swipe any entry for quick actions
            </p>
          )}
          <StreamSpineView records={records} currentUserName={currentUserName} />
        </FadeIn>
      ) : (
        <div className="flex flex-col items-center py-16 text-center">
          <p
            className="text-lg text-slate-700 dark:text-slate-300 mb-2"
            style={{ fontFamily: "var(--font-fraunces)" }}
          >
            No history with {firstName} yet
          </p>
          <p className="text-sm text-slate-400 dark:text-slate-500 mb-6">
            Add your first entry below
          </p>
        </div>
      )}

      {/* ── Log another FAB (mobile) ──────────────────────────────────────── */}
      <div className="fixed bottom-nav-safe right-4 md:hidden z-40">
        <button
          onClick={() => setLogOpen(true)}
          className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500
                     hover:from-indigo-600 hover:to-violet-600
                     shadow-lg shadow-indigo-500/30 flex items-center justify-center
                     transition-all active:scale-95"
        >
          <Plus className="w-6 h-6 text-white" />
        </button>
      </div>

      {/* Desktop log button */}
      <div className="hidden md:flex justify-center mt-4 mb-8">
        <button
          onClick={() => setLogOpen(true)}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl
                     border border-indigo-200 dark:border-indigo-800
                     text-indigo-600 dark:text-indigo-400 text-sm font-medium
                     hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Log entry
        </button>
      </div>

      {/* ── Sheets ──────────────────────────────────────────────────────────── */}
      <StreamLogSheet
        isOpen={logOpen}
        onClose={() => setLogOpen(false)}
        preselectedPerson={{ personId: person.personId, type: person.type, name: person.name }}
      />

      <StreamSettleSheet
        isOpen={settleOpen}
        onClose={() => setSettleOpen(false)}
        personName={person.name}
        counterpartId={person.personId}
        net={net}
        currency={currency}
      />

      <StreamForgiveSheet
        isOpen={forgiveOpen}
        onClose={() => setForgiveOpen(false)}
        personName={person.name}
        streamId={forgiveAll ? null : forgiveStreamId}
        amount={forgiveAmount}
        currency={currency}
        note={forgiveNote}
        counterpartId={person.personId}
      />
    </>
  );
}
