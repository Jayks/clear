"use server";

import { db } from "@/lib/db/client";
import { paymentRequests } from "@/lib/db/schema/payment-requests";
import { circleContributions } from "@/lib/db/schema/circle-contributions";
import { groupMembers } from "@/lib/db/schema/group-members";
import { groups } from "@/lib/db/schema/groups";
import { eq, and, inArray, sql } from "drizzle-orm";
import { formatCurrency } from "@/lib/utils";
import { getCurrentUser, getMembership } from "@/lib/db/queries/auth";
import { getDefaultUpiId } from "@/lib/db/queries/upi";
import { revalidatePath, revalidateTag } from "next/cache";
import { sendPushToUser } from "@/lib/notifications/send-push-notification";
import { insertConfirmedSettlement } from "@/lib/settlements/insert-settlement";
import { selfReportExternalPaymentSchema } from "@/lib/validations/payment-requests";

// ── selfReportExternalPayment ─────────────────────────────────────────────────
// Called by the public /request/[token] page — NO auth check.
// Ghost self-reports that they paid; this updates the request status and, for
// circles, atomically inserts the unconfirmed circle_contributions row so the
// admin's "awaiting confirmation" badge shows immediately.

export async function selfReportExternalPayment(
  token:         string,
  method:        "upi" | "cash" | "bank",
  utrReference?: string,
  paidAmount?:   number,  // required for Flexi circles (request.amount === null)
): Promise<{ ok: true } | { ok: false; error: string }> {
  // Round 16 fix #7: this is the one PUBLIC, unauthenticated money-adjacent
  // action (called from /request/[token], no auth check by design). It had
  // no Zod validation — an unbounded/Infinity/NaN paidAmount would overflow
  // the numeric(12,2) column, throw past this action, and the caller
  // (request-client.tsx) never sets `error` on a thrown (not returned)
  // rejection — the guest taps Confirm and nothing visibly happens.
  const parsed = selfReportExternalPaymentSchema.safeParse({ method, utrReference, paidAmount });
  if (!parsed.success) {
    return { ok: false, error: "Please check the amount and try again" };
  }
  // Round to 2 decimals up front — the DB column is numeric(12,2), and a
  // value like 500.555 would otherwise store as a silently-truncated 500.55
  // or 500.56 depending on the driver, rather than an intentional round.
  const roundedPaidAmount = parsed.data.paidAmount !== undefined
    ? Math.round(parsed.data.paidAmount * 100) / 100
    : undefined;

  try {
    return await selfReportExternalPaymentInner(token, method, utrReference, roundedPaidAmount);
  } catch (err) {
    console.error("[payment-requests] selfReportExternalPayment failed:", err);
    return { ok: false, error: "Something went wrong — please try again" };
  }
}

