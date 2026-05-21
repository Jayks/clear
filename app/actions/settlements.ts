"use server";

import { db } from "@/lib/db/client";
import { settlements } from "@/lib/db/schema/settlements";
import { groupMembers } from "@/lib/db/schema/group-members";
import { eq, and, inArray } from "drizzle-orm";
import { revalidatePath, revalidateTag } from "next/cache";
import { getCurrentUser, getMembership } from "@/lib/db/queries/auth";
import { recordSettlementSchema, type RecordSettlementInput } from "@/lib/validations/settlement";

export async function recordSettlement(input: RecordSettlementInput) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" } as const;

  const parsed = recordSettlementSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" } as const;

  const { groupId, fromMemberId, toMemberId, amount, currency, note } = parsed.data;

  const membership = await getMembership(groupId, user.id);
  if (!membership) return { ok: false, error: "Not a member" } as const;
  if (membership.role !== "admin") return { ok: false, error: "Not authorized" } as const;
  if (fromMemberId === toMemberId) return { ok: false, error: "Cannot settle with yourself" } as const;

  const memberRows = await db.select({ id: groupMembers.id }).from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), inArray(groupMembers.id, [fromMemberId, toMemberId])));
  if (memberRows.length !== 2) return { ok: false, error: "Invalid members" } as const;

  try {
    await db.insert(settlements).values({
      groupId,
      fromMemberId,
      toMemberId,
      amount: String(amount),
      currency,
      note: note || null,
    });

    revalidatePath(`/groups/${groupId}`, "layout");
    revalidateTag(`balances-${groupId}`, "max");
    return { ok: true } as const;
  } catch {
    return { ok: false, error: "Failed to record settlement" } as const;
  }
}

export async function deleteSettlement(settlementId: string, groupId: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" } as const;

  const membership = await getMembership(groupId, user.id);
  if (!membership || membership.role !== "admin")
    return { ok: false, error: "Not authorized" } as const;

  try {
    await db.delete(settlements).where(
      and(eq(settlements.id, settlementId), eq(settlements.groupId, groupId))
    );
    revalidatePath(`/groups/${groupId}`, "layout");
    revalidateTag(`balances-${groupId}`, "max");
    return { ok: true } as const;
  } catch {
    return { ok: false, error: "Failed to delete settlement" } as const;
  }
}
