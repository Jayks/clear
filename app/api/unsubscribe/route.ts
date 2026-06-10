import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { groupMembers } from "@/lib/db/schema/group-members";
import { groups } from "@/lib/db/schema/groups";
import { eq } from "drizzle-orm";

function verifyToken(memberId: string, token: string): boolean {
  const expected = createHmac("sha256", process.env.RESEND_UNSUBSCRIBE_SECRET!)
    .update(memberId)
    .digest("hex");
  try {
    return timingSafeEqual(Buffer.from(token, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const token = searchParams.get("token") ?? "";
  const memberId = searchParams.get("mid") ?? "";

  if (!token || !memberId || !verifyToken(memberId, token)) {
    return new NextResponse(errorPage("Invalid or expired unsubscribe link."), {
      status: 400,
      headers: { "Content-Type": "text/html" },
    });
  }

  const [member] = await db
    .select({ id: groupMembers.id, groupId: groupMembers.groupId, notificationsMuted: groupMembers.notificationsMuted })
    .from(groupMembers)
    .where(eq(groupMembers.id, memberId));

  if (!member) {
    return new NextResponse(errorPage("Member not found."), {
      status: 404,
      headers: { "Content-Type": "text/html" },
    });
  }

  if (!member.notificationsMuted) {
    await db
      .update(groupMembers)
      .set({ notificationsMuted: true })
      .where(eq(groupMembers.id, memberId));
  }

  const [group] = await db
    .select({ name: groups.name })
    .from(groups)
    .where(eq(groups.id, member.groupId));

  return new NextResponse(successPage(group?.name ?? "this group"), {
    status: 200,
    headers: { "Content-Type": "text/html" },
  });
}

// Group names are user-controlled and embedded into a hand-built HTML string
// (not React), so they MUST be escaped to prevent stored XSS.
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function successPage(groupName: string): string {
  return page(
    "Unsubscribed",
    `You've been unsubscribed from <strong>${escapeHtml(groupName)}</strong> notifications.`,
    "You won't receive any more expense emails for this group."
  );
}

function errorPage(message: string): string {
  return page("Invalid link", message, "");
}

function page(title: string, heading: string, sub: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} — Clear</title>
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #F0FDFA; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .card { background: #fff; border-radius: 20px; padding: 40px 32px; max-width: 400px; width: 90%; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .logo { display: inline-block; background: linear-gradient(140deg,#22D3EE,#0BB6D4,#0E8FA8,#0B5E70); border-radius: 12px; width: 48px; height: 48px; line-height: 48px; font-size: 24px; color: #fff; font-weight: 700; margin-bottom: 20px; }
    h1 { margin: 0 0 8px; font-size: 20px; color: #0F172A; }
    p { margin: 0 0 24px; font-size: 14px; color: #64748B; line-height: 1.6; }
    a { display: inline-block; background: linear-gradient(135deg,#06B6D4,#14B8A6); color: #fff; text-decoration: none; font-weight: 600; font-size: 14px; padding: 12px 28px; border-radius: 10px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">C</div>
    <h1>${heading}</h1>
    ${sub ? `<p>${sub}</p>` : ""}
    <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "/"}">Back to Clear</a>
  </div>
</body>
</html>`;
}
