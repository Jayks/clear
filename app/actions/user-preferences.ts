"use server";

import { getCurrentUser } from "@/lib/db/queries/auth";
import { setEmailNotificationsEnabled } from "@/lib/db/queries/user-preferences";

export async function updateEmailNotificationsAction(enabled: boolean) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in" } as const;

  try {
    await setEmailNotificationsEnabled(user.id, enabled);
    return { ok: true } as const;
  } catch (err) {
    console.error("[updateEmailNotificationsAction]", err);
    return { ok: false, error: "Failed to save preference" } as const;
  }
}
