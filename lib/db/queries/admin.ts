import { db } from "@/lib/db/client";
import { groups } from "@/lib/db/schema/groups";
import { groupMembers } from "@/lib/db/schema/group-members";
import { expenses } from "@/lib/db/schema/expenses";
import { settlements } from "@/lib/db/schema/settlements";
import { adminActivity } from "@/lib/db/schema/admin-activity";
import type { AdminActivity } from "@/lib/db/schema/admin-activity";
import { count, sum, eq, sql, desc, isNotNull, and, inArray } from "drizzle-orm";
import { subscriptions } from "@/lib/db/schema/subscriptions";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/db/queries/auth";
import { unstable_cache } from "next/cache";

// Uses the shared getCurrentUser() (itself React-cache()-wrapped) so the admin
// queries reuse the same validated-session lookup as the rest of the request
// instead of issuing their own separate supabase.auth.getUser() round-trip.
const requirePlatformAdmin = async (): Promise<void> => {
  const user = await getCurrentUser();
  if (!isPlatformAdmin(user?.email)) throw new Error("Forbidden");
};

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

// Resolves PLATFORM_ADMIN_EMAIL entries to Supabase Auth user IDs via the
// Admin API. Fails open to [] (never throws) — callers treat "no admins
// resolved" as a no-op, same posture as the original inline block this
// replaces (used to live inline in getAdminUserList()).
async function resolvePlatformAdminUserIds(): Promise<string[]> {
  const adminEmails = new Set(getPlatformAdminEmails());
  if (adminEmails.size === 0) return [];
  try {
    const adminClient = createAdminClient();
    const { data } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
    return (data?.users ?? [])
      .filter((u) => u.email && adminEmails.has(u.email))
      .map((u) => u.id);
  } catch {
    return [];
  }
}

// Cached wrapper — the raw resolver above is a listUsers({ perPage: 1000 })
// Admin API call, too heavy to run on every login (notifyAdmins() calls this
// once per trackVisit()). The admin email→ID mapping essentially never
// changes, so cache it for an hour instead of hitting the Admin API per visit.
export const getPlatformAdminUserIds = unstable_cache(
  resolvePlatformAdminUserIds,
  ["platform-admin-ids"],
  { revalidate: 3600 }
);

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

  // Resolve platform admin emails → user IDs via the shared cached resolver
  // (outside the DB transaction).
  const platformAdminIds = new Set(await getPlatformAdminUserIds());

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

    const userIds = Array.from(userMap.keys());
    const subRows = userIds.length > 0
      ? await tx.select({
          userId: subscriptions.userId,
          currentPeriodEnd: subscriptions.currentPeriodEnd,
          status: subscriptions.status,
          trialEndsAt: subscriptions.trialEndsAt,
        }).from(subscriptions).where(inArray(subscriptions.userId, userIds))
      : [];
    const subMap = new Map(subRows.map((s) => [s.userId, s]));
    const now = new Date();

    return Array.from(userMap.entries()).map(([id, u]) => {
      const sub = subMap.get(id);
      // Timestamp-driven (Razorpay M1 refactor) — see gates.ts getUserPlan note.
      const isPlus = sub && (
        (sub.currentPeriodEnd !== null && sub.currentPeriodEnd > now) ||
        (sub.status === "trialing" && sub.trialEndsAt !== null && sub.trialEndsAt > now)
      );
      const isPlatformAdmin = platformAdminIds.has(id);
      return {
        id,
        email: "",
        displayName: u.displayName ?? `User ${id.slice(0, 8)}`,
        joinedAt: u.joinedAt?.toISOString() ?? new Date().toISOString(),
        groupsOwned: u.owned,
        groupsJoined: u.joined,
        role: (isPlatformAdmin ? "platform_admin" : u.owned > 0 ? "group_owner" : "member") as "platform_admin" | "group_owner" | "member",
        plan: (isPlus ? "plus" : "free") as "plus" | "free",
      };
    });
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
        isDemo:          groups.isDemo,
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

// Deliberately UNCACHED, unlike getPlatformAdminUserIds above — that cache is
// justified because the admin email→ID mapping never changes; this data
// changes on every login, so caching it would directly defeat the feature's
// purpose (refreshing /admin after a fresh login wouldn't show it).
export async function getRecentAdminActivity(limit: number): Promise<AdminActivity[]> {
  await requirePlatformAdmin();
  return withAdminTimeout(async (tx) => {
    return tx
      .select()
      .from(adminActivity)
      .orderBy(desc(adminActivity.createdAt))
      .limit(limit);
  });
}
