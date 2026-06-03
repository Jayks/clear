"use server";

import { db } from "@/lib/db/client";
import { streamRecords } from "@/lib/db/schema/stream-records";
import { streamGuests } from "@/lib/db/schema/stream-guests";
import { streamSettlements } from "@/lib/db/schema/stream-settlements";
import { getCurrentUser } from "@/lib/db/queries/auth";
import {
  getStreamByConfirmToken,
  getRecentStreamCounterparts,
  searchStreamableUsers,
} from "@/lib/db/queries/stream";
import {
  logStreamSchema,
  settleStreamSchema,
  disputeStreamSchema,
  selfReportStreamSettleSchema,
  type LogStreamInput,
  type SettleStreamInput,
  type DisputeStreamInput,
  type SelfReportStreamSettleInput,
} from "@/lib/validations/stream";
import { sendStreamPush } from "@/lib/notifications/send-stream-notification";
import { revalidatePath } from "next/cache";
import { eq, and, or, sum, sql, inArray, asc } from "drizzle-orm";
import { formatCurrency } from "@/lib/utils";

// ── Log a new Stream ──────────────────────────────────────────────────────────

export async function logStream(input: LogStreamInput) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" } as const;

  const parsed = logStreamSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Invalid input" } as const;
  }

  const {
    counterpartId,
    counterpartGuestId: existingGuestId,
    guestName,
    guestEmail,
    guestPhone,
    amount,
    currency,
    direction,
    note,
  } = parsed.data;

  // If new guest info provided, create the guest record first
  let resolvedGuestId = existingGuestId;
  if (guestName && !counterpartId && !existingGuestId) {
    const [newGuest] = await db
      .insert(streamGuests)
      .values({ createdBy: user.id, name: guestName, email: guestEmail, phone: guestPhone })
      .returning({ id: streamGuests.id });
    resolvedGuestId = newGuest.id;
  }

  // 48-hour token expiry — set here since DB can't do interval arithmetic as a default
  const confirmTokenExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

  try {
    const [record] = await db
      .insert(streamRecords)
      .values({
        creatorId:          user.id,
        counterpartId:      counterpartId ?? null,
        counterpartGuestId: resolvedGuestId ?? null,
        amount:             String(amount),
        currency,
        direction,
        note:               note || null,
        status:             "pending",
        confirmTokenExpiresAt,
      })
      .returning({ id: streamRecords.id, confirmToken: streamRecords.confirmToken });

    // Push notification to the Clear-user counterpart
    if (counterpartId) {
      const amountStr  = formatCurrency(amount, currency);
      const noteClause = note ? ` for ${note}` : "";
      // B-5 fix: direction-aware body.
      //   they_owe_me = creator paid; counterpart owes creator → "you owe"
      //   i_owe_them  = counterpart paid; creator owes counterpart → "they owe you"
      const body = direction === "they_owe_me"
        ? `says you owe ${amountStr}${noteClause}`
        : `says they owe you ${amountStr}${noteClause}`;
      // Fire-and-forget — don't let notification failure block the action
      sendStreamPush(counterpartId, {
        title: user.user_metadata?.full_name ?? "Someone",
        body,
        url:   `/stream/confirm/${record.confirmToken}`,
      }).catch(() => {});
    }

    revalidatePath("/groups", "layout");    // refreshes homepage strip
    revalidatePath("/stream", "layout");    // refreshes dashboard if open

    const confirmUrl = record.confirmToken
      ? `/stream/confirm/${record.confirmToken}`
      : null;

    return { ok: true, streamId: record.id, confirmUrl } as const;
  } catch (err) {
    console.error("logStream error:", err);
    return { ok: false, error: "Failed to log Stream" } as const;
  }
}


// ── Confirm a Stream (from guest confirmation page — no auth) ─────────────────

