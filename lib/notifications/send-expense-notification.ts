import { createHmac } from "crypto";
import { db } from "@/lib/db/client";
import { groupMembers } from "@/lib/db/schema/group-members";
import { groups } from "@/lib/db/schema/groups";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildExpenseEmail } from "./expense-email";
import { eq, and, isNotNull } from "drizzle-orm";

interface NotificationParams {
  groupId: string;
  description: string;
  amount: number;
  currency: string;
  actorName: string;
  actorUserId: string;
}

function buildUnsubscribeToken(memberId: string): string {
  return createHmac("sha256", process.env.RESEND_UNSUBSCRIBE_SECRET!)
    .update(memberId)
    .digest("hex");
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: process.env.RESEND_FROM, to, subject, html }),
  });
}

export async function sendExpenseNotification(params: NotificationParams): Promise<void> {
  const { groupId, description, amount, currency, actorName, actorUserId } = params;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  const [group] = await db
    .select({ name: groups.name })
    .from(groups)
    .where(eq(groups.id, groupId));
  if (!group) return;

  const recipients = await db
    .select({ id: groupMembers.id, userId: groupMembers.userId })
    .from(groupMembers)
    .where(
      and(
        eq(groupMembers.groupId, groupId),
        isNotNull(groupMembers.userId),
        eq(groupMembers.notificationsMuted, false)
      )
    );

  const toNotify = recipients.filter((m) => m.userId !== actorUserId);
  if (toNotify.length === 0) return;

  const supabase = createAdminClient();

  await Promise.all(
    toNotify.map(async (member) => {
      const { data } = await supabase.auth.admin.getUserById(member.userId!);
      const email = data.user?.email;
      if (!email) return;

      const token = buildUnsubscribeToken(member.id);
      const unsubscribeUrl = `${appUrl}/api/unsubscribe?token=${token}&mid=${member.id}`;
      const groupUrl = `${appUrl}/groups/${groupId}`;

      const { subject, html } = buildExpenseEmail({
        groupName: group.name,
        groupUrl,
        actorName,
        description,
        amount,
        currency,
        unsubscribeUrl,
      });

      await sendEmail(email, subject, html);
    })
  );
}
