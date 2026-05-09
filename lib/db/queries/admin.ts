import { db } from "@/lib/db/client";
import { groups } from "@/lib/db/schema/groups";
import { groupMembers } from "@/lib/db/schema/group-members";
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
  const [groupsResult, expensesResult, settledResult, usersResult] = await Promise.all([
    db.select({ total: count() }).from(groups),
    db.select({ total: count() }).from(expenses),
    db.select({ total: sum(settlements.amount) }).from(settlements),
    createAdminClient().auth.admin.listUsers({ perPage: 1 }),
  ]);

  return {
    totalUsers: ("total" in usersResult.data ? usersResult.data.total : 0) ?? 0,
    totalGroups: groupsResult[0].total,
    totalExpenses: expensesResult[0].total,
    totalSettled: Number(settledResult[0].total ?? 0),
  };
}

export async function getAdminUserList() {
  await requirePlatformAdmin();
  const { data: { users } } = await createAdminClient().auth.admin.listUsers({ perPage: 100 });

  const [ownerCounts, memberCounts] = await Promise.all([
    db
      .select({ userId: groupMembers.userId, owned: count() })
      .from(groupMembers)
      .where(eq(groupMembers.role, "admin"))
      .groupBy(groupMembers.userId),
    db
      .select({ userId: groupMembers.userId, total: count() })
      .from(groupMembers)
      .where(isNotNull(groupMembers.userId))
      .groupBy(groupMembers.userId),
  ]);

  const ownerMap = new Map(ownerCounts.map((r) => [r.userId!, r.owned]));
  const memberMap = new Map(memberCounts.map((r) => [r.userId!, r.total]));
  const adminEmails = getPlatformAdminEmails();

  return users.map((u) => {
    const email = u.email ?? "";
    const groupsOwned = ownerMap.get(u.id) ?? 0;
    const role: "platform_admin" | "group_owner" | "member" =
      adminEmails.includes(email) ? "platform_admin"
      : groupsOwned > 0 ? "group_owner"
      : "member";

    return {
      id: u.id,
      email,
      displayName:
        typeof u.user_metadata?.full_name === "string"
          ? u.user_metadata.full_name
          : email.split("@")[0],
      joinedAt: u.created_at,
      groupsOwned,
      groupsJoined: memberMap.get(u.id) ?? 0,
      role,
    };
  });
}

export async function getAdminGroupList() {
  await requirePlatformAdmin();
  return db
    .select({
      id: groups.id,
      name: groups.name,
      coverPhotoUrl: groups.coverPhotoUrl,
      createdBy: groups.createdBy,
      creatorName: sql<string>`(
        select coalesce(gm.display_name, gm.guest_name, 'Unknown')
        from group_members gm
        where gm.group_id = ${groups.id} and gm.user_id = ${groups.createdBy}
        limit 1
      )`,
      defaultCurrency: groups.defaultCurrency,
      startDate: groups.startDate,
      endDate: groups.endDate,
      isArchived: groups.isArchived,
      createdAt: groups.createdAt,
      memberCount: sql<number>`(select count(*) from group_members where group_members.group_id = groups.id)`,
      expenseCount: sql<number>`(select count(*) from expenses where expenses.group_id = groups.id)`,
      totalSpend: sql<number | null>`(select sum(amount)::float8 from expenses where expenses.group_id = groups.id)`,
    })
    .from(groups)
    .orderBy(desc(groups.createdAt))
    .limit(200);
}
