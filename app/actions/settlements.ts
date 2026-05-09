"use server";

import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db/client";
import { settlements } from "@/lib/db/schema/settlements";
import { tripMembers } from "@/lib/db/schema/trip-members";
import { eq, and, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getMembership } from "@/lib/db/queries/auth";
import { recordSettlementSchema, type RecordSettlementInput } from "@/lib/validations/settlement";

export async function recordSettlement(input: RecordSettlementInput) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" } as const;

  const parsed = recordSettlementSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" } as const;

  const { tripId, fromMemberId, toMemberId, amount, currency, note } = parsed.data;

  const membership = await getMembership(tripId, user.id);
  if (!membership) return { ok: false, error: "Not a member" } as const;
  if (membership.role !== "admin") return { ok: false, error: "Not authorized" } as const;
  if (fromMemberId === toMemberId) return { ok: false, error: "Cannot settle with yourself" } as const;

  const tripMemberRows = await db.select({ id: tripMembers.id }).from(tripMembers)
    .where(and(eq(tripMembers.tripId, tripId), inArray(tripMembers.id, [fromMemberId, toMemberId])));
  if (tripMemberRows.length !== 2) return { ok: false, error: "Invalid members" } as const;

  try {
    await db.insert(settlements).values({
      tripId,
      fromMemberId,
      toMemberId,
      amount: String(amount),
      currency,
      note: note || null,
    });

    revalidatePath(`/trips/${tripId}`, "layout");
    return { ok: true } as const;
  } catch {
    return { ok: false, error: "Failed to record settlement" } as const;
  }
}

export async function deleteSettlement(settlementId: string, tripId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" } as const;

  const membership = await getMembership(tripId, user.id);
  if (!membership || membership.role !== "admin")
    return { ok: false, error: "Not authorized" } as const;

  try {
    await db.delete(settlements).where(
      and(eq(settlements.id, settlementId), eq(settlements.tripId, tripId))
    );
    revalidatePath(`/trips/${tripId}`, "layout");
    return { ok: true } as const;
  } catch {
    return { ok: false, error: "Failed to delete settlement" } as const;
  }
}
