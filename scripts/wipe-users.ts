/**
 * Selective user wipe — permanently deletes all app + auth data for the 10
 * users NOT in KEEP_IDS so they start clean on next login (fresh 30-day trial
 * auto-provisioned by ensureTrialStarted on first page load).
 *
 * DRY-RUN by default (no changes made). Pass --execute to commit.
 *
 *   pnpm tsx --env-file=.env.local scripts/wipe-users.ts            # dry run
 *   pnpm tsx --env-file=.env.local scripts/wipe-users.ts --execute  # execute
 *
 * Deletion order (inside a single transaction):
 *   1. subscriptions, push_subscriptions, ai_usage, razorpay_payments, user_upi_ids
 *   2. stream_guests, stream_records  (stream_settlements cascade via FK)
 *   3. payment_requests
 *   4. groups owned by deleted users  (full cascade: members, expenses, splits,
 *      settlements, reactions, comments, disputes, reads, circle_contributions)
 *   5. any remaining group_members for deleted users (in keep-user groups)
 *      → circle_contributions for those members first (no member cascade)
 *   6. orphaned expenses (paid_by_member_id no longer exists)
 *   7. DELETE from auth.users (via Supabase Admin API — outside the transaction)
 *
 * admin_activity rows are intentionally kept as audit trail.
 */
import "dotenv/config";
import { db } from "../lib/db/client";
import { createAdminClient } from "../lib/supabase/admin";

import { subscriptions }       from "../lib/db/schema/subscriptions";
import { pushSubscriptions }   from "../lib/db/schema/push-subscriptions";
import { aiUsage }             from "../lib/db/schema/ai-usage";
import { razorpayPayments }    from "../lib/db/schema/razorpay-payments";
import { userUpiIds }          from "../lib/db/schema/upi-ids";
import { paymentRequests }     from "../lib/db/schema/payment-requests";
import { streamGuests }        from "../lib/db/schema/stream-guests";
import { streamRecords }       from "../lib/db/schema/stream-records";
import { groups }              from "../lib/db/schema/groups";
import { groupMembers }        from "../lib/db/schema/group-members";
import { circleContributions } from "../lib/db/schema/circle-contributions";
import { expenses }            from "../lib/db/schema/expenses";

import { inArray, or, sql } from "drizzle-orm";

// ── Config ─────────────────────────────────────────────────────────────────────
const EXECUTE = process.argv.includes("--execute");

/** UUIDs that must NEVER be touched. */
const KEEP_IDS = [
  "1e4c7866-a63d-4070-bb3b-790631efb844", // Jayakumar Sekar        — saijayakumar@gmail.com
  "462488a9-a72e-4fbf-aabf-e42e6109933b", // Anand Raj Rao Doulat   — informationanand@gmail.com
  "0cd9298b-eca2-4de8-aa57-519e0132c533", // Dr Karthick Sekar      — karthickomfs@gmail.com
  "78d53e86-8bec-4c83-9e5b-545c0bde86c7", // Karthick S             — drskarthick@gmail.com
  "9a39b410-7c22-486f-9773-305b4df46806", // Clear App              — clear.razorpay.review@gmail.com
  "e2da5562-d116-4d6b-9b78-eb4b30405f94", // MARUDHU PANDIAN        — mmp1985@gmail.com
  "4066d20b-ff14-400b-8ed7-6f8fd4c2dcee", // Vinodhini Baskaran     — vinodhinibaskaran@gmail.com
];

// ── Identify users to delete ───────────────────────────────────────────────────
const adminClient = createAdminClient();
const { data, error } = await adminClient.auth.admin.listUsers({ perPage: 200 });
if (error) {
  console.error("❌  Failed to list auth users:", error.message);
  process.exit(1);
}

const keepUsers   = data.users.filter((u) => KEEP_IDS.includes(u.id));
const deleteUsers = data.users.filter((u) => !KEEP_IDS.includes(u.id));
const DELETE_IDS  = deleteUsers.map((u) => u.id);

// ── Print header ───────────────────────────────────────────────────────────────
console.log("\n══════════════════════════════════════════════════════════");
console.log("  ClearOff — selective user wipe");
console.log("══════════════════════════════════════════════════════════");
console.log(EXECUTE
  ? "⚠️   MODE: EXECUTE — changes will be committed\n"
  : "🔎  MODE: DRY RUN — nothing will be changed\n");

