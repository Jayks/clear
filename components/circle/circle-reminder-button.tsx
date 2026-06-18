"use client";

import { useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { generatePaymentRequest } from "@/app/actions/payment-requests";
import { CircleReminderSheet } from "./circle-reminder-sheet";

/** A member who hasn't paid yet. isGuest=true → generate a /request/[token] link. */
export interface PendingMemberInput {
  id:      string;   // group_members.id
  name:    string;
  isGuest: boolean;
}

interface Props {
  groupId:        string;
  groupName:      string;
  circleName:     string;
  periodLabel:    string | null;
  paidCount:      number;
  totalCount:     number;
  pendingMembers: PendingMemberInput[];
  amount:         number | null;
  currency:       string;
  upiId:          string | null;
  joinUrl:        string;
  circlePeriod:   string | null;
  isOneTime?:     boolean;
}

export function CircleReminderButton({
  groupId, groupName, circleName, periodLabel,
  paidCount, totalCount, pendingMembers,
  amount, currency, upiId, joinUrl, circlePeriod, isOneTime,
}: Props) {
  const [open,       setOpen]       = useState(false);
  const [generating, setGenerating] = useState(false);

  // Ghost members with generated tokens (populated once on first click)
  const [ghostTokens, setGhostTokens] = useState<
    { name: string; token: string }[]
  >([]);

  const hoverBorder = isOneTime
    ? "hover:border-amber-300 dark:hover:border-amber-600"
    : "hover:border-violet-300 dark:hover:border-violet-600";

  async function handleClick() {
    // Separate ghosts (need payment tokens) from Clear users (no token needed)
    const ghosts     = pendingMembers.filter((m) => m.isGuest);
    const clearUsers = pendingMembers.filter((m) => !m.isGuest);

    // If no ghosts, open the sheet immediately with just Clear-user names
    if (ghosts.length === 0) {
      setGhostTokens([]);
      setOpen(true);
      return;
    }

    setGenerating(true);
    try {
      // Generate a payment token for each ghost in parallel
      const results = await Promise.all(
        ghosts.map((m) =>
          generatePaymentRequest({
            groupId,
            groupName,
            payerMemberId: m.id,
            payerName:     m.name,
            amount,
            currency,
            circlePeriod,
          }),
        ),
      );

      // Collect successful tokens; silently skip any that errored
      const tokens: { name: string; token: string }[] = [];
      for (let i = 0; i < ghosts.length; i++) {
        const res = results[i];
        if (res.ok) {
          tokens.push({ name: ghosts[i].name, token: res.token });
        }
      }

      if (tokens.length === 0 && ghosts.length > 0) {
        toast.error("Couldn't generate payment links — please try again.");
        return;
      }

      setGhostTokens(tokens);
      setOpen(true);
    } catch {
      toast.error("Couldn't generate payment links — please try again.");
    } finally {
      setGenerating(false);
    }
  }

  // Names of Clear-account members (no link needed; they have the app)
  const clearNames = pendingMembers.filter((m) => !m.isGuest).map((m) => m.name);

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={generating}
        className={`w-full flex items-center justify-center gap-2 py-3 mb-6 rounded-2xl
                   border border-slate-200 dark:border-slate-700
                   text-slate-600 dark:text-slate-300 text-sm font-medium
                   hover:bg-slate-50 dark:hover:bg-slate-800/60
                   ${hoverBorder} transition-all
                   disabled:opacity-60 disabled:cursor-not-allowed`}
      >
        {generating ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Send className="w-4 h-4" />
        )}
        {generating ? "Preparing links…" : `Send reminder to ${pendingMembers.length} ↗`}
      </button>

      <CircleReminderSheet
        isOpen={open}
        onClose={() => setOpen(false)}
        circleName={circleName}
        periodLabel={periodLabel}
        paidCount={paidCount}
        totalCount={totalCount}
        pendingGhosts={ghostTokens}
        pendingClearNames={clearNames}
        amount={amount}
        currency={currency}
        upiId={upiId}
        joinUrl={joinUrl}
      />
    </>
  );
}