export async function confirmStream(token: string) {
  if (!token) return { ok: false, error: "invalid_token" } as const;

  const result = await getStreamByConfirmToken(token);
  if (!result) return { ok: false, error: "link_expired" } as const;

  const { record, creatorName } = result;

  if (record.status !== "pending") {
    return { ok: false, error: "already_resolved" } as const;
  }

  try {
    await db
      .update(streamRecords)
      .set({
        status:      "confirmed",
        confirmedAt: new Date(),
        // confirmToken intentionally kept — allows "already confirmed" state on re-visit
        updatedAt:   new Date(),
      })
      .where(eq(streamRecords.id, record.id));

    // Notify the creator
    // Note: we don't have the confirmer's name here (guest flow, no auth).
    // Use the amount + note for context instead.
    const amountStr  = formatCurrency(Number(record.amount), record.currency);
    const noteClause = record.note ? ` for ${record.note}` : "";
    sendStreamPush(record.creatorId, {
      title: "✓ Stream confirmed",
      body:  `${amountStr}${noteClause} — your stream was confirmed`,
      // Deep-link to the creator's view of this relationship
      url:   `/stream/${record.counterpartGuestId ?? record.counterpartId ?? ""}`,
    }).catch(() => {});

    return {
      ok: true,
      creatorName,
      amount: Number(record.amount),
      currency: record.currency,
      note: record.note,
    } as const;
  } catch (err) {
    console.error("confirmStream error:", err);
    return { ok: false, error: "Failed to confirm" } as const;
  }
}


// ── Dispute a Stream (from guest confirmation page — no auth) ─────────────────

export async function disputeStream(input: DisputeStreamInput) {
  const parsed = disputeStreamSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" } as const;

  const { token, reason, note } = parsed.data;

  const result = await getStreamByConfirmToken(token);
  if (!result) return { ok: false, error: "link_expired" } as const;

  const { record, creatorName } = result;

  if (record.status !== "pending") {
    return { ok: false, error: "already_resolved" } as const;
  }

  try {
    await db
      .update(streamRecords)
      .set({
        status:        "disputed",
        disputedAt:    new Date(),
        disputeReason: reason,
        disputeNote:   note || null,
        // confirmToken intentionally kept — allows "already disputed" state on re-visit
        updatedAt:     new Date(),
      })
      .where(eq(streamRecords.id, record.id));

    const amountStr = formatCurrency(Number(record.amount), record.currency);
    const noteClause = record.note ? ` for ${record.note}` : "";
    sendStreamPush(record.creatorId, {
      title: "⚠ Disputed",
      body:  `${creatorName} disputed ${amountStr}${noteClause}`,
      // Deep-link to the creator's view of this relationship
      url:   `/stream/${record.counterpartGuestId ?? record.counterpartId ?? ""}`,
    }).catch(() => {});

    return { ok: true } as const;
  } catch (err) {
    console.error("disputeStream error:", err);
    return { ok: false, error: "Failed to dispute" } as const;
  }
}


// ── Settle a Stream ───────────────────────────────────────────────────────────

export async function settleStream(input: SettleStreamInput) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" } as const;

  const parsed = settleStreamSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Invalid input" } as const;
  }

  const { streamId, amount, note } = parsed.data;

  // Verify the user is a party to this stream
  const [record] = await db
    .select()
    .from(streamRecords)
    .where(
      and(
        eq(streamRecords.id, streamId),
        or(
          eq(streamRecords.creatorId, user.id),
          eq(streamRecords.counterpartId, user.id),
        ),
      ),
    )
    .limit(1);

  if (!record) return { ok: false, error: "Stream not found" } as const;
  if (record.status === "settled" || record.status === "forgiven") {
    return { ok: false, error: "Stream is already closed" } as const;
  }

  // Guard: settlement cannot exceed the outstanding debt amount
  if (amount > Number(record.amount) + 0.01) {
    return { ok: false, error: "Settlement amount exceeds the outstanding debt" } as const;
  }

  try {
    const [settlement] = await db
      .insert(streamSettlements)
      .values({
        streamId,
        amount:     String(amount),
        currency:   record.currency,
        note:       note || null,
        recordedBy: user.id,
      })
      .returning({ id: streamSettlements.id });

    // Check if total settlements now cover the full amount
    const [totalRow] = await db
      .select({ total: sum(streamSettlements.amount) })
      .from(streamSettlements)
      .where(eq(streamSettlements.streamId, streamId));

    const totalSettled = Number(totalRow?.total ?? 0);

    if (totalSettled >= Number(record.amount) - 0.01) {
      await db
        .update(streamRecords)
        .set({ status: "settled", settledAt: new Date(), updatedAt: new Date() })
        .where(eq(streamRecords.id, streamId));
    } else {
      // Partial — just update updatedAt
      await db
        .update(streamRecords)
        .set({ updatedAt: new Date() })
        .where(eq(streamRecords.id, streamId));
    }

    // Notify the other party
    const otherUserId =
      record.creatorId === user.id ? record.counterpartId : record.creatorId;
    if (otherUserId) {
      const amountStr = formatCurrency(amount, record.currency);
      sendStreamPush(otherUserId, {
        title: "Settled ✓",
        body:  `${amountStr} marked as settled`,
        // From the receiver's perspective, the current user IS the person — link to their page
        url:   `/stream/${user.id}`,
      }).catch(() => {});
    }

    revalidatePath("/stream", "layout");
    revalidatePath("/groups", "layout");

    return { ok: true, settlementId: settlement.id } as const;
  } catch (err) {
    console.error("settleStream error:", err);
    return { ok: false, error: "Failed to record settlement" } as const;
  }
}


