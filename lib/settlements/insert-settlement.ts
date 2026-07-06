import { db } from "@/lib/db/client";
import { settlements } from "@/lib/db/schema/settlements";
import type { PaymentMethod } from "@/lib/payment/types";

/** Same tx-param typing pattern as `withAdminTimeout` in lib/db/queries/admin.ts. */
type DbTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface InsertConfirmedSettlementParams {
  groupId:       string;
  fromMemberId:  string;
  toMemberId:    string;
  amount:        number;
  currency:      string;
  note?:         string;
  paymentMethod?: PaymentMethod;
  utrReference?: string;
}

/**
 * Round 16 fix #8: the confirmed-settlement INSERT core, extracted out of
 * `recordSettlement` (app/actions/settlements.ts) so `confirmExternalPayment`
 * (app/actions/payment-requests.ts) can run it INSIDE the same transaction as
 * its `payment_requests` claim + final-status UPDATE. Before this extraction,
 * `confirmExternalPayment`'s trip/nest branch called `recordSettlement` as a
 * separate, already-committed action — a crash/timeout between that call
 * committing and the request's own final UPDATE left the request stranded in
 * `confirming` forever (no code path accepts that status, so a retry always
 * errors). Wrapping the claim + this INSERT + the final UPDATE in one
 * transaction makes a mid-flight crash roll everything back atomically instead.
 *
 * Deliberately NOT exported as a `"use server"` action — plain internal
 * function, callable from any transaction. Validation (member rows exist,
 * currency matches the group's defaultCurrency) must happen BEFORE the
 * transaction opens, same as `recordSettlement` already does.
 */
export async function insertConfirmedSettlement(
  tx: DbTx,
  params: InsertConfirmedSettlementParams,
): Promise<{ id: string }> {
  const [row] = await tx
    .insert(settlements)
    .values({
      groupId:       params.groupId,
      fromMemberId:  params.fromMemberId,
      toMemberId:    params.toMemberId,
      amount:        String(params.amount),
      currency:      params.currency,
      note:          params.note || null,
      isConfirmed:   true,
      paymentMethod: params.paymentMethod ?? null,
      utrReference:  params.utrReference ?? null,
    })
    .returning({ id: settlements.id });
  return row;
}
