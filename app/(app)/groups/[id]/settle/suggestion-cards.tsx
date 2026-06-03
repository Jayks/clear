"use client";

/**
 * SuggestionCards — direction-aware suggestion list for the settle page.
 *
 * Per card, based on who's viewing:
 *   debtor   (currentMemberId === s.from)  → [💸 Pay ₹X] opens PaymentSheet(debtor)
 *   creditor (currentMemberId === s.to)    → [📤 Request ₹X] opens PaymentSheet(creditor)
 *   admin    (neither)                      → MarkPaidButton (existing flow, is_confirmed=true)
 *
 * One shared PaymentSheet instance is reused across all suggestion cards.
 * openIdx tracks which suggestion triggered it.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { PaymentSheet }    from "@/components/payment/payment-sheet";
import { SettledCelebration } from "@/components/settlement/settled-celebration";
import { SettleShareButton }  from "@/components/settlement/settle-share-button";
import { MarkPaidButton }     from "./mark-paid-button";
import { selfReportSettlement, recordSettlement, deleteSettlement } from "@/app/actions/settlements";
import { hapticSuccess } from "@/lib/haptics";
import { cn, formatCurrency, getMemberName } from "@/lib/utils";
import type { Transaction } from "@/lib/settle/optimize";
import type { GroupMember } from "@/lib/db/schema/group-members";
import type { PaymentMethod } from "@/lib/payment/types";

interface PaymentCallbackParams {
  paymentMethod: PaymentMethod;
  utrReference?: string;
  note?: string;
  /** Actual amount being paid — may be less than suggestion for partial settlements */
  amount?: number;
}

interface Props {
  suggestions:          Transaction[];
  members:              GroupMember[];
  currentMemberId:      string | undefined;
  isAdmin:              boolean;
  currency:             string;
  groupId:              string;
  groupName:            string;
  /** userId → default VPA string | null */
  upiIdMap:             Record<string, string | null>;
  settleUrl:            string;
  inviteUrl:            string;
  pastSettlementsTotal: number;
  settlementCount:      number;
}

