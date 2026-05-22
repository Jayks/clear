import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { pushSubscriptions } from "@/lib/db/schema/push-subscriptions";
import { getCurrentUser } from "@/lib/db/queries/auth";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const endpoint: string = body.endpoint;
  const p256dh: string = body.keys?.p256dh;
  const auth: string = body.keys?.auth;

  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  await db
    .insert(pushSubscriptions)
    .values({ userId: user.id, endpoint, p256dh, auth })
    .onConflictDoUpdate({
      target: [pushSubscriptions.userId, pushSubscriptions.endpoint],
      set: { p256dh, auth },
    });

  return NextResponse.json({ ok: true });
}
