import { db } from "@/lib/db/client";
import { expenses } from "@/lib/db/schema/expenses";
import { groups } from "@/lib/db/schema/groups";
import { createAdminClient } from "@/lib/supabase/admin";
import { getGroupsAdminPlans } from "@/lib/subscription/gates";
import { isReceiptExpired } from "@/lib/subscription/receipt-retention";
import { extractReceiptStoragePath } from "@/lib/receipt/storage-path";
import { eq, and, isNotNull, asc } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BUCKET = "receipt-photos";
// Cap per run so a daily cron stays well within the serverless time budget.
// Free-tier proof volume is low; this only matters if a large backlog accrues.
const BATCH_LIMIT = 500;

/**
 * Cron: prune expired free-tier receipt photos (Phase 3b — "receipt vault" perk).
 *
 * Deletes only the image bytes from Supabase Storage and nulls `receiptUrl`.
 * `receiptItems` + `receiptScannedAt` are intentionally KEPT — the extracted
 * line-item data and the "✨ scanned with AI" badge persist forever; only the
 * photo viewer goes dark. Plus groups are never pruned (permanent vault).
 *
 * Auth: Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}`. Reject anything
 * else so the endpoint can't be triggered to mass-delete proofs.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const now = new Date();

  // Candidate proofs: any expense still holding a receipt photo, oldest first.
  const candidates = await db
    .select({
      id:         expenses.id,
      groupId:    expenses.groupId,
      receiptUrl: expenses.receiptUrl,
      createdAt:  expenses.createdAt,
      groupType:  groups.groupType,
      endDate:    groups.endDate,
      isArchived: groups.isArchived,
    })
    .from(expenses)
    .innerJoin(groups, eq(expenses.groupId, groups.id))
    .where(isNotNull(expenses.receiptUrl))
    .orderBy(asc(expenses.createdAt))
    .limit(BATCH_LIMIT);

  if (candidates.length === 0) {
    return Response.json({ ok: true, scanned: 0, pruned: 0, errors: 0 });
  }

  // One batched query for the admin plan of every group in this batch.
  const groupIds = [...new Set(candidates.map((c) => c.groupId))];
  const plans = await getGroupsAdminPlans(groupIds);

  const expired = candidates.filter((c) =>
    isReceiptExpired({
      plan:       plans[c.groupId] ?? "free",
      createdAt:  c.createdAt,
      groupType:  c.groupType,
      endDate:    c.endDate,
      isArchived: c.isArchived,
      now,
    }),
  );

  const supabase = createAdminClient();
  let pruned = 0;
  let errors = 0;

  for (const exp of expired) {
    if (!exp.receiptUrl) continue;
    const path = extractReceiptStoragePath(exp.receiptUrl);
    try {
      // Delete the bytes first; only null the column if storage delete succeeded,
      // so a transient storage error retries the same row on the next run rather
      // than orphaning the object (DB pointer gone, file left behind).
      const { error } = await supabase.storage.from(BUCKET).remove([path]);
      if (error) {
        errors++;
        continue;
      }
      await db
        .update(expenses)
        .set({ receiptUrl: null }) // keep receiptItems + receiptScannedAt
        .where(and(eq(expenses.id, exp.id), eq(expenses.groupId, exp.groupId)));
      pruned++;
    } catch {
      errors++;
    }
  }

  return Response.json({
    ok: true,
    scanned: candidates.length,
    expired: expired.length,
    pruned,
    errors,
  });
}
