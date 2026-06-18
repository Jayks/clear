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
import { recordSettlement } from "@/app/actions/settlements";

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
  if (request.contextType === "circle") {
    if (!request.contributionId) {
      return { ok: false, error: "Missing contribution reference — cannot confirm" } as const;
    }

    // Atomic claim: flip to 'confirming' to prevent concurrent double-confirms.
    // If 0 rows updated a concurrent confirm already handled it.
    const [claimed] = await db
      .update(paymentRequests)
      .set({ status: "confirming" })
      .where(
        and(
          eq(paymentRequests.id, requestId),
          eq(paymentRequests.status, "self_reported"),
        ),
      )
      .returning({ id: paymentRequests.id });

    if (!claimed) return { ok: true } as const; // concurrent confirm won

    // ── Confirm the circle contribution (admin-only DB update + push notify) ─
    const [contrib] = await db
      .select({
        memberId: circleContributions.memberId,
        amount:   circleContributions.amount,
        currency: circleContributions.currency,
        period:   circleContributions.period,
      })
      .from(circleContributions)
      .where(
        and(
          eq(circleContributions.id, request.contributionId),
          eq(circleContributions.groupId, groupId),
          eq(circleContributions.isConfirmed, false),
        ),
      );

    if (!contrib) {
      // Contribution not found — may have been disputed/deleted concurrently, or was
      // already confirmed by a separate path. Treat as success.
      await db
        .update(paymentRequests)
        .set({ status: "confirmed", confirmedAt: new Date() })
        .where(eq(paymentRequests.id, requestId));
      revalidatePath(`/groups/${groupId}`, "layout");
      revalidateTag(`balances-${groupId}`, "max");
      return { ok: true } as const;
    }

    const [confirmed] = await db
      .update(circleContributions)
      .set({ isConfirmed: true })
      .where(
        and(
          eq(circleContributions.id, request.contributionId),
          eq(circleContributions.groupId, groupId),
          eq(circleContributions.isConfirmed, false), // guard: only if still unconfirmed
        ),
      )
      .returning({ id: circleContributions.id });

    if (!confirmed) {
      // Row was updated/deleted between our SELECT and UPDATE (concurrent dispute).
      // Rollback to self_reported so the admin surface doesn't show stale state.
      await db
        .update(paymentRequests)
        .set({ status: "self_reported" })
        .where(eq(paymentRequests.id, requestId));
      return { ok: false, error: "Contribution already processed" } as const;
    }

    // ── Mark the payment request as confirmed ─────────────────────────────────
    await db
      .update(paymentRequests)
      .set({ status: "confirmed", confirmedAt: new Date() })
      .where(eq(paymentRequests.id, requestId));

    revalidatePath("/groups");
    revalidatePath(`/groups/${groupId}`, "layout");
    revalidateTag(`balances-${groupId}`, "max");

    // ── Push notify the ghost's admin (fire-and-forget) ───────────────────────
    // Notify the member whose contribution was confirmed (mirrors confirmContribution).
    const [memberRow] = await db
      .select({ userId: groupMembers.userId })
      .from(groupMembers)
      .where(eq(groupMembers.id, contrib.memberId));

    if (memberRow?.userId) {
      const amtStr = formatCurrency(Number(contrib.amount), contrib.currency);
      await sendPushToUser({
        targetUserId: memberRow.userId,
        groupId,
        title:        "✅ Payment confirmed",
        body:         `Your ${contrib.currency} ${amtStr} contribution was confirmed.`,
        url:          `/groups/${groupId}`,
      }).catch(() => { /* push failure must never block the confirm */ });
    }

    return { ok: true } as const;
  }

  // ── Trip / Nest ───────────────────────────────────────────────────────────
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

    // Claim with 'confirming' to prevent concurrent double-confirm
    const [claimed] = await db
      .update(paymentRequests)
      .set({ status: "confirming" })
      .where(
        and(
          eq(paymentRequests.id, requestId),
          eq(paymentRequests.status, "self_reported"),
        ),
      )
      .returning({ id: paymentRequests.id });

    if (!claimed) return { ok: true } as const; // concurrent confirm won

    // Fetch group's current defaultCurrency — recordSettlement validates it
    // matches (S-12 guard) so we must pass the live value, not the stored one.
    const [groupRow] = await db
      .select({ defaultCurrency: groups.defaultCurrency })
      .from(groups)
      .where(eq(groups.id, groupId))
      .limit(1);

    if (!groupRow) {
      await db
        .update(paymentRequests)
        .set({ status: "self_reported" })
        .where(eq(paymentRequests.id, requestId));
      return { ok: false, error: "Group not found" } as const;
    }

    // Map paymentMethod: payment_requests stores "bank", settlements expect "bank_transfer".
    const settlementMethod = (() => {
      if (request.paymentMethod === "bank") return "bank_transfer" as const;
      if (request.paymentMethod === "upi")  return "upi" as const;
      if (request.paymentMethod === "cash") return "cash" as const;
      return undefined;
    })();

    // recordSettlement: admin-only action that writes a confirmed settlement row.
    // Auth passes because confirmExternalPayment already verified admin role, and
    // getCurrentUser() + getMembership() are React-cache deduped within this request.
    const settlementResult = await recordSettlement({
      groupId,
      fromMemberId:  request.payerMemberId,
      toMemberId:    request.payeeMemberId,
      amount:        Number(request.amount),
      currency:      groupRow.defaultCurrency,
      paymentMethod: settlementMethod,
      utrReference:  request.utrReference ?? undefined,
      note:          request.description ?? undefined,
    });

    if (!settlementResult.ok) {
      // Roll back the confirming claim so the admin can retry
      await db
        .update(paymentRequests)
        .set({ status: "self_reported" })
        .where(eq(paymentRequests.id, requestId));
      return { ok: false, error: settlementResult.error } as const;
    }

    // Mark confirmed + back-ref to settlement row
    await db
      .update(paymentRequests)
      .set({
        status:       "confirmed",
        confirmedAt:  new Date(),
        settlementId: settlementResult.settlementId,
      })
      .where(eq(paymentRequests.id, requestId));

    // revalidatePath/revalidateTag already called by recordSettlement
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
