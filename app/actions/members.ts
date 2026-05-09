"use server";

import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db/client";
import { trips } from "@/lib/db/schema/trips";
import { tripMembers } from "@/lib/db/schema/trip-members";
import { addGuestSchema } from "@/lib/validations/trip";
import { eq, and } from "drizzle-orm";
import { getMembership } from "@/lib/db/queries/auth";
import { extractDisplayName } from "@/lib/utils";
import { revalidatePath } from "next/cache";

export async function addGuestMember(input: { tripId: string; guestName: string }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" } as const;

  const parsed = addGuestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" } as const;

  const { tripId, guestName } = parsed.data;

  const membership = await getMembership(tripId, user.id);
  if (!membership || membership.role !== "admin")
    return { ok: false, error: "Not authorized" } as const;

  const [duplicate] = await db.select({ id: tripMembers.id }).from(tripMembers)
    .where(and(eq(tripMembers.tripId, tripId), eq(tripMembers.guestName, guestName)));
  if (duplicate) return { ok: false, error: "A guest with this name already exists" } as const;

  try {
    const [member] = await db.insert(tripMembers).values({
      tripId,
      guestName,
      role: "member",
    }).returning();

    revalidatePath(`/trips/${tripId}/members`);
    return { ok: true, member } as const;
  } catch {
    return { ok: false, error: "Failed to add guest" } as const;
  }
}

export async function removeMember(tripId: string, memberId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" } as const;

  const membership = await getMembership(tripId, user.id);
  if (!membership || membership.role !== "admin")
    return { ok: false, error: "Not authorized" } as const;

  try {
    await db.delete(tripMembers).where(
      and(eq(tripMembers.id, memberId), eq(tripMembers.tripId, tripId))
    );
    revalidatePath(`/trips/${tripId}/members`);
    return { ok: true } as const;
  } catch {
    return { ok: false, error: "Failed to remove member" } as const;
  }
}

export async function joinTrip(token: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" } as const;

  const [trip] = await db.select().from(trips).where(eq(trips.shareToken, token));
  if (!trip) return { ok: false, error: "Invalid invite link" } as const;

  const [existing] = await db
    .select()
    .from(tripMembers)
    .where(and(eq(tripMembers.tripId, trip.id), eq(tripMembers.userId, user.id)));

  if (existing) return { ok: true, tripId: trip.id } as const;

  try {
    await db.insert(tripMembers).values({
      tripId: trip.id,
      userId: user.id,
      displayName: extractDisplayName(user),
      role: "member",
    });

    revalidatePath("/trips");
    revalidatePath(`/trips/${trip.id}`);
    return { ok: true, tripId: trip.id } as const;
  } catch {
    return { ok: false, error: "Failed to join trip" } as const;
  }
}
