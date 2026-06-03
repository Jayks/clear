"use server";

import { db } from "@/lib/db/client";
import { groups } from "@/lib/db/schema/groups";
import { groupMembers } from "@/lib/db/schema/group-members";
import { subscriptions } from "@/lib/db/schema/subscriptions";
import { eq, count, sql } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPlatformAdmin } from "@/lib/db/queries/admin";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/db/queries/auth";
import { getVisitorNotificationsEnabled, setVisitorNotificationsEnabled } from "@/lib/db/queries/settings";
import { sendTelegramMessage } from "@/lib/notifications/send-telegram-notification";

function parseBrowser(ua: string): string {
  if (/edg\//i.test(ua)) return "Edge";
  if (/opr\//i.test(ua)) return "Opera";
  if (/chrome|chromium|crios/i.test(ua)) return "Chrome";
  if (/firefox|fxios/i.test(ua)) return "Firefox";
  if (/safari/i.test(ua)) return "Safari";
  return "Browser";
}

function parseOS(ua: string): string {
  if (/iphone/i.test(ua)) return "iPhone";
  if (/ipad/i.test(ua)) return "iPad";
  if (/android/i.test(ua)) return "Android";
  if (/windows/i.test(ua)) return "Windows";
  if (/macintosh|mac os/i.test(ua)) return "Mac";
  if (/linux/i.test(ua)) return "Linux";
  return "Unknown OS";
}

function accountAge(createdAt: string): string {
  const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

export async function trackVisit(): Promise<void> {
  try {
    const [user, enabled] = await Promise.all([getCurrentUser(), getVisitorNotificationsEnabled()]);
    if (!user || !enabled) return;

    const hdrs = await headers();
    const ip = hdrs.get("x-forwarded-for")?.split(",")[0].trim() ?? "";
    const ua = hdrs.get("user-agent") ?? "";

    // geolocation + group count in parallel
    const [geo, groupCountRow] = await Promise.all([
      ip && ip !== "::1" && ip !== "127.0.0.1"
        ? fetch(`https://ipapi.co/${ip}/json/`, { signal: AbortSignal.timeout(3000) }).then((r) => r.json()).catch(() => null)
        : Promise.resolve(null),
      db.select({ cnt: count() }).from(groupMembers).where(eq(groupMembers.userId, user.id)).then((r) => r[0]?.cnt ?? 0).catch(() => 0),
    ]);

    const location = geo?.city
      ? `${geo.city}, ${geo.region ?? ""}, ${geo.country_code ?? ""}`.replace(/, ,/g, ",").trim()
      : "Unknown location";
    const isp = geo?.org ? ` · ${geo.org.replace(/^AS\d+ /i, "")}` : "";

    const name = user.user_metadata?.full_name ?? "Unknown";
    const email = user.email ?? "";
    const os = parseOS(ua);
    const browser = parseBrowser(ua);
    const joinedAt = user.created_at ?? "";
    const isNew = joinedAt && Date.now() - new Date(joinedAt).getTime() < 5 * 60 * 1000;
    const age = joinedAt ? accountAge(joinedAt) : "unknown";
    const time = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });

    const lines = [
      `👤 <b>New visit · Clear</b>`,
      ``,
      isNew ? `🆕 <b>NEW USER</b>` : null,
      `${name} (${email})`,
      `📍 ${location}${isp}`,
      `💻 ${os} · ${browser}`,
      `🗓 Joined ${age} · ${groupCountRow} group${groupCountRow === 1 ? "" : "s"}`,
      `🕐 ${time} IST`,
    ].filter((l) => l !== null).join("\n");

    await sendTelegramMessage(lines);
  } catch {
    // fire-and-forget — never surfaces to the user
  }
}

export async function toggleVisitorNotifications(enabled: boolean) {
  try {
    await requirePlatformAdminAction();
  } catch {
    return { ok: false, error: "Forbidden" } as const;
  }
  await setVisitorNotificationsEnabled(enabled);
  revalidatePath("/admin");
  return { ok: true } as const;
}

async function requirePlatformAdminAction() {
  const user = await getCurrentUser();
  if (!isPlatformAdmin(user?.email)) throw new Error("Forbidden");
}

export async function adminSetUserPlan(userId: string, plan: "free" | "plus") {
  try {
    await requirePlatformAdminAction();
  } catch {
    return { ok: false, error: "Forbidden" } as const;
  }

  try {
    await db.insert(subscriptions).values({
      userId,
      plan: plan === "plus" ? "plus" : "free",
      status: plan === "plus" ? "active" : "cancelled",
      adminOverride: true,
    }).onConflictDoUpdate({
      target: subscriptions.userId,
      set: {
        plan: plan === "plus" ? "plus" : "free",
        status: plan === "plus" ? "active" : "cancelled",
        adminOverride: true,
        updatedAt: sql`now()`,
      },
    });
    revalidatePath("/admin/users");
    return { ok: true } as const;
  } catch {
    return { ok: false, error: "Failed to update plan" } as const;
  }
}

export async function adminDeleteGroup(groupId: string) {
  try {
    await requirePlatformAdminAction();
  } catch {
    return { ok: false, error: "Forbidden" } as const;
  }

  const [group] = await db
    .select({ isDemo: groups.isDemo })
    .from(groups)
    .where(eq(groups.id, groupId));

  if (!group) return { ok: false, error: "Group not found" } as const;
  if (group.isDemo) return { ok: false, error: "Cannot delete demo groups" } as const;

  try {
    await db.delete(groups).where(eq(groups.id, groupId));
    revalidatePath("/admin/groups");
    revalidatePath("/groups");
    return { ok: true } as const;
  } catch {
    return { ok: false, error: "Failed to delete group" } as const;
  }
}

export async function adminDeleteUser(userId: string) {
  try {
    await requirePlatformAdminAction();
  } catch {
    return { ok: false, error: "Forbidden" } as const;
  }

  const adminClient = createAdminClient();
  const { data: { user }, error } = await adminClient.auth.admin.getUserById(userId);
  if (error || !user) return { ok: false, error: "User not found" } as const;
  if (isPlatformAdmin(user.email)) return { ok: false, error: "Cannot delete platform admins" } as const;

  // A-1 fix: delete from Auth FIRST, then clean up DB.
  // Old order (DB then Auth): if Auth fails, groupMembers rows are permanently
  // deleted but the user's account is still active — they can log in with no groups.
  // New order (Auth then DB): if Auth succeeds but DB cleanup fails, the auth
  // account is gone (user cannot log in) and the orphaned groupMembers rows are
  // harmless since no auth session can ever be created for that userId again.
  try {
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteError) return { ok: false, error: "Failed to delete user from auth" } as const;

    // Auth account is gone — now safe to clean up any remaining DB rows.
    await db.delete(groupMembers).where(eq(groupMembers.userId, userId));

    revalidatePath("/admin/users");
    return { ok: true } as const;
  } catch {
    return { ok: false, error: "Failed to delete user" } as const;
  }
}