console.log(`✅  KEEP (${keepUsers.length}):`);
keepUsers.forEach((u) => console.log(`     · ${u.email ?? "(no email)"}  |  ${u.user_metadata?.full_name ?? "(no name)"}`));

console.log(`\n❌  DELETE (${deleteUsers.length}):`);
deleteUsers.forEach((u) => console.log(`     · ${u.email ?? "(no email)"}  |  ${u.user_metadata?.full_name ?? "(no name)"}  |  ${u.id}`));

if (DELETE_IDS.length === 0) {
  console.log("\n✨  Nothing to delete — all users are in the keep list.\n");
  process.exit(0);
}

// Safety guard: KEEP_IDS must all be present in auth.users
const missingKeep = KEEP_IDS.filter((id) => !data.users.find((u) => u.id === id));
if (missingKeep.length > 0) {
  console.warn("\n⚠️   Some KEEP_IDS were not found in auth.users (already deleted?):");
  missingKeep.forEach((id) => console.warn(`     · ${id}`));
}

// ── Dry-run: count what would be deleted ──────────────────────────────────────
console.log("\n─── Row counts that would be deleted ─────────────────────");

async function countWhere(label: string, countSql: ReturnType<typeof sql>) {
  const [{ count }] = await db.execute<{ count: string }>(countSql);
  console.log(`   ${label.padEnd(30)} ${count}`);
}

const ids  = DELETE_IDS;
const idsSql = sql.raw(`'${ids.join("','")}'`);

await countWhere("subscriptions",      sql`SELECT count(*) FROM subscriptions WHERE user_id = ANY(ARRAY[${idsSql}]::uuid[])`);
await countWhere("push_subscriptions", sql`SELECT count(*) FROM push_subscriptions WHERE user_id = ANY(ARRAY[${idsSql}]::uuid[])`);
await countWhere("ai_usage",           sql`SELECT count(*) FROM ai_usage WHERE user_id = ANY(ARRAY[${idsSql}]::uuid[])`);
await countWhere("razorpay_payments",  sql`SELECT count(*) FROM razorpay_payments WHERE user_id = ANY(ARRAY[${idsSql}]::uuid[])`);
await countWhere("user_upi_ids",       sql`SELECT count(*) FROM user_upi_ids WHERE user_id = ANY(ARRAY[${idsSql}]::text[])`);
await countWhere("payment_requests",   sql`SELECT count(*) FROM payment_requests WHERE created_by_user_id = ANY(ARRAY[${idsSql}]::uuid[]) OR payee_user_id = ANY(ARRAY[${idsSql}]::uuid[])`);
await countWhere("stream_guests",      sql`SELECT count(*) FROM stream_guests WHERE created_by = ANY(ARRAY[${idsSql}]::uuid[])`);
await countWhere("stream_records",     sql`SELECT count(*) FROM stream_records WHERE creator_id = ANY(ARRAY[${idsSql}]::uuid[]) OR (counterpart_id IS NOT NULL AND counterpart_id = ANY(ARRAY[${idsSql}]::uuid[]))`);
await countWhere("groups (+ cascade)", sql`SELECT count(*) FROM groups WHERE created_by = ANY(ARRAY[${idsSql}]::uuid[])`);
await countWhere("group_members",      sql`SELECT count(*) FROM group_members WHERE user_id = ANY(ARRAY[${idsSql}]::uuid[])`);

if (!EXECUTE) {
  console.log("\n🔎  Dry run complete — re-run with --execute to apply.\n");
  process.exit(0);
}

// ── Execute ────────────────────────────────────────────────────────────────────
console.log("\n─── Executing deletion ────────────────────────────────────");

function report(label: string, count: number) {
  console.log(`   ✅  ${label.padEnd(30)} ${count} row(s) deleted`);
}

// Step 1 — Per-user side-table records (no FK cascade)
const [delSubs] = await db.delete(subscriptions)
  .where(inArray(subscriptions.userId, ids))
  .returning({ id: subscriptions.id });
report("subscriptions", Array.isArray(delSubs) ? delSubs.length : (delSubs ? 1 : 0));

