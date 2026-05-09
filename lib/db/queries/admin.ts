import { db } from "@/lib/db/client";
import { trips } from "@/lib/db/schema/trips";
import { tripMembers } from "@/lib/db/schema/trip-members";
import { expenses } from "@/lib/db/schema/expenses";
import { settlements } from "@/lib/db/schema/settlements";
import { count, sum, eq, sql, desc, isNotNull } from "drizzle-orm";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function requirePlatformAdmin(): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isPlatformAdmin(user?.email)) throw new Error("Forbidden");
}

function getPlatformAdminEmails(): string[] {
  return (process.env.PLATFORM_ADMIN_EMAIL ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
}

export function isPlatformAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return getPlatformAdminEmails().includes(email);
}

export async function getAdminStats() {
  await requirePlatformAdmin();
  const [tripsResult, expensesResult, settledResult, usersResult] = await Promise.all([
    db.select({ total: count() }).from(trips),
    db.select({ total: count() }).from(expenses),
    db.select({ total: sum(settlements.amount) }).from(settlements),
    createAdminClient().auth.admin.listUsers({ perPage: 1 }),
  ]);

  return {
    totalUsers: ("total" in usersResult.data ? usersResult.data.total : 0) ?? 0,
    totalTrips: tripsResult[0].total,
    totalExpenses: expensesResult[0].total,
    totalSettled: Number(settledResult[0].total ?? 0),
  };
}

export async function getAdminUserList() {
  await requirePlatformAdmin();
  const { data: { users } } = await createAdminClient().auth.admin.listUsers({ perPage: 100 });

  const [ownerCounts, memberCounts] = await Promise.all([
    db
      .select({ userId: tripMembers.userId, owned: count() })
      .from(tripMembers)
      .where(eq(tripMembers.role, "admin"))
      .groupBy(tripMembers.userId),
    db
      .select({ userId: tripMembers.userId, total: count() })
      .from(tripMembers)
      .where(isNotNull(tripMembers.userId))
      .groupBy(tripMembers.userId),
  ]);

  const ownerMap = new Map(ownerCounts.map((r) => [r.userId!, r.owned]));
  const memberMap = new Map(memberCounts.map((r) => [r.userId!, r.total]));
  const adminEmails = getPlatformAdminEmails();

  return users.map((u) => {
    const email = u.email ?? "";
    const tripsOwned = ownerMap.get(u.id) ?? 0;
    const role: "platform_admin" | "trip_owner" | "member" =
      adminEmails.includes(email) ? "platform_admin"
      : tripsOwned > 0 ? "trip_owner"
      : "member";

    return {
      id: u.id,
      email,
      displayName:
        typeof u.user_metadata?.full_name === "string"
          ? u.user_metadata.full_name
          : email.split("@")[0],
      joinedAt: u.created_at,
      tripsOwned,
      tripsJoined: memberMap.get(u.id) ?? 0,
      role,
    };
  });
}

export async function getAdminTripList() {
  await requirePlatformAdmin();
  return db
    .select({
      id: trips.id,
      name: trips.name,
      coverPhotoUrl: trips.coverPhotoUrl,
      createdBy: trips.createdBy,
      creatorName: sql<string>`(
        select coalesce(tm.display_name, tm.guest_name, 'Unknown')
        from trip_members tm
        where tm.trip_id = ${trips.id} and tm.user_id = ${trips.createdBy}
        limit 1
      )`,
      defaultCurrency: trips.defaultCurrency,
      startDate: trips.startDate,
      endDate: trips.endDate,
      isArchived: trips.isArchived,
      createdAt: trips.createdAt,
      memberCount: sql<number>`(select count(*) from trip_members where trip_members.trip_id = trips.id)`,
      expenseCount: sql<number>`(select count(*) from expenses where expenses.trip_id = trips.id)`,
      totalSpend: sql<number | null>`(select sum(amount)::float8 from expenses where expenses.trip_id = trips.id)`,
    })
    .from(trips)
    .orderBy(desc(trips.createdAt))
    .limit(200);
}
