"use server";

import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db/client";
import { trips } from "@/lib/db/schema/trips";
import { tripMembers } from "@/lib/db/schema/trip-members";
import { createTripSchema, type CreateTripInput } from "@/lib/validations/trip";
import { eq, sql } from "drizzle-orm";
import { getMembership } from "@/lib/db/queries/auth";
import { extractDisplayName } from "@/lib/utils";
import { revalidatePath } from "next/cache";

export async function createTrip(input: CreateTripInput) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" } as const;

  const parsed = createTripSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message ?? "Invalid input" } as const;

  const { name, description, coverPhotoUrl, defaultCurrency, startDate, endDate, budget, itinerary } = parsed.data;

  try {
    const [trip] = await db.insert(trips).values({
      name,
      description: description || null,
      coverPhotoUrl: coverPhotoUrl || null,
      defaultCurrency,
      startDate: startDate || null,
      endDate: endDate || null,
      budget: budget != null ? String(budget) : null,
      itinerary: itinerary || null,
      createdBy: user.id,
    }).returning();

    await db.insert(tripMembers).values({
      tripId: trip.id,
      userId: user.id,
      displayName: extractDisplayName(user),
      role: "admin",
    });

    revalidatePath("/trips");
    return { ok: true, tripId: trip.id } as const;
  } catch {
    return { ok: false, error: "Failed to create trip" } as const;
  }
}

export async function updateTrip(tripId: string, input: CreateTripInput) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" } as const;

  const parsed = createTripSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message ?? "Invalid input" } as const;

  const membership = await getMembership(tripId, user.id);
  if (!membership || membership.role !== "admin")
    return { ok: false, error: "Not authorized" } as const;

  const { name, description, coverPhotoUrl, defaultCurrency, startDate, endDate, budget, itinerary } = parsed.data;

  try {
    await db.update(trips).set({
      name,
      description: description || null,
      coverPhotoUrl: coverPhotoUrl || null,
      defaultCurrency,
      startDate: startDate || null,
      endDate: endDate || null,
      budget: budget != null ? String(budget) : null,
      itinerary: itinerary || null,
    }).where(eq(trips.id, tripId));

    revalidatePath(`/trips/${tripId}`);
    revalidatePath("/trips");
    return { ok: true } as const;
  } catch {
    return { ok: false, error: "Failed to update trip" } as const;
  }
}

export async function archiveTrip(tripId: string, archive: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" } as const;

  const membership = await getMembership(tripId, user.id);
  if (!membership || membership.role !== "admin")
    return { ok: false, error: "Not authorized" } as const;

  try {
    await db.update(trips).set({ isArchived: archive }).where(eq(trips.id, tripId));
    revalidatePath("/trips");
    revalidatePath(`/trips/${tripId}`);
    return { ok: true } as const;
  } catch {
    return { ok: false, error: "Failed to update trip" } as const;
  }
}

export async function deleteTrip(tripId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" } as const;

  const membership = await getMembership(tripId, user.id);
  if (!membership || membership.role !== "admin")
    return { ok: false, error: "Not authorized" } as const;

  try {
    await db.delete(trips).where(eq(trips.id, tripId));
    revalidatePath("/trips");
    return { ok: true } as const;
  } catch {
    return { ok: false, error: "Failed to delete trip" } as const;
  }
}

export async function regenerateShareToken(tripId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" } as const;

  const membership = await getMembership(tripId, user.id);
  if (!membership || membership.role !== "admin")
    return { ok: false, error: "Not authorized" } as const;

  try {
    const [updated] = await db
      .update(trips)
      .set({ shareToken: sql`gen_random_uuid()` })
      .where(eq(trips.id, tripId))
      .returning();

    revalidatePath(`/trips/${tripId}/members`);
    return { ok: true, shareToken: updated.shareToken } as const;
  } catch {
    return { ok: false, error: "Failed to regenerate token" } as const;
  }
}
