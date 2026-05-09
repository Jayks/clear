import { db } from "@/lib/db/client";
import { trips } from "@/lib/db/schema/trips";
import { tripMembers } from "@/lib/db/schema/trip-members";
import { eq, and, count, sql } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";

async function getCurrentUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getTrips() {
  const user = await getCurrentUser();
  if (!user) return [];

  const rows = await db
    .select({
      trip: trips,
      // Correlated subquery counts ALL members of the trip,
      // not just the row matched by the outer WHERE clause.
      memberCount: sql<number>`(select count(*) from trip_members where trip_members.trip_id = ${trips.id})`,
    })
    .from(trips)
    .innerJoin(tripMembers, eq(trips.id, tripMembers.tripId))
    .where(and(eq(tripMembers.userId, user.id), eq(trips.isArchived, false)))
    .groupBy(trips.id)
    // Demo trip pinned first, then upcoming by nearest date, then past/undated by recency
    .orderBy(
      sql`case when ${trips.isDemo} then 0 else 1 end`,
      sql`case when ${trips.startDate} >= current_date then 0 else 1 end`,
      sql`case when ${trips.startDate} >= current_date then ${trips.startDate} end asc`,
      sql`case when ${trips.startDate} < current_date or ${trips.startDate} is null then ${trips.createdAt} end desc`
    );

  return rows;
}

export async function getArchivedTrips() {
  const user = await getCurrentUser();
  if (!user) return [];

  return db
    .select({
      trip: trips,
      memberCount: sql<number>`(select count(*) from trip_members where trip_members.trip_id = ${trips.id})`,
    })
    .from(trips)
    .innerJoin(tripMembers, eq(trips.id, tripMembers.tripId))
    .where(and(eq(tripMembers.userId, user.id), eq(trips.isArchived, true)))
    .groupBy(trips.id)
    .orderBy(sql`${trips.createdAt} desc`);
}

export async function getTripWithMembers(tripId: string) {
  const user = await getCurrentUser();
  if (!user) return null;

  // Verify membership first (separate query — avoids compound-join issues with postgres.js)
  const [membership] = await db
    .select()
    .from(tripMembers)
    .where(and(eq(tripMembers.tripId, tripId), eq(tripMembers.userId, user.id)));

  if (!membership) return null;

  // Fetch the trip
  const [trip] = await db
    .select()
    .from(trips)
    .where(eq(trips.id, tripId));

  if (!trip) return null;

  // All members of the trip
  const rawMembers = await db
    .select()
    .from(tripMembers)
    .where(eq(tripMembers.tripId, tripId))
    .orderBy(tripMembers.joinedAt);

  // Patch the current user's displayName from their live session if the DB
  // row was created before the display_name column was added.
  const sessionName =
    (user.user_metadata?.full_name as string | undefined) ??
    user.email?.split("@")[0] ??
    null;

  const members = rawMembers.map((m) =>
    m.userId === user.id && !m.displayName
      ? { ...m, displayName: sessionName }
      : m
  );

  return { trip, members, currentMember: { ...membership, displayName: membership.displayName ?? sessionName }, currentUser: user };
}

export async function getTripByToken(token: string) {
  const [trip] = await db
    .select()
    .from(trips)
    .where(eq(trips.shareToken, token));

  if (!trip) return null;

  const [{ memberCount }] = await db
    .select({ memberCount: count(tripMembers.id) })
    .from(tripMembers)
    .where(eq(tripMembers.tripId, trip.id));

  return { trip, memberCount };
}
