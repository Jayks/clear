import { db } from "@/lib/db/client";
import { groups } from "@/lib/db/schema/groups";
import { groupMembers } from "@/lib/db/schema/group-members";
import { expenses } from "@/lib/db/schema/expenses";
import { eq, and, sql } from "drizzle-orm";
import { getUserPlan } from "./gates";
import { selectLockedGroups, isCurrentlyActiveTrip, type LockCheckGroup } from "./degradation";

/**
 * DB-backed callers for the pure overflow-lock policy in `degradation.ts`.
 * Split out so the pure functions stay directly unit-testable (see that file's
 * header comment) — this file is exercised via manual testing + the server
 * actions that call `isGroupLocked`, not Vitest.
 */

/**
 * The admin's active (non-archived, non-demo) groups with the inputs
 * `selectLockedGroups` needs. `lastActiveAt` = latest expense `createdAt` for that
 * group, falling back to the group's own `createdAt` when it has no expenses yet.
 */
export async function getGroupsForLockCheck(adminUserId: string): Promise<LockCheckGroup[]> {
  const rows = await db
    .select({
      id: groups.id,
      groupType: groups.groupType,
      startDate: groups.startDate,
      endDate: groups.endDate,
      createdAt: groups.createdAt,
      lastExpenseAt: sql<string | null>`MAX(${expenses.createdAt})`,
    })
    .from(groups)
    .leftJoin(expenses, eq(expenses.groupId, groups.id))
    .where(and(eq(groups.createdBy, adminUserId), eq(groups.isArchived, false), eq(groups.isDemo, false)))
    .groupBy(groups.id, groups.groupType, groups.startDate, groups.endDate, groups.createdAt);

  const now = new Date();
  return rows.map((r) => ({
    id: r.id,
    lastActiveAt: r.lastExpenseAt ? new Date(r.lastExpenseAt) : r.createdAt,
    isActiveTrip: isCurrentlyActiveTrip(r.groupType, r.startDate, r.endDate, now),
  }));
}

/**
 * Is this group currently overflow-locked (read-only) for its admin's plan?
 * Mirrors `getGroupPlan`'s admin-lookup pattern (lib/subscription/gates.ts).
 * Fails open (never blocks a write due to a DB hiccup or a group with no
 * resolvable admin) — same philosophy as every other gate in this family.
 */
export async function isGroupLocked(groupId: string): Promise<boolean> {
  try {
    const [adminRow] = await db
      .select({ userId: groupMembers.userId })
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.role, "admin")))
      .limit(1);
    if (!adminRow?.userId) return false;

    const plan = await getUserPlan(adminRow.userId);
    if (plan === "plus") return false;

    const groupList = await getGroupsForLockCheck(adminRow.userId);
    return selectLockedGroups(groupList, plan).has(groupId);
  } catch {
    return false;
  }
}

/**
 * Batched variant for list pages (e.g. the Home page card grid) — computes the
 * FULL locked-group set for groups the given user admins, in one extra query,
 * instead of N `isGroupLocked` calls (same N+1 pitfall the old per-card
 * `getBalances` fan-out had before it was batched). Only meaningful for groups
 * this user admins — a group admin'd by someone else isn't covered (the admin's
 * own page render, or that group's server-action write-guards, handle it).
 */
export async function getMyLockedGroupIds(userId: string): Promise<Set<string>> {
  try {
    const plan = await getUserPlan(userId);
    if (plan === "plus") return new Set();
    const groupList = await getGroupsForLockCheck(userId);
    return selectLockedGroups(groupList, plan);
  } catch {
    return new Set();
  }
}
