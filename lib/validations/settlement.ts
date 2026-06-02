import { z } from "zod";

const paymentMethodSchema = z.enum(["upi", "cash", "bank_transfer", "other"]);

export const recordSettlementSchema = z.object({
  groupId:       z.string().uuid(),
  fromMemberId:  z.string().uuid(),
  toMemberId:    z.string().uuid(),
  amount:        z.number().positive().max(999999.99),
  currency:      z.string().length(3),
  note:          z.string().max(200).optional(),
  paymentMethod: paymentMethodSchema.optional(),
  utrReference:  z.string().max(30).optional(),
});

export type RecordSettlementInput = z.infer<typeof recordSettlementSchema>;

/**
 * Non-admin self-report — inserts with is_confirmed = false.
 * The creditor (or admin) later calls confirmSettlement / disputeSettlement.
 */
export const selfReportSettlementSchema = z.object({
  groupId:       z.string().uuid(),
  fromMemberId:  z.string().uuid(),
  toMemberId:    z.string().uuid(),
  amount:        z.number().positive().max(999999.99),
  currency:      z.string().length(3),
  paymentMethod: paymentMethodSchema.optional(),
  utrReference:  z.string().max(30).optional(),
  note:          z.string().max(200).optional(),
});

export type SelfReportSettlementInput = z.infer<typeof selfReportSettlementSchema>;
