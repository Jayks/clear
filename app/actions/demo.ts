"use server";

import { db } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/db/queries/auth";
import { groups } from "@/lib/db/schema/groups";
import { groupMembers } from "@/lib/db/schema/group-members";
import { and, eq, inArray } from "drizzle-orm";
import { extractDisplayName } from "@/lib/utils";
import { seedDemoGroup } from "@/lib/demo/seed-demo-trip";
import { seedDemoNest } from "@/lib/demo/seed-demo-nest";

export async function ensureDemoGroup() {
  const user = await getCurrentUser();
  if (!user) return;

  // Fetch all demo groups for this user
  const demoGroups = await db
    .select({ id: groups.id, groupType: groups.groupType, createdAt: groups.createdAt, description: groups.description })
    .from(groups)
    .innerJoin(groupMembers, eq(groups.id, groupMembers.groupId))
    .where(and(eq(groupMembers.userId, user.id), eq(groups.isDemo, true)))
    .orderBy(groups.createdAt);

  const tripDemos = demoGroups.filter((g) => g.groupType === "trip");
  const nestDemos = demoGroups.filter((g) => g.groupType === "nest");

  // Remove duplicates per type — keep the oldest, delete extras
  if (tripDemos.length > 1) {
    const [, ...extras] = tripDemos;
    await db.delete(groups).where(inArray(groups.id, extras.map((g) => g.id)));
  }
  if (nestDemos.length > 1) {
    const [, ...extras] = nestDemos;
    await db.delete(groups).where(inArray(groups.id, extras.map((g) => g.id)));
  }

  const displayName = extractDisplayName(user);

  // Seed whichever demo type is missing
  if (tripDemos.length === 0) {
    await seedDemoGroup(user.id, displayName);
  }

  // Re-seed the nest if it's the old sparse version (description doesn't match current seed)
  const NEST_SEED_VERSION = "A pre-loaded sample nest — explore shared tab splitting freely!";
  const existingNest = nestDemos[0];
  if (!existingNest) {
    await seedDemoNest(user.id, displayName);
  } else if (existingNest.description !== NEST_SEED_VERSION) {
    // Stale seed — delete and re-seed
    await db.delete(groups).where(eq(groups.id, existingNest.id));
    await seedDemoNest(user.id, displayName);
  }
}