async function selfReportExternalPaymentInner(
  token:         string,
  method:        "upi" | "cash" | "bank",
  utrReference:  string | undefined,
  paidAmount:    number | undefined,
): Promise<{ ok: true } | { ok: false; error: string }> {
  // ── Fetch the request (service-role read; no auth needed) ──────────────────
  const request = await db
    .select()
    .from(paymentRequests)
    .where(eq(paymentRequests.token, token))
    .limit(1)
    .then((r) => r[0] ?? null);

  if (!request) return { ok: false, error: "Link not found" };
  if (request.expiresAt < new Date()) return { ok: false, error: "Link has expired" };
  // Any status other than 'pending' is already handled — return ok (idempotent).
  if (request.status !== "pending") return { ok: true };

  // ── Validate Flexi amount ──────────────────────────────────────────────────
  if (request.amount === null) {
    if (!paidAmount || paidAmount <= 0) {
      return { ok: false, error: "Please enter the amount you paid" };
    }
  }

  const isCircle = request.contextType === "circle";

  // ── Trip / Nest: atomic status flip only (no contribution row) ─────────────
  if (!isCircle) {
    const [updated] = await db
      .update(paymentRequests)
      .set({
        status:          "self_reported",
        paymentMethod:   method,
        utrReference:    utrReference ?? null,
        selfReportedAt:  new Date(),
      })
      .where(and(
        eq(paymentRequests.token, token),
        eq(paymentRequests.status, "pending"),
      ))
      .returning();

    // 0 rows → concurrent self-report already handled this; safe to return ok.
    if (!updated) return { ok: true };
  }

  // ── Circle: single transaction (status flip + contribution INSERT) ─────────
  // The status flip and INSERT must be atomic. A split-transaction approach
  // (UPDATE commits, INSERT fails) leaves status='self_reported' with
  // contribution_id=null — when the admin confirms, confirmContribution(null,…)
  // returns "Contribution not found" and loops forever.
  if (isCircle) {
    const txResult = await db.transaction(async (tx) => {

      // Step 1: atomic status flip — guards against double-tap / concurrent reports.
      const [updated] = await tx
        .update(paymentRequests)
        .set({
          status:          "self_reported",
          paymentMethod:   method,
          utrReference:    utrReference ?? null,
          selfReportedAt:  new Date(),
        })
        .where(and(
          eq(paymentRequests.token, token),
          eq(paymentRequests.status, "pending"),
        ))
        .returning();

      // 0 rows → already handled (concurrent or prior call); abort and return ok.
      if (!updated) return { alreadyHandled: true } as const;

      // Step 2a: confirmed dedup (recurring circles only — mirrors selfReportContribution's
      // `if (input.period)` guard; one-time circles may have multiple contributions).
      if (updated.circlePeriod && updated.payerMemberId) {
        const [existingConfirmed] = await tx
          .select({ id: circleContributions.id })
          .from(circleContributions)
          .where(and(
            eq(circleContributions.groupId,    updated.groupId),
            eq(circleContributions.memberId,   updated.payerMemberId),
            eq(circleContributions.period,     updated.circlePeriod),
            eq(circleContributions.isConfirmed, true),
          ));

        if (existingConfirmed) {
          // Edge case: admin already recorded the contribution manually between token
          // generation and the ghost's self-report. Mark the request confirmed right
          // away — no admin confirm step needed.
          await tx
            .update(paymentRequests)
            .set({
              status:         "confirmed",
              confirmedAt:    new Date(),
              contributionId: existingConfirmed.id,
            })
            .where(eq(paymentRequests.id, updated.id));
          return { alreadyConfirmed: true } as const;
        }
      }

      // Step 2b: pending dedup — no existing unconfirmed contribution for this member.
      // In practice this cannot arise (step 1's WHERE guard prevents a second
      // concurrent self-report reaching here), but guard defensively.
      if (updated.payerMemberId) {
        const [existingPending] = await tx
          .select({ id: circleContributions.id })
          .from(circleContributions)
          .where(and(
            eq(circleContributions.groupId,    updated.groupId),
            eq(circleContributions.memberId,   updated.payerMemberId),
            eq(circleContributions.isConfirmed, false),
          ));

        if (existingPending) return { alreadyPending: true } as const;
      }

      // Step 3: INSERT circle_contributions (unconfirmed — admin will confirm later).
      // currency passed explicitly: the column is NOT NULL DEFAULT 'INR'; omitting it
      // would silently record a non-INR circle's contribution as INR.
      const effectiveAmount = paidAmount ?? Number(updated.amount);
      const [newContrib] = await tx
        .insert(circleContributions)
        .values({
          groupId:       updated.groupId,
          memberId:      updated.payerMemberId!,
          amount:        String(effectiveAmount),
          currency:      updated.currency,
          period:        updated.circlePeriod ?? undefined,
          recordedBy:    updated.createdByUserId,  // admin who generated the request
          isConfirmed:   false,
          paymentMethod: method,
          utrReference:  utrReference ?? null,
        })
        .returning({ id: circleContributions.id });

      // Step 4: write contribution_id back to the request so confirmExternalPayment
      // can call confirmContribution(contributionId) without a separate lookup.
      await tx
        .update(paymentRequests)
        .set({ contributionId: newContrib.id })
        .where(eq(paymentRequests.id, updated.id));

      return { contributionId: newContrib.id } as const;
    });

    // If already handled or already confirmed, return ok without sending a push.
    // (alreadyConfirmed = payment already recorded; no admin action needed;
    //  notifying "please confirm" would be misleading.)
    if ("alreadyHandled" in txResult || "alreadyConfirmed" in txResult || "alreadyPending" in txResult) {
      return { ok: true };
    }
  }

  // ── Push notification to payee ─────────────────────────────────────────────
  // sendPushToUser checks notifications_muted for the group; passes silently
  // if the payee has no push subscription.
  const notifyAmount = request.amount !== null
    ? Number(request.amount)
    : (paidAmount ?? null);

  const amountStr = notifyAmount !== null
    ? formatCurrency(notifyAmount, request.currency)
    : "an amount";

  const deepLink = request.contextType === "circle"
    ? `/groups/${request.groupId}`
    : `/groups/${request.groupId}/settle`;

  await sendPushToUser({
    targetUserId: request.payeeUserId,
    groupId:      request.groupId,
    title:        "💸 Payment reported",
    body:         `${request.payerName} says they paid ${amountStr}. Confirm →`,
    url:          deepLink,
  }).catch(() => { /* push failure must never surface to the guest */ });

  return { ok: true };
}

