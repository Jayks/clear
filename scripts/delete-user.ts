/**
 * Delete a single ClearOff user by email — full cascade (same order as wipe-users.ts).
 *
 *   pnpm tsx --env-file=.env.local scripts/delete-user.ts jay@clearoff.in
 *   pnpm tsx --env-file=.env.local scripts/delete-user.ts jay@clearoff.in --execute
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

import { eq, inArray, or, sql } from "drizzle-orm";

const TARGET_EMAIL = process.argv[2]?.toLowerCase();
const EXECUTE      = process.argv.includes("--execute");

if (!TARGET_EMAIL) {
  console.error("Usage: pnpm tsx --env-file=.env.local scripts/delete-user.ts <email> [--execute]");
  process.exit(1);
}

// ── Look up user ───────────────────────────────────────────────────────────────
const adminClient = createAdminClient();
const { data, error } = await adminClient.auth.admin.listUsers({ perPage: 500 });
if (error) {
  console.error("❌  Failed to list auth users:", error.message);
  process.exit(1);
}

const target = data.users.find((u) => u.email?.toLowerCase() === TARGET_EMAIL);
if (!target) {
  console.error(`❌  No user found with email: ${TARGET_EMAIL}`);
  process.exit(1);
}

const id   = target.id;
const ids  = [id];
const idsSql = sql.raw(`'${id}'`);

console.log("\n══════════════════════════════════════════════════════════");
console.log("  ClearOff — single user delete");
console.log("══════════════════════════════════════════════════════════");
console.log(EXECUTE
  ? "⚠️   MODE: EXECUTE — changes will be committed\n"
  : "🔎  MODE: DRY RUN — nothing will be changed\n");
console.log(`   Email : ${target.email}`);
console.log(`   Name  : ${target.user_metadata?.full_name ?? "(none)"}`);
console.log(`   ID    : ${id}`);
console.log(`   Joined: ${target.created_at}`);

// ── Row counts ─────────────────────────────────────────────────────────────────
async function count(label: string, countSql: ReturnType<typeof sql>) {
  const [{ count: n }] = await db.execute<{ count: string }>(countSql);
  console.log(`   ${label.padEnd(30)} ${n}`);
}

console.log("\n─── What will be deleted ──────────────────────────────────");
await count("subscriptions",      sql`SELECT count(*) FROM subscriptions WHERE user_id = ${sql.raw(`'${id}'`)}::uuid`);
await count("push_subscriptions", sql`SELECT count(*) FROM push_subscriptions WHERE user_id = ${sql.raw(`'${id}'`)}::uuid`);
await count("ai_usage",           sql`SELECT count(*) FROM ai_usage WHERE user_id = ${sql.raw(`'${id}'`)}::uuid`);
await count("razorpay_payments",  sql`SELECT count(*) FROM razorpay_payments WHERE user_id = ${sql.raw(`'${id}'`)}::uuid`);
await count("user_upi_ids",       sql`SELECT count(*) FROM user_upi_ids WHERE user_id = ${sql.raw(`'${id}'`)}`);
await count("payment_requests",   sql`SELECT count(*) FROM payment_requests WHERE created_by_user_id = ${sql.raw(`'${id}'`)}::uuid OR payee_user_id = ${sql.raw(`'${id}'`)}::uuid`);
await count("stream_guests",      sql`SELECT count(*) FROM stream_guests WHERE created_by = ${sql.raw(`'${id}'`)}::uuid`);
await count("stream_records",     sql`SELECT count(*) FROM stream_records WHERE creator_id = ${sql.raw(`'${id}'`)}::uuid OR counterpart_id = ${sql.raw(`'${id}'`)}::uuid`);
await count("groups (+ cascade)", sql`SELECT count(*) FROM groups WHERE created_by = ${sql.raw(`'${id}'`)}::uuid`);
await count("group_members",      sql`SELECT count(*) FROM group_members WHERE user_id = ${sql.raw(`'${id}'`)}::uuid`);

if (!EXECUTE) {
  console.log("\n🔎  Dry run complete — re-run with --execute to apply.\n");
  process.exit(0);
}

// ── Execute ────────────────────────────────────────────────────────────────────
console.log("\n─── Executing deletion ────────────────────────────────────");

function report(label: string, rows: unknown[]) {
  console.log(`   ✅  ${label.padEnd(30)} ${rows.length} row(s)`);
}

// 1 — Side-table records
const [delSubs] = await db.delete(subscriptions).where(eq(subscriptions.userId, id)).returning({ id: subscriptions.id });
report("subscriptions", Array.isArray(delSubs) ? [delSubs] : (delSubs ? [delSubs] : []));

const delPush = await db.delete(pushSubscriptions).where(eq(pushSubscriptions.userId, id)).returning({ id: pushSubscriptions.id });
report("push_subscriptions", delPush);

const delAi = await db.delete(aiUsage).where(eq(aiUsage.userId, id)).returning({ id: aiUsage.id });
report("ai_usage", delAi);

const delRp = await db.delete(razorpayPayments).where(eq(razorpayPayments.userId, id)).returning({ id: razorpayPayments.id });
report("razorpay_payments", delRp);

await db.execute(sql`DELETE FROM user_upi_ids WHERE user_id = ${id}`);
console.log(`   ✅  ${"user_upi_ids".padEnd(30)} (done)`);

// 2 — Streams
const delSg = await db.delete(streamGuests).where(eq(streamGuests.createdBy, id)).returning({ id: streamGuests.id });
report("stream_guests", delSg);

const delSr = await db.delete(streamRecords)
  .where(or(eq(streamRecords.creatorId, id), eq(streamRecords.counterpartId, id)))
  .returning({ id: streamRecords.id });
report("stream_records (+ settlements)", delSr);

// 3 — Payment requests
const delPr = await db.delete(paymentRequests)
  .where(or(eq(paymentRequests.createdByUserId, id), eq(paymentRequests.payeeUserId, id)))
  .returning({ id: paymentRequests.id });
report("payment_requests", delPr);

// 4 — Groups the user created (cascade: members, expenses, splits, settlements, etc.)
const userGroups = await db
  .select({ id: groups.id })
  .from(groups)
  .where(eq(groups.createdBy, id));

if (userGroups.length > 0) {
  const groupIds = userGroups.map((g) => g.id);

  // circle_contributions don't cascade from group_members — delete first
  const memberRows = await db
    .select({ id: groupMembers.id })
    .from(groupMembers)
    .where(inArray(groupMembers.groupId, groupIds));
  if (memberRows.length > 0) {
    const memberIds = memberRows.map((m) => m.id);
    const delCc = await db.delete(circleContributions)
      .where(inArray(circleContributions.memberId, memberIds))
      .returning({ id: circleContributions.id });
    report("  circle_contributions", delCc);
  }

  // Also clean up orphaned expenses (paid_by_member_id)
  const orphanExpenses = await db
    .select({ id: expenses.id })
    .from(expenses)
    .where(inArray(expenses.groupId, groupIds));
  report("  expenses (cascade via group)", orphanExpenses);

  const delGroups = await db.delete(groups).where(inArray(groups.id, groupIds)).returning({ id: groups.id });
  report("groups (+ full cascade)", delGroups);
}

// 5 — Remaining group_members in groups the user DIDN'T create
const remainingMembers = await db
  .select({ id: groupMembers.id })
  .from(groupMembers)
  .where(eq(groupMembers.userId, id));

if (remainingMembers.length > 0) {
  const memberIds = remainingMembers.map((m) => m.id);
  // circle_contributions first (no member-level cascade)
  const delCc2 = await db.delete(circleContributions)
    .where(inArray(circleContributions.memberId, memberIds))
    .returning({ id: circleContributions.id });
  if (delCc2.length > 0) report("  circle_contributions", delCc2);

  const delGm = await db.delete(groupMembers).where(eq(groupMembers.userId, id)).returning({ id: groupMembers.id });
  report("group_members (remaining)", delGm);
}

// 6 — Auth account (last — point of no return)
const { error: authErr } = await adminClient.auth.admin.deleteUser(id);
if (authErr) {
  console.error(`\n❌  Auth deletion failed: ${authErr.message}`);
  console.error("    DB rows have been cleaned up but the auth account still exists.");
  console.error("    Delete it manually in the Supabase dashboard.\n");
  process.exit(1);
}
console.log(`   ✅  ${"auth.users".padEnd(30)} deleted`);

console.log(`\n✨  Done — ${TARGET_EMAIL} has been permanently deleted.\n`);
process.exit(0);