export function SuggestionCards({
  suggestions, members, currentMemberId, isAdmin,
  currency, groupId, groupName, upiIdMap,
  settleUrl, inviteUrl, pastSettlementsTotal, settlementCount,
}: Props) {
  const router = useRouter();
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const memberName = (id: string) => {
    const m = members.find((m) => m.id === id);
    return m ? getMemberName(m) : "Member";
  };

  const memberUserId = (id: string) =>
    members.find((m) => m.id === id)?.userId ?? "";

  const defaultVpa = (memberId: string) =>
    upiIdMap[memberUserId(memberId)] ?? null;

  // ── Callbacks wired to server actions ──────────────────────────────────────
  async function handleSelfReport(idx: number, params: PaymentCallbackParams) {
    const s = suggestions[idx];
    const result = await selfReportSettlement({
      groupId,
      fromMemberId:  s.from,
      toMemberId:    s.to,
      // Use edited amount if the debtor did a partial settlement
      amount:        params.amount ?? s.amount,
      currency,
      paymentMethod: params.paymentMethod,
      utrReference:  params.utrReference,
      note:          params.note,
    });
    if (!result.ok) { toast.error(result.error); throw new Error(result.error); }
    hapticSuccess();
    toast.success("Payment reported! Waiting for confirmation.");
    router.refresh();
  }

  async function handleMarkPaid(idx: number, params: PaymentCallbackParams) {
    const s = suggestions[idx];
    const result = await recordSettlement({
      groupId,
      fromMemberId:  s.from,
      toMemberId:    s.to,
      amount:        s.amount,
      currency,
      paymentMethod: params.paymentMethod,
      utrReference:  params.utrReference,
      note:          params.note,
    });
    if (!result.ok) { toast.error(result.error); throw new Error(result.error); }
    hapticSuccess();
    const { settlementId } = result;
    toast.success("Payment recorded!", {
      duration: 5000,
      action: {
        label: "Undo",
        onClick: async () => {
          const undo = await deleteSettlement(settlementId, groupId);
          if (undo.ok) { toast.success("Settlement undone."); router.refresh(); }
          else toast.error(undo.error ?? "Could not undo.");
        },
      },
    });
    router.refresh();
  }

  // ── Active suggestion data (for PaymentSheet) ─────────────────────────────
  const activeSuggestion = openIdx !== null ? suggestions[openIdx] : null;

  // ── Empty state ────────────────────────────────────────────────────────────
  if (suggestions.length === 0) {
    return (
      <>
        <SettledCelebration groupId={groupId} />
        <div className="rounded-2xl border border-emerald-200/70 dark:border-emerald-800/40
                        bg-gradient-to-br from-emerald-50/80 to-teal-50/50
                        dark:from-emerald-950/30 dark:to-teal-950/20
                        px-5 py-8 flex flex-col items-center gap-3 mb-8">
          <div className="w-16 h-16 rounded-full bg-white dark:bg-slate-800/80
                          border border-emerald-200/80 dark:border-emerald-800/50
                          flex items-center justify-center shadow-md shadow-emerald-500/10">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 dark:text-emerald-400" />
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-emerald-700 dark:text-emerald-300"
               style={{ fontFamily: "var(--font-fraunces)" }}>
              All settled up!
            </p>
            <p className="text-sm text-emerald-600/75 dark:text-emerald-400/70 mt-1">
              {pastSettlementsTotal > 0
                ? `${formatCurrency(pastSettlementsTotal, currency)} tracked and squared away`
                : "No payments needed right now."}
            </p>
          </div>
          {settlementCount > 0 && (
            <div className="flex items-center gap-2 text-xs text-emerald-600/55 dark:text-emerald-400/50">
              <span>{settlementCount} payment{settlementCount !== 1 ? "s" : ""} recorded</span>
              <span className="w-1 h-1 rounded-full bg-emerald-400/60 dark:bg-emerald-600/60 inline-block" />
              <span>{members.length} member{members.length !== 1 ? "s" : ""}</span>
            </div>
          )}
        </div>
      </>
    );
  }

  // ── Suggestion list ────────────────────────────────────────────────────────
  return (
    <>
      <div className="flex items-center justify-between mb-4 px-0.5">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {suggestions.length} payment{suggestions.length !== 1 ? "s" : ""} to settle
        </p>
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 tabular"
           style={{ fontFamily: "var(--font-fraunces)" }}>
          {formatCurrency(suggestions.reduce((sum, s) => sum + s.amount, 0), currency)} total
        </p>
      </div>

      <div className="space-y-2 mb-8">
        {suggestions.map((s, i) => {
          const isYouFrom = currentMemberId === s.from;
          const isYouTo   = currentMemberId === s.to;
          const isYours   = isYouFrom || isYouTo;

          return (
            <div
              key={i}
              id={`suggestion-${i}`}
              className={cn(
                "glass rounded-xl px-4 py-3.5 flex flex-col gap-2.5",
                isYouFrom && "ring-2 ring-amber-400/50 dark:ring-amber-500/40 bg-amber-50/40 dark:bg-amber-900/10",
                isYouTo   && "ring-2 ring-emerald-400/40 dark:ring-emerald-500/30",
              )}
            >
              {/* Viewer label */}
              {isYours && (
                <span className={cn(
                  "self-start text-[11px] font-semibold px-2 py-0.5 rounded-full",
                  isYouFrom
                    ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300"
                    : "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300",
                )}>
                  {isYouFrom ? "You owe" : "Owed to you"}
                </span>
              )}

              {/* Names + amount row */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate min-w-0">
                  {memberName(s.from)}
                </span>
                <ArrowRight className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate min-w-0 flex-1">
                  {memberName(s.to)}
                </span>
                <span
                  className={cn(
                    "text-lg font-semibold tabular shrink-0",
                    isYouFrom ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400",
                  )}
                  style={{ fontFamily: "var(--font-fraunces)" }}
                >
                  {formatCurrency(s.amount, currency)}
                </span>
              </div>

              {/* Action row — involved parties */}
              {isYours && (
                <div className="flex items-center gap-2 flex-wrap">
                  {/* DEBTOR: Pay button → PaymentSheet(debtor) */}
                  {isYouFrom && (
                    <button
                      type="button"
                      onClick={() => setOpenIdx(i)}
                      className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold
                                 text-white bg-gradient-to-br from-cyan-500 to-teal-500
                                 hover:from-cyan-600 hover:to-teal-600
                                 px-3 py-1.5 rounded-lg transition-all
                                 shadow-sm shadow-cyan-500/20"
                    >
                      💸 Pay {formatCurrency(s.amount, currency)} →
                    </button>
                  )}

                  {/* CREDITOR: Request button → PaymentSheet(creditor) */}
                  {isYouTo && (
                    <button
                      type="button"
                      onClick={() => setOpenIdx(i)}
                      className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold
                                 text-white bg-gradient-to-br from-emerald-500 to-teal-500
                                 hover:from-emerald-600 hover:to-teal-600
                                 px-3 py-1.5 rounded-lg transition-all
                                 shadow-sm shadow-emerald-500/20"
                    >
                      📤 Request {formatCurrency(s.amount, currency)} →
                    </button>
                  )}

                  <SettleShareButton
                    fromName={memberName(s.from)}
                    toName={memberName(s.to)}
                    amount={s.amount}
                    currency={currency}
                    direction={isYouFrom ? "owe" : "owed"}
                    groupName={groupName}
                    settleUrl={inviteUrl}
                  />
                </div>
              )}

              {/* Action row — admin (neither debtor nor creditor) */}
              {!isYours && (
                <div className="flex items-center gap-2">
                  <MarkPaidButton
                    groupId={groupId}
                    fromMemberId={s.from}
                    toMemberId={s.to}
                    amount={s.amount}
                    currency={currency}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Unified PaymentSheet (one instance, reused per suggestion) ──────── */}
      {activeSuggestion && (
        <PaymentSheet
          isOpen={openIdx !== null}
          onClose={() => setOpenIdx(null)}
          direction={currentMemberId === activeSuggestion.from ? "debtor" : "creditor"}
          amount={activeSuggestion.amount}
          currency={currency}
          payer={{
            userId:       memberUserId(activeSuggestion.from),
            name:         memberName(activeSuggestion.from),
            defaultUpiId: defaultVpa(activeSuggestion.from),
          }}
          payee={{
            userId:       memberUserId(activeSuggestion.to),
            name:         memberName(activeSuggestion.to),
            defaultUpiId: defaultVpa(activeSuggestion.to),
          }}
          context={{ type: "trip", id: groupId, name: groupName }}
          onSelfReport={(params) => handleSelfReport(openIdx!, params)}
          onMarkPaid={(params)   => handleMarkPaid(openIdx!, params)}
        />
      )}
    </>
  );
}