// ── generatePaymentRequest ────────────────────────────────────────────────────
// Called by CircleReminderButton (admin) to create or reuse a per-ghost token.
// Dedup strategy:
//   1. If a live pending/self_reported token already exists for this
//      (groupId, payerMemberId, circlePeriod) combination → reuse it.
//   2. If the reusable row is expired AND still 'pending' → renew expiresAt in-place.
//   3. If the reusable row is expired AND 'self_reported' → return as-is (admin surface
//      handles confirmation; a fresh token would create a second pending row).
//   4. No existing row → INSERT new.
//   5. Unique constraint violation (concurrent first INSERT) → re-fetch winner.

export interface GeneratePaymentRequestInput {
  /** "circle" | "trip" | "nest" — defaults to "circle" for backward compat */
  contextType:   "circle" | "trip" | "nest";
  groupId:       string;
  groupName:     string;
  /** Ghost group_members.id — the person who owes */
  payerMemberId: string;
  payerName:     string;
  /** Fixed amount; null only for Flexi one-time circles */
  amount:        number | null;
  currency:      string;
  /** "2026-06" for recurring circles; null for one-time circles and trip/nest */
  circlePeriod:  string | null;
  description?:  string;
}

export async function generatePaymentRequest(
  input: GeneratePaymentRequestInput,
): Promise<{ ok: true; token: string } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" } as const;

  const membership = await getMembership(input.groupId, user.id);
  if (!membership || membership.role !== "admin")
    return { ok: false, error: "Only admins can send payment requests" } as const;

  // Payee info (the admin generating the request)
  const payeeName =
    membership.displayName ?? user.user_metadata?.full_name ?? user.email ?? "Admin";
  const upiRow  = await getDefaultUpiId(user.id);
  const payeeUpiId = upiRow?.upiId ?? null;

  // ── Dedup: look for a live token for this payer+payee+period ────────────────
  // Must match the partial unique index columns exactly:
  //   (group_id, COALESCE(payer_member_id,''), COALESCE(payee_member_id,''), COALESCE(circle_period,''))
  // Including payeeMemberId ensures separate creditors can each have a live token
  // for the same ghost debtor in a Trip/Nest with multiple creditors.
  const [existing] = await db
    .select()
    .from(paymentRequests)
    .where(
      and(
        eq(paymentRequests.groupId, input.groupId),
        eq(paymentRequests.payerMemberId, input.payerMemberId),
        sql`COALESCE(${paymentRequests.payeeMemberId}::text, '') = COALESCE(${membership.id}::text, '')`,
        sql`COALESCE(${paymentRequests.circlePeriod}, '') = COALESCE(${input.circlePeriod ?? null}, '')`,
        inArray(paymentRequests.status, ["pending", "self_reported"]),
      ),
    )
    .limit(1);

  if (existing) {
    const now       = new Date();
    const isExpired = existing.expiresAt < now;

    if (!isExpired) {
      // Live token — reuse without modification
      return { ok: true, token: existing.token } as const;
    }

    if (existing.status === "pending") {
      // Expired pending: renew the expiry in-place so the old link comes back to life.
      // (Avoids creating a second token that would violate the dedup index once the
      // expired row is included in the partial-index boundary again after the UPDATE.)
      const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await db
        .update(paymentRequests)
        .set({ expiresAt: newExpiry })
        .where(eq(paymentRequests.id, existing.id));
      return { ok: true, token: existing.token } as const;
    }

    // Expired self_reported: the ghost already reported a payment; the admin needs to
    // confirm it rather than generate a fresh request.  Return the token so the admin
    // can still see the request link (it will render the "waiting for confirmation" state).
    return { ok: true, token: existing.token } as const;
  }

  // ── No existing row: INSERT new ───────────────────────────────────────────────
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // +7 days

  try {
    const [row] = await db
      .insert(paymentRequests)
      .values({
        contextType:     input.contextType,
        groupId:         input.groupId,
        groupName:       input.groupName,
        amount:          input.amount !== null ? String(input.amount) : null,
        currency:        input.currency,
        description:     input.description ?? null,
        payerName:       input.payerName,
        payerMemberId:   input.payerMemberId,
        payeeUserId:     user.id,
        payeeMemberId:   membership.id,
        payeeName,
        payeeUpiId,
        circlePeriod:    input.circlePeriod ?? null,
        status:          "pending",
        createdByUserId: user.id,
        expiresAt,
      })
      .returning({ token: paymentRequests.token });

    return { ok: true, token: row.token } as const;
  } catch (err: unknown) {
    // Unique-constraint violation (23505) — concurrent INSERT won the race.
    // Re-query to return the winner's token.
    if ((err as { code?: string }).code === "23505") {
      const [winner] = await db
        .select({ token: paymentRequests.token })
        .from(paymentRequests)
        .where(
          and(
            eq(paymentRequests.groupId, input.groupId),
            eq(paymentRequests.payerMemberId, input.payerMemberId),
            sql`COALESCE(${paymentRequests.payeeMemberId}::text, '') = COALESCE(${membership.id}::text, '')`,
            sql`COALESCE(${paymentRequests.circlePeriod}, '') = COALESCE(${input.circlePeriod ?? null}, '')`,
            inArray(paymentRequests.status, ["pending", "self_reported"]),
          ),
        )
        .limit(1);

      if (winner) return { ok: true, token: winner.token } as const;
      return { ok: false, error: "Concurrent request conflict — please try again" } as const;
    }
    throw err;
  }
}

