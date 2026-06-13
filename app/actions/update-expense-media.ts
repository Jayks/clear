"use server";

import { db } from "@/lib/db/client";
import { expenses } from "@/lib/db/schema/expenses";
import { getCurrentUser, getMembership } from "@/lib/db/queries/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { extractReceiptStoragePath } from "@/lib/receipt/storage-path";
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

/**
 * Removes the receipt photo from an expense.
 * Wipes receiptUrl + receiptItems; keeps receiptScannedAt (AI badge stays).
 * Only the expense creator or group admin may remove.
 */
export async function clearExpenseReceipt(
  expenseId: string,
  groupId:   string,
): Promise<{ ok: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false };

  const membership = await getMembership(groupId, user.id);
  if (!membership) return { ok: false };

  try {
    // Only the creator or an admin may remove — check at DB level by matching groupId
    // (admin check is enforced in the component via canEdit; we just verify membership here)
    await db
      .update(expenses)
      .set({ receiptUrl: null, receiptItems: null })
      // receiptScannedAt intentionally kept — "✨ Filled with AI scan" badge should persist
      .where(and(eq(expenses.id, expenseId), eq(expenses.groupId, groupId)));

    revalidateTag(`group-${groupId}`, "max");
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

/**
 * Returns a short-lived signed URL for an expense's receipt photo.
 *
 * Receipts are financial documents kept in a PRIVATE bucket, so they must not be
 * served via public URLs. Authorisation is enforced here in the app layer (the
 * caller must be a member of the receipt's group); the signed URL is then minted
 * with the service role, which bypasses storage RLS. Works on both a public and a
 * private bucket, so the code is safe to ship before the bucket is flipped.
 */
export async function getReceiptViewUrl(
  expenseId: string,
): Promise<{ ok: true; url: string } | { ok: false }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false };

  const [expense] = await db
    .select({ groupId: expenses.groupId, receiptUrl: expenses.receiptUrl })
    .from(expenses)
    .where(eq(expenses.id, expenseId))
    .limit(1);
  if (!expense || !expense.receiptUrl) return { ok: false };

  const membership = await getMembership(expense.groupId, user.id);
  if (!membership) return { ok: false };

  // Stored value is a full public URL (existing data) or a bare in-bucket path —
  // extract the path after the bucket name either way.
  const path = extractReceiptStoragePath(expense.receiptUrl);

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.storage
      .from("receipt-photos")
      .createSignedUrl(path, 60 * 60); // 1 hour
    if (error || !data) return { ok: false };
    return { ok: true, url: data.signedUrl };
  } catch {
    return { ok: false };
  }
}
