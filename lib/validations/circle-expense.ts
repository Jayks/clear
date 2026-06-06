import { z } from "zod";

export const addCircleExpenseSchema = z.object({
  groupId:        z.string().uuid(),
  description:    z.string().min(1, "Description is required").max(200),
  category:       z.string().min(1, "Category is required"),
  customCategory: z.string().max(100).optional(),
  amount:         z.number().positive("Amount must be positive").max(999999.99, "Amount is too large"),
  currency:       z.string().length(3),
  expenseDate:    z.string().min(1, "Date is required"),
  notes:          z.string().max(500).optional(),
  isAdvance:      z.boolean(),
  // Receipt scanning fields (no location / receiptItems — circle expenses are single-line pool draws)
  receiptUrl:   z.string().url().nullable().optional(),
  wasAiScanned: z.boolean().optional(),
  clearReceipt: z.boolean().optional(),
}).superRefine((data, ctx) => {
  if (data.category === "other" && (!data.customCategory || data.customCategory.trim() === "")) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["customCategory"],
      message: "Please describe the expense",
    });
  }
});

export type AddCircleExpenseInput = z.infer<typeof addCircleExpenseSchema>;