// ── confirmExternalPayment ────────────────────────────────────────────────────
// Called by the admin confirmation surface (circle contribution roster / settle page).
// Atomically marks the payment request confirmed and records the financial row.
//
// Circle path:  payment_requests.contributionId → confirmContribution(contributionId)
// Trip/Nest:    M3 (not yet implemented).

export async function confirmExternalPayment(
  requestId: string,
  groupId:   string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" } as const;

  const membership = await getMembership(groupId, user.id);
  if (!membership || membership.role !== "admin")
    return { ok: false, error: "Only admins can confirm payments" } as const;

  // ── Fetch the request ─────────────────────────────────────────────────────
  const [request] = await db
    .select()
    .from(paymentRequests)
    .where(and(eq(paymentRequests.id, requestId), eq(paymentRequests.groupId, groupId)))
    .limit(1);

  if (!request) return { ok: false, error: "Payment request not found" } as const;

  // Idempotent: already confirmed or disputed → success
  if (request.status === "confirmed" || request.status === "disputed") {
    return { ok: true } as const;
  }

  if (request.status !== "self_reported") {
    return { ok: false, error: "Payment has not been self-reported yet" } as const;
  }

  // ── Circle ────────────────────────────────────────────────────────────────
  // Round 16 fix #8: the claim → contribution SELECT → contribution UPDATE →
  // request final UPDATE now all run inside ONE transaction. Previously the
  // claim (self_reported → confirming) was a committed standalone UPDATE — a
  // crash/timeout between it and the later steps left the request stranded
  // in `confirming` forever (no code path accepts that status, so the
  // admin's confirm button would error permanently on retry). Wrapping
  // everything in a transaction means a mid-flight failure rolls the claim
  // back automatically instead. The contribution row is also now locked
  // (`.for("update")`) before it's read, so a concurrent
  // `disputeExternalPayment` serializes behind this transaction instead of
  // racing the SELECT-then-UPDATE guard.
  if (request.contextType === "circle") {
    if (!request.contributionId) {
      return { ok: false, error: "Missing contribution reference — cannot confirm" } as const;
    }
    const contributionId = request.contributionId;

    type CircleTxResult =
      | { kind: "concurrent" }
      | { kind: "confirmed-no-contrib" }
      | { kind: "confirmed"; contribMemberId: string; contribAmount: string; contribCurrency: string };

    let txResult: CircleTxResult;
    try {
      txResult = await db.transaction(async (tx) => {
        // Atomic claim: flip to 'confirming' to prevent concurrent double-confirms.
        const [claimed] = await tx
          .update(paymentRequests)
          .set({ status: "confirming" })
          .where(and(eq(paymentRequests.id, requestId), eq(paymentRequests.status, "self_reported")))
          .returning({ id: paymentRequests.id });

        if (!claimed) return { kind: "concurrent" } as const; // concurrent confirm won

        // Lock-only SELECT (same idiom as addCircleExpense's wallet-overdraw
        // guard) — serializes a concurrent disputeExternalPayment's DELETE
        // against this row until this transaction commits or rolls back.
        await tx.select({ id: circleContributions.id }).from(circleContributions)
          .where(eq(circleContributions.id, contributionId)).for("update");

        const [contrib] = await tx
          .select({
            memberId: circleContributions.memberId,
            amount:   circleContributions.amount,
            currency: circleContributions.currency,
          })
          .from(circleContributions)
          .where(and(
            eq(circleContributions.id, contributionId),
            eq(circleContributions.groupId, groupId),
            eq(circleContributions.isConfirmed, false),
          ));

        if (!contrib) {
          // Contribution not found — may have been disputed/deleted concurrently
          // (before our lock), or already confirmed by a separate path. Treat as success.
          await tx.update(paymentRequests).set({ status: "confirmed", confirmedAt: new Date() })
            .where(eq(paymentRequests.id, requestId));
          return { kind: "confirmed-no-contrib" } as const;
        }

        const [confirmed] = await tx
          .update(circleContributions)
          .set({ isConfirmed: true })
          .where(and(
            eq(circleContributions.id, contributionId),
            eq(circleContributions.groupId, groupId),
            eq(circleContributions.isConfirmed, false),
          ))
          .returning({ id: circleContributions.id });

        // With the row locked above this shouldn't be reachable, but keep the
        // guard: throwing aborts the whole transaction, rolling back the
        // claim too — no more manual "revert to self_reported" needed.
        if (!confirmed) throw new Error("CONTRIB_CONFLICT");

        await tx.update(paymentRequests).set({ status: "confirmed", confirmedAt: new Date() })
          .where(eq(paymentRequests.id, requestId));

        return {
          kind: "confirmed",
          contribMemberId: contrib.memberId,
          contribAmount:   contrib.amount,
          contribCurrency: contrib.currency,
        } as const;
      });
    } catch (err) {
      if (err instanceof Error && err.message === "CONTRIB_CONFLICT") {
        return { ok: false, error: "Contribution already processed" } as const;
      }
      throw err;
    }

    if (txResult.kind === "concurrent") return { ok: true } as const;

    revalidatePath("/groups");
    revalidatePath(`/groups/${groupId}`, "layout");
    revalidateTag(`balances-${groupId}`, "max");

    // ── Push notify the ghost's admin (fire-and-forget, after commit) ────────
    if (txResult.kind === "confirmed") {
      const [memberRow] = await db
        .select({ userId: groupMembers.userId })
        .from(groupMembers)
        .where(eq(groupMembers.id, txResult.contribMemberId));

      if (memberRow?.userId) {
        const amtStr = formatCurrency(Number(txResult.contribAmount), txResult.contribCurrency);
        await sendPushToUser({
          targetUserId: memberRow.userId,
          groupId,
          title:        `✓ Payment confirmed — ${request.groupName}`,
          body:         `Your ${amtStr} contribution was confirmed.`,
          url:          `/groups/${groupId}`,
        }).catch(() => { /* push failure must never block the confirm */ });
      }
    }

    return { ok: true } as const;
  }

  // ── Trip / Nest ───────────────────────────────────────────────────────────
  // Round 16 fix #8: the old code called `recordSettlement` — a separate,
  // already-committed action — between the claim UPDATE and this request's
  // own final UPDATE. A crash/timeout in that window left the request
  // stranded in `confirming` forever. Fix: validation (member rows exist,
  // currency guard) runs BEFORE the transaction, same as recordSettlement
  // itself does; the claim + settlement INSERT (via the extracted
  // `insertConfirmedSettlement` core) + final UPDATE now all run inside ONE
  // transaction, so a mid-flight failure rolls everything back atomically.
  // Notify + revalidate stay outside the transaction (side effects must not
  // fire on a rollback).
  if (request.contextType === "trip" || request.contextType === "nest") {
    if (!request.payerMemberId) {
      return { ok: false, error: "Missing payer member reference" } as const;
    }
    if (!request.payeeMemberId) {
      return { ok: false, error: "Missing payee member reference" } as const;
    }
    if (request.amount === null) {
      return { ok: false, error: "Amount is required for trip/nest settlement" } as const;
    }
    const payerMemberId = request.payerMemberId;
    const payeeMemberId = request.payeeMemberId;
    const amount        = Number(request.amount);

    // Validation before the transaction — mirrors recordSettlement's own
    // pre-tx checks (member rows exist, currency matches the group's live
    // defaultCurrency; the request's stored `currency` isn't trusted since
    // the group's default can change after the request was generated).
    const memberRows = await db
      .select({
        id:          groupMembers.id,
        userId:      groupMembers.userId,
        displayName: groupMembers.displayName,
        guestName:   groupMembers.guestName,
      })
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), inArray(groupMembers.id, [payerMemberId, payeeMemberId])));
    if (memberRows.length !== 2) return { ok: false, error: "Invalid members" } as const;

    const [groupRow] = await db
      .select({ defaultCurrency: groups.defaultCurrency, name: groups.name })
      .from(groups)
      .where(eq(groups.id, groupId))
      .limit(1);
    if (!groupRow) return { ok: false, error: "Group not found" } as const;

    // Map paymentMethod: payment_requests stores "bank", settlements expect "bank_transfer".
    const settlementMethod = (() => {
      if (request.paymentMethod === "bank") return "bank_transfer" as const;
      if (request.paymentMethod === "upi")  return "upi" as const;
      if (request.paymentMethod === "cash") return "cash" as const;
      return undefined;
    })();

    type TripTxResult = { kind: "concurrent" } | { kind: "confirmed"; settlementId: string };

    const txResult: TripTxResult = await db.transaction(async (tx) => {
      // Claim with 'confirming' to prevent concurrent double-confirm.
      const [claimed] = await tx
        .update(paymentRequests)
        .set({ status: "confirming" })
        .where(and(eq(paymentRequests.id, requestId), eq(paymentRequests.status, "self_reported")))
        .returning({ id: paymentRequests.id });

      if (!claimed) return { kind: "concurrent" } as const; // concurrent confirm won

      const inserted = await insertConfirmedSettlement(tx, {
        groupId,
        fromMemberId:  payerMemberId,
        toMemberId:    payeeMemberId,
        amount,
        currency:      groupRow.defaultCurrency,
        paymentMethod: settlementMethod,
        utrReference:  request.utrReference ?? undefined,
        note:          request.description ?? undefined,
      });

      await tx
        .update(paymentRequests)
        .set({ status: "confirmed", confirmedAt: new Date(), settlementId: inserted.id })
        .where(eq(paymentRequests.id, requestId));

      return { kind: "confirmed", settlementId: inserted.id } as const;
    });

    if (txResult.kind === "concurrent") return { ok: true } as const;

    revalidatePath(`/groups/${groupId}`, "layout");
    revalidateTag(`balances-${groupId}`, "max");

    // ── Notify the other party (mirrors recordSettlement's own notify block,
    //    which we bypassed in favour of the tx-safe insertConfirmedSettlement
    //    core) ────────────────────────────────────────────────────────────
    const payerMember = memberRows.find((m) => m.id === payerMemberId);
    const payeeMember = memberRows.find((m) => m.id === payeeMemberId);
    const amountStr    = formatCurrency(amount, groupRow.defaultCurrency);
    const otherParties = [payerMember, payeeMember].filter(
      (m): m is NonNullable<typeof m> => !!m?.userId && m.userId !== user.id,
    );
    for (const member of otherParties) {
      const title = `💸 Settlement recorded — ${groupRow.name}`;
      const body  = `${amountStr} settlement between ${payerMember?.displayName ?? payerMember?.guestName ?? "a member"} and ${payeeMember?.displayName ?? payeeMember?.guestName ?? "a member"} was recorded.`;
      const url   = `/groups/${groupId}/settle`;
      const targetUserId = member.userId!;
      await sendPushToUser({ targetUserId, groupId, title, body, url }).catch(() => {});
    }

    return { ok: true } as const;
  }

  return { ok: false, error: "Unknown context type" } as const;
}

