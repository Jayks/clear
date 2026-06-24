"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Receipt, Users, Wallet, Check, X, ArrowRight } from "lucide-react";
import type { ContextTheme } from "@/lib/theme/context-theme";

interface Props {
  groupId: string;
  memberCount: number;
  hasExpenses: boolean;
  theme: ContextTheme;
}

/**
 * NudgeArrow — themed, gently animated "tap here" affordance for a pending
 * checklist step. Plain Framer Motion `animate` (no explicit reduced-motion
 * check needed) — the app-wide `<MotionConfig reducedMotion="user">` in
 * app/layout.tsx already makes this a no-op for users with that OS setting.
 */
function NudgeArrow({ colorClass }: { colorClass: string }) {
  return (
    <motion.span
      className="shrink-0 inline-flex"
      animate={{ x: [0, 4, 0] }}
      transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
    >
      <ArrowRight className={`w-4 h-4 ${colorClass}`} />
    </motion.span>
  );
}

const ROW_CLASS = "flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm";

/**
 * ChecklistItem — done items render as a plain, non-interactive row (the
 * strikethrough already says "ignore this"; leaving it as a live, hoverable
 * link sent a mixed signal — caught via user feedback). Pending items stay a
 * real Link with the themed nudge arrow.
 */
function ChecklistItem({
  href, done, icon: Icon, label, accentClass,
}: {
  href: string;
  done: boolean;
  icon: typeof Receipt;
  label: string;
  accentClass: string;
}) {
  const content = (
    <>
      {done ? (
        <Check className="w-4 h-4 shrink-0 text-emerald-500" />
      ) : (
        <Icon className="w-4 h-4 shrink-0 text-slate-400" />
      )}
      <span className={done ? "flex-1 text-slate-400 dark:text-slate-500 line-through" : "flex-1 text-slate-600 dark:text-slate-300"}>
        {label}
      </span>
      {!done && <NudgeArrow colorClass={accentClass} />}
    </>
  );

  if (done) {
    return <div className={ROW_CLASS}>{content}</div>;
  }
  return (
    <Link href={href} className={`${ROW_CLASS} hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors`}>
      {content}
    </Link>
  );
}

/**
 * FirstRunChecklist — shown on a brand-new real group instead of a blank
 * dashboard (theme C). The parent renders this while EITHER actionable step
 * (expense logged, members added) is still outstanding — gating on just
 * "zero expenses" would hide the still-relevant "Add members" nudge the
 * moment a first expense is logged, even if no one's been added yet (caught
 * in manual testing). Each step shows its own done state independently;
 * the whole card disappears only once both are done, or can be dismissed
 * early. localStorage-gated per group, same pattern as RepeatTripPrompt.
 */
export function FirstRunChecklist({ groupId, memberCount, hasExpenses, theme }: Props) {
  // Default hidden until the localStorage check runs — avoids an SSR/client
  // mismatch flash (server always renders "unknown," same pattern as other
  // dismissable UI in this app).
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(localStorage.getItem(`clear_first_run_checklist_dismissed_${groupId}`) === "1");
  }, [groupId]);

  function handleDismiss() {
    localStorage.setItem(`clear_first_run_checklist_dismissed_${groupId}`, "1");
    setDismissed(true);
  }

  if (dismissed) return null;

  const hasMembers = memberCount > 1;

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
        Get started
      </p>

      <div className="space-y-2">
        <ChecklistItem
          href={`/groups/${groupId}/expenses/new`}
          done={hasExpenses}
          icon={Receipt}
          label="Log your first expense"
          accentClass={theme.accentText}
        />

        <ChecklistItem
          href={`/groups/${groupId}/members`}
          done={hasMembers}
          icon={Users}
          label="Add members"
          accentClass={theme.accentText}
        />

        <Link
          href={`/groups/${groupId}/settle`}
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm
                     text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300
                     transition-colors"
        >
          <Wallet className="w-4 h-4 shrink-0" />
          <span className="flex-1">Settle up once everyone&apos;s chipped in</span>
        </Link>
      </div>
    </div>
  );
}
