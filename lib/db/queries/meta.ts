import { cache } from "react";
import { db } from "@/lib/db/client";
import { trips } from "@/lib/db/schema/trips";
import { eq } from "drizzle-orm";

// React cache deduplicates within the same request render tree,
// so generateMetadata + the page component share one DB call.
export const getTripName = cache(async (tripId: string): Promise<string | null> => {
  const [row] = await db
    .select({ name: trips.name })
    .from(trips)
    .where(eq(trips.id, tripId));
  return row?.name ?? null;
});