// ── disputeExternalPayment ────────────────────────────────────────────────────
// Admin-only: reject a ghost's self-reported payment.
//
// Circle path: deletes the unconfirmed circle_contributions row then marks
//   the request 'disputed' (so the admin can re-generate a fresh link).
// Trip/Nest path: just marks 'disputed' — no financial row to roll back.

export async function disputeExternalPayment(
  requestId: string,
  groupId:   string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" } as const;

  const membership = await getMembership(groupId, user.id);
  if (!membership || membership.role !== "admin")
    return { ok: false, error: "Only admins can dispute payments" } as const;

  const [request] = await db
    .select()
    .from(paymentRequests)
    .where(and(eq(paymentRequests.id, requestId), eq(paymentRequests.groupId, groupId)))
    .limit(1);

  if (!request) return { ok: false, error: "Payment request not found" } as const;

  // Idempotent: already resolved
  if (request.status === "confirmed" || request.status === "disputed") {
    return { ok: true } as const;
  }

  if (request.status !== "self_reported") {
    return { ok: false, error: "Payment has not been self-reported yet" } as const;
  }

  // Circle: delete the unconfirmed contribution so the member appears unpaid again
  if (request.contextType === "circle" && request.contributionId) {
    await db
      .delete(circleContributions)
      .where(
        and(
          eq(circleContributions.id, request.contributionId),
          eq(circleContributions.groupId, groupId),
          eq(circleContributions.isConfirmed, false),
        ),
      );
  }

  // Mark disputed (atomic guard: only if still self_reported)
  await db
    .update(paymentRequests)
    .set({ status: "disputed" })
    .where(
      and(
        eq(paymentRequests.id, requestId),
        eq(paymentRequests.status, "self_reported"),
      ),
    );

  revalidatePath(`/groups/${groupId}`, "layout");
  revalidateTag(`balances-${groupId}`, "max");

  return { ok: true } as const;
}
