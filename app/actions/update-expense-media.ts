"use server";

import { db } from "@/lib/db/client";
import { expenses } from "@/lib/db/schema/expenses";
import { getCurrentUser, getMembership } from "@/lib/db/queries/auth";
import { eq, and } from "drizzle-orm";
import { revalidateTag } from "next/cache";

/**
 * Attaches a receipt photo URL to an expense after the background upload completes.
 *
 * Called from the client after `addExpense` / `addCircleExpense` returns — the form
 * navigates immediately (good UX) and this write happens in the background.
 * Using expenseId (not paidBy) is safe: the proof upload race cannot corrupt
 * the expense row — at worst the URL is missing (user can re-attach in edit).
 */
export async function updateExpenseMedia(
  expenseId: string,
  groupId:   string,
  { receiptUrl }: { receiptUrl: string },
): Promise<{ ok: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false };

  // Verify the caller is still a member of this group
  const membership = await getMembership(groupId, user.id);
  if (!membership) return { ok: false };

  try {
    await db
      .update(expenses)
      .set({ receiptUrl })
      .where(and(eq(expenses.id, expenseId), eq(expenses.groupId, groupId)));

    revalidateTag(`group-${groupId}`, "max");
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
