/**
 * Seed script — comprehensive Circle test data (12 circles).
 *
 * Deletes ALL existing circles for both seed users, then creates 12 new ones
 * covering every role, state, sub-type, and workflow combination.
 *
 * JAY IS ADMIN (7 circles):
 *   1. 🏏 Cricket Club Circle     — recurring, 5/8 paid, wallet expense + advance
 *   2. ☕ Office Coffee Pool       — recurring, ALL 6/6 paid, wallet expense
 *   3. 🎀 Kavya's Baby Shower      — one-time/fixed, collecting, batch confirm banner
 *   4. 💍 Sreeja & Vikram Gift     — one-time/fixed, purchased + 🎯 celebration + surplus
 *   5. ✅ Farewell — Pradeep       — one-time/fixed, complete lifecycle
 *   6. 🌍 Europe Backpacking Fund  — one-time/flexi, soft target, 5/8 contributed
 *   7. 🏠 Flat Deposit Pool        — one-time/flexi, no target, no deadline
 *
 * ANUPRIYA IS ADMIN, SAI IS MEMBER (5 circles):
 *   8.  🎮 Friday Game Night Fund  — recurring, Jay UNPAID → "Pay ₹400 ↗" UPI button
 *   9.  🪴 Balcony Garden Fund     — recurring, Jay PAID → "You're clear for [month]"
 *   10. 🎁 Appa's 65th Birthday    — one-time/fixed, Jay UNPAID → "Pay ₹2,000 ↗" UPI
 *   11. 🌊 Coorg Trip Pool         — one-time/fixed, Jay PAID → "You've contributed" + More
 *   12. 🎪 New Year Party Fund     — one-time/flexi, Jay UNPAID → dynamic UPI, 16 members
 *
 * Setup (.env.local):
 *   PLATFORM_ADMIN_EMAIL=saijayakumar@gmail.com
 *   SEED_SECOND_EMAIL=rn.anupriya@gmail.com
 *
 * Usage: pnpm seed:circles
 */

