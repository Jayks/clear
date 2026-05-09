import { z } from "zod";

export const recordSettlementSchema = z.object({
  groupId: z.string().uuid(),
  fromMemberId: z.string().uuid(),
  toMemberId: z.string().uuid(),
  amount: z.number().positive().max(999999.99),
  currency: z.string().length(3),
  note: z.string().max(200).optional(),
});

export type RecordSettlementInput = z.infer<typeof recordSettlementSchema>;