// ── Undo a Settlement ─────────────────────────────────────────────────────────

export async function undoSettleStream(settlementId: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" } as const;

  // Verify the settlement belongs to a stream the user is party to
  const [settlement] = await db
    .select()
    .from(streamSettlements)
    .where(eq(streamSettlements.id, settlementId))
    .limit(1);

  if (!settlement) return { ok: false, error: "Settlement not found" } as const;
  if (settlement.recordedBy !== user.id) return { ok: false, error: "Not authorized" } as const;

  const [record] = await db
    .select()
    .from(streamRecords)
    .where(eq(streamRecords.id, settlement.streamId))
    .limit(1);

  if (!record) return { ok: false, error: "Stream not found" } as const;

  // S-7 + S-8 fix: wrap DELETE + UPDATE in one transaction AND use disputedAt as the
  // authoritative signal for status restoration (same fix as S-5 for undoSettleWithPerson
  // but was missed here).  Without the transaction, a failed UPDATE after a committed
  // DELETE leaves the settlement gone but the stream permanently locked as "settled".
  try {
    await db.transaction(async (tx) => {
      await tx
        .delete(streamSettlements)
        .where(eq(streamSettlements.id, settlementId));

      // Revert status if stream was marked as fully settled
      if (record.status === "settled") {
        const previousStatus =
          record.disputedAt  ? "disputed"  :
          record.confirmedAt ? "confirmed" :
          "pending";
        await tx
          .update(streamRecords)
          .set({ status: previousStatus, settledAt: null, updatedAt: new Date() })
          .where(eq(streamRecords.id, record.id));
      }
    });

    revalidatePath("/stream", "layout");
    revalidatePath("/groups", "layout");

    return { ok: true } as const;
  } catch (err) {
    console.error("undoSettleStream error:", err);
    return { ok: false, error: "Failed to undo settlement" } as const;
  }
}


// ── Forgive a Stream ──────────────────────────────────────────────────────────

export async function forgiveStream(streamId: string, privateNote?: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" } as const;

  // Only the creditor (the person owed money) can forgive
  const [record] = await db
    .select()
    .from(streamRecords)
    .where(eq(streamRecords.id, streamId))
    .limit(1);

  if (!record) return { ok: false, error: "Stream not found" } as const;

  const isCreditor =
    (record.creatorId === user.id && record.direction === "they_owe_me") ||
    (record.counterpartId === user.id && record.direction === "i_owe_them");

  if (!isCreditor) {
    return { ok: false, error: "Only the creditor can forgive a Stream" } as const;
  }

  if (record.status === "forgiven") {
    return { ok: false, error: "Already forgiven" } as const;
  }

  try {
    await db
      .update(streamRecords)
      .set({
        status:      "forgiven",
        forgivenAt:  new Date(),
        forgivenNote: privateNote || null,
        updatedAt:   new Date(),
      })
      .where(eq(streamRecords.id, streamId));

    // Counterpart is intentionally NOT notified — forgiveness is a private act.

    revalidatePath("/stream", "layout");
    revalidatePath("/groups", "layout");

    return { ok: true } as const;
  } catch (err) {
    console.error("forgiveStream error:", err);
    return { ok: false, error: "Failed to forgive Stream" } as const;
  }
}


