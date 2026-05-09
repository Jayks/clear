/**
 * Seed script — creates a 10-day Goa trip with 10 members and 30 expenses.
 * Usage: pnpm seed
 *
 * Requires at least one trip already in the DB (to discover the user's ID).
 */
import { db } from "../lib/db/client";
import { groups as trips } from "../lib/db/schema/groups";
import { groupMembers as tripMembers } from "../lib/db/schema/group-members";
import { expenses } from "../lib/db/schema/expenses";
import type { NewExpense } from "../lib/db/schema/expenses";
import { expenseSplits } from "../lib/db/schema/expense-splits";
import type { NewExpenseSplit } from "../lib/db/schema/expense-splits";
import { createAdminClient } from "../lib/supabase/admin";
import { computeSplits } from "../lib/splits/compute";
import type { SplitMode, SplitInput } from "../lib/splits/compute";
import { eq } from "drizzle-orm";

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
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
  console.log("\n🌱 Clear test seed — Goa Summer 2025\n");

  // Discover user ID from existing trips
  const existingTrips = await db.select().from(trips).limit(1);
  if (existingTrips.length === 0) {
    console.error("❌  No existing trips found. Log in and create one trip via the UI first.");
    process.exit(1);
  }
  const userId = existingTrips[0].createdBy;
  console.log(`👤  User ID: ${userId}`);

  const admin = createAdminClient();
  const { data: userData } = await admin.auth.admin.getUserById(userId);
  const userDisplayName: string = userData?.user?.user_metadata?.full_name ?? "You";
  console.log(`👤  Display name: ${userDisplayName}\n`);

  // ── Create trip ────────────────────────────────────────────────────────────
  const [trip] = await db.insert(trips).values({
    name: "Goa Summer 2025",
    description: "10 days of sun, sand, and good company. The whole crew, one trip.",
    defaultCurrency: "INR",
    startDate: "2025-05-15",
    endDate: "2025-05-24",
    createdBy: userId,
  }).returning();
  console.log(`✅  Trip: "${trip.name}" (${trip.id})`);

  // ── Create members ─────────────────────────────────────────────────────────
  const [me] = await db.insert(tripMembers).values({
    groupId: trip.id,
    userId,
    displayName: userDisplayName,
    role: "admin",
  }).returning();

  const guestNames = ["Meera", "Raj", "Priya", "Arjun", "Kavitha", "Suresh", "Deepa", "Karthik", "Anita"];
  const guests = await db.insert(tripMembers).values(
    guestNames.map((name) => ({ groupId: trip.id, guestName: name, role: "member" as const }))
  ).returning();

  const [meera, raj, priya, arjun, kavitha, suresh, deepa, karthik, anita] = guests;
  const all = [me, meera, raj, priya, arjun, kavitha, suresh, deepa, karthik, anita];
  const allIds = all.map((m) => m.id);
  console.log(`✅  ${all.length} members added (1 admin + 9 guests)\n`);

  // ── Expense factory helpers ────────────────────────────────────────────────
  const eqAll = allIds.map((id) => ({ memberId: id }));
  const eq5 = (ids: string[]) => ids.map((id) => ({ memberId: id }));

  let count = 0;

  async function add(
    date: string, description: string, category: NewExpense["category"],
    amount: number, paidBy: string, splitMode: NewExpenseSplit["splitType"], splitInputs: SplitInput[]
  ) {
    await insertExpense({
      groupId: trip.id, paidByMemberId: paidBy, description, category,
      amount, currency: "INR", expenseDate: date, splitMode,
      splits: splitInputs, createdByUserId: userId,
    });
    count++;
    const modeTag = `[${splitMode.padEnd(10)}]`;
    console.log(`  ${String(count).padStart(2, "0")}. ${modeTag} ${description.padEnd(38)} ${fmt(amount)}`);
  }

  console.log("📝  Adding 30 expenses...\n");
  console.log(`     ${"Mode".padEnd(12)} ${"Description".padEnd(38)} Amount`);
  console.log(`     ${"-".repeat(62)}`);

  // ── Day 1: May 15 — Arrival ────────────────────────────────────────────────
  await add("2025-05-15", "Hotel Estrela do Mar (10 nights)", "accommodation", 95000,
    me.id, "equal", eqAll);

  await add("2025-05-15", "Airport cab (x2 vehicles)", "transport", 3600,
    raj.id, "equal", eqAll);

  // Shares: couples share a room → 2x share; solo travellers → 1x
  await add("2025-05-15", "Welcome dinner at Fisherman's Wharf", "food", 9600,
    meera.id, "shares", [
      { memberId: me.id, value: 2 }, { memberId: meera.id, value: 2 },
      { memberId: raj.id, value: 1 }, { memberId: priya.id, value: 1 },
      { memberId: arjun.id, value: 1 }, { memberId: kavitha.id, value: 1 },
      { memberId: suresh.id, value: 1 }, { memberId: deepa.id, value: 1 },
      { memberId: karthik.id, value: 1 }, { memberId: anita.id, value: 1 },
    ]);

  // ── Day 2: May 16 — Beach day ──────────────────────────────────────────────
  await add("2025-05-16", "Breakfast at Baga beach shack", "food", 2200,
    priya.id, "equal", eqAll);

  // Exact: 6 people did water sports, 4 didn't
  await add("2025-05-16", "Water sports package", "activities", 9000,
    arjun.id, "exact", [
      { memberId: me.id, value: 1500 }, { memberId: arjun.id, value: 1500 },
      { memberId: raj.id, value: 1500 }, { memberId: meera.id, value: 1500 },
      { memberId: priya.id, value: 1500 }, { memberId: kavitha.id, value: 1500 },
    ]);

  await add("2025-05-16", "Beer and snacks on the beach", "food", 3600,
    me.id, "equal", eqAll);

  // ── Day 3: May 17 — Sightseeing ───────────────────────────────────────────
  await add("2025-05-17", "Old Goa churches guided tour", "sightseeing", 2400,
    kavitha.id, "equal", eqAll);

  // Percentage: heavier eaters ordered more
  await add("2025-05-17", "Lunch at Viva Panjim", "food", 8000,
    suresh.id, "percentage", [
      { memberId: me.id, value: 12 }, { memberId: meera.id, value: 12 },
      { memberId: raj.id, value: 15 }, { memberId: priya.id, value: 8 },
      { memberId: arjun.id, value: 15 }, { memberId: kavitha.id, value: 8 },
      { memberId: suresh.id, value: 10 }, { memberId: deepa.id, value: 8 },
      { memberId: karthik.id, value: 7 }, { memberId: anita.id, value: 5 },
    ]);

  await add("2025-05-17", "Sahakari Spice Farm visit", "sightseeing", 3500,
    deepa.id, "equal", eqAll);

  // ── Day 4: May 18 — Sunset cruise ─────────────────────────────────────────
  await add("2025-05-18", "Sunset dolphin cruise", "activities", 22000,
    karthik.id, "equal", eqAll);

  // Exact: different drinks orders at the bar
  await add("2025-05-18", "Cocktails at Tito's Bar", "food", 7800,
    anita.id, "exact", [
      { memberId: me.id, value: 1200 }, { memberId: meera.id, value: 800 },
      { memberId: raj.id, value: 1000 }, { memberId: priya.id, value: 600 },
      { memberId: arjun.id, value: 1000 }, { memberId: kavitha.id, value: 400 },
      { memberId: suresh.id, value: 800 }, { memberId: deepa.id, value: 600 },
      { memberId: karthik.id, value: 800 }, { memberId: anita.id, value: 600 },
    ]);

  await add("2025-05-18", "Late night street food", "food", 1500,
    me.id, "equal", eqAll);

  // ── Day 5: May 19 — Scooter day ───────────────────────────────────────────
  // Shares: 5 scooters, some solo some pillion
  await add("2025-05-19", "Scooter rentals (5 bikes, full day)", "transport", 5000,
    raj.id, "shares", [
      { memberId: me.id, value: 2 }, { memberId: meera.id, value: 2 },
      { memberId: raj.id, value: 2 }, { memberId: priya.id, value: 2 },
      { memberId: arjun.id, value: 2 }, { memberId: kavitha.id, value: 1 },
      { memberId: suresh.id, value: 1 }, { memberId: deepa.id, value: 1 },
      { memberId: karthik.id, value: 2 }, { memberId: anita.id, value: 1 },
    ]);

  await add("2025-05-19", "Petrol for all scooters", "transport", 1200,
    meera.id, "equal", eqAll);

  await add("2025-05-19", "Supermarket grocery run", "groceries", 6400,
    priya.id, "equal", eqAll);

  // ── Day 6: May 20 — Dudhsagar ─────────────────────────────────────────────
  await add("2025-05-20", "Dudhsagar falls jeep safari", "activities", 18000,
    arjun.id, "equal", eqAll);

  await add("2025-05-20", "Packed lunch & snacks (jungle)", "food", 3200,
    kavitha.id, "equal", eqAll);

  // Percentage: different shopping amounts at flea market
  await add("2025-05-20", "Anjuna flea market haul", "shopping", 14000,
    suresh.id, "percentage", [
      { memberId: me.id, value: 5 }, { memberId: meera.id, value: 20 },
      { memberId: raj.id, value: 5 }, { memberId: priya.id, value: 15 },
      { memberId: arjun.id, value: 5 }, { memberId: kavitha.id, value: 20 },
      { memberId: suresh.id, value: 10 }, { memberId: deepa.id, value: 5 },
      { memberId: karthik.id, value: 5 }, { memberId: anita.id, value: 10 },
    ]);

  // ── Day 7: May 21 — South Goa ─────────────────────────────────────────────
  await add("2025-05-21", "Cab to South Goa beaches", "transport", 4800,
    deepa.id, "equal", eqAll);

  await add("2025-05-21", "Lunch at Palolem beach shack", "food", 5500,
    karthik.id, "equal", eqAll);

  // Exact: only 7 went to the club
  await add("2025-05-21", "Club Cubana entry + drinks", "activities", 10500,
    anita.id, "exact", [
      { memberId: me.id, value: 1500 }, { memberId: meera.id, value: 1500 },
      { memberId: raj.id, value: 1500 }, { memberId: arjun.id, value: 1500 },
      { memberId: suresh.id, value: 1500 }, { memberId: karthik.id, value: 1500 },
      { memberId: anita.id, value: 1500 },
    ]);

  // ── Day 8: May 22 — Wellness day ──────────────────────────────────────────
  // Only 6 did yoga
  await add("2025-05-22", "Sunrise yoga class (6 people)", "activities", 3000,
    me.id, "equal", eq5([me.id, meera.id, priya.id, kavitha.id, deepa.id, anita.id]));

  await add("2025-05-22", "Organic breakfast at Artjuna", "food", 4200,
    raj.id, "equal", eqAll);

  // Percentage: different shopping budgets
  await add("2025-05-22", "Souvenir shopping (Mapusa market)", "shopping", 9000,
    priya.id, "percentage", [
      { memberId: me.id, value: 10 }, { memberId: meera.id, value: 15 },
      { memberId: raj.id, value: 5 }, { memberId: priya.id, value: 20 },
      { memberId: arjun.id, value: 5 }, { memberId: kavitha.id, value: 15 },
      { memberId: suresh.id, value: 5 }, { memberId: deepa.id, value: 10 },
      { memberId: karthik.id, value: 5 }, { memberId: anita.id, value: 10 },
    ]);

  // ── Day 9: May 23 — Adventure + farewell ──────────────────────────────────
  // Shares: some did parasailing twice
  await add("2025-05-23", "Parasailing at Calangute", "activities", 18000,
    arjun.id, "shares", [
      { memberId: me.id, value: 2 }, { memberId: meera.id, value: 1 },
      { memberId: raj.id, value: 2 }, { memberId: priya.id, value: 1 },
      { memberId: arjun.id, value: 2 }, { memberId: kavitha.id, value: 1 },
      { memberId: suresh.id, value: 2 }, { memberId: deepa.id, value: 1 },
      { memberId: karthik.id, value: 2 }, { memberId: anita.id, value: 1 },
    ]);

  // Exact: set menu vs à la carte
  await add("2025-05-23", "Farewell dinner at A Reverie", "food", 16000,
    kavitha.id, "exact", [
      { memberId: me.id, value: 2000 }, { memberId: meera.id, value: 1500 },
      { memberId: raj.id, value: 1800 }, { memberId: priya.id, value: 1500 },
      { memberId: arjun.id, value: 2000 }, { memberId: kavitha.id, value: 1500 },
      { memberId: suresh.id, value: 1500 }, { memberId: deepa.id, value: 1500 },
      { memberId: karthik.id, value: 1200 }, { memberId: anita.id, value: 1500 },
    ]);

  await add("2025-05-23", "Auto-rickshaw rides (last evening)", "transport", 800,
    suresh.id, "equal", eqAll);

  // ── Day 10: May 24 — Checkout ─────────────────────────────────────────────
  await add("2025-05-24", "Checkout breakfast", "food", 2800,
    deepa.id, "equal", eqAll);

  await add("2025-05-24", "Airport drop (x2 cabs)", "transport", 4000,
    karthik.id, "equal", eqAll);

  await add("2025-05-24", "Airport lounge + last bites", "food", 5600,
    anita.id, "equal", eqAll);

  // ── Summary ────────────────────────────────────────────────────────────────
  const allExpenses = await db.select().from(expenses).where(eq(expenses.groupId, trip.id));
  const total = allExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const allSplits = await db.select().from(expenseSplits)
    .where(eq(expenseSplits.expenseId, allExpenses[0]?.id ?? ""));

  console.log(`\n${"─".repeat(62)}`);
  console.log(`✅  ${count} expenses created`);
  console.log(`💰  Total trip spend: ${fmt(total)} (${fmt(Math.round(total / 10))} per person)`);
  console.log(`\n🔗  Open your trip: http://localhost:3000/groups/${trip.id}`);
  console.log(`📊  Settle page:    http://localhost:3000/groups/${trip.id}/settle\n`);

  process.exit(0);
}

main().catch((e) => { console.error("❌ Seed failed:", e); process.exit(1); });
