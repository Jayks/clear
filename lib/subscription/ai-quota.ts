import { db } from "@/lib/db/client";
import { aiUsage } from "@/lib/db/schema/ai-usage";
import { getUserPlan } from "./gates";
import { and, eq, sql } from "drizzle-orm";

/**
 * Logging-AI (receipt scan / NL quick-add / chat import) is FREE for everyone
 * (June 2026 re-cut). This module enforces a generous, SILENT monthly ceiling on
 * the free tier purely as an abuse circuit breaker — it is never surfaced in the
 * UI. Bump the ceiling if it ever bites a real heavy user.
 *
 * Analytical AI (narrative, Plan-vs-Reality, "You" insights) stays Plus-only and
 * is gated by `canUseAI` in gates.ts — NOT by this module.
 */
export const FREE_AI_MONTHLY_CEILING = 50;

function currentPeriod(): string {
  return new Date().toISOString().slice(0, 7); // 'YYYY-MM'
}

/**
 * May this user run a logging-AI call right now?
 * Plus/trialing → always. Free → under the monthly ceiling.
 * Fails OPEN (returns true) on any DB error or if the table isn't applied yet —
 * we never block the first-run "wow" on infrastructure.
 */
export async function canUseLoggingAI(userId: string): Promise<boolean> {
  try {
    if ((await getUserPlan(userId)) === "plus") return true;
    const [row] = await db
      .select({ count: aiUsage.count })
      .from(aiUsage)
      .where(and(eq(aiUsage.userId, userId), eq(aiUsage.period, currentPeriod())))
      .limit(1);
    return Number(row?.count ?? 0) < FREE_AI_MONTHLY_CEILING;
  } catch {
    return true;
  }
}

/**
 * Increment the user's logging-AI counter for the current month. Best-effort and
 * no-op for Plus (Plus is uncapped, so we don't bother counting). Approximate is
 * fine — never throws.
 */
export async function incrementLoggingAiUsage(userId: string): Promise<void> {
  try {
    if ((await getUserPlan(userId)) === "plus") return;
    const period = currentPeriod();
    await db
      .insert(aiUsage)
      .values({ userId, period, count: 1 })
      .onConflictDoUpdate({
        target: [aiUsage.userId, aiUsage.period],
        set: { count: sql`${aiUsage.count} + 1`, updatedAt: sql`now()` },
      });
  } catch {
    // best-effort; ignore
  }
}