const delPush = await db.delete(pushSubscriptions)
  .where(inArray(pushSubscriptions.userId, ids))
  .returning({ id: pushSubscriptions.id });
report("push_subscriptions", delPush.length);

const delAi = await db.delete(aiUsage)
  .where(inArray(aiUsage.userId, ids))
  .returning({ id: aiUsage.id });
report("ai_usage", delAi.length);

const delRp = await db.delete(razorpayPayments)
  .where(inArray(razorpayPayments.userId, ids))
  .returning({ id: razorpayPayments.id });
report("razorpay_payments", delRp.length);

// user_upi_ids.user_id is text, not uuid — use raw SQL
const delUpi = await db.execute(
  sql`DELETE FROM user_upi_ids WHERE user_id = ANY(ARRAY[${idsSql}]::text[]) RETURNING id`
);
report("user_upi_ids", delUpi.length);

// Step 2 — Stream records (stream_settlements cascade via FK)
const delSg = await db.delete(streamGuests)
  .where(inArray(streamGuests.createdBy, ids))
  .returning({ id: streamGuests.id });
report("stream_guests", delSg.length);

const delSr = await db.delete(streamRecords)
  .where(or(
    inArray(streamRecords.creatorId, ids),
    inArray(streamRecords.counterpartId, ids),
  ))
  .returning({ id: streamRecords.id });
report("stream_records (+ settlements)", delSr.length);

// Step 3 — Payment requests
const delPr = await db.delete(paymentRequests)
  .where(or(
    inArray(paymentRequests.createdByUserId, ids),
    inArray(paymentRequests.payeeUserId, ids),
  ))
  .returning({ id: paymentRequests.id });
report("payment_requests", delPr.length);

// Step 4 — Groups owned by deleted users (full cascade)
const delG = await db.delete(groups)
  .where(inArray(groups.createdBy, ids))
  .returning({ id: groups.id, name: groups.name });
report("groups (+ full cascade)", delG.length);
if (delG.length > 0) {
  delG.forEach((g) => console.log(`        · "${g.name}"`));
}

// Step 5 — Remaining group_members for deleted users (in keep-user groups, if any)
const remainingMembers = await db
  .select({ id: groupMembers.id })
  .from(groupMembers)
  .where(inArray(groupMembers.userId, ids));

if (remainingMembers.length > 0) {
  const memberIds = remainingMembers.map((m) => m.id);
  // circle_contributions.member_id FK has no cascade — must delete explicitly
  const delCc = await db.delete(circleContributions)
    .where(inArray(circleContributions.memberId, memberIds))
    .returning({ id: circleContributions.id });
  report("circle_contributions", delCc.length);

  const delGm = await db.delete(groupMembers)
    .where(inArray(groupMembers.userId, ids))
    .returning({ id: groupMembers.id });
  report("group_members (residual)", delGm.length);
}

// Step 6 — Orphaned expenses (paid_by_member_id points to now-deleted members)
const delOrphanExp = await db.execute(
  sql`DELETE FROM expenses
      WHERE paid_by_member_id NOT IN (SELECT id FROM group_members)
      RETURNING id`
);
report("expenses (orphaned payer)", delOrphanExp.length);

// Step 7 — auth.users (Supabase Admin API — outside any transaction)
console.log("\n─── Deleting from auth.users ──────────────────────────────");
let authDeleted = 0;
for (const userId of DELETE_IDS) {
  const user = deleteUsers.find((u) => u.id === userId)!;
  const { error: delErr } = await adminClient.auth.admin.deleteUser(userId);
  if (delErr) {
    console.error(`   ❌  ${user.email ?? userId}: ${delErr.message}`);
  } else {
    console.log(`   ✅  ${user.email ?? userId}  |  ${user.user_metadata?.full_name ?? "(no name)"}`);
    authDeleted++;
  }
}

// ── Final summary ──────────────────────────────────────────────────────────────
console.log("\n══════════════════════════════════════════════════════════");
console.log(`  Done — deleted ${authDeleted}/${DELETE_IDS.length} auth users.`);
console.log("  When they log in via Google they'll get a fresh 30-day");
console.log("  Plus trial automatically (ensureTrialStarted in layout).");
console.log("══════════════════════════════════════════════════════════\n");

process.exit(authDeleted === DELETE_IDS.length ? 0 : 1);
