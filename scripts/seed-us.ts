/**
 * Seed script — creates a US-based Trip (Pacific Coast Road Trip) and a
 * US household Nest (Brooklyn Apartment), each with 5 members and 10 expenses in USD.
 *
 * Usage: pnpm seed:us
 *
 * Requires at least one group already in the DB (to discover the user's ID).
 */
import { db } from "../lib/db/client";
import { groups } from "../lib/db/schema/groups";
import { groupMembers } from "../lib/db/schema/group-members";
import { expenses } from "../lib/db/schema/expenses";
import type { NewExpense } from "../lib/db/schema/expenses";
import { expenseSplits } from "../lib/db/schema/expense-splits";
import type { NewExpenseSplit } from "../lib/db/schema/expense-splits";
import { computeSplits } from "../lib/splits/compute";
import type { SplitInput } from "../lib/splits/compute";
import { eq as drizzleEq } from "drizzle-orm";

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

async function insertExpense(params: {
  groupId: string;
  paidByMemberId: string;
  description: string;
  category: NewExpense["category"];
  amount: number;
  currency: string;
  expenseDate: string;
  splitMode: NewExpenseSplit["splitType"];
  splits: SplitInput[];
  createdByUserId: string;
}) {
  const result = computeSplits(params.splitMode, params.amount, params.splits);
  if (!result.ok) throw new Error(`Split failed for "${params.description}": ${result.error}`);

  const [expense] = await db.insert(expenses).values({
    groupId: params.groupId,
    paidByMemberId: params.paidByMemberId,
    description: params.description,
    category: params.category,
    amount: String(params.amount),
    currency: params.currency,
    expenseDate: params.expenseDate,
    createdByUserId: params.createdByUserId,
  }).returning();

  await db.insert(expenseSplits).values(
    result.splits.map((s) => ({
      expenseId: expense.id,
      memberId: s.memberId,
      shareAmount: String(s.shareAmount),
      splitType: params.splitMode,
      splitValue: s.splitValue != null ? String(s.splitValue) : null,
    }))
  );

  return expense;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n🌱 Clear US seed — Pacific Coast Road Trip + Brooklyn Apartment\n");

  // Hardcoded to the project owner — avoids Supabase Admin API timeout in script context.
  const userId = "1e4c7866-a63d-4070-bb3b-790631efb844";
  const userDisplayName = "Jayakumar Sekar";
  console.log(`👤  Display name: ${userDisplayName}\n`);

  // ════════════════════════════════════════════════════════════════════════════
  // PART 1 — TRIP: Pacific Coast Road Trip · June 2025
  // ════════════════════════════════════════════════════════════════════════════

  console.log("═".repeat(62));
  console.log("🚗  TRIP — Pacific Coast Road Trip · June 2025");
  console.log("═".repeat(62) + "\n");

  const [trip] = await db.insert(groups).values({
    name: "Pacific Coast Road Trip · June 2025",
    description: "5 days along Hwy 1 from LA to SF — beaches, Yosemite day trip, Napa wines, and way too many In-N-Out stops.",
    groupType: "trip",
    defaultCurrency: "USD",
    startDate: "2025-06-10",
    endDate: "2025-06-14",
    createdBy: userId,
  }).returning();
  console.log(`✅  Trip: "${trip.name}" (${trip.id})\n`);

  // Members
  const [tripMe] = await db.insert(groupMembers).values({
    groupId: trip.id,
    userId,
    displayName: userDisplayName,
    role: "admin",
  }).returning();

  const tripGuestNames = ["Dylan", "Lily", "Josh", "Emma"];
  const tripGuests = await db.insert(groupMembers).values(
    tripGuestNames.map((name) => ({ groupId: trip.id, guestName: name, role: "member" as const }))
  ).returning();

  const [dylan, lily, josh, emma] = tripGuests;
  const tripAll = [tripMe, dylan, lily, josh, emma];
  const tripAllIds = tripAll.map((m) => m.id);
  console.log(`✅  5 members: ${userDisplayName}, Dylan, Lily, Josh, Emma\n`);

  const eqAll5Trip = tripAllIds.map((id) => ({ memberId: id }));

  let tripCount = 0;

  async function addTrip(
    date: string,
    description: string,
    category: NewExpense["category"],
    amount: number,
    paidBy: string,
    splitMode: NewExpenseSplit["splitType"],
    splitInputs: SplitInput[]
  ) {
    await insertExpense({
      groupId: trip.id, paidByMemberId: paidBy, description, category,
      amount, currency: "USD", expenseDate: date, splitMode,
      splits: splitInputs, createdByUserId: userId,
    });
    tripCount++;
    const modeTag = `[${splitMode.padEnd(10)}]`;
    console.log(`  ${String(tripCount).padStart(2, "0")}. ${modeTag} ${description.padEnd(40)} ${fmt(amount)}`);
  }

  console.log("📝  Adding 10 trip expenses...\n");
  console.log(`     ${"Mode".padEnd(12)} ${"Description".padEnd(40)} Amount`);
  console.log(`     ${"-".repeat(66)}`);

  // Day 1 — Jun 10: LA arrival
  await addTrip("2025-06-10", "Malibu Beach Inn (2 nights)", "accommodation", 520.00,
    tripMe.id, "equal", eqAll5Trip);

  await addTrip("2025-06-10", "LAX long-term parking (5 days)", "transport", 90.00,
    dylan.id, "equal", eqAll5Trip);

  await addTrip("2025-06-10", "In-N-Out Burger run", "food", 42.50,
    lily.id, "equal", eqAll5Trip);

  // Day 2 — Jun 11: Yosemite day trip (4 of 5 went; $35/person)
  await addTrip("2025-06-11", "Yosemite day passes (4 people)", "activities", 140.00,
    josh.id, "exact", [
      { memberId: tripMe.id, value: 35 },
      { memberId: dylan.id, value: 35 },
      { memberId: lily.id, value: 35 },
      { memberId: josh.id, value: 35 },
      // Emma stayed behind — not included
    ]);

  // Day 3 — Jun 12: SF arrival
  await addTrip("2025-06-12", "Gas — LA to SF via Hwy 1", "transport", 85.00,
    emma.id, "equal", eqAll5Trip);

  await addTrip("2025-06-12", "Airbnb San Francisco (2 nights)", "accommodation", 380.00,
    tripMe.id, "equal", eqAll5Trip);

  // Day 4 — Jun 13: SF sightseeing
  await addTrip("2025-06-13", "Golden Gate Bridge bike rental", "activities", 120.00,
    dylan.id, "equal", eqAll5Trip);

  await addTrip("2025-06-13", "Fisherman's Wharf seafood dinner", "food", 215.00,
    lily.id, "shares", [
      { memberId: tripMe.id, value: 2 },
      { memberId: dylan.id, value: 2 },
      { memberId: lily.id, value: 2 },
      { memberId: josh.id, value: 1 }, // lighter eater
      { memberId: emma.id, value: 1 }, // lighter eater
    ]);

  // Day 5 — Jun 14: Napa + departure
  await addTrip("2025-06-14", "Napa Valley wine tasting", "activities", 180.00,
    josh.id, "exact", [
      { memberId: tripMe.id, value: 45 },  // premium tasting
      { memberId: dylan.id, value: 45 },   // premium tasting
      { memberId: lily.id, value: 45 },    // premium tasting
      { memberId: emma.id, value: 25 },    // basic flight
      { memberId: josh.id, value: 20 },    // designated driver — just cheese board
    ]);

  await addTrip("2025-06-14", "Souvenir shopping — Pier 39", "shopping", 95.00,
    emma.id, "percentage", [
      { memberId: tripMe.id, value: 30 },
      { memberId: dylan.id, value: 25 },
      { memberId: lily.id, value: 20 },
      { memberId: josh.id, value: 15 },
      { memberId: emma.id, value: 10 },
    ]);

  const allTripExpenses = await db.select().from(expenses).where(drizzleEq(expenses.groupId, trip.id));
  const tripTotal = allTripExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

  console.log(`\n${"─".repeat(66)}`);
  console.log(`✅  ${tripCount} expenses created`);
  console.log(`💰  Total trip spend: ${fmt(tripTotal)} (${fmt(tripTotal / 5)} per person)`);
  console.log(`🔗  http://localhost:3000/groups/${trip.id}\n`);

  // ════════════════════════════════════════════════════════════════════════════
  // PART 2 — NEST: Maple Street Apartment · Brooklyn
  // ════════════════════════════════════════════════════════════════════════════

  console.log("═".repeat(62));
  console.log("🏠  NEST — Maple Street Apartment · Brooklyn");
  console.log("═".repeat(62) + "\n");

  const [nest] = await db.insert(groups).values({
    name: "Maple Street Apartment · Brooklyn",
    description: "Five roommates, one apartment in Park Slope. Splitting rent, utilities, and all the little things that add up.",
    groupType: "nest",
    defaultCurrency: "USD",
    createdBy: userId,
  }).returning();
  console.log(`✅  Nest: "${nest.name}" (${nest.id})\n`);

  // Members
  const [nestMe] = await db.insert(groupMembers).values({
    groupId: nest.id,
    userId,
    displayName: userDisplayName,
    role: "admin",
  }).returning();

  const nestGuestNames = ["Casey", "Drew", "Morgan", "Avery"];
  const nestGuests = await db.insert(groupMembers).values(
    nestGuestNames.map((name) => ({ groupId: nest.id, guestName: name, role: "member" as const }))
  ).returning();

  const [casey, drew, morgan, avery] = nestGuests;
  const nestAll = [nestMe, casey, drew, morgan, avery];
  const nestAllIds = nestAll.map((m) => m.id);
  console.log(`✅  5 members: ${userDisplayName}, Casey, Drew, Morgan, Avery\n`);

  const eqAll5Nest = nestAllIds.map((id) => ({ memberId: id }));

  let nestCount = 0;

  async function addNest(
    date: string,
    description: string,
    category: NewExpense["category"],
    amount: number,
    paidBy: string,
    splitMode: NewExpenseSplit["splitType"],
    splitInputs: SplitInput[]
  ) {
    await insertExpense({
      groupId: nest.id, paidByMemberId: paidBy, description, category,
      amount, currency: "USD", expenseDate: date, splitMode,
      splits: splitInputs, createdByUserId: userId,
    });
    nestCount++;
    const modeTag = `[${splitMode.padEnd(10)}]`;
    console.log(`  ${String(nestCount).padStart(2, "0")}. ${modeTag} ${description.padEnd(40)} ${fmt(amount)}`);
  }

  console.log("📝  Adding 10 nest expenses...\n");
  console.log(`     ${"Mode".padEnd(12)} ${"Description".padEnd(40)} Amount`);
  console.log(`     ${"-".repeat(66)}`);

  // May 2025 recurring bills
  await addNest("2025-05-01", "May rent — Park Slope apt", "rent", 4200.00,
    casey.id, "equal", eqAll5Nest);

  await addNest("2025-05-05", "ConEd electricity — May", "utilities", 145.00,
    drew.id, "equal", eqAll5Nest);

  await addNest("2025-05-05", "Verizon internet — May", "utilities", 89.00,
    morgan.id, "equal", eqAll5Nest);

  await addNest("2025-05-08", "Costco grocery haul", "groceries", 230.00,
    avery.id, "shares", [
      { memberId: nestMe.id, value: 2 },
      { memberId: casey.id, value: 2 },
      { memberId: drew.id, value: 2 },
      { memberId: morgan.id, value: 1 }, // travels a lot, eats less at home
      { memberId: avery.id, value: 2 },
    ]);

  await addNest("2025-05-14", "Netflix + Hulu + Spotify (family)", "subscriptions", 54.00,
    nestMe.id, "equal", eqAll5Nest);

  // Mid-month one-offs
  await addNest("2025-05-17", "Plumber — bathroom faucet", "maintenance", 180.00,
    casey.id, "equal", eqAll5Nest);

  await addNest("2025-05-19", "Pizza + wings night in", "food", 62.00,
    drew.id, "exact", [
      { memberId: nestMe.id, value: 18 },  // large pizza + wings
      { memberId: casey.id, value: 14 },
      { memberId: drew.id, value: 12 },
      { memberId: morgan.id, value: 10 },  // just pizza slice
      { memberId: avery.id, value: 8 },    // wasn't that hungry
    ]);

  await addNest("2025-05-21", "Cleaning supplies + paper goods", "supplies", 48.00,
    morgan.id, "equal", eqAll5Nest);

  // June bills
  await addNest("2025-06-01", "June rent — Park Slope apt", "rent", 4200.00,
    avery.id, "equal", eqAll5Nest);

  await addNest("2025-06-05", "Gas & water — June", "utilities", 110.00,
    nestMe.id, "equal", eqAll5Nest);

  const allNestExpenses = await db.select().from(expenses).where(drizzleEq(expenses.groupId, nest.id));
  const nestTotal = allNestExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

  console.log(`\n${"─".repeat(66)}`);
  console.log(`✅  ${nestCount} expenses created`);
  console.log(`💰  Total nest spend: ${fmt(nestTotal)} (${fmt(nestTotal / 5)} per person)`);
  console.log(`🔗  http://localhost:3000/groups/${nest.id}\n`);

  // ── Final summary ──────────────────────────────────────────────────────────

  console.log("═".repeat(62));
  console.log("✅  US seed complete!");
  console.log(`   🚗  Trip: http://localhost:3000/groups/${trip.id}`);
  console.log(`   📊  Trip settle: http://localhost:3000/groups/${trip.id}/settle`);
  console.log(`   🏠  Nest: http://localhost:3000/groups/${nest.id}`);
  console.log(`   📊  Nest settle: http://localhost:3000/groups/${nest.id}/settle`);
  console.log("═".repeat(62) + "\n");

  process.exit(0);
}

main().catch((e) => { console.error("❌  Seed failed:", e); process.exit(1); });
