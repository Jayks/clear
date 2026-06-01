/**
 * HeroBalancePill — streamed into the group detail hero card.
 * Shows the current user's net position as a small glass pill overlaid on the
 * dark hero gradient so they immediately know "what do I owe / what am I owed"
 * without navigating to the Settle Up page.
 *
 * Reuses the same getBalances() query already cached for SettleBalanceBadge
 * (same cache tag: balances-${groupId}).
 */

import { getBalances } from "@/lib/db/queries/balances";
import { formatCurrency } from "@/lib/utils";

interface Props {
  groupId: string;
  currentMemberId: string;
  defaultCurrency: string;
}

export async function HeroBalancePill({ groupId, currentMemberId, defaultCurrency }: Props) {
  const { balances } = await getBalances(groupId, defaultCurrency);
  const myBalance = balances.find((b) => b.memberId === currentMemberId);
  if (!myBalance) return null;

  const { net } = myBalance;
  const hasActivity = balances.some((b) => b.totalPaid > 0 || b.totalOwed > 0);
  // No pill when the group has no expenses at all — nothing to report yet
  if (!hasActivity) return null;

  // Settled
  if (Math.abs(net) < 0.005) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                       bg-white/15 text-white/75 border border-white/20">
        All settled ✓
      </span>
    );
  }

  const isOwed = net > 0;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border
        ${isOwed
          ? "bg-emerald-500/25 text-emerald-200 border-emerald-400/30"
          : "bg-amber-500/25 text-amber-200 border-amber-400/30"
        }`}
    >
      {isOwed
        ? `Owed ${formatCurrency(net, defaultCurrency)}`
        : `You owe ${formatCurrency(Math.abs(net), defaultCurrency)}`}
    </span>
  );
}