// ── Delete a Stream (creator only, pending only) ──────────────────────────────

export async function deleteStream(streamId: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" } as const;

  const [record] = await db
    .select()
    .from(streamRecords)
    .where(
      and(
        eq(streamRecords.id, streamId),
        eq(streamRecords.creatorId, user.id),
      ),
    )
    .limit(1);

  if (!record) return { ok: false, error: "Stream not found" } as const;
  if (record.status !== "pending") {
    return { ok: false, error: "Only pending Streams can be deleted" } as const;
  }

  try {
    await db.delete(streamRecords).where(eq(streamRecords.id, streamId));

    revalidatePath("/stream", "layout");
    revalidatePath("/groups", "layout");

    return { ok: true } as const;
  } catch (err) {
    console.error("deleteStream error:", err);
    return { ok: false, error: "Failed to delete Stream" } as const;
  }
}


// ── Settle entire balance with a person ──────────────────────────────────────

/**
 * Marks ALL active stream records between the current user and a counterpart
 * as settled in one action.
 *
 * Mental model: "We're all square now." Both parties agree the net is zero.
 * Returns the settled stream IDs so the client can undo within the toast window.
 */
export async function settleWithPerson(
  counterpartId: string,
  note?: string,
  /** If provided and less than total net, settle oldest entries first until amount is covered. */
  partialAmount?: number,
) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" } as const;

  const ACTIVE = ["pending", "confirmed", "disputed"] as const;

  // Fetch all active streams between the two parties (both directions).
  // Three cases cover all combinations of Clear users and guests:
  //   1. User is creator → counterpart is a Clear user   (counterpart_id)
  //   2. Counterpart (Clear user) is creator → user is counterpart
  //   3. User is creator → counterpart is a guest         (counterpart_guest_id)
  // Note: guests can never be creators, so no 4th case is needed.
  const active = await db
    .select({ id: streamRecords.id, amount: streamRecords.amount, createdAt: streamRecords.createdAt })
    .from(streamRecords)
    .where(
      and(
        inArray(streamRecords.status, [...ACTIVE]),
        or(
          and(eq(streamRecords.creatorId, user.id),       eq(streamRecords.counterpartId, counterpartId)),
          and(eq(streamRecords.creatorId, counterpartId), eq(streamRecords.counterpartId, user.id)),
          and(eq(streamRecords.creatorId, user.id),       eq(streamRecords.counterpartGuestId, counterpartId)),
        ),
      ),
    )
    .orderBy(asc(streamRecords.createdAt));  // oldest first for partial allocation

  if (active.length === 0) {
    return { ok: false, error: "No active streams to settle" } as const;
  }

  // Determine which streams to settle
  let ids: string[];
  if (partialAmount && partialAmount > 0) {
    // Settle oldest entries first — only include entries whose full amount is
    // covered by the remaining partial budget.  Never mark an entry as "settled"
    // if only part of it was paid; stop at the first entry that would exceed
    // the remaining budget.  (Bug S-1 fix: the previous code pushed the id
    // before checking, so a ₹50 payment could wipe a ₹200 entry.)
    let remaining = partialAmount;
    ids = [];
    for (const r of active) {
      const amt = Number(r.amount);
      if (remaining <= 0) break;
      if (amt <= remaining + 0.01) {
        ids.push(r.id);
        remaining -= amt;
      } else {
        // Next entry is larger than remaining budget — stop here
        break;
      }
    }
  } else {
    ids = active.map((r) => r.id);
  }

  const now = new Date();
  try {
    await db
      .update(streamRecords)
      .set({ status: "settled", settledAt: now, updatedAt: now })
      .where(inArray(streamRecords.id, ids));

    // Push notification to counterpart — deep-link to their view of this relationship
    sendStreamPush(counterpartId, {
      title: "Settled ✓",
      body:  note ? `Balance cleared — ${note}` : "Your balance has been marked as settled",
      url:   `/stream/${user.id}`,
    }).catch(() => {});

    revalidatePath("/stream", "layout");
    revalidatePath("/groups", "layout");

    return { ok: true, settledIds: ids } as const;
  } catch (err) {
    console.error("settleWithPerson error:", err);
    return { ok: false, error: "Failed to settle" } as const;
  }
}


