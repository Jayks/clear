"use server";

import { db } from "@/lib/db/client";
import { subscriptions } from "@/lib/db/schema/subscriptions";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/db/queries/auth";
import { revalidatePath } from "next/cache";

// Called fire-and-forget from app/(app)/layout.tsx on every authenticated page load.
// Creates the subscription row (trialing) on first visit, regardless of entry point.
export async function ensureTrialStarted(userId: string): Promise<void> {
  try {
    const [existing] = await db.select({ id: subscriptions.id })
      .from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1);
    if (existing) return;
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 30);
    await db.insert(subscriptions).values({
      userId,
      plan: "free",
      status: "trialing",
      trialEndsAt,
    });
    // trial_started GA4 event is client-side — fired by TrialBanner in Phase 3
  } catch {
    // Table may not exist yet — fail silently, will retry on next page load
  }
}

// Used by /upgrade simulated checkout and UpgradePrompt
export async function activatePlusDemo(
  billingCycle: "monthly" | "annual"
): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" };
  const periodEnd = new Date();
  if (billingCycle === "annual") {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  } else {
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  }
  await db.insert(subscriptions).values({
    userId: user.id,
    plan: "plus",
    status: "active",
    trialEndsAt: null,
    billingCycle,
    currentPeriodEnd: periodEnd,
  }).onConflictDoUpdate({
    target: subscriptions.userId,
    set: {
      plan: "plus",
      status: "active",
      trialEndsAt: null,
      billingCycle,
      currentPeriodEnd: periodEnd,
      updatedAt: new Date(),
    },
  });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function cancelPlusDemo(): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" };
  await db.insert(subscriptions).values({
    userId: user.id,
    plan: "free",
    status: "cancelled",
    trialEndsAt: null,
    billingCycle: null,
    currentPeriodEnd: null,
  }).onConflictDoUpdate({
    target: subscriptions.userId,
    set: {
      plan: "free",
      status: "cancelled",
      billingCycle: null,
      currentPeriodEnd: null,
      updatedAt: new Date(),
    },
  });
  revalidatePath("/", "layout");
  return { ok: true };
}
