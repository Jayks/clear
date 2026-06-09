import { cache } from "react";
import { db } from "@/lib/db/client";
import { groups } from "@/lib/db/schema/groups";
import { eq } from "drizzle-orm";

// React cache deduplicates within the same request render tree,
// so generateMetadata + the page component share one DB call.
export const getGroupName = cache(async (groupId: string): Promise<string | null> => {
  const [row] = await db
    .select({ name: groups.name })
    .from(groups)
    .where(eq(groups.id, groupId));
  return row?.name ?? null;
});

// Richer summary used by the group layout to power the GroupActionHub sheet.
// React-cached so it deduplicates with any concurrent group fetches.
export const getGroupSummary = cache(async (groupId: string) => {
  const [row] = await db
    .select({
      name:            groups.name,
      groupType:       groups.groupType,
      defaultCurrency: groups.defaultCurrency,
      isArchived:      groups.isArchived,
      startDate:       groups.startDate,
      endDate:         groups.endDate,
      shareToken:      groups.shareToken,
    })
    .from(groups)
    .where(eq(groups.id, groupId));
  return row ?? null;
});