/**
 * Undoes a bulk settle — reverts all specified streams back to their previous
 * active status. Used by the 5-second undo toast after settleWithPerson.
 */
export async function undoSettleWithPerson(streamIds: string[]) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" } as const;
  if (!streamIds.length) return { ok: true } as const;

  try {
    const rows = await db
      .select({
        id:          streamRecords.id,
        confirmedAt: streamRecords.confirmedAt,
        disputedAt:  streamRecords.disputedAt,
      })
      .from(streamRecords)
      .where(
        and(
          inArray(streamRecords.id, streamIds),
          or(
            eq(streamRecords.creatorId, user.id),
            eq(streamRecords.counterpartId, user.id),
          ),
        ),
      );

    // S-9 fix: group rows by their pre-settle status and run 3 batch inArray UPDATEs
    // inside a single transaction.  The previous N-individual-UPDATEs loop was not
    // atomic — if update K failed, rows 0..K-1 were committed while K..N-1 were not,
    // leaving a partially-reverted balance.  Grouping also reduces DB round-trips
    // from N to at most 3 regardless of how many streams are being undone.
    const now = new Date();
    const disputedIds  = rows.filter((r) =>  r.disputedAt                      ).map((r) => r.id);
    const confirmedIds = rows.filter((r) => !r.disputedAt &&  r.confirmedAt    ).map((r) => r.id);
    const pendingIds   = rows.filter((r) => !r.disputedAt && !r.confirmedAt    ).map((r) => r.id);

    await db.transaction(async (tx) => {
      if (disputedIds.length > 0)
        await tx.update(streamRecords)
          .set({ status: "disputed",  settledAt: null, updatedAt: now })
          .where(inArray(streamRecords.id, disputedIds));
      if (confirmedIds.length > 0)
        await tx.update(streamRecords)
          .set({ status: "confirmed", settledAt: null, updatedAt: now })
          .where(inArray(streamRecords.id, confirmedIds));
      if (pendingIds.length > 0)
        await tx.update(streamRecords)
          .set({ status: "pending",   settledAt: null, updatedAt: now })
          .where(inArray(streamRecords.id, pendingIds));
    });

    revalidatePath("/stream", "layout");
    revalidatePath("/groups", "layout");

    return { ok: true } as const;
  } catch (err) {
    console.error("undoSettleWithPerson error:", err);
    return { ok: false, error: "Failed to undo" } as const;
  }
}


/**
 * Forgives ALL active stream records where the current user is the creditor
 * (they owe me). Counterpart is not notified — this is a private act.
 */
export async function forgiveAllActiveStreams(
  counterpartId: string,
  privateNote?: string,
) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" } as const;

  const ACTIVE = ["pending", "confirmed", "disputed"] as const;

  // Only forgive streams where current user is the creditor (they are owed money).
  // Three cases: clear-user counterpart, clear-user as creator, and guest counterpart.
  const forgivable = await db
    .select({ id: streamRecords.id })
    .from(streamRecords)
    .where(
      and(
        inArray(streamRecords.status, [...ACTIVE]),
        or(
          // Case 1: user created it, "they owe me", Clear-user counterpart
          and(
            eq(streamRecords.creatorId, user.id),
            eq(streamRecords.direction, "they_owe_me"),
            eq(streamRecords.counterpartId, counterpartId),
          ),
          // Case 2: Clear-user counterpart is creator, "i owe them" (so viewer is owed)
          and(
            eq(streamRecords.creatorId, counterpartId),
            eq(streamRecords.direction, "i_owe_them"),
            eq(streamRecords.counterpartId, user.id),
          ),
          // Case 3: user created it, "they owe me", guest counterpart
          and(
            eq(streamRecords.creatorId, user.id),
            eq(streamRecords.direction, "they_owe_me"),
            eq(streamRecords.counterpartGuestId, counterpartId),
          ),
        ),
      ),
    );

  if (forgivable.length === 0) {
    return { ok: false, error: "Nothing to forgive" } as const;
  }

  const ids = forgivable.map((r) => r.id);

  try {
    await db
      .update(streamRecords)
      .set({
        status:      "forgiven",
        forgivenAt:  new Date(),
        forgivenNote: privateNote || null,
        updatedAt:   new Date(),
      })
      .where(inArray(streamRecords.id, ids));

    // Counterpart is intentionally NOT notified.

    revalidatePath("/stream", "layout");
    revalidatePath("/groups", "layout");

    return { ok: true, forgivenCount: ids.length } as const;
  } catch (err) {
    console.error("forgiveAllActiveStreams error:", err);
    return { ok: false, error: "Failed to forgive" } as const;
  }
}


