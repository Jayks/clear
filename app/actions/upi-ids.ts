"use server";

import { getCurrentUser } from "@/lib/db/queries/auth";
import { db } from "@/lib/db/client";
import { userUpiIds } from "@/lib/db/schema/upi-ids";
import { eq, and, desc } from "drizzle-orm";
import { saveUpiIdSchema } from "@/lib/validations/upi";
import { sql } from "drizzle-orm";

const MAX_UPI_IDS = 5;

// ─── Save (add or update) a UPI ID ───────────────────────────────────────────

export async function saveUpiId(input: {
  upiId: string;
  label?: string;
  setAsDefault?: boolean;
}): Promise<{ ok: true; record: import("@/lib/db/schema/upi-ids").UserUpiId } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const parsed = saveUpiIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0].message };

  const { upiId, label, setAsDefault } = parsed.data;

  // Enforce max 5 IDs
  const existing = await db
    .select({ id: userUpiIds.id })
    .from(userUpiIds)
    .where(eq(userUpiIds.userId, user.id));

  const exactMatch = await db
    .select({ id: userUpiIds.id })
    .from(userUpiIds)
    .where(and(eq(userUpiIds.userId, user.id), eq(userUpiIds.upiId, upiId)))
    .limit(1);

  const isNew = exactMatch.length === 0;
  if (isNew && existing.length >= MAX_UPI_IDS) {
    return { ok: false, error: `You can save up to ${MAX_UPI_IDS} UPI IDs` };
  }

  // Run insert/update atomically; return the real DB record so the client
  // can replace its optimistic fake-UUID entry with the true id.
  let savedRecord: import("@/lib/db/schema/upi-ids").UserUpiId | null = null;

  await db.transaction(async (tx) => {
    if (setAsDefault) {
      await tx
        .update(userUpiIds)
        .set({ isDefault: false })
        .where(and(eq(userUpiIds.userId, user.id), eq(userUpiIds.isDefault, true)));
    }

    if (isNew) {
      const [inserted] = await tx
        .insert(userUpiIds)
        .values({
          userId:    user.id,
          upiId,
          label:     label ?? null,
          isDefault: setAsDefault ?? (existing.length === 0), // first ID auto-becomes default
        })
        .returning();
      savedRecord = inserted;
    } else {
      const [updated] = await tx
        .update(userUpiIds)
        .set({
          label:     label ?? null,
          isDefault: setAsDefault ? true : sql`is_default`,
        })
        .where(and(eq(userUpiIds.userId, user.id), eq(userUpiIds.upiId, upiId)))
        .returning();
      savedRecord = updated;
    }
  });

  if (!savedRecord) return { ok: false, error: "Failed to save UPI ID" };
  return { ok: true, record: savedRecord };
}

// ─── Delete a UPI ID ─────────────────────────────────────────────────────────

export async function deleteUpiId(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  // Fetch the row to know if it was the default
  const [row] = await db
    .select({ isDefault: userUpiIds.isDefault, userId: userUpiIds.userId })
    .from(userUpiIds)
    .where(and(eq(userUpiIds.id, id), eq(userUpiIds.userId, user.id)))
    .limit(1);

  if (!row) return { ok: false, error: "UPI ID not found" };

  await db.transaction(async (tx) => {
    await tx.delete(userUpiIds).where(and(eq(userUpiIds.id, id), eq(userUpiIds.userId, user.id)));

    // Auto-promote the most recently added remaining ID to default
    if (row.isDefault) {
      const [next] = await tx
        .select({ id: userUpiIds.id })
        .from(userUpiIds)
        .where(eq(userUpiIds.userId, user.id))
        .orderBy(desc(userUpiIds.createdAt))
        .limit(1);
      if (next) {
        await tx.update(userUpiIds).set({ isDefault: true }).where(eq(userUpiIds.id, next.id));
      }
    }
  });

  return { ok: true };
}

// ─── Set a UPI ID as default ─────────────────────────────────────────────────

export async function setDefaultUpiId(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  await db.transaction(async (tx) => {
    // Unset all defaults for this user
    await tx
      .update(userUpiIds)
      .set({ isDefault: false })
      .where(eq(userUpiIds.userId, user.id));
    // Set the chosen one
    await tx
      .update(userUpiIds)
      .set({ isDefault: true })
      .where(and(eq(userUpiIds.id, id), eq(userUpiIds.userId, user.id)));
  });

  return { ok: true };
}