import "dotenv/config";
import { db } from "../lib/db/client";
import { groups } from "../lib/db/schema/groups";
import { groupMembers } from "../lib/db/schema/group-members";
import { circleContributions } from "../lib/db/schema/circle-contributions";
import { expenses } from "../lib/db/schema/expenses";
import { createAdminClient } from "../lib/supabase/admin";
import { and, eq, inArray } from "drizzle-orm";

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function daysAgo(n: number): string {
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

async function resolveUser(
  admin: ReturnType<typeof createAdminClient>,
  email: string,
): Promise<string> {
  const { data } = await admin.auth.admin.listUsers({ perPage: 200 });
  const match = data?.users?.find((u: { email?: string }) => u.email === email);
  if (!match) throw new Error(`No auth user found for: ${email}`);
  return match.id;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n⭕  Clear Circle seed — 12 circles, full scenario coverage\n");

  // ── Resolve both users ───────────────────────────────────────────────────────
  const supabaseAdmin = createAdminClient();

  const saiEmail      = process.env.SEED_USER_EMAIL ?? process.env.PLATFORM_ADMIN_EMAIL;
  const anupriyaEmail = process.env.SEED_SECOND_EMAIL;

  if (!saiEmail) {
    console.error("❌  Set PLATFORM_ADMIN_EMAIL in .env.local");
    process.exit(1);
  }
  if (!anupriyaEmail) {
    console.error("❌  Set SEED_SECOND_EMAIL=rn.anupriya@gmail.com in .env.local");
    process.exit(1);
  }

  let saiId: string;
  let anupriyaId: string;
  try {
    saiId      = await resolveUser(supabaseAdmin, saiEmail);
    anupriyaId = await resolveUser(supabaseAdmin, anupriyaEmail);
  } catch (e: unknown) {
    console.error("❌ ", (e as Error).message);
    process.exit(1);
  }

  console.log(`👤  Jay:      ${saiId} <${saiEmail}>`);
  console.log(`👤  Anu:      ${anupriyaId} <${anupriyaEmail}>\n`);

  // ── Delete all existing circles for both users ───────────────────────────────
  console.log("🗑️   Cleaning up existing circles...");

  const existingRows = await db
    .select({ id: groupMembers.groupId })
    .from(groupMembers)
    .innerJoin(
      groups,
      and(eq(groups.id, groupMembers.groupId), eq(groups.groupType, "circle")),
    )
    .where(inArray(groupMembers.userId, [saiId, anupriyaId]));

  const circleIds = [...new Set(existingRows.map((r) => r.id))];

  if (circleIds.length > 0) {
    await db.delete(circleContributions).where(inArray(circleContributions.groupId, circleIds));
    await db.delete(expenses).where(inArray(expenses.groupId, circleIds));
    await db.delete(groupMembers).where(inArray(groupMembers.groupId, circleIds));
    await db.delete(groups).where(inArray(groups.id, circleIds));
    console.log(`  ✓ Deleted ${circleIds.length} existing circle(s)\n`);
  } else {
    console.log(`  ✓ No existing circles to delete\n`);
  }

  const cur = currentPeriod();

  // ════════════════════════════════════════════════════════════════════════════
  // 1. 🏏 Cricket Club Circle — recurring, ₹600/mo, 5/8 paid, wallet expenses
  //    Admin: Jay | Tests: recurring pending chips, wallet expense + advance,
  //    remind bell, UPI set, partial payment state
  // ════════════════════════════════════════════════════════════════════════════
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🏏  1. Cricket Club Circle  (recurring · ₹600/mo · 5/8 paid · wallet+advance)");

  const [cricket] = await db.insert(groups).values({
    name:               "Cricket Club Circle 🏏",
    groupType:          "circle",
    defaultCurrency:    "INR",
    circleMode:         "recurring",
    contributionAmount: "600",
    contributionPeriod: "monthly",
    contributionDay:    5,
    circleStatus:       "active",
    upiId:              "sai.jk@okaxis",
    walletExpensesEnabled: true,
    createdBy:          saiId,
  }).returning();

  const [cricketAdmin] = await db.insert(groupMembers).values({
    groupId: cricket.id, userId: saiId, displayName: "Jay (Admin)", role: "admin",
  }).returning();

  const [cricketAnupriya] = await db.insert(groupMembers).values({
    groupId: cricket.id, userId: anupriyaId, displayName: "Anu", role: "member",
  }).returning();

  const cricketGhosts = await db.insert(groupMembers).values([
    { groupId: cricket.id, guestName: "Rahul",  role: "member" },
    { groupId: cricket.id, guestName: "Ankit",  role: "member" },
    { groupId: cricket.id, guestName: "Vikram", role: "member" },
    { groupId: cricket.id, guestName: "Neha",   role: "member" },  // pending
    { groupId: cricket.id, guestName: "Dev",    role: "member" },  // pending
    { groupId: cricket.id, guestName: "Priya",  role: "member" },  // pending
  ]).returning();

  // Jay + Anupriya + Rahul + Ankit + Vikram paid (5/8). Neha, Dev, Priya pending.
  await db.insert(circleContributions).values([
    { groupId: cricket.id, memberId: cricketAdmin.id,       amount: "600", currency: "INR", period: cur, recordedBy: saiId },
    { groupId: cricket.id, memberId: cricketAnupriya.id,    amount: "600", currency: "INR", period: cur, recordedBy: saiId },
    { groupId: cricket.id, memberId: cricketGhosts[0].id,   amount: "600", currency: "INR", period: cur, recordedBy: saiId },
    { groupId: cricket.id, memberId: cricketGhosts[1].id,   amount: "600", currency: "INR", period: cur, recordedBy: saiId },
    { groupId: cricket.id, memberId: cricketGhosts[2].id,   amount: "600", currency: "INR", period: cur, recordedBy: saiId },
  ]);

  await db.insert(expenses).values([
    {
      groupId: cricket.id, paidByMemberId: cricketAdmin.id,
      description: "Ground rental — June", category: "venue",
      amount: "2400", currency: "INR", expenseDate: daysAgo(5),
      isAdvance: false, createdByUserId: saiId,
    },
    {
      groupId: cricket.id, paidByMemberId: cricketAdmin.id,
      description: "Drinks & snacks", category: "food",
      amount: "800", currency: "INR", expenseDate: daysAgo(2),
      isAdvance: true,  // admin paid from pocket → advance badge
      notes: "Paid from my pocket at the ground",
      createdByUserId: saiId,
    },
  ]);
  console.log(`  ✓ ${cricket.id} · 8 members · 5/8 paid · 2 wallet expenses (1 advance)`);

  // ════════════════════════════════════════════════════════════════════════════
  // 2. ☕ Office Coffee Pool — recurring, ALL 6/6 paid, wallet balance
  //    Admin: Jay | Tests: all-paid state, "Everyone paid 🎉", paid chips
  //    with "Tap to record more ↓", no UPI (tests no-UPI path)
  // ════════════════════════════════════════════════════════════════════════════
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("☕  2. Office Coffee Pool  (recurring · ₹300/mo · ALL 6/6 paid · no UPI)");

  const [coffee] = await db.insert(groups).values({
    name:               "Office Coffee Pool ☕",
    groupType:          "circle",
    defaultCurrency:    "INR",
    circleMode:         "recurring",
    contributionAmount: "300",
    contributionPeriod: "monthly",
    contributionDay:    1,
    circleStatus:       "active",
    walletExpensesEnabled: true,
    createdBy:          saiId,
  }).returning();

  const [coffeeAdmin] = await db.insert(groupMembers).values({
    groupId: coffee.id, userId: saiId, displayName: "Jay (Admin)", role: "admin",
  }).returning();

  const coffeeGhosts = await db.insert(groupMembers).values([
    { groupId: coffee.id, guestName: "Arjun",  role: "member" },
    { groupId: coffee.id, guestName: "Meera",  role: "member" },
    { groupId: coffee.id, guestName: "Karan",  role: "member" },
    { groupId: coffee.id, guestName: "Sachin", role: "member" },
    { groupId: coffee.id, guestName: "Divya",  role: "member" },
  ]).returning();

  // ALL 6/6 paid
  await db.insert(circleContributions).values([
    { groupId: coffee.id, memberId: coffeeAdmin.id,       amount: "300", currency: "INR", period: cur, recordedBy: saiId },
    { groupId: coffee.id, memberId: coffeeGhosts[0].id,   amount: "300", currency: "INR", period: cur, recordedBy: saiId },
    { groupId: coffee.id, memberId: coffeeGhosts[1].id,   amount: "300", currency: "INR", period: cur, recordedBy: saiId },
    { groupId: coffee.id, memberId: coffeeGhosts[2].id,   amount: "300", currency: "INR", period: cur, recordedBy: saiId },
    { groupId: coffee.id, memberId: coffeeGhosts[3].id,   amount: "300", currency: "INR", period: cur, recordedBy: saiId },
    { groupId: coffee.id, memberId: coffeeGhosts[4].id,   amount: "300", currency: "INR", period: cur, recordedBy: saiId },
  ]);

  await db.insert(expenses).values({
    groupId: coffee.id, paidByMemberId: coffeeAdmin.id,
    description: "Coffee beans + filters", category: "shopping",
    amount: "1200", currency: "INR", expenseDate: daysAgo(3),
    isAdvance: false, createdByUserId: saiId,
  });
  console.log(`  ✓ ${coffee.id} · 6 members · 6/6 paid · wallet balance ${fmt(600)}`);

  // ════════════════════════════════════════════════════════════════════════════
  // 3. 🎀 Kavya's Baby Shower — one-time/fixed ₹500/person, collecting
  //    Admin: Jay | Tests: fixed collecting, Anupriya self-reported (isConfirmed=false)
  //    → batch confirm banner, partial progress bar, advance wallet expense
  // ════════════════════════════════════════════════════════════════════════════
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🎀  3. Kavya's Baby Shower  (fixed ₹500 · 12 members · batch confirm banner)");

  const [babyShower] = await db.insert(groups).values({
    name:                "Kavya's Baby Shower 🎀",
    groupType:           "circle",
    defaultCurrency:     "INR",
    circleMode:          "one_time",
    contributionAmount:  "500",
    targetAmount:        "8000",
    eventDate:           daysFromNow(20),
    circleStatus:        "active",
    contributionPrivacy: "public",
    upiId:               "sai.jk@okaxis",
    walletExpensesEnabled: true,
    createdBy:           saiId,
  }).returning();

  const [babyAdmin] = await db.insert(groupMembers).values({
    groupId: babyShower.id, userId: saiId, displayName: "Jay (Organiser)", role: "admin",
  }).returning();

  const [babyAnupriya] = await db.insert(groupMembers).values({
    groupId: babyShower.id, userId: anupriyaId, displayName: "Anu", role: "member",
  }).returning();

  const babyGhosts = await db.insert(groupMembers).values([
    { groupId: babyShower.id, guestName: "Ritu",    role: "member" },
    { groupId: babyShower.id, guestName: "Sneha",   role: "member" },
    { groupId: babyShower.id, guestName: "Pooja",   role: "member" },
    { groupId: babyShower.id, guestName: "Deepak",  role: "member" },
    { groupId: babyShower.id, guestName: "Rohan",   role: "member" },
    { groupId: babyShower.id, guestName: "Arun",    role: "member" },  // pending
    { groupId: babyShower.id, guestName: "Nikhil",  role: "member" },  // pending
    { groupId: babyShower.id, guestName: "Pallavi", role: "member" },  // pending
    { groupId: babyShower.id, guestName: "Sona",    role: "member" },  // pending
    { groupId: babyShower.id, guestName: "Ajay",    role: "member" },  // pending
  ]).returning();

  // Jay + 5 ghosts confirmed (₹3,000); Anupriya self-reported (pending confirm)
  await db.insert(circleContributions).values([
    { groupId: babyShower.id, memberId: babyAdmin.id,       amount: "500", currency: "INR", period: null, recordedBy: saiId },
    { groupId: babyShower.id, memberId: babyGhosts[0].id,   amount: "500", currency: "INR", period: null, recordedBy: saiId },
    { groupId: babyShower.id, memberId: babyGhosts[1].id,   amount: "500", currency: "INR", period: null, recordedBy: saiId },
    { groupId: babyShower.id, memberId: babyGhosts[2].id,   amount: "500", currency: "INR", period: null, recordedBy: saiId },
    { groupId: babyShower.id, memberId: babyGhosts[3].id,   amount: "500", currency: "INR", period: null, recordedBy: saiId },
    { groupId: babyShower.id, memberId: babyGhosts[4].id,   amount: "500", currency: "INR", period: null, recordedBy: saiId },
  ]);
  // Anupriya self-reported — admin (Sai) sees batch confirm banner
  await db.insert(circleContributions).values({
    groupId:     babyShower.id,
    memberId:    babyAnupriya.id,
    amount:      "500",
    currency:    "INR",
    period:      null,
    isConfirmed: false,  // pending admin confirmation
  });

  await db.insert(expenses).values({
    groupId: babyShower.id, paidByMemberId: babyAdmin.id,
    description: "Venue deposit — Bloom & Petal", category: "venue",
    amount: "2000", currency: "INR", expenseDate: daysAgo(7),
    isAdvance: true, notes: "Paid upfront to hold the date",
    createdByUserId: saiId,
  });
  console.log(`  ✓ ${babyShower.id} · 12 members · 6 confirmed · 1 pending (Anupriya) → batch confirm`);

  // ════════════════════════════════════════════════════════════════════════════
  // 4. 💍 Sreeja & Vikram Wedding Gift — one-time/fixed, purchased + celebration + surplus
  //    Admin: Jay | Tests: 🎯 goal celebration (125%), surplus card, purchased state,
  //    lifecycle stepper at "Purchased", wallet expense
  // ════════════════════════════════════════════════════════════════════════════
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("💍  4. Sreeja & Vikram Gift  (fixed · 125% · purchased · 🎯 celebration · surplus)");

  const [wedding] = await db.insert(groups).values({
    name:                "Sreeja & Vikram Wedding Gift 💍",
    groupType:           "circle",
    defaultCurrency:     "INR",
    circleMode:          "one_time",
    contributionAmount:  "1000",
    targetAmount:        "8000",
    eventDate:           daysAgo(5),    // deadline passed
    circleStatus:        "purchased",   // gift already bought
    contributionPrivacy: "public",
    walletExpensesEnabled: true,
    createdBy:           saiId,
  }).returning();

  const [weddingAdmin] = await db.insert(groupMembers).values({
    groupId: wedding.id, userId: saiId, displayName: "Jay (Organiser)", role: "admin",
  }).returning();

  const weddingGhosts = await db.insert(groupMembers).values([
    { groupId: wedding.id, guestName: "Rahul",   role: "member" },
    { groupId: wedding.id, guestName: "Priya",   role: "member" },
    { groupId: wedding.id, guestName: "Karthik", role: "member" },
    { groupId: wedding.id, guestName: "Neha",    role: "member" },
    { groupId: wedding.id, guestName: "Arjun",   role: "member" },
    { groupId: wedding.id, guestName: "Divya",   role: "member" },
    { groupId: wedding.id, guestName: "Suresh",  role: "member" },
    { groupId: wedding.id, guestName: "Meera",   role: "member" },
    { groupId: wedding.id, guestName: "Ravi",    role: "member" },
  ]).returning();

  // 10 × ₹1,000 = ₹10,000 (125% of ₹8,000 target)
  await db.insert(circleContributions).values([
    { groupId: wedding.id, memberId: weddingAdmin.id,       amount: "1000", currency: "INR", period: null, recordedBy: saiId },
    { groupId: wedding.id, memberId: weddingGhosts[0].id,   amount: "1000", currency: "INR", period: null, recordedBy: saiId },
    { groupId: wedding.id, memberId: weddingGhosts[1].id,   amount: "1000", currency: "INR", period: null, recordedBy: saiId },
    { groupId: wedding.id, memberId: weddingGhosts[2].id,   amount: "1000", currency: "INR", period: null, recordedBy: saiId },
    { groupId: wedding.id, memberId: weddingGhosts[3].id,   amount: "1000", currency: "INR", period: null, recordedBy: saiId },
    { groupId: wedding.id, memberId: weddingGhosts[4].id,   amount: "1000", currency: "INR", period: null, recordedBy: saiId },
    { groupId: wedding.id, memberId: weddingGhosts[5].id,   amount: "1000", currency: "INR", period: null, recordedBy: saiId },
    { groupId: wedding.id, memberId: weddingGhosts[6].id,   amount: "1000", currency: "INR", period: null, recordedBy: saiId },
    { groupId: wedding.id, memberId: weddingGhosts[7].id,   amount: "1000", currency: "INR", period: null, recordedBy: saiId },
    { groupId: wedding.id, memberId: weddingGhosts[8].id,   amount: "1000", currency: "INR", period: null, recordedBy: saiId },
  ]);
  // Total: ₹10,000. Expense: ₹7,000. Surplus = ₹3,000.
  await db.insert(expenses).values({
    groupId: wedding.id, paidByMemberId: weddingAdmin.id,
    description: "Gift hamper — La Maison", category: "gift",
    amount: "7000", currency: "INR", expenseDate: daysAgo(3),
    isAdvance: false, createdByUserId: saiId,
  });
  console.log(`  ✓ ${wedding.id} · 10 members · ${fmt(10000)} / ${fmt(8000)} · surplus ${fmt(3000)}`);

  // ════════════════════════════════════════════════════════════════════════════
  // 5. ✅ Farewell — Pradeep — one-time/fixed, COMPLETE lifecycle
  //    Admin: Jay | Tests: complete state, full stepper all green,
  //    "This goal is complete" banner, all members paid, expenses settled
  // ════════════════════════════════════════════════════════════════════════════
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("✅  5. Farewell — Pradeep  (fixed · complete · all settled · closed)");

  const [pradeep] = await db.insert(groups).values({
    name:                "Farewell — Pradeep 🥂",
    groupType:           "circle",
    defaultCurrency:     "INR",
    circleMode:          "one_time",
    contributionAmount:  "500",
    targetAmount:        "5000",
    eventDate:           daysAgo(30),
    circleStatus:        "complete",
    contributionPrivacy: "public",
    walletExpensesEnabled: true,
    createdBy:           saiId,
  }).returning();

  const [pradeepAdmin] = await db.insert(groupMembers).values({
    groupId: pradeep.id, userId: saiId, displayName: "Jay (Organiser)", role: "admin",
  }).returning();

  const pradeepGhosts = await db.insert(groupMembers).values([
    { groupId: pradeep.id, guestName: "Ankit",   role: "member" },
    { groupId: pradeep.id, guestName: "Vikram",  role: "member" },
    { groupId: pradeep.id, guestName: "Neha",    role: "member" },
    { groupId: pradeep.id, guestName: "Karan",   role: "member" },
    { groupId: pradeep.id, guestName: "Pooja",   role: "member" },
    { groupId: pradeep.id, guestName: "Arun",    role: "member" },
    { groupId: pradeep.id, guestName: "Sachin",  role: "member" },
    { groupId: pradeep.id, guestName: "Pallavi", role: "member" },
    { groupId: pradeep.id, guestName: "Deepak",  role: "member" },
  ]).returning();

  // All 10 × ₹500 = ₹5,000 (100%)
  await db.insert(circleContributions).values([
    { groupId: pradeep.id, memberId: pradeepAdmin.id,       amount: "500", currency: "INR", period: null, recordedBy: saiId },
    ...pradeepGhosts.map((g) => ({
      groupId: pradeep.id, memberId: g.id,
      amount: "500", currency: "INR", period: null as string | null, recordedBy: saiId,
    })),
  ]);

  await db.insert(expenses).values([
    {
      groupId: pradeep.id, paidByMemberId: pradeepAdmin.id,
      description: "Farewell dinner — Hard Rock", category: "food",
      amount: "3800", currency: "INR", expenseDate: daysAgo(31),
      isAdvance: false, createdByUserId: saiId,
    },
    {
      groupId: pradeep.id, paidByMemberId: pradeepAdmin.id,
      description: "Amazon gift card", category: "gift",
      amount: "1000", currency: "INR", expenseDate: daysAgo(31),
      isAdvance: false, createdByUserId: saiId,
    },
  ]);
  console.log(`  ✓ ${pradeep.id} · 10 members · ${fmt(5000)} collected · complete`);

  // ════════════════════════════════════════════════════════════════════════════
  // 6. 🌍 Europe Backpacking Fund — one-time/flexi, soft target ₹1L, 5/8 contributed
  //    Admin: Jay | Tests: Flexi badge "one-time · flexi", individual amounts in
  //    roster paid section, allTimeCollected in hero, no "₹X each" pending label
  // ════════════════════════════════════════════════════════════════════════════
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🌍  6. Europe Backpacking Fund  (flexi · ₹1L target · 5/8 contributed · varying amounts)");

  const [europe] = await db.insert(groups).values({
    name:                "Europe Backpacking Fund 🌍",
    groupType:           "circle",
    defaultCurrency:     "INR",
    circleMode:          "one_time",
    contributionAmount:  null,     // Flexi
    targetAmount:        "100000",
    eventDate:           daysFromNow(75),
    circleStatus:        "active",
    contributionPrivacy: "public",
    walletExpensesEnabled: true,
    createdBy:           saiId,
  }).returning();

  const [europeAdmin] = await db.insert(groupMembers).values({
    groupId: europe.id, userId: saiId, displayName: "Jay (Organiser)", role: "admin",
  }).returning();

  const [europeAnupriya] = await db.insert(groupMembers).values({
    groupId: europe.id, userId: anupriyaId, displayName: "Anu", role: "member",
  }).returning();

  const europeGhosts = await db.insert(groupMembers).values([
    { groupId: europe.id, guestName: "Shreya",  role: "member" },
    { groupId: europe.id, guestName: "Arjun",   role: "member" },
    { groupId: europe.id, guestName: "Meera",   role: "member" },
    { groupId: europe.id, guestName: "Karthik", role: "member" },  // pending
    { groupId: europe.id, guestName: "Tanvi",   role: "member" },  // pending
    { groupId: europe.id, guestName: "Ravi",    role: "member" },  // pending
  ]).returning();

  // 5/8 contributed — varying amounts totalling ₹46,500
  await db.insert(circleContributions).values([
    { groupId: europe.id, memberId: europeAdmin.id,       amount: "8000",  currency: "INR", period: null, recordedBy: saiId },
    { groupId: europe.id, memberId: europeAnupriya.id,    amount: "15000", currency: "INR", period: null, recordedBy: saiId },
    { groupId: europe.id, memberId: europeGhosts[0].id,   amount: "12000", currency: "INR", period: null, recordedBy: saiId },
    { groupId: europe.id, memberId: europeGhosts[1].id,   amount: "5000",  currency: "INR", period: null, recordedBy: saiId },
    { groupId: europe.id, memberId: europeGhosts[2].id,   amount: "6500",  currency: "INR", period: null, recordedBy: saiId },
  ]);
  console.log(`  ✓ ${europe.id} · 8 members · 5/8 contributed · ${fmt(46500)} / ${fmt(100000)}`);

  // ════════════════════════════════════════════════════════════════════════════
  // 7. 🏠 Flat Deposit Pool — one-time/flexi, NO target, NO deadline
  //    Admin: Jay | Tests: Flexi no-target (bar by count ratio), wrap-up always
  //    available without goal, wallet expenses disabled, savings-only mode
  // ════════════════════════════════════════════════════════════════════════════
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🏠  7. Flat Deposit Pool  (flexi · no target · no deadline · savings-only)");

  const [flatDeposit] = await db.insert(groups).values({
    name:                "Flat Deposit Pool 🏠",
    groupType:           "circle",
    defaultCurrency:     "INR",
    circleMode:          "one_time",
    contributionAmount:  null,
    targetAmount:        null,   // no target
    eventDate:           null,   // no deadline
    circleStatus:        "active",
    contributionPrivacy: "public",
    walletExpensesEnabled: false, // savings-only — tests the disabled state
    createdBy:           saiId,
  }).returning();

  const [flatAdmin] = await db.insert(groupMembers).values({
    groupId: flatDeposit.id, userId: saiId, displayName: "Jay (Organiser)", role: "admin",
  }).returning();

  const flatGhosts = await db.insert(groupMembers).values([
    { groupId: flatDeposit.id, guestName: "Rohit",  role: "member" },
    { groupId: flatDeposit.id, guestName: "Priya",  role: "member" },  // pending
    { groupId: flatDeposit.id, guestName: "Suresh", role: "member" },  // pending
  ]).returning();

  // 2/4 contributed — bar fills by count ratio (50%)
  await db.insert(circleContributions).values([
    { groupId: flatDeposit.id, memberId: flatAdmin.id,       amount: "20000", currency: "INR", period: null, recordedBy: saiId },
    { groupId: flatDeposit.id, memberId: flatGhosts[0].id,   amount: "10000", currency: "INR", period: null, recordedBy: saiId },
  ]);
  console.log(`  ✓ ${flatDeposit.id} · 4 members · 2/4 contributed · ${fmt(30000)} total · no target`);

  // ════════════════════════════════════════════════════════════════════════════
  // 8. 🎮 Friday Game Night Fund — recurring, ANUPRIYA ADMIN, Jay UNPAID
  //    Tests: member recurring UNPAID state → "Pay ₹400 ↗" UPI button visible,
  //    return-from-UPI prompt, "Already paid elsewhere?" link
  // ════════════════════════════════════════════════════════════════════════════
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🎮  8. Friday Game Night Fund  (Anupriya admin · Jay UNPAID · ₹400/mo · UPI)");

  const [gameNight] = await db.insert(groups).values({
    name:               "Friday Game Night Fund 🎮",
    groupType:          "circle",
    defaultCurrency:    "INR",
    circleMode:         "recurring",
    contributionAmount: "400",
    contributionPeriod: "monthly",
    contributionDay:    10,
    circleStatus:       "active",
    upiId:              "anupriya.r@okicici",
    walletExpensesEnabled: true,
    createdBy:          anupriyaId,
  }).returning();

  const [gameAdmin] = await db.insert(groupMembers).values({
    groupId: gameNight.id, userId: anupriyaId, displayName: "Anu (Admin)", role: "admin",
  }).returning();

  // Jay inserted as member but NOT contributed → sees "Pay ₹400 ↗"
  await db.insert(groupMembers).values({
    groupId: gameNight.id, userId: saiId, displayName: "Jay", role: "member",
  });

  const gameGhosts = await db.insert(groupMembers).values([
    { groupId: gameNight.id, guestName: "Karthik", role: "member" },
    { groupId: gameNight.id, guestName: "Riya",    role: "member" },
    { groupId: gameNight.id, guestName: "Suresh",  role: "member" },
    { groupId: gameNight.id, guestName: "Prerna",  role: "member" },  // pending
    { groupId: gameNight.id, guestName: "Varun",   role: "member" },  // pending
  ]).returning();

  // Anupriya + Karthik + Riya + Suresh paid; Jay + Prerna + Varun pending
  await db.insert(circleContributions).values([
    { groupId: gameNight.id, memberId: gameAdmin.id,        amount: "400", currency: "INR", period: cur, recordedBy: anupriyaId },
    { groupId: gameNight.id, memberId: gameGhosts[0].id,    amount: "400", currency: "INR", period: cur, recordedBy: anupriyaId },
    { groupId: gameNight.id, memberId: gameGhosts[1].id,    amount: "400", currency: "INR", period: cur, recordedBy: anupriyaId },
    { groupId: gameNight.id, memberId: gameGhosts[2].id,    amount: "400", currency: "INR", period: cur, recordedBy: anupriyaId },
  ]);
  console.log(`  ✓ ${gameNight.id} · 7 members · Jay UNPAID → "Pay ₹400 ↗" UPI button`);

  // ════════════════════════════════════════════════════════════════════════════
  // 9. 🪴 Balcony Garden Fund — recurring, ANUPRIYA ADMIN, Jay PAID
  //    Tests: member recurring PAID state → "You're clear for [month]", no UPI
  //    (tests the no-UPI I've-paid path on member's own paid view)
  // ════════════════════════════════════════════════════════════════════════════
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🪴  9. Balcony Garden Fund  (Anupriya admin · Jay PAID · ₹250/mo · no UPI)");

  const [garden] = await db.insert(groups).values({
    name:               "Balcony Garden Fund 🪴",
    groupType:          "circle",
    defaultCurrency:    "INR",
    circleMode:         "recurring",
    contributionAmount: "250",
    contributionPeriod: "monthly",
    contributionDay:    1,
    circleStatus:       "active",
    walletExpensesEnabled: true,
    createdBy:          anupriyaId,
  }).returning();

  const [gardenAdmin] = await db.insert(groupMembers).values({
    groupId: garden.id, userId: anupriyaId, displayName: "Anu (Admin)", role: "admin",
  }).returning();

  const [gardenSai] = await db.insert(groupMembers).values({
    groupId: garden.id, userId: saiId, displayName: "Jay", role: "member",
  }).returning();

  const gardenGhosts = await db.insert(groupMembers).values([
    { groupId: garden.id, guestName: "Mira",   role: "member" },
    { groupId: garden.id, guestName: "Roshan", role: "member" },  // pending
    { groupId: garden.id, guestName: "Tanvi",  role: "member" },  // pending
  ]).returning();

  // Anupriya + Jay + Mira paid; Roshan + Tanvi pending
  await db.insert(circleContributions).values([
    { groupId: garden.id, memberId: gardenAdmin.id,       amount: "250", currency: "INR", period: cur, recordedBy: anupriyaId },
    { groupId: garden.id, memberId: gardenSai.id,         amount: "250", currency: "INR", period: cur, recordedBy: anupriyaId },
    { groupId: garden.id, memberId: gardenGhosts[0].id,   amount: "250", currency: "INR", period: cur, recordedBy: anupriyaId },
  ]);

  await db.insert(expenses).values({
    groupId: garden.id, paidByMemberId: gardenAdmin.id,
    description: "Seeds & soil mix", category: "shopping",
    amount: "450", currency: "INR", expenseDate: daysAgo(10),
    isAdvance: false, createdByUserId: anupriyaId,
  });
  console.log(`  ✓ ${garden.id} · 5 members · Jay PAID → "You're clear for [month]"`);

  // ════════════════════════════════════════════════════════════════════════════
  // 10. 🎁 Appa's 65th Birthday — one-time/fixed, ANUPRIYA ADMIN, Jay UNPAID
  //     Tests: member fixed UNPAID → "Pay ₹2,000 ↗" UPI button, return-from-UPI
  //     prompt, "Already paid elsewhere? Report it →" link, 70% collected
  // ════════════════════════════════════════════════════════════════════════════
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🎁  10. Appa's 65th Birthday  (Anupriya admin · Jay UNPAID · ₹2,000 Fixed · UPI)");

  const [appa] = await db.insert(groups).values({
    name:                "Appa's 65th Birthday 🎁",
    groupType:           "circle",
    defaultCurrency:     "INR",
    circleMode:          "one_time",
    contributionAmount:  "2000",
    targetAmount:        "20000",
    eventDate:           daysFromNow(40),
    circleStatus:        "active",
    contributionPrivacy: "public",
    upiId:               "anupriya.r@okicici",
    walletExpensesEnabled: true,
    createdBy:           anupriyaId,
  }).returning();

  const [appaAdmin] = await db.insert(groupMembers).values({
    groupId: appa.id, userId: anupriyaId, displayName: "Anu (Organiser)", role: "admin",
  }).returning();

  // Jay as member — NOT contributed
  await db.insert(groupMembers).values({
    groupId: appa.id, userId: saiId, displayName: "Jay", role: "member",
  });

  const appaGhosts = await db.insert(groupMembers).values([
    { groupId: appa.id, guestName: "Karthik",  role: "member" },
    { groupId: appa.id, guestName: "Riya",     role: "member" },
    { groupId: appa.id, guestName: "Suresh",   role: "member" },
    { groupId: appa.id, guestName: "Prerna",   role: "member" },
    { groupId: appa.id, guestName: "Varun",    role: "member" },
    { groupId: appa.id, guestName: "Deepa",    role: "member" },
    { groupId: appa.id, guestName: "Naveen",   role: "member" },  // pending
    { groupId: appa.id, guestName: "Sindhu",   role: "member" },  // pending
    { groupId: appa.id, guestName: "Mohan",    role: "member" },  // pending
  ]).returning();

  // 7/11 contributed (₹14,000 of ₹20,000 = 70%). Jay, Naveen, Sindhu, Mohan pending.
  await db.insert(circleContributions).values([
    { groupId: appa.id, memberId: appaAdmin.id,         amount: "2000", currency: "INR", period: null, recordedBy: anupriyaId },
    { groupId: appa.id, memberId: appaGhosts[0].id,     amount: "2000", currency: "INR", period: null, recordedBy: anupriyaId },
    { groupId: appa.id, memberId: appaGhosts[1].id,     amount: "2000", currency: "INR", period: null, recordedBy: anupriyaId },
    { groupId: appa.id, memberId: appaGhosts[2].id,     amount: "2000", currency: "INR", period: null, recordedBy: anupriyaId },
    { groupId: appa.id, memberId: appaGhosts[3].id,     amount: "2000", currency: "INR", period: null, recordedBy: anupriyaId },
    { groupId: appa.id, memberId: appaGhosts[4].id,     amount: "2000", currency: "INR", period: null, recordedBy: anupriyaId },
    { groupId: appa.id, memberId: appaGhosts[5].id,     amount: "2000", currency: "INR", period: null, recordedBy: anupriyaId },
  ]);
  console.log(`  ✓ ${appa.id} · 11 members · Jay UNPAID → "Pay ₹2,000 ↗" · ${fmt(14000)} / ${fmt(20000)}`);

  // ════════════════════════════════════════════════════════════════════════════
  // 11. 🌊 Coorg Trip Pool — one-time/fixed, ANUPRIYA ADMIN, Jay PAID
  //     Tests: member fixed PAID → "You've contributed ✓" state + "+ More" button,
  //     contribute-more flow, 6/8 collected (75%), no UPI
  // ════════════════════════════════════════════════════════════════════════════
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🌊  11. Coorg Trip Pool  (Anupriya admin · Jay PAID · ₹1,500 Fixed · no UPI)");

  const [coorg] = await db.insert(groups).values({
    name:                "Coorg Trip Pool 🌊",
    groupType:           "circle",
    defaultCurrency:     "INR",
    circleMode:          "one_time",
    contributionAmount:  "1500",
    targetAmount:        "12000",
    eventDate:           daysFromNow(10),
    circleStatus:        "active",
    contributionPrivacy: "public",
    walletExpensesEnabled: true,
    createdBy:           anupriyaId,
  }).returning();

  const [coorgAdmin] = await db.insert(groupMembers).values({
    groupId: coorg.id, userId: anupriyaId, displayName: "Anu (Organiser)", role: "admin",
  }).returning();

  const [coorgSai] = await db.insert(groupMembers).values({
    groupId: coorg.id, userId: saiId, displayName: "Jay", role: "member",
  }).returning();

  const coorgGhosts = await db.insert(groupMembers).values([
    { groupId: coorg.id, guestName: "Karthik", role: "member" },
    { groupId: coorg.id, guestName: "Riya",    role: "member" },
    { groupId: coorg.id, guestName: "Suresh",  role: "member" },
    { groupId: coorg.id, guestName: "Prerna",  role: "member" },
    { groupId: coorg.id, guestName: "Varun",   role: "member" },  // pending
    { groupId: coorg.id, guestName: "Deepa",   role: "member" },  // pending
  ]).returning();

  // Anupriya + Jay + Karthik + Riya + Suresh + Prerna = 6/8 paid (₹9,000 / ₹12,000)
  await db.insert(circleContributions).values([
    { groupId: coorg.id, memberId: coorgAdmin.id,        amount: "1500", currency: "INR", period: null, recordedBy: anupriyaId },
    { groupId: coorg.id, memberId: coorgSai.id,          amount: "1500", currency: "INR", period: null, recordedBy: anupriyaId },
    { groupId: coorg.id, memberId: coorgGhosts[0].id,    amount: "1500", currency: "INR", period: null, recordedBy: anupriyaId },
    { groupId: coorg.id, memberId: coorgGhosts[1].id,    amount: "1500", currency: "INR", period: null, recordedBy: anupriyaId },
    { groupId: coorg.id, memberId: coorgGhosts[2].id,    amount: "1500", currency: "INR", period: null, recordedBy: anupriyaId },
    { groupId: coorg.id, memberId: coorgGhosts[3].id,    amount: "1500", currency: "INR", period: null, recordedBy: anupriyaId },
  ]);
  console.log(`  ✓ ${coorg.id} · 8 members · Jay PAID → "You've contributed ✓" · ${fmt(9000)} / ${fmt(12000)}`);

  // ════════════════════════════════════════════════════════════════════════════
  // 12. 🎪 New Year Party Fund — one-time/flexi, ANUPRIYA ADMIN, Jay UNPAID
  //     Tests: member Flexi UNPAID → amount input + "Pay via UPI ↗" dynamic button
  //     (disabled until amount typed), large group (16 members), admin_only privacy
  //     (Sai sees count-only, Anupriya sees full ₹ totals)
  // ════════════════════════════════════════════════════════════════════════════
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🎪  12. New Year Party Fund  (Anupriya admin · Jay UNPAID · Flexi · 16 members · admin_only)");

  const [newYear] = await db.insert(groups).values({
    name:                "New Year 2027 Party Fund 🎪",
    groupType:           "circle",
    defaultCurrency:     "INR",
    circleMode:          "one_time",
    contributionAmount:  null,     // Flexi
    targetAmount:        "30000",
    eventDate:           daysFromNow(45),
    circleStatus:        "active",
    contributionPrivacy: "admin_only",  // amounts hidden from Sai
    upiId:               "anupriya.r@okicici",
    walletExpensesEnabled: true,
    createdBy:           anupriyaId,
  }).returning();

  const [newYearAdmin] = await db.insert(groupMembers).values({
    groupId: newYear.id, userId: anupriyaId, displayName: "Anu (Organiser)", role: "admin",
  }).returning();

  // Jay as member — NOT contributed
  await db.insert(groupMembers).values({
    groupId: newYear.id, userId: saiId, displayName: "Jay", role: "member",
  });

  const newYearGhosts = await db.insert(groupMembers).values([
    { groupId: newYear.id, guestName: "Karthik",  role: "member" },
    { groupId: newYear.id, guestName: "Riya",     role: "member" },
    { groupId: newYear.id, guestName: "Suresh",   role: "member" },
    { groupId: newYear.id, guestName: "Prerna",   role: "member" },
    { groupId: newYear.id, guestName: "Varun",    role: "member" },
    { groupId: newYear.id, guestName: "Deepa",    role: "member" },
    { groupId: newYear.id, guestName: "Naveen",   role: "member" },
    { groupId: newYear.id, guestName: "Sindhu",   role: "member" },
    { groupId: newYear.id, guestName: "Mohan",    role: "member" },
    { groupId: newYear.id, guestName: "Kavya",    role: "member" },
    { groupId: newYear.id, guestName: "Ajith",    role: "member" },
    { groupId: newYear.id, guestName: "Tanya",    role: "member" },
    { groupId: newYear.id, guestName: "Roshan",   role: "member" },
    { groupId: newYear.id, guestName: "Priya",    role: "member" },
  ]).returning();

  // 5/16 contributed with varying amounts (₹16,000). Jay is NOT among them.
  await db.insert(circleContributions).values([
    { groupId: newYear.id, memberId: newYearAdmin.id,         amount: "3000", currency: "INR", period: null, recordedBy: anupriyaId },
    { groupId: newYear.id, memberId: newYearGhosts[0].id,     amount: "5000", currency: "INR", period: null, recordedBy: anupriyaId },
    { groupId: newYear.id, memberId: newYearGhosts[1].id,     amount: "2500", currency: "INR", period: null, recordedBy: anupriyaId },
    { groupId: newYear.id, memberId: newYearGhosts[2].id,     amount: "4000", currency: "INR", period: null, recordedBy: anupriyaId },
    { groupId: newYear.id, memberId: newYearGhosts[3].id,     amount: "1500", currency: "INR", period: null, recordedBy: anupriyaId },
  ]);
  console.log(`  ✓ ${newYear.id} · 16 members · Jay UNPAID → Flexi UPI button · ${fmt(16000)} / ${fmt(30000)}`);

  // ── Summary ───────────────────────────────────────────────────────────────
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  console.log(`\n${"═".repeat(62)}`);
  console.log(`✅  12 circles seeded\n`);

  console.log(`📋  SAI IS ADMIN:`);
  console.log(`\n   🏏  Cricket Club Circle      recurring · 5/8 paid · wallet + advance`);
  console.log(`       ${base}/groups/${cricket.id}`);
  console.log(`\n   ☕  Office Coffee Pool        recurring · ALL paid · wallet balance`);
  console.log(`       ${base}/groups/${coffee.id}`);
  console.log(`\n   🎀  Kavya's Baby Shower       fixed · collecting · batch confirm banner`);
  console.log(`       ${base}/groups/${babyShower.id}`);
  console.log(`\n   💍  Sreeja & Vikram Gift      fixed · purchased · 🎯 celebration · surplus`);
  console.log(`       ${base}/groups/${wedding.id}`);
  console.log(`\n   ✅  Farewell — Pradeep        fixed · complete · all settled`);
  console.log(`       ${base}/groups/${pradeep.id}`);
  console.log(`\n   🌍  Europe Backpacking Fund   flexi · soft target · individual amounts`);
  console.log(`       ${base}/groups/${europe.id}`);
  console.log(`\n   🏠  Flat Deposit Pool         flexi · no target · savings-only`);
  console.log(`       ${base}/groups/${flatDeposit.id}`);

  console.log(`\n📋  ANUPRIYA IS ADMIN, SAI IS MEMBER:`);
  console.log(`\n   🎮  Friday Game Night Fund    recurring · Jay UNPAID → "Pay ₹400 ↗"`);
  console.log(`       ${base}/groups/${gameNight.id}`);
  console.log(`\n   🪴  Balcony Garden Fund       recurring · Jay PAID → "You're clear for [month]"`);
  console.log(`       ${base}/groups/${garden.id}`);
  console.log(`\n   🎁  Appa's 65th Birthday      fixed · Jay UNPAID → "Pay ₹2,000 ↗" UPI`);
  console.log(`       ${base}/groups/${appa.id}`);
  console.log(`\n   🌊  Coorg Trip Pool           fixed · Jay PAID → "You've contributed" + More`);
  console.log(`       ${base}/groups/${coorg.id}`);
  console.log(`\n   🎪  New Year Party Fund       flexi · Jay UNPAID → dynamic UPI · 16 members`);
  console.log(`       ${base}/groups/${newYear.id}`);

  console.log(`\n   Home → Circles section:`);
  console.log(`       ${base}/groups`);
  console.log(`${"═".repeat(62)}\n`);

  process.exit(0);
}

main().catch((e) => {
  console.error("❌  Circle seed failed:", e);
  process.exit(1);
});
