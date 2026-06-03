"use server";

import { db } from "@/lib/db/client";
import { settlements } from "@/lib/db/schema/settlements";
import { groupMembers } from "@/lib/db/schema/group-members";
import { eq, and, inArray } from "drizzle-orm";
import { revalidatePath, revalidateTag } from "next/cache";
import { getCurrentUser, getMembership } from "@/lib/db/queries/auth";
import { formatCurrency } from "@/lib/utils";
import { sendPushToUser } from "@/lib/notifications/send-push-notification";
import {
  recordSettlementSchema,
  selfReportSettlementSchema,
  type RecordSettlementInput,
  type SelfReportSettlementInput,
} from "@/lib/validations/settlement";

// ── recordSettlement (admin only — marks confirmed immediately) ────────────────

export async function recordSettlement(input: RecordSettlementInput) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" } as const;

  const parsed = recordSettlementSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" } as const;

  const { groupId, fromMemberId, toMemberId, amount, currency, note, paymentMethod, utrReference } = parsed.data;

  const membership = await getMembership(groupId, user.id);
  if (!membership) return { ok: false, error: "Not a member" } as const;
  if (membership.role !== "admin") return { ok: false, error: "Not authorized" } as const;
  if (fromMemberId === toMemberId) return { ok: false, error: "Cannot settle with yourself" } as const;

  const memberRows = await db.select({ id: groupMembers.id }).from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), inArray(groupMembers.id, [fromMemberId, toMemberId])));
  if (memberRows.length !== 2) return { ok: false, error: "Invalid members" } as const;

  try {
    const [row] = await db.insert(settlements).values({
      groupId,
      fromMemberId,
      toMemberId,
      amount:        String(amount),
      currency,
      note:          note || null,
      isConfirmed:   true,
      paymentMethod: paymentMethod ?? null,
      utrReference:  utrReference  ?? null,
    }).returning({ id: settlements.id });

    revalidatePath(`/groups/${groupId}`, "layout");
    revalidateTag(`balances-${groupId}`, "max");
    return { ok: true, settlementId: row.id } as const;
  } catch {
    return { ok: false, error: "Failed to record settlement" } as const;
  }
}

// ── selfReportSettlement (any member — inserts is_confirmed = false) ──────────

export async function selfReportSettlement(input: SelfReportSettlementInput) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" } as const;

  const parsed = selfReportSettlementSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" } as const;

  const { groupId, fromMemberId, toMemberId, amount, currency, paymentMethod, utrReference, note } = parsed.data;

  const membership = await getMembership(groupId, user.id);
  if (!membership) return { ok: false, error: "Not a member" } as const;

  // The current user must BE the fromMember (the one claiming to have paid)
  if (membership.id !== fromMemberId) return { ok: false, error: "Not authorized" } as const;
  if (fromMemberId === toMemberId) return { ok: false, error: "Cannot settle with yourself" } as const;

  // Verify both member IDs belong to this group and fetch toMember's userId for push
  const memberRows = await db
    .select({ id: groupMembers.id, userId: groupMembers.userId })
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), inArray(groupMembers.id, [fromMemberId, toMemberId])));
  if (memberRows.length !== 2) return { ok: false, error: "Invalid members" } as const;

  const toMemberRow = memberRows.find((m) => m.id === toMemberId);

  try {
    const [row] = await db.insert(settlements).values({
      groupId,
      fromMemberId,
      toMemberId,
      amount:        String(amount),
      currency,
      note:          note || null,
      isConfirmed:   false,
      paymentMethod: paymentMethod ?? null,
      utrReference:  utrReference  ?? null,
    }).returning({ id: settlements.id });

    revalidatePath(`/groups/${groupId}`, "layout");
    revalidateTag(`balances-${groupId}`, "max");

    // Push-notify the creditor so they can confirm receipt
    if (toMemberRow?.userId) {
      const actorName = membership.displayName ?? membership.guestName ?? "Someone";
      sendPushToUser({
        targetUserId: toMemberRow.userId,
        groupId,
        title: "💸 Payment reported",
        body:  `${actorName} says they paid ${formatCurrency(amount, currency)}. Confirm receipt →`,
        url:   `/groups/${groupId}/settle?confirm=${row.id}`,
      }).catch(() => {}); // fire-and-forget
    }

    return { ok: true, settlementId: row.id } as const;
  } catch {
    return { ok: false, error: "Failed to record settlement" } as const;
  }
}

// ── confirmSettlement (admin OR creditor only) ────────────────────────────────

