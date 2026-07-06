"use server";

import { db } from "@/lib/db/client";
import { settlements } from "@/lib/db/schema/settlements";
import { groupMembers } from "@/lib/db/schema/group-members";
import { groups } from "@/lib/db/schema/groups";
import { eq, and, inArray } from "drizzle-orm";
import { revalidatePath, revalidateTag } from "next/cache";
import { getCurrentUser, getMembership } from "@/lib/db/queries/auth";
import { formatCurrency } from "@/lib/utils";
import { sendPushToUser } from "@/lib/notifications/send-push-notification";
import { recordNotification } from "@/lib/notifications/record-notification";
import { resolveSettleNotifyTargets } from "@/lib/settlements/settle-notify-targets";
import { insertConfirmedSettlement } from "@/lib/settlements/insert-settlement";
import {
  recordSettlementSchema,
  selfReportSettlementSchema,
  type RecordSettlementInput,
  type SelfReportSettlementInput,
} from "@/lib/validations/settlement";

// ── recordSettlement (admin only — marks confirmed immediately) ────────────────
// Deliberately NOT gated by isGroupLocked (RAZORPAY_PLAN.md §9 allowlist):
// closing out an existing debt shouldn't require the admin to be on Plus — only
// *new* financial content (expenses, members) is gated. Same for deleteSettlement.

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

  const memberRows = await db
    .select({
      id:          groupMembers.id,
      userId:      groupMembers.userId,
      displayName: groupMembers.displayName,
      guestName:   groupMembers.guestName,
    })
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), inArray(groupMembers.id, [fromMemberId, toMemberId])));
  if (memberRows.length !== 2) return { ok: false, error: "Invalid members" } as const;

  // S-12 fix: validate the settlement currency matches the group's defaultCurrency.
  // getBalances() sums settlements with NO currency filter (unlike expenses), so a
  // settlement in a different currency would be counted into the net as if it were
  // the default currency — silently corrupting balances. Mirrors the circle R13-1
  // currency guard, which was never applied to group settlements.
  const [groupRow] = await db.select({ defaultCurrency: groups.defaultCurrency, name: groups.name })
    .from(groups).where(eq(groups.id, groupId)).limit(1);
  if (!groupRow) return { ok: false, error: "Group not found" } as const;
  if (currency !== groupRow.defaultCurrency)
    return { ok: false, error: `Currency must be ${groupRow.defaultCurrency}` } as const;

  try {
    // Round 16 fix #8: uses the shared insertConfirmedSettlement core — no
    // transaction needed here (a single INSERT is already atomic), but the
    // same function is now also called from confirmExternalPayment's
    // trip/nest branch inside its own transaction.
    const row = await db.transaction((tx) =>
      insertConfirmedSettlement(tx, { groupId, fromMemberId, toMemberId, amount, currency, note, paymentMethod, utrReference }),
    );

    revalidatePath(`/groups/${groupId}`, "layout");
    revalidateTag(`balances-${groupId}`, "max");

    // Notify the other party — an admin recorded this settlement directly
    // (isConfirmed:true immediately), so unlike selfReportSettlement there's
    // no confirm step; both from/to members should just hear it happened.
    // No prior push call site existed here — added alongside the inbox
    // persistence rather than as a separate change, since skipping it would
    // leave trip/nest settlements as the one domain with no "recorded"
    // notification (circle contributions and Streams both notify on their
    // equivalent immediate-settle paths).
    const fromMember = memberRows.find((m) => m.id === fromMemberId);
    const toMember   = memberRows.find((m) => m.id === toMemberId);
    const amountStr  = formatCurrency(amount, currency);
    const otherParties = [fromMember, toMember].filter(
      (m): m is NonNullable<typeof m> => !!m?.userId && m.userId !== user.id
    );
    for (const member of otherParties) {
      const title = `💸 Settlement recorded — ${groupRow.name}`;
      const body  = `${amountStr} settlement between ${fromMember?.displayName ?? fromMember?.guestName ?? "a member"} and ${toMember?.displayName ?? toMember?.guestName ?? "a member"} was recorded.`;
      const url   = `/groups/${groupId}/settle`;
      const targetUserId = member.userId!;
      recordNotification({
        userId: targetUserId,
        groupId,
        type:   "settlement_recorded",
        title,
        body,
        url,
        sendPush: () => sendPushToUser({ targetUserId, groupId, title, body, url }).catch(() => {}),
      }).catch(() => {});
    }

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

  // Verify both member IDs belong to this group and fetch toMember's identity for push
  const memberRows = await db
    .select({
      id:          groupMembers.id,
      userId:      groupMembers.userId,
      displayName: groupMembers.displayName,
      guestName:   groupMembers.guestName,
    })
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), inArray(groupMembers.id, [fromMemberId, toMemberId])));
  if (memberRows.length !== 2) return { ok: false, error: "Invalid members" } as const;

  // S-12 fix: same currency guard as recordSettlement — balances sum settlements
  // without a currency filter, so a non-default-currency self-report would corrupt
  // the net once confirmed.
  const [groupRow] = await db.select({ defaultCurrency: groups.defaultCurrency })
    .from(groups).where(eq(groups.id, groupId)).limit(1);
  if (!groupRow) return { ok: false, error: "Group not found" } as const;
  if (currency !== groupRow.defaultCurrency)
    return { ok: false, error: `Currency must be ${groupRow.defaultCurrency}` } as const;

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

    // Push-notify whoever can confirm this payment (fire-and-forget).
    //   • Clear-user creditor → notify them to confirm receipt.
    //   • Ghost/guest creditor (userId === null) → they can never confirm, so fall
    //     back to the group admin(s) who proxy-confirm. Without this, a non-admin
    //     paying a ghost creditor notified nobody and the settlement sat silently
    //     pending (Phase 3a fix — mirrors Circle's selfReportContribution).
    const creditorUserId = toMemberRow?.userId ?? null;
    let adminUserIds: (string | null)[] = [];
    if (!creditorUserId) {
      const adminRows = await db
        .select({ userId: groupMembers.userId })
        .from(groupMembers)
        .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.role, "admin")));
      adminUserIds = adminRows.map((a) => a.userId);
    }

    const notify = resolveSettleNotifyTargets({
      creditorUserId,
      adminUserIds,
      reporterUserId: user.id,
    });

    if (notify.kind !== "none") {
      const actorName = membership.displayName ?? membership.guestName ?? "Someone";
      const amountStr = formatCurrency(amount, currency);
      const payeeName = toMemberRow?.displayName ?? toMemberRow?.guestName ?? "a guest member";
      const body =
        notify.kind === "creditor"
          ? `${actorName} says they paid ${amountStr}. Confirm receipt →`
          : `${actorName} says they paid ${amountStr} to ${payeeName}. Confirm on their behalf →`;

      const title = "💸 Payment reported";
      const url   = `/groups/${groupId}/settle?confirm=${row.id}`;
      for (const targetUserId of notify.targetUserIds) {
        recordNotification({
          userId: targetUserId,
          groupId,
          type:   "settlement_recorded",
          title,
          body,
          url,
          sendPush: () => sendPushToUser({ targetUserId, groupId, title, body, url }).catch(() => {}),
        }).catch(() => {}); // fire-and-forget
      }
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
      id:           settlements.id,
      isConfirmed:  settlements.isConfirmed,
      toMemberId:   settlements.toMemberId,
      fromMemberId: settlements.fromMemberId,
      amount:       settlements.amount,
      currency:     settlements.currency,
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
    // FIX #11: Add isConfirmed=false to the WHERE clause and use .returning() to
    // detect a 0-row update.  Without this, a concurrent disputeSettlement that
    // deletes or already-confirmed this row between our SELECT and this UPDATE
    // causes confirmSettlement to silently fire a spurious push notification while
    // updating 0 rows.  Mirrors the R13-5 fix applied to confirmContribution.
    const [updated] = await db
      .update(settlements)
      .set({ isConfirmed: true })
      .where(and(
        eq(settlements.id, settlementId),
        eq(settlements.groupId, groupId),
        eq(settlements.isConfirmed, false),
      ))
      .returning({ id: settlements.id });

    if (!updated) return { ok: false, error: "Settlement was already processed" } as const;

    revalidatePath(`/groups/${groupId}`, "layout");
    revalidateTag(`balances-${groupId}`, "max");

    // Notify the payer that the creditor confirmed their self-reported payment.
    // Mirrors the confirmStreamSettle path in stream.ts — the debtor reported "I paid"
    // and deserves to hear back when accepted (previously they heard nothing on accept,
    // only on dispute).
    const [fromMember] = await db
      .select({ userId: groupMembers.userId })
      .from(groupMembers)
      .where(eq(groupMembers.id, settlement.fromMemberId));

    if (fromMember?.userId && fromMember.userId !== user.id) {
      const amountStr     = formatCurrency(Number(settlement.amount), settlement.currency);
      const confirmerName = membership.displayName ?? membership.guestName ?? "Someone";
      const targetUserId  = fromMember.userId;
      const title = "✓ Payment confirmed";
      const body  = `${confirmerName} confirmed your ${amountStr} payment.`;
      const url   = `/groups/${groupId}/settle`;
      recordNotification({
        userId: targetUserId,
        groupId,
        type:   "settlement_recorded",
        title,
        body,
        url,
        sendPush: () => sendPushToUser({ targetUserId, groupId, title, body, url }).catch(() => {}),
      }).catch(() => {});
    }

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
    // R6-1 fix: re-assert isConfirmed=false in the DELETE WHERE clause so that a
    // concurrent confirmSettlement call that snuck in between the SELECT check
    // above and this DELETE cannot cause a confirmed settlement (permanent balance
    // history) to be silently deleted.  Mirrors the C-2 fix applied to
    // circle.ts disputeContribution / rejectContribution.
    // Round 16 fix #10: the DELETE's return value was never checked — a
    // concurrent confirmSettlement winning the race meant 0 rows were
    // deleted here, yet this function still notified the payer "your
    // payment was disputed" and revalidated, even though their payment had
    // actually just been confirmed. Check `.returning()` and bail cleanly.
    const [deleted] = await db.delete(settlements).where(
      and(
        eq(settlements.id, settlementId),
        eq(settlements.groupId, groupId),
        eq(settlements.isConfirmed, false),
      )
    ).returning({ id: settlements.id });

    if (!deleted) return { ok: false, error: "Settlement was already confirmed" } as const;

    revalidatePath(`/groups/${groupId}`, "layout");
    revalidateTag(`balances-${groupId}`, "max");

    // Push-notify the payer about the dispute (fire-and-forget)
    if (fromMember?.userId) {
      const disputerName = membership.displayName ?? membership.guestName ?? "Someone";
      const reasonSuffix = reason ? ` Reason: "${reason}".` : "";
      const amountStr    = formatCurrency(Number(settlement.amount), settlement.currency);
      const targetUserId = fromMember.userId;
      const title = "⚠️ Payment disputed";
      const body  = `${disputerName} disputed your ${amountStr} payment.${reasonSuffix} Please re-check and report again.`;
      const url   = `/groups/${groupId}/settle`;
      recordNotification({
        userId: targetUserId,
        groupId,
        type:   "settlement_recorded",
        title,
        body,
        url,
        sendPush: () => sendPushToUser({ targetUserId, groupId, title, body, url }).catch(() => {}),
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
