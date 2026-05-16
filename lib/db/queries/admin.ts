import { db } from "@/lib/db/client";
import { groups } from "@/lib/db/schema/groups";
import { groupMembers } from "@/lib/db/schema/group-members";
import { expenses } from "@/lib/db/schema/expenses";
import { settlements } from "@/lib/db/schema/settlements";
import { count, sum, eq, sql, desc, isNotNull, and } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { cache } from "react";

// cache() deduplicates across getAdminStats / getAdminUserList / getAdminGroupList
// when they run in Promise.all — one getUser() network call instead of three.
const requirePlatformAdmin = cache(async (): Promise<void> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isPlatformAdmin(user?.email)) throw new Error("Forbidden");
});

// Wraps a block in a transaction and sets a hard server-side statement timeout.
// When the timeout fires, Postgres cancels the query and rolls back the transaction,
// immediately releasing the connection back to the pool. Without this, slow/hung
// queries hold connections and starve other pages (e.g. groups) of DB access.
async function withAdminTimeout<T>(
  fn: (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => Promise<T>,
  timeoutMs = 8_000,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL statement_timeout = ${sql.raw(String(timeoutMs))}`);
    return fn(tx);
  });
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
  return withAdminTimeout(async (tx) => {
    // Single SQL round-trip for all four stats
    const [row] = await tx.execute<{
      total_groups: string; total_expenses: string;
      total_settled: string; total_users: string;
    }>(sql`
      SELECT
        (SELECT count(*)::text FROM groups)                                             AS total_groups,
        (SELECT count(*)::text FROM expenses WHERE is_template = false)                AS total_expenses,
        (SELECT COALESCE(sum(amount), 0)::text FROM settlements)                       AS total_settled,
        (SELECT count(DISTINCT user_id)::text FROM group_members WHERE user_id IS NOT NULL) AS total_users
    `);
    return {
      totalUsers:    Number(row.total_users),
      totalGroups:   Number(row.total_groups),
      totalExpenses: Number(row.total_expenses),
      totalSettled:  Number(row.total_settled),
    };
  });
}

export async function getAdminUserList() {
  await requirePlatformAdmin();
  return withAdminTimeout(async (tx) => {
    const rows = await tx
      .select({
        userId:      groupMembers.userId,
        displayName: groupMembers.displayName,
        role:        groupMembers.role,
        joinedAt:    groupMembers.joinedAt,
      })
      .from(groupMembers)
      .where(isNotNull(groupMembers.userId));

    const userMap = new Map<string, {
      displayName: string | null; owned: number; joined: number; joinedAt: Date | null;
    }>();
    for (const row of rows) {
      const id = row.userId!;
      const existing = userMap.get(id);
      if (!existing) {
        userMap.set(id, { displayName: row.displayName, owned: row.role === "admin" ? 1 : 0, joined: 1, joinedAt: row.joinedAt });
      } else {
        existing.joined++;
        if (row.role === "admin") existing.owned++;
        if (!existing.joinedAt || (row.joinedAt && row.joinedAt < existing.joinedAt)) existing.joinedAt = row.joinedAt;
      }
    }

    return Array.from(userMap.entries()).map(([id, u]) => ({
      id,
      email: "",
      displayName: u.displayName ?? `User ${id.slice(0, 8)}`,
      joinedAt: u.joinedAt?.toISOString() ?? new Date().toISOString(),
      groupsOwned: u.owned,
      groupsJoined: u.joined,
      role: (u.owned > 0 ? "group_owner" : "member") as "platform_admin" | "group_owner" | "member",
    }));
  });
}

export async function getAdminGroupList() {
  await requirePlatformAdmin();
  return withAdminTimeout(async (tx) => {
    // Single-pass JOIN aggregation — replaces 4 correlated subqueries per row.
    const rows = await tx
      .select({
        id:              groups.id,
        name:            groups.name,
        coverPhotoUrl:   groups.coverPhotoUrl,
        createdBy:       groups.createdBy,
        defaultCurrency: groups.defaultCurrency,
        startDate:       groups.startDate,
        endDate:         groups.endDate,
        isArchived:      groups.isArchived,
        createdAt:       groups.createdAt,
        memberCount:     sql<number>`count(distinct ${groupMembers.id})`,
        expenseCount:    sql<number>`count(distinct ${expenses.id})`,
        totalSpend:      sql<number | null>`sum(${expenses.amount})::float8`,
      })
      .from(groups)
      .leftJoin(groupMembers, eq(groupMembers.groupId, groups.id))
      .leftJoin(expenses, and(eq(expenses.groupId, groups.id), eq(expenses.isTemplate, false)))
      .groupBy(groups.id)
      .orderBy(desc(groups.createdAt))
      .limit(200);

    return rows.map(r => ({ ...r, creatorName: "—" }));
  });
}