export async function confirmSettlement(settlementId: string, groupId: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" } as const;

  const membership = await getMembership(groupId, user.id);
  if (!membership) return { ok: false, error: "Not a member" } as const;

  // Fetch the settlement so we can verify the permission
  const [settlement] = await db
    .select({
      id:          settlements.id,
      isConfirmed: settlements.isConfirmed,
      toMemberId:  settlements.toMemberId,
    })
    .from(settlements)
    .where(and(eq(settlements.id, settlementId), eq(settlements.groupId, groupId)));

  if (!settlement) return { ok: false, error: "Settlement not found" } as const;
  if (settlement.isConfirmed) return { ok: false, error: "Already confirmed" } as const;

  // Fetch toMember to check if current user is the creditor
  const [toMember] = await db
    .select({ userId: groupMembers.userId })
    .from(groupMembers)
    .where(eq(groupMembers.id, settlement.toMemberId));

  const isCreditor = !!toMember?.userId && toMember.userId === user.id;
  const isAdmin    = membership.role === "admin";

  if (!isAdmin && !isCreditor) {
    return { ok: false, error: "Not authorized — only the creditor or an admin can confirm" } as const;
  }

  try {
    await db
      .update(settlements)
      .set({ isConfirmed: true })
      .where(and(eq(settlements.id, settlementId), eq(settlements.groupId, groupId)));

    revalidatePath(`/groups/${groupId}`, "layout");
    revalidateTag(`balances-${groupId}`, "max");
    return { ok: true } as const;
  } catch {
    return { ok: false, error: "Failed to confirm settlement" } as const;
  }
}

// ── disputeSettlement (admin OR creditor — removes the pending record) ─────────

export async function disputeSettlement(
  settlementId: string,
  groupId: string,
  /** Human-readable reason from the 2-step inline picker in PaymentPendingBadge */
  reason?: string,
) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" } as const;

  const membership = await getMembership(groupId, user.id);
  if (!membership) return { ok: false, error: "Not a member" } as const;

  const [settlement] = await db
    .select({
      id:           settlements.id,
      isConfirmed:  settlements.isConfirmed,   // S-1b fix: must check before DELETE
      toMemberId:   settlements.toMemberId,
      fromMemberId: settlements.fromMemberId,
      amount:       settlements.amount,
      currency:     settlements.currency,
    })
    .from(settlements)
    .where(and(eq(settlements.id, settlementId), eq(settlements.groupId, groupId)));

  if (!settlement) return { ok: false, error: "Settlement not found" } as const;
  // S-1b fix: confirmed settlements are permanent balance history — only
  // unconfirmed (self-reported, pending creditor review) can be disputed.
  if (settlement.isConfirmed)
    return { ok: false, error: "Cannot dispute a confirmed settlement" } as const;

  const [[toMember], [fromMember]] = await Promise.all([
    db.select({ userId: groupMembers.userId })
      .from(groupMembers)
      .where(eq(groupMembers.id, settlement.toMemberId)),
    db.select({ userId: groupMembers.userId, displayName: groupMembers.displayName, guestName: groupMembers.guestName })
      .from(groupMembers)
      .where(eq(groupMembers.id, settlement.fromMemberId)),
  ]);

  const isCreditor = !!toMember?.userId && toMember.userId === user.id;
  const isAdmin    = membership.role === "admin";

  if (!isAdmin && !isCreditor) {
    return { ok: false, error: "Not authorized — only the creditor or an admin can dispute" } as const;
  }

  try {
    await db.delete(settlements).where(
      and(eq(settlements.id, settlementId), eq(settlements.groupId, groupId))
    );

    revalidatePath(`/groups/${groupId}`, "layout");
    revalidateTag(`balances-${groupId}`, "max");

    // Push-notify the payer about the dispute (fire-and-forget)
    if (fromMember?.userId) {
      const disputerName = membership.displayName ?? membership.guestName ?? "Someone";
      const reasonSuffix = reason ? ` Reason: "${reason}".` : "";
      const amountStr    = formatCurrency(Number(settlement.amount), settlement.currency);
      sendPushToUser({
        targetUserId: fromMember.userId,
        groupId,
        title: "⚠️ Payment disputed",
        body:  `${disputerName} disputed your ${amountStr} payment.${reasonSuffix} Please re-check and report again.`,
        url:   `/groups/${groupId}/settle`,
      }).catch(() => {});
    }

    return { ok: true } as const;
  } catch {
    return { ok: false, error: "Failed to dispute settlement" } as const;
  }
}

// ── deleteSettlement (admin only) ──────────────────────────────────────────────

export async function deleteSettlement(settlementId: string, groupId: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" } as const;

  const membership = await getMembership(groupId, user.id);
  if (!membership || membership.role !== "admin")
    return { ok: false, error: "Not authorized" } as const;

  try {
    await db.delete(settlements).where(
      and(eq(settlements.id, settlementId), eq(settlements.groupId, groupId))
    );
    revalidatePath(`/groups/${groupId}`, "layout");
    revalidateTag(`balances-${groupId}`, "max");
    return { ok: true } as const;
  } catch {
    return { ok: false, error: "Failed to delete settlement" } as const;
  }
}
