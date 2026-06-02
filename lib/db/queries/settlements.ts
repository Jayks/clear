import { db } from "@/lib/db/client";
import { settlements } from "@/lib/db/schema/settlements";
import { groupMembers } from "@/lib/db/schema/group-members";
import { eq, and } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

export interface PendingSettlement {
  id:              string;
  groupId:         string;
  fromMemberId:    string;
  toMemberId:      string;
  amount:          string;
  currency:        string;
  paymentMethod:   string | null;
  utrReference:    string | null;
  settledAt:       Date;
  /** Display name of the person who self-reported paying */
  fromMemberName:  string;
  /** userId of the creditor (person who should confirm receipt) */
  toMemberUserId:  string | null;
}

/**
 * Returns all unconfirmed (self-reported) settlements for a group.
 * Used on the settle page to render PaymentPendingBadge cards.
 */
export async function getPendingSettlements(groupId: string): Promise<PendingSettlement[]> {
  const fromMember = alias(groupMembers, "from_member");
  const toMember   = alias(groupMembers, "to_member");

  const rows = await db
    .select({
      id:              settlements.id,
      groupId:         settlements.groupId,
      fromMemberId:    settlements.fromMemberId,
      toMemberId:      settlements.toMemberId,
      amount:          settlements.amount,
      currency:        settlements.currency,
      paymentMethod:   settlements.paymentMethod,
      utrReference:    settlements.utrReference,
      settledAt:       settlements.settledAt,
      fromDisplayName: fromMember.displayName,
      fromGuestName:   fromMember.guestName,
      toMemberUserId:  toMember.userId,
    })
    .from(settlements)
    .innerJoin(fromMember, eq(fromMember.id, settlements.fromMemberId))
    .innerJoin(toMember,   eq(toMember.id,   settlements.toMemberId))
    .where(
      and(
        eq(settlements.groupId,     groupId),
        eq(settlements.isConfirmed, false),
      )
    )
    .orderBy(settlements.settledAt);

  return rows.map((r) => ({
    id:             r.id,
    groupId:        r.groupId,
    fromMemberId:   r.fromMemberId,
    toMemberId:     r.toMemberId,
    amount:         r.amount,
    currency:       r.currency,
    paymentMethod:  r.paymentMethod,
    utrReference:   r.utrReference,
    settledAt:      r.settledAt,
    fromMemberName: r.fromDisplayName ?? r.fromGuestName ?? "Member",
    toMemberUserId: r.toMemberUserId,
  }));
}
