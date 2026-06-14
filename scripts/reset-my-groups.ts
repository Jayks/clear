/**
 * Dev utility — reset a user's home to a clean slate for testing the new-user flow.
 *
 *  - Groups you CREATED  → deleted (FK cascade removes expenses/splits/members/etc.)
 *  - Groups you only JOINED → your membership row removed (the group survives for
 *    its other members — e.g. the second seed user)
 *  - ALL your streams (both directions) + your stream guests → deleted
 *
 * DRY-RUN by default — prints exactly what it would do. Pass --confirm to execute.
 *
 *   pnpm tsx --env-file=.env.local scripts/reset-my-groups.ts            # dry run
 *   pnpm tsx --env-file=.env.local scripts/reset-my-groups.ts --confirm  # execute
 *
 * Targets PLATFORM_ADMIN_EMAIL (or SEED_USER_EMAIL) by default; override with --email=x@y.com
 */
import "dotenv/config";
import { db } from "../lib/db/client";
import { groups } from "../lib/db/schema/groups";
import { groupMembers } from "../lib/db/schema/group-members";
import { streamRecords } from "../lib/db/schema/stream-records";
import { streamGuests } from "../lib/db/schema/stream-guests";
import { circleContributions } from "../lib/db/schema/circle-contributions";
import { createAdminClient } from "../lib/supabase/admin";
import { and, eq, inArray, or } from "drizzle-orm";

const CONFIRM = process.argv.includes("--confirm");
const emailArg = process.argv.find((a) => a.startsWith("--email="))?.slice("--email=".length);
const EMAIL = emailArg ?? process.env.SEED_USER_EMAIL ?? process.env.PLATFORM_ADMIN_EMAIL;

if (!EMAIL) {
  console.error("❌  No email — set PLATFORM_ADMIN_EMAIL in .env.local or pass --email=you@x.com");
  process.exit(1);
}

const admin = createAdminClient();
const { data, error } = await admin.auth.admin.listUsers({ perPage: 200 });
if (error) { console.error("❌ ", error.message); process.exit(1); }
const user = data.users.find((u) => u.email === EMAIL);
if (!user) { console.error(`❌  No auth user for ${EMAIL}`); process.exit(1); }
const userId = user.id;

console.log(`\n🧹  Reset target: ${EMAIL}  (${userId})`);
console.log(CONFIRM ? "⚠️   MODE: EXECUTE (--confirm)\n" : "🔎  MODE: DRY RUN (no changes)\n");

// ── Classify the user's group memberships ──────────────────────────────────────
const rows = await db
  .select({
    groupId: groups.id, name: groups.name, type: groups.groupType,
    isDemo: groups.isDemo, createdBy: groups.createdBy, memberRow: groupMembers.id,
  })
  .from(groupMembers)
  .innerJoin(groups, eq(groups.id, groupMembers.groupId))
  .where(eq(groupMembers.userId, userId));

const owned  = rows.filter((r) => r.createdBy === userId);
const joined = rows.filter((r) => r.createdBy !== userId);

console.log(`📦  Groups you OWN → DELETE (${owned.length}):`);
owned.forEach((g) => console.log(`     · ${g.name}  [${g.type}${g.isDemo ? " · demo" : ""}]`));
console.log(`\n🔗  Groups you only JOINED → UN-MEMBER (${joined.length}):`);
joined.forEach((g) => console.log(`     · ${g.name}  [${g.type}]`));

// ── Streams ────────────────────────────────────────────────────────────────────
const myStreams = await db
  .select({ id: streamRecords.id })
  .from(streamRecords)
  .where(or(eq(streamRecords.creatorId, userId), eq(streamRecords.counterpartId, userId)));
const myGuests = await db
  .select({ id: streamGuests.id })
  .from(streamGuests)
  .where(eq(streamGuests.createdBy, userId));

console.log(`\n🌊  Streams → DELETE: ${myStreams.length} record(s), ${myGuests.length} guest(s)`);

if (!CONFIRM) {
  console.log("\n🔎  Dry run complete — re-run with --confirm to apply.\n");
  process.exit(0);
}

// ── Execute ────────────────────────────────────────────────────────────────────
if (owned.length > 0) {
  await db.delete(groups).where(inArray(groups.id, owned.map((g) => g.groupId)));
}
if (joined.length > 0) {
  const memberRowIds = joined.map((g) => g.memberRow);
  // Clear our own circle contributions first — that FK doesn't cascade on a
  // member-row delete (expense_splits/reactions/etc. do).
  await db.delete(circleContributions).where(inArray(circleContributions.memberId, memberRowIds));
  await db.delete(groupMembers).where(
    and(eq(groupMembers.userId, userId), inArray(groupMembers.id, memberRowIds)),
  );
}
if (myStreams.length > 0) {
  // stream_settlements cascade via FK on stream_records
  await db.delete(streamRecords).where(
    or(eq(streamRecords.creatorId, userId), eq(streamRecords.counterpartId, userId)),
  );
}
if (myGuests.length > 0) {
  await db.delete(streamGuests).where(eq(streamGuests.createdBy, userId));
}

console.log("\n✅  Done — your home is a clean slate.\n");
process.exit(0);
