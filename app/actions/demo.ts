"use server";

import { db } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/db/queries/auth";
import { groups } from "@/lib/db/schema/groups";
import { groupMembers } from "@/lib/db/schema/group-members";
import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { extractDisplayName } from "@/lib/utils";
import { seedDemoGroup } from "@/lib/demo/seed-demo-trip";
import { seedDemoNest } from "@/lib/demo/seed-demo-nest";
import { seedDemoCircle } from "@/lib/demo/seed-demo-circle";

const SEEDERS = {
  trip: seedDemoGroup,
  nest: seedDemoNest,
  circle: seedDemoCircle,
} as const;

export type SampleStep = keyof typeof SEEDERS;

/**
 * Seed ONE sample context (trip | nest | circle) for the current user, if a demo
 * of that type doesn't already exist. Stepped (rather than one atomic call) so
 * the loading interstitial can show honest per-context progress. Idempotent.
 */
export async function seedSampleStep(
  step: SampleStep,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Please sign in first." };

  try {
    const existing = await db
      .select({ id: groups.id })
      .from(groups)
      .innerJoin(groupMembers, eq(groups.id, groupMembers.groupId))
      .where(and(
        eq(groupMembers.userId, user.id),
        eq(groups.isDemo, true),
        eq(groups.groupType, step),
      ))
      .limit(1);

    if (existing.length === 0) {
      await SEEDERS[step](user.id, extractDisplayName(user));
    }
    revalidatePath("/groups", "layout");
    return { ok: true };
  } catch {
    return { ok: false, error: "Couldn't load the sample. Please try again." };
  }
}

/**
 * Remove all of the current user's sample groups. Deleting the GROUPS cascades
 * (members, contributions, expenses, splits all go via FK) — no per-table
 * cleanup needed, unlike un-membering a shared group.
 */
export async function removeSampleData(): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Please sign in first." };

  try {
    const demoRows = await db
      .select({ id: groups.id })
      .from(groups)
      .innerJoin(groupMembers, eq(groups.id, groupMembers.groupId))
      .where(and(eq(groupMembers.userId, user.id), eq(groups.isDemo, true)));

    if (demoRows.length > 0) {
      await db.delete(groups).where(inArray(groups.id, demoRows.map((r) => r.id)));
    }
    revalidatePath("/groups", "layout");
    return { ok: true };
  } catch {
    return { ok: false, error: "Couldn't remove the sample. Please try again." };
  }
}
