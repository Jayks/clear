import { cache } from "react";
import { db } from "@/lib/db/client";
import { subscriptions } from "@/lib/db/schema/subscriptions";
import { groupMembers } from "@/lib/db/schema/group-members";
import { expenses } from "@/lib/db/schema/expenses";
import { groups } from "@/lib/db/schema/groups";
import { eq, and, count, inArray } from "drizzle-orm";

// React cache() deduplicates across the RSC tree — one DB hit per user per request
export const getUserPlan = cache(async (userId: string): Promise<"plus" | "free"> => {
  try {
    const [sub] = await db.select().from(subscriptions)
      .where(eq(subscriptions.userId, userId)).limit(1);
    if (!sub) return "free";
    if (sub.plan === "plus" && sub.status === "active") return "plus";
    if (sub.status === "trialing" && sub.trialEndsAt && sub.trialEndsAt > new Date()) return "plus";
    return "free";
  } catch {
    // Table may not exist yet or DB unreachable — fail open (free plan)
    return "free";
  }
});

// Uses the group admin's plan — all members benefit from the admin's subscription
export const getGroupPlan = cache(async (groupId: string): Promise<"plus" | "free"> => {
  try {
    const [adminRow] = await db.select({ userId: groupMembers.userId })
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.role, "admin")))
      .limit(1);
    if (!adminRow?.userId) return "free";
    return getUserPlan(adminRow.userId);
  } catch {
    return "free";
  }
});

export async function getUserSubscription(userId: string) {
  const [sub] = await db.select().from(subscriptions)
    .where(eq(subscriptions.userId, userId)).limit(1);
  return sub ?? null;
}

// ── User-level gates (current user's plan) ────────────────────────────────────

export async function canCreateGroup(userId: string): Promise<boolean> {
  try {
    if ((await getUserPlan(userId)) === "plus") return true;
    const [row] = await db.select({ total: count() }).from(groups)
      .where(and(eq(groups.createdBy, userId), eq(groups.isArchived, false), eq(groups.isDemo, false)));
    return Number(row.total) < 4;
  } catch {
    return true;
  }
}

export async function canUseAI(userId: string): Promise<boolean> {
  return (await getUserPlan(userId)) === "plus";
}

export async function canExportCSV(userId: string): Promise<boolean> {
  return (await getUserPlan(userId)) === "plus";
}

// ── Group-level gates (group admin's plan) ────────────────────────────────────

export async function canUseNonEqualSplit(groupId: string): Promise<boolean> {
  return (await getGroupPlan(groupId)) === "plus";
}

export async function canUseTemplates(groupId: string): Promise<boolean> {
  return (await getGroupPlan(groupId)) === "plus";
}

export async function canUseBudget(groupId: string): Promise<boolean> {
  return (await getGroupPlan(groupId)) === "plus";
}

export async function canAddMember(groupId: string): Promise<boolean> {
  try {
    if ((await getGroupPlan(groupId)) === "plus") return true;
    const [row] = await db.select({ total: count() }).from(groupMembers)
      .where(eq(groupMembers.groupId, groupId));
    return Number(row.total) < 8;
  } catch {
    return true;
  }
}

export async function canAddExpense(groupId: string): Promise<boolean> {
  try {
    if ((await getGroupPlan(groupId)) === "plus") return true;
    const [row] = await db.select({ total: count() }).from(expenses)
      .where(and(eq(expenses.groupId, groupId), eq(expenses.isTemplate, false)));
    return Number(row.total) < 50;
  } catch {
    return true;
  }
}

// ── Soft nudge helpers (used by UI in Phase 3) ────────────────────────────────

export async function getGroupNudge(userId: string): Promise<"near_limit" | "at_limit" | null> {
  if ((await getUserPlan(userId)) === "plus") return null;
  const [row] = await db.select({ total: count() }).from(groups)
    .where(and(eq(groups.createdBy, userId), eq(groups.isArchived, false), eq(groups.isDemo, false)));
  const n = Number(row.total);
  if (n >= 4) return "at_limit";
  if (n >= 3) return "near_limit";
  return null;
}

export async function getMemberNudge(groupId: string): Promise<"near_limit" | "at_limit" | null> {
  if ((await getGroupPlan(groupId)) === "plus") return null;
  const [row] = await db.select({ total: count() }).from(groupMembers)
    .where(eq(groupMembers.groupId, groupId));
  const n = Number(row.total);
  if (n >= 8) return "at_limit";
  if (n >= 7) return "near_limit";
  return null;
}

export async function getExpenseNudge(groupId: string): Promise<"near_limit" | "at_limit" | null> {
  if ((await getGroupPlan(groupId)) === "plus") return null;
  const [row] = await db.select({ total: count() }).from(expenses)
    .where(and(eq(expenses.groupId, groupId), eq(expenses.isTemplate, false)));
  const n = Number(row.total);
  if (n >= 50) return "at_limit";
  if (n >= 40) return "near_limit";
  return null;
}

// ── Batch plan lookup for groups page (Phase 4) ───────────────────────────────

// Single JOIN: fetches admin plan for N groups in one query
export async function getGroupsAdminPlans(
  groupIds: string[]
): Promise<Record<string, "plus" | "free">> {
  if (!groupIds.length) return {};
  const rows = await db
    .select({
      groupId: groupMembers.groupId,
      plan: subscriptions.plan,
      status: subscriptions.status,
      trialEndsAt: subscriptions.trialEndsAt,
    })
    .from(groupMembers)
    .leftJoin(subscriptions, eq(subscriptions.userId, groupMembers.userId))
    .where(and(inArray(groupMembers.groupId, groupIds), eq(groupMembers.role, "admin")));
  const now = new Date();
  const result: Record<string, "plus" | "free"> = {};
  for (const r of rows) {
    if (result[r.groupId] === "plus") continue;
    const isPlus =
      (r.plan === "plus" && r.status === "active") ||
      (r.status === "trialing" && r.trialEndsAt !== null && r.trialEndsAt > now);
    result[r.groupId] = isPlus ? "plus" : "free";
  }
  return result;
}