// ── Self-report a stream settlement (debtor side) ────────────────────────────

/**
 * Debtor reports they've paid. Creates a streamSettlement with is_confirmed=false
 * and pushes a notification to the creditor to confirm.
 *
 * Permission: current user must be the net debtor (net < 0) for this counterpart.
 */
export async function selfReportStreamSettle(input: SelfReportStreamSettleInput) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" } as const;

  const parsed = selfReportStreamSettleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Invalid input" } as const;
  }

  const { counterpartId, amount, currency, paymentMethod, utrReference } = parsed.data;

  const ACTIVE = ["pending", "confirmed", "disputed"] as const;

  // Find all active records between the two parties (both directions)
  const active = await db
    .select({
      id:            streamRecords.id,
      amount:        streamRecords.amount,
      direction:     streamRecords.direction,
      creatorId:     streamRecords.creatorId,
      counterpartId: streamRecords.counterpartId,
    })
    .from(streamRecords)
    .where(
      and(
        inArray(streamRecords.status, [...ACTIVE]),
        or(
          and(eq(streamRecords.creatorId, user.id),       eq(streamRecords.counterpartId, counterpartId)),
          and(eq(streamRecords.creatorId, counterpartId), eq(streamRecords.counterpartId, user.id)),
        ),
      ),
    )
    .orderBy(asc(streamRecords.createdAt));

  if (active.length === 0) {
    return { ok: false, error: "No active balance to settle" } as const;
  }

  // Compute net from current user's perspective (positive = owed to user, negative = user owes)
  let net = 0;
  for (const r of active) {
    const isCreator = r.creatorId === user.id;
    const amt = Number(r.amount);
    if (isCreator) {
      net += r.direction === "they_owe_me" ? amt : -amt;
    } else {
      net += r.direction === "they_owe_me" ? -amt : amt;
    }
  }

  if (net >= 0) {
    return { ok: false, error: "You don't owe anything to this person" } as const;
  }

  // Attach the settlement to the oldest active record (primary record)
  const primaryRecord = active[0];

  try {
    const [settlement] = await db
      .insert(streamSettlements)
      .values({
        streamId:      primaryRecord.id,
        amount:        String(amount),
        currency,
        note:          null,
        recordedBy:    user.id,
        isConfirmed:   false,
        paymentMethod: paymentMethod ?? null,
        utrReference:  utrReference ?? null,
      })
      .returning({ id: streamSettlements.id });

    // Push-notify the creditor (counterpart)
    const userName  = (user.user_metadata?.full_name as string | undefined) ?? "Someone";
    const amountStr = formatCurrency(amount, currency);
    sendStreamPush(counterpartId, {
      title: "💸 Payment reported",
      body:  `${userName} says they settled ${amountStr} with you. Confirm →`,
      // ?confirm= auto-scrolls to the pending settlement badge on the creditor's timeline
      url:   `/stream/${user.id}?confirm=${settlement.id}`,
    }).catch(() => {});

    revalidatePath("/stream", "layout");
    revalidatePath("/groups", "layout");

    return { ok: true, settlementId: settlement.id } as const;
  } catch (err) {
    console.error("selfReportStreamSettle error:", err);
    return { ok: false, error: "Failed to report settlement" } as const;
  }
}


