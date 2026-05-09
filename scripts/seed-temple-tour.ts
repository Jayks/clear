/**
 * Seed script — South India Temple Circuit 2026
 * 20 members, 5 days, 25 expenses, 6 payers, all equal splits.
 *
 * Usage: pnpm seed:temple
 *
 * The authenticated user (saijayakumar@gmail.com) is inserted as trip admin.
 */
import { db } from "../lib/db/client";
import { groups as trips } from "../lib/db/schema/groups";
import { groupMembers as tripMembers } from "../lib/db/schema/group-members";
import { expenses } from "../lib/db/schema/expenses";
import type { NewExpense } from "../lib/db/schema/expenses";
import { expenseSplits } from "../lib/db/schema/expense-splits";
import { createAdminClient } from "../lib/supabase/admin";
import { computeSplits } from "../lib/splits/compute";
import { eq } from "drizzle-orm";

const ADMIN_EMAIL = "saijayakumar@gmail.com";

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
  allMemberIds: string[];
  createdByUserId: string;
}) {
  const splits = params.allMemberIds.map((id) => ({ memberId: id }));
  const result = computeSplits("equal", params.amount, splits);
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
      splitType: "equal" as const,
      splitValue: null,
    }))
  );

  return expense;
}

async function main() {
  console.log("\n🛕  Clear seed — South India Temple Circuit 2026\n");

  // ── Find admin user by email ──────────────────────────────────────────────
  const supabaseAdmin = createAdminClient();
  const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;

  const adminUser = users.find((u) => u.email === ADMIN_EMAIL);
  if (!adminUser) {
    console.error(`❌  User "${ADMIN_EMAIL}" not found. Make sure they have logged in at least once.`);
    process.exit(1);
  }
  const userId = adminUser.id;
  const userDisplayName: string = adminUser.user_metadata?.full_name ?? "Sai";
  console.log(`👤  Admin: ${userDisplayName} (${userId})\n`);

  // ── Create trip ────────────────────────────────────────────────────────────
  const [trip] = await db.insert(trips).values({
    name: "South India Temple Circuit 2026",
    description: "A 5-day spiritual journey through the sacred temples of Tamil Nadu — Mahabalipuram, Kanchipuram, Tirupati, and Madurai.",
    defaultCurrency: "INR",
    startDate: "2026-01-10",
    endDate: "2026-01-14",
    budget: "500000",
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

  // 6 payers (including me): Ramesh, Lakshmi, Venkat, Padma, Murali
  // 14 non-payers: Geetha, Shankar, Radha, Balu, Kamala, Selvam, Meenakshi,
  //                Rajan, Sumathi, Dinesh, Saroja, Krishnan, Vimala, Gopal
  const guestNames = [
    "Ramesh", "Lakshmi", "Venkat", "Padma", "Murali",
    "Geetha", "Shankar", "Radha", "Balu", "Kamala",
    "Selvam", "Meenakshi", "Rajan", "Sumathi", "Dinesh",
    "Saroja", "Krishnan", "Vimala", "Gopal",
  ];
  const guestRows = await db.insert(tripMembers).values(
    guestNames.map((name) => ({ groupId: trip.id, guestName: name, role: "member" as const }))
  ).returning();

  const [ramesh, lakshmi, venkat, padma, murali] = guestRows;
  const all = [me, ...guestRows];
  const allIds = all.map((m) => m.id);
  console.log(`✅  ${all.length} members added (1 admin + ${guestRows.length} guests)\n`);

  // ── Expense log ────────────────────────────────────────────────────────────
  let count = 0;
  async function add(
    date: string,
    description: string,
    category: NewExpense["category"],
    amount: number,
    paidBy: string
  ) {
    await insertExpense({
      groupId: trip.id, paidByMemberId: paidBy,
      description, category, amount, currency: "INR",
      expenseDate: date, allMemberIds: allIds, createdByUserId: userId,
    });
    count++;
    console.log(`  ${String(count).padStart(2, "0")}. ${description.padEnd(45)} ${fmt(amount).padStart(12)}`);
  }

  console.log("📝  Adding 25 expenses (all equal ÷ 20)...\n");
  console.log(`     ${"Description".padEnd(45)} ${"Amount".padStart(12)}`);
  console.log(`     ${"-".repeat(58)}`);

  // ── Day 1 · Jan 10 — Arrival in Chennai ────────────────────────────────────
  console.log("\n  Day 1 · Jan 10 — Arrival & Chennai\n");
  await add("2026-01-10", "Van hire from Chennai airport (2 vans)", "transport", 14000, ramesh.id);
  await add("2026-01-10", "Hotel Divine Grace (10 rooms × 5 nights)", "accommodation", 200000, me.id);
  await add("2026-01-10", "Welcome dinner — Murugan Idli Shop, T. Nagar", "food", 9000, lakshmi.id);

  // ── Day 2 · Jan 11 — Mahabalipuram ─────────────────────────────────────────
  console.log("\n  Day 2 · Jan 11 — Mahabalipuram\n");
  await add("2026-01-11", "Chartered bus to Mahabalipuram", "transport", 8000, venkat.id);
  await add("2026-01-11", "Hotel breakfast (buffet)", "food", 6000, murali.id);
  await add("2026-01-11", "Shore Temple & Five Rathas entry (20 pax)", "sightseeing", 5000, padma.id);
  await add("2026-01-11", "Lunch at Ideal Beach Resort", "food", 11000, ramesh.id);
  await add("2026-01-11", "Souvenir shopping at beach market", "shopping", 7000, lakshmi.id);

  // ── Day 3 · Jan 12 — Kanchipuram ───────────────────────────────────────────
  console.log("\n  Day 3 · Jan 12 — Kanchipuram\n");
  await add("2026-01-12", "Chartered bus to Kanchipuram", "transport", 6000, venkat.id);
  await add("2026-01-12", "Ekambareswarar & Kamakshi Temple poojas", "sightseeing", 12000, padma.id);
  await add("2026-01-12", "Kanchipuram silk sarees (group purchase)", "shopping", 40000, me.id);
  await add("2026-01-12", "Lunch at Saravanaa Bhavan, Kanchipuram", "food", 10000, murali.id);

  // ── Day 4 · Jan 13 — Tirupati ──────────────────────────────────────────────
  console.log("\n  Day 4 · Jan 13 — Tirupati\n");
  await add("2026-01-13", "Overnight bus Kanchipuram → Tirupati", "transport", 16000, ramesh.id);
  await add("2026-01-13", "Tirumala SSD darshan tickets (20 pax)", "sightseeing", 24000, lakshmi.id);
  await add("2026-01-13", "TTD laddoo prasadam (20 boxes)", "food", 5000, venkat.id);
  await add("2026-01-13", "Accommodation at Sri Venkateshwara Lodge", "accommodation", 70000, padma.id);
  await add("2026-01-13", "Group dinner at TTD Anna Prasadam", "food", 5000, murali.id);

  // ── Day 5 · Jan 14 — Madurai & Departure ───────────────────────────────────
  console.log("\n  Day 5 · Jan 14 — Madurai & Departure\n");
  await add("2026-01-14", "Bus Tirupati → Madurai", "transport", 22000, me.id);
  await add("2026-01-14", "Meenakshi Amman Temple special pooja", "sightseeing", 15000, ramesh.id);
  await add("2026-01-14", "Breakfast at Hotel Surya, Madurai", "food", 8000, lakshmi.id);
  await add("2026-01-14", "Lunch at Murugan Idli Shop, Madurai", "food", 11000, venkat.id);
  await add("2026-01-14", "Madurai shopping (handicrafts, spices)", "shopping", 18000, padma.id);
  await add("2026-01-14", "Return train tickets Chennai (20 pax)", "transport", 25000, murali.id);
  await add("2026-01-14", "Farewell dinner — Hotel Germanus, Madurai", "food", 14000, me.id);

  // ── Summary ────────────────────────────────────────────────────────────────
  const allExpenses = await db.select().from(expenses).where(eq(expenses.groupId, trip.id));
  const total = allExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

  console.log(`\n${"─".repeat(58)}`);
  console.log(`✅  ${count} expenses · ${all.length} members`);
  console.log(`💰  Total: ${fmt(total)}  |  Per person: ${fmt(Math.round(total / all.length))}`);
  console.log(`\n🔗  Trip:    http://localhost:3000/groups/${trip.id}`);
  console.log(`📊  Settle:  http://localhost:3000/groups/${trip.id}/settle\n`);

  process.exit(0);
}

main().catch((e) => { console.error("❌  Seed failed:", e); process.exit(1); });
