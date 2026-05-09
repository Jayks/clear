import { z } from "zod";

const splitInputSchema = z.object({
  memberId: z.string().uuid(),
  value: z.number().optional(),
});

export const addExpenseSchema = z.object({
  groupId: z.string().uuid(),
  paidByMemberId: z.string().uuid(),
  description: z.string().min(1, "Description is required").max(200),
  category: z.string().min(1, "Category is required"),
  amount: z.number().positive("Amount must be positive").max(999999.99, "Amount is too large"),
  currency: z.string().length(3),
  expenseDate: z.string().min(1, "Date is required"),
  endDate: z.string().optional(),
  notes: z.string().max(500).optional(),
  splitMode: z.enum(["equal", "exact", "percentage", "shares"]),
  splits: z.array(splitInputSchema).min(1),
});

export type AddExpenseInput = z.infer<typeof addExpenseSchema>;

const splitInputSchema2 = z.object({
  memberId: z.string().uuid(),
  value: z.number().optional(),
});

export const addTemplateSchema = z.object({
  groupId: z.string().uuid(),
  paidByMemberId: z.string().uuid(),
  description: z.string().min(1, "Description is required").max(200),
  category: z.string().min(1, "Category is required"),
  amount: z.number().positive("Amount must be positive").max(999999.99),
  currency: z.string().length(3),
  recurrence: z.enum(["monthly", "weekly"]),
  splitMode: z.enum(["equal", "exact", "percentage", "shares"]),
  splits: z.array(splitInputSchema2).min(1),
});

export type AddTemplateInput = z.infer<typeof addTemplateSchema>;