// ── Confirm a self-reported stream settlement (creditor side) ─────────────────

/**
 * Creditor confirms the debtor's self-reported payment.
 * Marks the settlement as confirmed, then settles all active records
 * between the two parties (same logic as settleWithPerson).
 *
 * Permission: current user must be the creditor for the associated stream record
 * (i.e. the party who is NOT settlement.recordedBy).
 */
export async function confirmStreamSettle(settlementId: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" } as const;

  // Fetch settlement
  const [settlement] = await db
    .select()
    .from(streamSettlements)
    .where(eq(streamSettlements.id, settlementId))
    .limit(1);

  if (!settlement)               return { ok: false, error: "Settlement not found" } as const;
  if (settlement.isConfirmed)    return { ok: false, error: "Already confirmed" } as const;

  // Fetch the associated stream record
  const [record] = await db
    .select()
    .from(streamRecords)
    .where(eq(streamRecords.id, settlement.streamId))
    .limit(1);

  if (!record) return { ok: false, error: "Stream not found" } as const;

  // Determine creditor = the party who did NOT self-report
  const debtorId = settlement.recordedBy;
  const creditorId =
    record.creatorId === debtorId
      ? record.counterpartId
      : record.counterpartId === debtorId
        ? record.creatorId
        : null;

  if (!creditorId || creditorId !== user.id) {
    return { ok: false, error: "Not authorised to confirm this settlement" } as const;
  }

  // S-10 fix: wrap the settlement confirm + stream-record settle in one transaction.
  // Previously, if the streamRecords UPDATE failed after streamSettlements was confirmed,
  // the settlement appeared confirmed but the balance showed as still outstanding —
  // unrecoverable without direct DB access.
  try {
    await db.transaction(async (tx) => {
      // Step 1: mark the settlement row as confirmed
      await tx
        .update(streamSettlements)
        .set({ isConfirmed: true })
        .where(eq(streamSettlements.id, settlementId));

      // Step 2: settle stream records up to the confirmed amount.
      // Oldest entries first — only entries whose full amount fits within the
      // paid amount are settled (Bug S-2 fix retained inside the transaction).
      const ACTIVE = ["pending", "confirmed", "disputed"] as const;
      const activeRecords = await tx
        .select({ id: streamRecords.id, amount: streamRecords.amount })
        .from(streamRecords)
        .where(
          and(
            inArray(streamRecords.status, [...ACTIVE]),
            or(
              and(eq(streamRecords.creatorId, user.id),  eq(streamRecords.counterpartId, debtorId)),
              and(eq(streamRecords.creatorId, debtorId), eq(streamRecords.counterpartId, user.id)),
            ),
          ),
        )
        .orderBy(asc(streamRecords.createdAt));

      if (activeRecords.length > 0) {
        const paidAmount       = Number(settlement.amount);
        const totalOutstanding = activeRecords.reduce((s, r) => s + Number(r.amount), 0);

        let toSettleIds: string[];
        if (paidAmount >= totalOutstanding - 0.01) {
          toSettleIds = activeRecords.map((r) => r.id);
        } else {
          let remaining = paidAmount;
          toSettleIds = [];
          for (const r of activeRecords) {
            const amt = Number(r.amount);
            if (remaining <= 0) break;
            if (amt <= remaining + 0.01) {
              toSettleIds.push(r.id);
              remaining -= amt;
            } else {
              break;
            }
          }
        }

        if (toSettleIds.length > 0) {
          const now = new Date();
          await tx
            .update(streamRecords)
            .set({ status: "settled", settledAt: now, updatedAt: now })
            .where(inArray(streamRecords.id, toSettleIds));
        }
      }
    });

    // Notify debtor: their payment was confirmed (outside transaction — fire-and-forget)
    const amountStr = formatCurrency(Number(settlement.amount), settlement.currency);
    sendStreamPush(debtorId, {
      title: "✓ Payment confirmed",
      body:  `${amountStr} settlement confirmed. Balance cleared!`,
      url:   `/stream/${user.id}`,
    }).catch(() => {});

    revalidatePath("/stream", "layout");
    revalidatePath("/groups", "layout");

    return { ok: true } as const;
  } catch (err) {
    console.error("confirmStreamSettle error:", err);
    return { ok: false, error: "Failed to confirm settlement" } as const;
  }
}


