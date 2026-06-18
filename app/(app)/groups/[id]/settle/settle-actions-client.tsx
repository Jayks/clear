"use client";

/**
 * SettleActionsClient — client wrapper that owns shared optimistic state across
 * SettleHeroCard, PendingConfirmations, ExternalPaymentsPending, and SuggestionCards.
 *
 * When any payment is confirmed (regular Clear user or ghost), four things update instantly:
 *   1. The row in "Pending confirmation" / "Guest payment reports" (internal removedIds)
 *   2. The matching suggestion card in "Minimum payments"  (hiddenKeys here)
 *   3. The person pill in the hero card                   (visibleSuggestions here)
 *
 * RSC content that sits between the hero and the actions sections (DebtFlowGraph,
 * monthly context, net balances) is passed as `children` — server-rendered and
 * injected unchanged; it refreshes on router.refresh().
 *
 * On server error, the hidden suggestion and hero pill roll back.
 * Disputes do NOT hide suggestion cards — the debt still exists.
 */

import { useState } from "react";
import { Send } from "lucide-react";
import { SettleHeroCard }         from "@/components/settlement/settle-hero-card";
import { ExternalPaymentsPending } from "./external-payments-pending";
import { PendingConfirmations }    from "./pending-confirmations";
import { SuggestionCards }         from "./suggestion-cards";
import { SectionHeader }           from "@/components/shared/section-header";
import type { PaymentRequest }     from "@/lib/db/schema/payment-requests";
import type { PendingSettlement }  from "@/lib/db/queries/settlements";
import type { Transaction }        from "@/lib/settle/optimize";
import type { GroupMember }        from "@/lib/db/schema/group-members";
import type { MemberBalanceRow }   from "@/lib/db/queries/balances";
import type { ContextTheme }       from "@/lib/theme/context-theme";

interface Props {
  // SettleHeroCard
  balances:             MemberBalanceRow[];
  // PendingConfirmations (regular Clear-user self-reported settlements)
  pendingSettlements:      PendingSettlement[];
  focusId?:                string;
  // ExternalPaymentsPending
  pendingExternalPayments: PaymentRequest[];
  groupId:         string;
  currentUserId:   string | undefined;
  isAdmin:         boolean;
  currency:        string;
  // SuggestionCards + hero
  suggestions:          Transaction[];
  members:              GroupMember[];
  currentMemberId:      string | undefined;
  groupName:            string;
  upiIdMap:             Record<string, string | null>;
  settleUrl:            string;
  inviteUrl:            string;
  pastSettlementsTotal: number;
  settlementCount:      number;
  contextType:          "trip" | "nest";
  appUrl:               string;
  // Section header
  theme: ContextTheme;
  /** RSC-rendered content between the hero card and the actions sections.
   *  (DebtFlowGraph, monthly context, net balances, PendingConfirmations) */
  children?: React.ReactNode;
}

export function SettleActionsClient({
  balances, pendingSettlements, focusId, pendingExternalPayments,
  groupId, currentUserId, isAdmin, currency,
  suggestions, members, currentMemberId, groupName, upiIdMap,
  settleUrl, inviteUrl, pastSettlementsTotal, settlementCount,
  contextType, appUrl, theme, children,
}: Props) {
  // "fromMemberId:toMemberId" keys — hidden optimistically when either a regular
  // settlement or a guest payment request is confirmed by admin.
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(new Set());

  function hideKey(fromId: string, toId: string) {
    setHiddenKeys((prev) => new Set([...prev, `${fromId}:${toId}`]));
  }
  function restoreKey(fromId: string, toId: string) {
    const key = `${fromId}:${toId}`;
    setHiddenKeys((prev) => { const s = new Set(prev); s.delete(key); return s; });
  }

  // Adapters for each child component's callback shape
  function hideFromRequest(req: PaymentRequest) {
    if (req.payerMemberId && req.payeeMemberId) hideKey(req.payerMemberId, req.payeeMemberId);
  }
  function restoreFromRequest(req: PaymentRequest) {
    if (req.payerMemberId && req.payeeMemberId) restoreKey(req.payerMemberId, req.payeeMemberId);
  }
  function hideFromSettlement(s: PendingSettlement) {
    hideKey(s.fromMemberId, s.toMemberId);
  }
  function restoreFromSettlement(s: PendingSettlement) {
    restoreKey(s.fromMemberId, s.toMemberId);
  }

  const visibleSuggestions = hiddenKeys.size > 0
    ? suggestions.filter((s) => !hiddenKeys.has(`${s.from}:${s.to}`))
    : suggestions;

  return (
    <>
      {/* Hero card — uses visibleSuggestions so person pills vanish instantly */}
      <SettleHeroCard
        balances={balances}
        suggestions={visibleSuggestions}
        currentMemberId={currentMemberId}
        currency={currency}
        members={members}
      />

      {/* RSC subtree: DebtFlowGraph, monthly context, net balances */}
      {children}

      {/* Regular Clear-user self-reported settlements — optimistic hide on confirm */}
      <PendingConfirmations
        pending={pendingSettlements}
        groupId={groupId}
        currentUserId={currentUserId}
        isAdmin={isAdmin}
        focusId={focusId}
        onConfirmOptimistic={hideFromSettlement}
        onConfirmRollback={restoreFromSettlement}
      />

      {/* Guest payment reports — optimistic hide on confirm */}
      <ExternalPaymentsPending
        requests={pendingExternalPayments}
        groupId={groupId}
        currentUserId={currentUserId}
        isAdmin={isAdmin}
        currency={currency}
        onConfirmOptimistic={hideFromRequest}
        onConfirmRollback={restoreFromRequest}
      />

      <div data-tour="settle-suggestions">
        <SectionHeader
          icon={Send}
          label="Minimum payments"
          subtitle="Transfers that zero out all the balances above"
          theme={theme}
          className="mb-4"
        />
        <SuggestionCards
          suggestions={visibleSuggestions}
          members={members}
          currentMemberId={currentMemberId}
          isAdmin={isAdmin}
          currency={currency}
          groupId={groupId}
          groupName={groupName}
          upiIdMap={upiIdMap}
          settleUrl={settleUrl}
          inviteUrl={inviteUrl}
          pastSettlementsTotal={pastSettlementsTotal}
          settlementCount={settlementCount}
          contextType={contextType}
          appUrl={appUrl}
        />
      </div>
    </>
  );
}
