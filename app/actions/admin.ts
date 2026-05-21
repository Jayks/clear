"use server";

import { db } from "@/lib/db/client";
import { groups } from "@/lib/db/schema/groups";
import { groupMembers } from "@/lib/db/schema/group-members";
import { eq } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPlatformAdmin } from "@/lib/db/queries/admin";
import { revalidatePath } from "next/cache";

async function requirePlatformAdminAction() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isPlatformAdmin(user?.email)) throw new Error("Forbidden");
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

  try {
    await db.delete(groupMembers).where(eq(groupMembers.userId, userId));

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteError) return { ok: false, error: "Failed to delete user from auth" } as const;

    revalidatePath("/admin/users");
    return { ok: true } as const;
  } catch {
    return { ok: false, error: "Failed to delete user" } as const;
  }
}
