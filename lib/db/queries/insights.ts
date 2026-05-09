import { db } from "@/lib/db/client";
import { trips } from "@/lib/db/schema/trips";
import { tripMembers } from "@/lib/db/schema/trip-members";
import { expenses } from "@/lib/db/schema/expenses";
import { expenseSplits } from "@/lib/db/schema/expense-splits";
import { eq, sum, count, inArray, ne } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { computeAllTripsInsights } from "@/lib/insights/all-trips-insights";
import type { TripSummary } from "@/lib/insights/all-trips-insights";
import type { OtherTripSummary } from "@/lib/insights/cross-trip";

export async function getAllTripsInsightsData() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // All trips the user is a member of
  const memberships = await db
    .select({ tripId: tripMembers.tripId })
    .from(tripMembers)
    .where(eq(tripMembers.userId, user.id));

  if (memberships.length === 0) return null;

  const tripIds = memberships.map((m) => m.tripId);

  const [userTrips, allMembers] = await Promise.all([
    db.select().from(trips).where(inArray(trips.id, tripIds)),
    db.select().from(tripMembers).where(inArray(tripMembers.tripId, tripIds)),
  ]);

  // Expense totals per trip
  const summaries: TripSummary[] = await Promise.all(
    userTrips.map(async (trip) => {
      const [totals] = await db
        .select({ total: sum(expenses.amount), cnt: count(expenses.id) })
        .from(expenses)
        .where(eq(expenses.tripId, trip.id));

      return {
        tripId: trip.id,
        name: trip.name,
        totalSpend: Number(totals?.total ?? 0),
        expenseCount: Number(totals?.cnt ?? 0),
        memberCount: allMembers.filter((m) => m.tripId === trip.id).length,
        currency: trip.defaultCurrency,
      };
    })
  );

  // Category totals across all trips
  const catRows = await db
    .select({ category: expenses.category, total: sum(expenses.amount) })
    .from(expenses)
    .where(inArray(expenses.tripId, tripIds))
    .groupBy(expenses.category);

  const categoryTotals: Record<string, number> = {};
  for (const row of catRows) {
    categoryTotals[row.category] = Number(row.total ?? 0);
  }

  return computeAllTripsInsights({ trips: userTrips, summaries, categoryTotals, allMembers, currentUserId: user.id });
}

export async function getOtherTripsSummary(currentTripId: string): Promise<OtherTripSummary[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const memberships = await db
    .select({ tripId: tripMembers.tripId })
    .from(tripMembers)
    .where(eq(tripMembers.userId, user.id));

  const otherTripIds = memberships.map((m) => m.tripId).filter((id) => id !== currentTripId);
  if (otherTripIds.length === 0) return [];

  const [otherTrips, memberCounts, expTotals, catRows] = await Promise.all([
    db.select().from(trips).where(inArray(trips.id, otherTripIds)),
    db
      .select({ tripId: tripMembers.tripId, n: count() })
      .from(tripMembers)
      .where(inArray(tripMembers.tripId, otherTripIds))
      .groupBy(tripMembers.tripId),
    db
      .select({ tripId: expenses.tripId, total: sum(expenses.amount) })
      .from(expenses)
      .where(inArray(expenses.tripId, otherTripIds))
      .groupBy(expenses.tripId),
    db
      .select({ tripId: expenses.tripId, category: expenses.category, total: sum(expenses.amount) })
      .from(expenses)
      .where(inArray(expenses.tripId, otherTripIds))
      .groupBy(expenses.tripId, expenses.category),
  ]);

  const memberMap = new Map(memberCounts.map((r) => [r.tripId, r.n]));
  const totalMap = new Map(expTotals.map((r) => [r.tripId, Number(r.total ?? 0)]));

  const catMap = new Map<string, Record<string, number>>();
  for (const row of catRows) {
    if (!catMap.has(row.tripId)) catMap.set(row.tripId, {});
    catMap.get(row.tripId)![row.category] = Number(row.total ?? 0);
  }

  return otherTrips.map((t) => ({
    tripId: t.id,
    totalSpend: totalMap.get(t.id) ?? 0,
    memberCount: memberMap.get(t.id) ?? 0,
    startDate: t.startDate,
    endDate: t.endDate,
    currency: t.defaultCurrency,
    categoryTotals: catMap.get(t.id) ?? {},
  }));
}
