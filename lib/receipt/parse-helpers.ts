/**
 * Pure helper functions for receipt parsing — no external dependencies.
 * Extracted here so they can be unit-tested without the "use server" boundary.
 */

import { z } from "zod";

// ── Zod schema for the raw AI response ───────────────────────────────────────

export const receiptResponseSchema = z.object({
  description:  z.string().optional().nullable(),
  amount:       z.number().optional().nullable(),
  currency:     z.string().optional().nullable(),
  category:     z.string().optional().nullable(),
  expenseDate:  z.string().optional().nullable(),
  receiptItems: z.array(z.object({
    description: z.string(),
    amount:      z.number(),
    quantity:    z.number().optional(),
  })).optional().nullable(),
});

export type ReceiptResponseData = {
  description?: string | null;
  amount?:      number | null;
  expenseDate?: string | null;
  receiptItems?: Array<{ description: string; amount: number; quantity?: number }> | null;
};

// ── Confidence — weighted on form usefulness, NOT field count ─────────────────
// high   = amount + description + date all found
// medium = amount + description found (form mostly usable)
// low    = missing amount OR description (form barely usable regardless of other fields)

export function computeConfidence(
  data: ReceiptResponseData,
): "high" | "medium" | "low" {
  const hasAmount      = data.amount !== null && data.amount !== undefined;
  const hasDescription = !!data.description?.trim();
  const hasDate        = !!data.expenseDate;

  if (hasAmount && hasDescription && hasDate) return "high";
  if (hasAmount && hasDescription) return "medium";
  return "low";
}

// ── isEmpty — true when the response has no useful content ────────────────────

export function isEmptyReceiptResponse(data: ReceiptResponseData): boolean {
  const hasAmount = data.amount !== null && data.amount !== undefined;
  const hasDescription = !!data.description?.trim();
  const hasItems = (data.receiptItems?.length ?? 0) > 0;
  return !hasAmount && !hasDescription && !hasItems;
}
