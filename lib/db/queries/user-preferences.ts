import { db } from "@/lib/db/client";
import { userPreferences } from "@/lib/db/schema/user-preferences";
import { eq, and, inArray } from "drizzle-orm";

/** A user with no row yet (never touched the toggle) defaults to OFF. */
export async function getEmailNotificationsEnabled(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ enabled: userPreferences.emailNotificationsEnabled })
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId));
  return row?.enabled ?? false;
}

/**
 * Batch variant for the multi-recipient email send path
 * (`sendExpenseNotification`) — one query for N recipients instead of N,
 * matching this codebase's existing "batch, no N+1" discipline
 * (`getUserMemberIds`, `getHomeBalances`). Returns the set of userIds whose
 * preference is ON; anyone absent (no row, or row present but false) is
 * simply not in the set.
 */
export async function getEmailNotificationsEnabledBatch(userIds: string[]): Promise<Set<string>> {
  if (userIds.length === 0) return new Set();
  const rows = await db
    .select({ userId: userPreferences.userId })
    .from(userPreferences)
    .where(
      and(
        inArray(userPreferences.userId, userIds),
        eq(userPreferences.emailNotificationsEnabled, true)
      )
    );
  return new Set(rows.map((r) => r.userId));
}

export async function setEmailNotificationsEnabled(userId: string, enabled: boolean): Promise<void> {
  await db
    .insert(userPreferences)
    .values({ userId, emailNotificationsEnabled: enabled })
    .onConflictDoUpdate({
      target: userPreferences.userId,
      set: { emailNotificationsEnabled: enabled, updatedAt: new Date() },
    });
}
