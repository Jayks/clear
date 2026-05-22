import { db } from "@/lib/db/client";
import { platformSettings } from "@/lib/db/schema/platform-settings";
import { eq, sql } from "drizzle-orm";

export async function getVisitorNotificationsEnabled(): Promise<boolean> {
  const [row] = await db
    .select({ value: platformSettings.value })
    .from(platformSettings)
    .where(eq(platformSettings.key, "visitor_notifications_enabled"));
  return row ? row.value === "true" : true;
}

export async function setVisitorNotificationsEnabled(enabled: boolean): Promise<void> {
  await db
    .insert(platformSettings)
    .values({ key: "visitor_notifications_enabled", value: String(enabled) })
    .onConflictDoUpdate({
      target: platformSettings.key,
      set: { value: String(enabled), updatedAt: sql`now()` },
    });
}