// ── Dispute a self-reported stream settlement (creditor side) ─────────────────

/**
 * Creditor disputes the debtor's self-reported payment (deletes the record).
 * Same permission check as confirmStreamSettle.
 */
export async function disputeStreamSettle(
  settlementId: string,
  /** Human-readable reason from the 2-step inline picker in PaymentPendingBadge */
  reason?: string,
) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" } as const;

  const [settlement] = await db
    .select()
    .from(streamSettlements)
    .where(eq(streamSettlements.id, settlementId))
    .limit(1);

  if (!settlement)             return { ok: false, error: "Settlement not found" } as const;
  if (settlement.isConfirmed)  return { ok: false, error: "Cannot dispute a confirmed settlement" } as const;

  const [record] = await db
    .select()
    .from(streamRecords)
    .where(eq(streamRecords.id, settlement.streamId))
    .limit(1);

  if (!record) return { ok: false, error: "Stream not found" } as const;

  const debtorId = settlement.recordedBy;
  const creditorId =
    record.creatorId === debtorId
      ? record.counterpartId
      : record.counterpartId === debtorId
        ? record.creatorId
        : null;

  if (!creditorId || creditorId !== user.id) {
    return { ok: false, error: "Not authorised to dispute this settlement" } as const;
  }

  try {
    await db
      .delete(streamSettlements)
      .where(eq(streamSettlements.id, settlementId));

    // Notify debtor: payment was disputed (include reason if provided)
    const userName     = (user.user_metadata?.full_name as string | undefined) ?? "Someone";
    const amountStr    = formatCurrency(Number(settlement.amount), settlement.currency);
    const reasonSuffix = reason ? ` Reason: "${reason}".` : "";
    sendStreamPush(debtorId, {
      title: "⚠️ Payment disputed",
      body:  `${userName} disputed the ${amountStr} payment.${reasonSuffix} Please re-check and try again.`,
      url:   `/stream/${user.id}`,
    }).catch(() => {});

    revalidatePath("/stream", "layout");
    revalidatePath("/groups", "layout");

    return { ok: true } as const;
  } catch (err) {
    console.error("disputeStreamSettle error:", err);
    return { ok: false, error: "Failed to dispute settlement" } as const;
  }
}


// ── Thin server-action wrappers for client components ────────────────────────

/** Returns recent stream counterparts for the log sheet "Recents" list. */
export async function getRecentStreamCounterpartsAction() {
  const user = await getCurrentUser();
  if (!user) return [];
  return getRecentStreamCounterparts(user.id);
}

/** Searches people the user can Stream with (for the log sheet search input). */
export async function searchStreamableUsersAction(query: string) {
  const user = await getCurrentUser();
  if (!user) return [];
  if (!query.trim()) return getRecentStreamCounterparts(user.id);
  return searchStreamableUsers(user.id, query.trim());
}

/** Returns the last stream logged with a specific person (for smart context hint). */
export async function fetchLastStreamContextAction(personId: string) {
  const user = await getCurrentUser();
  if (!user) return null;

  const [record] = await db
    .select()
    .from(streamRecords)
    .where(
      and(
        or(
          and(eq(streamRecords.creatorId, user.id), eq(streamRecords.counterpartId, personId)),
          and(eq(streamRecords.creatorId, user.id), eq(streamRecords.counterpartGuestId, personId)),
          and(eq(streamRecords.creatorId, personId), eq(streamRecords.counterpartId, user.id)),
        ),
      ),
    )
    .orderBy(sql`created_at DESC`)
    .limit(1);

  if (!record) return null;

  return {
    amount:    Number(record.amount),
    currency:  record.currency,
    note:      record.note,
    direction: record.direction,
    createdAt: record.createdAt,
  };
}
