import { z } from "zod";

// BUG-09 fix: value must be non-negative; negative split values (e.g. -50%)
// would produce nonsensical share amounts in percentage/shares/exact modes.
const splitInputSchema = z.object({
  memberId: z.string().uuid(),
  value: z.number().min(0).optional(),
});

export const addExpenseSchema = z.object({
  groupId: z.string().uuid(),
  paidByMemberId: z.string().uuid(),
  description: z.string().min(1, "Description is required").max(200),
  category: z.string().min(1, "Category is required"),
  customCategory: z.string().max(100).optional(),
  amount: z.number().positive("Amount must be positive").max(999999.99, "Amount is too large"),
  currency: z.string().length(3),
  expenseDate: z.string().min(1, "Date is required"),
  endDate: z.string().optional(),
  notes: z.string().max(500).optional(),
  splitMode: z.enum(["equal", "exact", "percentage", "shares"]),
  splits: z.array(splitInputSchema).min(1),
}).superRefine((data, ctx) => {
  if (data.category === "other" && (!data.customCategory || data.customCategory.trim() === "")) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["customCategory"],
      message: "Please describe the expense",
    });
  }
});

export type AddExpenseInput = z.infer<typeof addExpenseSchema>;

// BUG-04 fix: addTemplateSchema now mirrors addExpenseSchema's superRefine so
// that templates with category="other" must supply a customCategory label.
// Without this, recurring templates could be saved without a display label.
export const addTemplateSchema = z.object({
  groupId: z.string().uuid(),
  paidByMemberId: z.string().uuid(),
  description: z.string().min(1, "Description is required").max(200),
  category: z.string().min(1, "Category is required"),
  customCategory: z.string().max(100).optional(),
  amount: z.number().positive("Amount must be positive").max(999999.99),
  currency: z.string().length(3),
  recurrence: z.enum(["monthly", "weekly"]),
  splitMode: z.enum(["equal", "exact", "percentage", "shares"]),
  splits: z.array(splitInputSchema).min(1),
}).superRefine((data, ctx) => {
  if (data.category === "other" && (!data.customCategory || data.customCategory.trim() === "")) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["customCategory"],
      message: "Please describe the expense",
    });
  }
});

export type AddTemplateInput = z.infer<typeof addTemplateSchema>;
