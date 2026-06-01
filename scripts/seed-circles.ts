/**
 * Seed script — creates 4 Circle groups covering every Phase 4+5 test scenario.
 *
 *   1. Cricket Club Circle    — recurring, ₹500/mo, 3/5 paid, 1 wallet expense
 *   2. Priya's 30th 🎂        — one_time/fixed, 85% collected, active status, public privacy
 *   3. Anniversary Gift 💍    — one_time/fixed, 110% collected, purchased status → surplus card + celebration
 *   4. Office Farewell Fund   — one_time/flexi, 40% collected, admin_only privacy → privacy test
 *
 * Usage:  pnpm seed:circles
 *
 * Requires PLATFORM_ADMIN_EMAIL (or SEED_USER_EMAIL) in .env.local.
 */

import "dotenv/config";
import { db } from "../lib/db/client";
import { groups } from "../lib/db/schema/groups";
import { groupMembers } from "../lib/db/schema/group-members";
import { circleContributions } from "../lib/db/schema/circle-contributions";
import { expenses } from "../lib/db/schema/expenses";
import { createAdminClient } from "../lib/supabase/admin";
import { isNotNull, desc } from "drizzle-orm";

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function daysAgoDate(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function currentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function fmt(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n⭕  Clear Circle seed — 4 circles covering Phase 4+5 scenarios\n");

  // ── Resolve user ID ──────────────────────────────────────────────────────────
  let userId: string | undefined;
  const seedEmail = process.env.SEED_USER_EMAIL ?? process.env.PLATFORM_ADMIN_EMAIL;

  if (seedEmail) {
    const admin = createAdminClient();
    const { data: listData } = await admin.auth.admin.listUsers({ perPage: 200 });
    const match = listData?.users?.find((u: { email?: string }) => u.email === seedEmail);
    if (!match) {
      console.error(`❌  No auth user found with email: ${seedEmail}`);
      process.exit(1);
    }
    userId = match.id;
    console.log(`👤  User: ${userId} <${seedEmail}>\n`);
  } else {
    const rows = await db
      .select({ userId: groupMembers.userId })
      .from(groupMembers)
      .where(isNotNull(groupMembers.userId))
      .orderBy(desc(groupMembers.joinedAt))
      .limit(50);

    const counts = new Map<string, number>();
    for (const r of rows) {
      if (!r.userId) continue;
      counts.set(r.userId, (counts.get(r.userId) ?? 0) + 1);
    }
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    userId = sorted[0]?.[0];

    if (!userId) {
      console.error("❌  Could not find any authenticated users. Create a group via the UI first.");
      process.exit(1);
    }
    console.log(`👤  User (most active): ${userId}`);
    console.log(`    Tip: set SEED_USER_EMAIL=you@example.com in .env.local\n`);
  }
  const uid: string = userId as string;

  // ══════════════════════════════════════════════════════════════════════════════
  // 1. Cricket Club Circle — recurring, ₹500/month
  //    Tests: Phase 4 wallet expense logging, dashboard inline expenses,
  //           recurring chip grid, cycle nav
  // ══════════════════════════════════════════════════════════════════════════════
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🏏  1. Cricket Club Circle  (recurring · ₹500/mo)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const [cricket] = await db.insert(groups).values({
    name:               "Cricket Club Circle",
    groupType:          "circle",
    defaultCurrency:    "INR",
    circleMode:         "recurring",
    contributionAmount: "500",
    contributionPeriod: "monthly",
    contributionDay:    1,
    circleStatus:       "active",
    upiId:              "cricket@okaxis",
    createdBy:          uid,
  }).returning();
  console.log(`  ✓ Group created: ${cricket.id}`);

  // Admin member
  const [cricketAdmin] = await db.insert(groupMembers).values({
    groupId: cricket.id, userId: uid,
    displayName: "You (Admin)", role: "admin",
  }).returning();

  // 5 ghost members
  const cricketGhosts = await db.insert(groupMembers).values([
    { groupId: cricket.id, guestName: "Rahul",  role: "member" },
    { groupId: cricket.id, guestName: "Ankit",  role: "member" },
    { groupId: cricket.id, guestName: "Vikram", role: "member" },
    { groupId: cricket.id, guestName: "Neha",   role: "member" },
    { groupId: cricket.id, guestName: "Dev",    role: "member" },
  ]).returning();
  console.log(`  ✓ 5 ghost members added`);

  const period = currentPeriod();

  // Admin + 2 ghosts have contributed this cycle (3/6 paid)
  await db.insert(circleContributions).values([
    { groupId: cricket.id, memberId: cricketAdmin.id,      amount: "500", currency: "INR", period, recordedBy: uid },
    { groupId: cricket.id, memberId: cricketGhosts[0].id,  amount: "500", currency: "INR", period, recordedBy: uid, note: "Paid on time" },
    { groupId: cricket.id, memberId: cricketGhosts[1].id,  amount: "500", currency: "INR", period, recordedBy: uid },
  ]);
  console.log(`  ✓ 3/6 contributions recorded for ${period}`);

  // 1 wallet expense — direct draw from pool
  const [cricketExp] = await db.insert(expenses).values({
    groupId:         cricket.id,
    paidByMemberId:  cricketAdmin.id,
    description:     "Ground rental — June",
    category:        "venue",
    amount:          "2000",
    currency:        "INR",
    expenseDate:     daysAgoDate(5),
    isAdvance:       false,
    createdByUserId: uid,
  }).returning();
  console.log(`  ✓ Wallet expense: Ground rental ${fmt(2000)} (${cricketExp.id})`);

  // ══════════════════════════════════════════════════════════════════════════════
  // 2. Priya's 30th 🎂 — one_time/fixed, 85% collected, active, public privacy
  //    Tests: one-time lifecycle (Collecting state), one-time personal status card,
  //           progress bar, near-goal state, wallet advance expense
  // ══════════════════════════════════════════════════════════════════════════════
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🎂  2. Priya's 30th  (one-time/fixed · ₹10,000 · 30 days left · public)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const [priya30] = await db.insert(groups).values({
    name:                "Priya's 30th 🎂",
    groupType:           "circle",
    defaultCurrency:     "INR",
    circleMode:          "one_time",
    contributionAmount:  "500",       // ₹500 per person suggested
    targetAmount:        "10000",
    eventDate:           daysFromNow(30),
    circleStatus:        "active",    // Collecting state → tests lifecycle stepper
    contributionPrivacy: "public",
    createdBy:           uid,
  }).returning();
  console.log(`  ✓ Group created: ${priya30.id}`);

  const [priya30Admin] = await db.insert(groupMembers).values({
    groupId: priya30.id, userId: uid,
    displayName: "You (Organiser)", role: "admin",
  }).returning();

  const priya30Ghosts = await db.insert(groupMembers).values([
    { groupId: priya30.id, guestName: "Rahul",  role: "member" },
    { groupId: priya30.id, guestName: "Ankit",  role: "member" },
    { groupId: priya30.id, guestName: "Vikram", role: "member" },
    { groupId: priya30.id, guestName: "Neha",   role: "member" },
    { groupId: priya30.id, guestName: "Dev",    role: "member" },
    { groupId: priya30.id, guestName: "Karan",  role: "member" },
    { groupId: priya30.id, guestName: "Meera",  role: "member" },
    { groupId: priya30.id, guestName: "Sachin", role: "member" },
  ]).returning();
  console.log(`  ✓ 8 ghost members added`);

  // 85% collected = ₹8,500 across admin + 16 ghost contributions (some contributed more)
  await db.insert(circleContributions).values([
    { groupId: priya30.id, memberId: priya30Admin.id,      amount: "500",  currency: "INR", period: null, recordedBy: uid },
    { groupId: priya30.id, memberId: priya30Ghosts[0].id,  amount: "1000", currency: "INR", period: null, recordedBy: uid, note: "Rahul paid double" },
    { groupId: priya30.id, memberId: priya30Ghosts[1].id,  amount: "500",  currency: "INR", period: null, recordedBy: uid },
    { groupId: priya30.id, memberId: priya30Ghosts[2].id,  amount: "500",  currency: "INR", period: null, recordedBy: uid },
    { groupId: priya30.id, memberId: priya30Ghosts[3].id,  amount: "500",  currency: "INR", period: null, recordedBy: uid },
    { groupId: priya30.id, memberId: priya30Ghosts[4].id,  amount: "1500", currency: "INR", period: null, recordedBy: uid, note: "Dev paid for 3 people" },
    { groupId: priya30.id, memberId: priya30Ghosts[5].id,  amount: "500",  currency: "INR", period: null, recordedBy: uid },
    { groupId: priya30.id, memberId: priya30Ghosts[6].id,  amount: "3000", currency: "INR", period: null, recordedBy: uid, note: "Meera sponsored" },
    // Ghosts[7] (Sachin) has NOT contributed — shows as pending chip
  ]);
  // Total: 500+1000+500+500+500+1500+500+3000 = 8000
  // But need ₹8,500 — add one more partial
  await db.insert(circleContributions).values({
    groupId: priya30.id, memberId: priya30Ghosts[6].id, amount: "500",
    currency: "INR", period: null, recordedBy: uid, note: "Top-up",
  });
  // Total now = 8500 ✓
  console.log(`  ✓ ${fmt(8500)} / ${fmt(10000)} collected (85%)`);

  // 1 wallet advance expense (venue deposit paid by admin from pocket)
  await db.insert(expenses).values({
    groupId:         priya30.id,
    paidByMemberId:  priya30Admin.id,
    description:     "Venue deposit — The Leela",
    category:        "venue",
    amount:          "1500",
    currency:        "INR",
    expenseDate:     daysAgoDate(3),
    isAdvance:       true,            // admin paid from their pocket
    notes:           "Paid upfront to hold the date",
    createdByUserId: uid,
  });
  console.log(`  ✓ Wallet advance: Venue deposit ${fmt(1500)} (advance by You)`);

  // ══════════════════════════════════════════════════════════════════════════════
  // 3. Anniversary Gift for Dev 💍 — one_time/fixed, 110% collected, purchased status
  //    Tests: 🎯 goal-hit celebration, surplus card (₹1,500 surplus),
  //           lifecycle = purchased → "Note as distributed" / "Keep in wallet"
  // ══════════════════════════════════════════════════════════════════════════════
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("💍  3. Anniversary Gift for Dev  (one-time/fixed · purchased · surplus)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const [devGift] = await db.insert(groups).values({
    name:                "Anniversary Gift for Dev 💍",
    groupType:           "circle",
    defaultCurrency:     "INR",
    circleMode:          "one_time",
    contributionAmount:  "1000",
    targetAmount:        "5000",
    eventDate:           daysFromNow(7),
    circleStatus:        "purchased",  // Gift already bought → surplus card should appear
    contributionPrivacy: "public",
    createdBy:           uid,
  }).returning();
  console.log(`  ✓ Group created: ${devGift.id}`);

  const [devAdmin] = await db.insert(groupMembers).values({
    groupId: devGift.id, userId: uid,
    displayName: "You (Organiser)", role: "admin",
  }).returning();

  const devGhosts = await db.insert(groupMembers).values([
    { groupId: devGift.id, guestName: "Rahul",  role: "member" },
    { groupId: devGift.id, guestName: "Priya",  role: "member" },
    { groupId: devGift.id, guestName: "Neha",   role: "member" },
    { groupId: devGift.id, guestName: "Karan",  role: "member" },
  ]).returning();
  console.log(`  ✓ 4 ghost members added`);

  // ₹5,500 collected — 110% of ₹5,000 target
  await db.insert(circleContributions).values([
    { groupId: devGift.id, memberId: devAdmin.id,        amount: "1000", currency: "INR", period: null, recordedBy: uid },
    { groupId: devGift.id, memberId: devGhosts[0].id,    amount: "1500", currency: "INR", period: null, recordedBy: uid, note: "Rahul paid extra" },
    { groupId: devGift.id, memberId: devGhosts[1].id,    amount: "1000", currency: "INR", period: null, recordedBy: uid },
    { groupId: devGift.id, memberId: devGhosts[2].id,    amount: "1000", currency: "INR", period: null, recordedBy: uid },
    { groupId: devGift.id, memberId: devGhosts[3].id,    amount: "1000", currency: "INR", period: null, recordedBy: uid },
  ]);
  // Total: 1000+1500+1000+1000+1000 = 5500 ✓
  console.log(`  ✓ ${fmt(5500)} / ${fmt(5000)} collected (110% — over target!)`);

  // ₹4,000 wallet expense — gift purchased
  // Surplus = 5500 - 4000 = ₹1,500
  await db.insert(expenses).values({
    groupId:         devGift.id,
    paidByMemberId:  devAdmin.id,
    description:     "Anniversary watch — Fastrack",
    category:        "gift",
    amount:          "4000",
    currency:        "INR",
    expenseDate:     daysAgoDate(1),
    isAdvance:       false,
    createdByUserId: uid,
  });
  console.log(`  ✓ Gift expense: ${fmt(4000)} → surplus = ${fmt(1500)}`);
  console.log(`  ℹ  status = purchased → surplus card should appear for admin`);

  // ══════════════════════════════════════════════════════════════════════════════
  // 4. Office Farewell Fund — one_time/flexi (contributionAmount=null), admin_only privacy, 40% collected
  //    Tests: contribution privacy — non-admins see count only, not ₹ totals
  //    Note: Since seeded user is always admin, privacy hides amounts for OTHER
  //    users who join. To test non-admin view, log in with a second account.
  // ══════════════════════════════════════════════════════════════════════════════
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("👔  4. Office Farewell Fund  (one-time/flexi · admin_only privacy · 40%)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const [farewell] = await db.insert(groups).values({
    name:                "Office Farewell Fund",
    groupType:           "circle",
    defaultCurrency:     "INR",
    circleMode:          "one_time",
    contributionAmount:  null,        // open amounts — colleagues contribute what they can
    targetAmount:        "15000",
    eventDate:           daysFromNow(14),
    circleStatus:        "active",
    contributionPrivacy: "admin_only", // amounts hidden from non-admins
    createdBy:           uid,
  }).returning();
  console.log(`  ✓ Group created: ${farewell.id}`);

  const [farewellAdmin] = await db.insert(groupMembers).values({
    groupId: farewell.id, userId: uid,
    displayName: "You (Organiser)", role: "admin",
  }).returning();

  const farewellGhosts = await db.insert(groupMembers).values([
    { groupId: farewell.id, guestName: "Sameer",   role: "member" },
    { groupId: farewell.id, guestName: "Divya",    role: "member" },
    { groupId: farewell.id, guestName: "Harpreet", role: "member" },
    { groupId: farewell.id, guestName: "Tanya",    role: "member" },
  ]).returning();
  console.log(`  ✓ 4 ghost members added`);

  // ₹6,000 collected (40% of ₹15,000) — varying amounts (privacy covers this)
  await db.insert(circleContributions).values([
    { groupId: farewell.id, memberId: farewellAdmin.id,      amount: "2000", currency: "INR", period: null, recordedBy: uid },
    { groupId: farewell.id, memberId: farewellGhosts[0].id,  amount: "500",  currency: "INR", period: null, recordedBy: uid },
    { groupId: farewell.id, memberId: farewellGhosts[1].id,  amount: "1500", currency: "INR", period: null, recordedBy: uid },
    { groupId: farewell.id, memberId: farewellGhosts[2].id,  amount: "2000", currency: "INR", period: null, recordedBy: uid },
    // farewellGhosts[3] (Tanya) has NOT contributed
  ]);
  // Total: 2000+500+1500+2000 = 6000 ✓
  console.log(`  ✓ ${fmt(6000)} / ${fmt(15000)} collected (40%) — varying amounts hidden from members`);

  // ── Summary ────────────────────────────────────────────────────────────────
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  console.log(`\n${"═".repeat(57)}`);
  console.log(`✅  4 circles seeded`);
  console.log(`\n📋  What each circle tests:`);
  console.log(`\n   🏏  Cricket Club Circle`);
  console.log(`       Phase 4: wallet expense logging, advance badge,`);
  console.log(`       dashboard inline section, delete expense`);
  console.log(`       ${base}/groups/${cricket.id}`);
  console.log(`\n   🎂  Priya's 30th`);
  console.log(`       Phase 5: lifecycle (Collecting), goal personal status,`);
  console.log(`       wallet advance, near-goal progress bar`);
  console.log(`       ${base}/groups/${priya30.id}`);
  console.log(`\n   💍  Anniversary Gift for Dev`);
  console.log(`       Phase 5: 🎯 goal-hit celebration (110%),`);
  console.log(`       surplus card (₹1,500), lifecycle (Purchased)`);
  console.log(`       ${base}/groups/${devGift.id}`);
  console.log(`\n   👔  Office Farewell Fund`);
  console.log(`       Phase 5: contribution privacy (admin_only)`);
  console.log(`       As admin you see ₹ amounts.`);
  console.log(`       Log in as a second user via the invite link to see`);
  console.log(`       the count-only view.`);
  console.log(`       ${base}/groups/${farewell.id}`);
  console.log(`\n   Home → Circles section:`);
  console.log(`       ${base}/groups`);
  console.log(`${"═".repeat(57)}\n`);

  process.exit(0);
}

main().catch((e) => {
  console.error("❌  Circle seed failed:", e);
  process.exit(1);
});
