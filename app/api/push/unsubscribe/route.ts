import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { pushSubscriptions } from "@/lib/db/schema/push-subscriptions";
import { getCurrentUser } from "@/lib/db/queries/auth";
import { and, eq } from "drizzle-orm";

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { endpoint } = await req.json();
  if (!endpoint) return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });

  await db
    .delete(pushSubscriptions)
    .where(and(eq(pushSubscriptions.userId, user.id), eq(pushSubscriptions.endpoint, endpoint)));

  return NextResponse.json({ ok: true });
}
