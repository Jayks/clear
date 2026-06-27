"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Users, Wallet, Check, X, ArrowRight } from "lucide-react";
import { ONBOARDING_KEYS } from "@/lib/onboarding-keys";

interface Props {
  groupId: string;
  isAdmin: boolean;
  memberCount: number;
  /** Any member has contributed (controls admin item 2 done-state + show-condition). */
  hasContributions: boolean;
  /** THIS member has contributed (controls member item 1 done-state). */
  currentMemberHasContributed: boolean;
}

/** Animated nudge arrow — same pattern as FirstRunChecklist. */
function NudgeArrow() {
  return (
    <motion.span
      className="shrink-0 inline-flex"
      animate={{ x: [0, 4, 0] }}
      transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
    >
      <ArrowRight className="w-4 h-4 text-violet-400 dark:text-violet-500" />
    </motion.span>
  );
}

const ROW_CLASS =
  "flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm";

interface ChecklistItemProps {
  href?: string;
  done: boolean;
  icon: typeof Users;
  label: string;
  onClick?: () => void;
}

function ChecklistItem({ href, done, icon: Icon, label, onClick }: ChecklistItemProps) {
  const content = (
    <>
      {done ? (
        <Check className="w-4 h-4 shrink-0 text-emerald-500" />
      ) : (
        <Icon className="w-4 h-4 shrink-0 text-slate-400" />
      )}
      <span
        className={
          done
            ? "flex-1 text-slate-400 dark:text-slate-500 line-through"
            : "flex-1 text-slate-600 dark:text-slate-300"
        }
      >
        {label}
      </span>
      {!done && <NudgeArrow />}
    </>
  );

  if (done) return <div className={ROW_CLASS}>{content}</div>;

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${ROW_CLASS} w-full text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors`}
      >
        {content}
      </button>
    );
  }

  if (href) {
    return (
      <Link
        href={href}
        className={`${ROW_CLASS} hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors`}
      >
        {content}
      </Link>
    );
  }

  return <div className={ROW_CLASS}>{content}</div>;
}

/**
 * CircleFirstRun — shown on a brand-new Circle (0 contributions, ≤2 members).
 * Mutually exclusive with CircleOrientationBanner: the parent renders one or
 * the other, never both.
 */
export function CircleFirstRun({
  groupId,
  isAdmin,
  memberCount,
  hasContributions,
  currentMemberHasContributed,
}: Props) {
  // Server renders null to avoid SSR/client mismatch flash.
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const already =
      localStorage.getItem(ONBOARDING_KEYS.CIRCLE_FIRST_RUN(groupId)) === "1";
    if (!already) setDismissed(false);
  }, [groupId]);

  function handleDismiss() {
    localStorage.setItem(ONBOARDING_KEYS.CIRCLE_FIRST_RUN(groupId), "1");
    setDismissed(true);
  }

  if (dismissed) return null;

  const hasMembers = memberCount > 2; // creator + at least 1 other non-ghost member

  function scrollToRoster() {
    const roster = document.getElementById("contribution-roster");
    if (roster) roster.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="glass rounded-2xl p-4 mb-6 relative">
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss"
        className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center
                   text-slate-400 hover:text-slate-600 dark:hover:text-slate-200
                   hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3 pr-8">
        {isAdmin ? "Get started with your Circle" : "Get started"}
      </p>

      <div className="space-y-2">
        {isAdmin ? (
          <>
            {/* Item 1: Add members */}
            <ChecklistItem
              href={`/groups/${groupId}/members`}
              done={hasMembers}
              icon={Users}
              label="Add members"
            />

            {/* Item 2: Record first contribution — scrolls to roster, no href */}
            <ChecklistItem
              done={hasContributions}
              icon={Wallet}
              label="Record first contribution"
              onClick={scrollToRoster}
            />

            {/* Item 3: Informational, no done-state */}
            <Link
              href={`/groups/${groupId}/expenses`}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm
                         text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300
                         transition-colors"
            >
              <Wallet className="w-4 h-4 shrink-0" />
              <span className="flex-1">Track wallet expenses when you draw from the pot</span>
            </Link>
          </>
        ) : (
          <>
            {/* Member item 1: Record your contribution */}
            <ChecklistItem
              done={currentMemberHasContributed}
              icon={Wallet}
              label="Record your contribution"
              onClick={scrollToRoster}
            />

            {/* Item 2: Informational — no link, no done-state */}
            <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-slate-400 dark:text-slate-500">
              <Check className="w-4 h-4 shrink-0 opacity-40" />
              <span className="flex-1">The admin will confirm your payment</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
