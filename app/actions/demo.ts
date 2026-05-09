"use server";

import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db/client";
import { trips } from "@/lib/db/schema/trips";
import { tripMembers } from "@/lib/db/schema/trip-members";
import { and, eq, inArray } from "drizzle-orm";
import { extractDisplayName } from "@/lib/utils";
import { seedDemoTrip } from "@/lib/demo/seed-demo-trip";

export async function ensureDemoTrip() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Fetch all demo trips for this user — there should only ever be one.
  const demoTrips = await db
    .select({ id: trips.id, createdAt: trips.createdAt })
    .from(trips)
    .innerJoin(tripMembers, eq(trips.id, tripMembers.tripId))
    .where(and(eq(tripMembers.userId, user.id), eq(trips.isDemo, true)))
    .orderBy(trips.createdAt);

  // Remove duplicates — keep the oldest, delete the rest.
  if (demoTrips.length > 1) {
    const [, ...extras] = demoTrips;
    await db.delete(trips).where(inArray(trips.id, extras.map((t) => t.id)));
    return;
  }

  if (demoTrips.length === 1) return;

  await seedDemoTrip(user.id, extractDisplayName(user));
}
