import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { pushSubscriptions } from "@/lib/db/schema/push-subscriptions";
import { getCurrentUser } from "@/lib/db/queries/auth";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Round 16 fix #17: a malformed body (bad JSON) made req.json() throw,
  // which — uncaught in a route handler — surfaces as a bare 500 instead of
  // a normal 400. Push subscribe/unsubscribe run from the client's own
  // fetch calls, so a corrupted payload is plausible (stale service worker,
  // browser extension interference, etc.).
  let body: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const endpoint = body.endpoint;
  const p256dh   = body.keys?.p256dh;
  const auth     = body.keys?.auth;

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
