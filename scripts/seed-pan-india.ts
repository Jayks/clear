/**
 * Seed script — Pan-India Explorer 2026
 * 5 members, 7 days, 18 located expenses, designed to exercise every Map View
 * scenario discussed for the pin-chip feature:
 *
 *   - Day 1 (Chennai)            → 2 expenses, close together (may cluster at city zoom)
 *   - Day 2 (Chennai→Pondicherry) → same-day, ~130km apart (spread-out → fitBounds)
 *   - Day 3 (Chennai→Delhi)      → same-day, ~1750km apart (cross-country → fitBounds, midpoint test)
 *   - Day 4 (Delhi)              → 6 expenses, all close together (clustering "many same day" test)
 *   - Day 5 (Delhi→Agra)         → same-day, ~230km apart (spread-out → fitBounds)
 *   - Day 6 (Agra)               → 1 isolated expense (individually-rendered rich chip test)
 *   - Day 7 (Agra→Jaipur)        → same-day, ~240km apart (spread-out → fitBounds)
 *
 * Usage: pnpm seed:panindia
 *
 * The authenticated user (saijayakumar@gmail.com) is inserted as trip admin.
 */
import { db } from "../lib/db/client";
import { groups as trips } from "../lib/db/schema/groups";
import { groupMembers as tripMembers } from "../lib/db/schema/group-members";
import { expenses } from "../lib/db/schema/expenses";
import type { NewExpense, ExpenseLocation } from "../lib/db/schema/expenses";
import { expenseSplits } from "../lib/db/schema/expense-splits";
import { createAdminClient } from "../lib/supabase/admin";
import { computeSplits } from "../lib/splits/compute";
import { eq } from "drizzle-orm";

const ADMIN_EMAIL = "saijayakumar@gmail.com";

function fmt(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

// ── Real-world coordinates used across the itinerary ──────────────────────────
const PLACES = {
  chennaiAirport:   { lat: 12.9941, lng: 80.1709, name: "Chennai International Airport" },
  chennaiTNagar:    { lat: 13.0418, lng: 80.2341, name: "T. Nagar, Chennai" },
  chennaiMarina:    { lat: 13.0500, lng: 80.2824, name: "Marina Beach, Chennai" },
  pondicherryFrench:{ lat: 11.9340, lng: 79.8306, name: "French Quarter, Pondicherry" },
  pondicherryPromenade: { lat: 11.9304, lng: 79.8367, name: "Promenade Beach, Pondicherry" },
  delhiAirport:     { lat: 28.5562, lng: 77.1000, name: "Indira Gandhi International Airport, Delhi" },
  delhiCP:          { lat: 28.6315, lng: 77.2167, name: "Connaught Place, Delhi" },
  delhiRedFort:     { lat: 28.6562, lng: 77.2410, name: "Red Fort, Delhi" },
  delhiChandniChowk:{ lat: 28.6506, lng: 77.2303, name: "Chandni Chowk, Delhi" },
  delhiHumayun:     { lat: 28.5933, lng: 77.2507, name: "Humayun's Tomb, Delhi" },
  delhiDilliHaat:   { lat: 28.5679, lng: 77.2110, name: "Dilli Haat, Delhi" },
  agraExpressway:   { lat: 27.5000, lng: 77.6800, name: "Yamuna Expressway, near Agra" },
  agraTaj:          { lat: 27.1751, lng: 78.0421, name: "Taj Mahal, Agra" },
  jaipurEnRoute:    { lat: 27.0500, lng: 76.6500, name: "Dausa highway dhaba, en route to Jaipur" },
  jaipurHawaMahal:  { lat: 26.9239, lng: 75.8267, name: "Hawa Mahal, Jaipur" },
} satisfies Record<string, ExpenseLocation>;

async function insertExpense(params: {
  groupId: string;
  paidByMemberId: string;
  description: string;
  category: NewExpense["category"];
  amount: number;
  currency: string;
  expenseDate: string;
  location: ExpenseLocation;
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
    location: params.location,
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
  console.log("\n🇮🇳  Clear seed — Pan-India Explorer 2026\n");

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
    name: "Pan-India Explorer 2026",
    description: "South to North in 7 days — Chennai, Pondicherry, Delhi, Agra, and Jaipur. A whirlwind tour built to test the map view across clustered cities and long-haul travel days.",
    defaultCurrency: "INR",
    startDate: "2026-02-01",
    endDate: "2026-02-07",
    budget: "400000",
    createdBy: userId,
  }).returning();
  console.log(`✅  Trip: "${trip.name}" (${trip.id})`);

  // ── Create members (me + 4 guests = 5 total) ──────────────────────────────
  const [me] = await db.insert(tripMembers).values({
    groupId: trip.id,
    userId,
    displayName: userDisplayName,
    role: "admin",
  }).returning();

  const guestNames = ["Arjun", "Meera", "Rohan", "Divya"];
  const guestRows = await db.insert(tripMembers).values(
    guestNames.map((name) => ({ groupId: trip.id, guestName: name, role: "member" as const }))
  ).returning();

  const [arjun, meera, rohan, divya] = guestRows;
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
    paidBy: string,
    location: ExpenseLocation,
  ) {
    await insertExpense({
      groupId: trip.id, paidByMemberId: paidBy,
      description, category, amount, currency: "INR",
      expenseDate: date, location, allMemberIds: allIds, createdByUserId: userId,
    });
    count++;
    console.log(`  ${String(count).padStart(2, "0")}. ${description.padEnd(48)} ${fmt(amount).padStart(10)}  📍 ${location.name}`);
  }

  console.log("📝  Adding 18 located expenses (all equal ÷ 5)...\n");

  // ── Day 1 · Feb 1 — Chennai arrival (2 close-together pins) ───────────────
  console.log("\n  Day 1 · Feb 1 — Chennai arrival\n");
  await add("2026-02-01", "Airport taxi to hotel", "transport", 1800, arjun.id, PLACES.chennaiAirport);
  await add("2026-02-01", "Welcome dinner at Murugan Idli Shop, T. Nagar", "food", 4200, me.id, PLACES.chennaiTNagar);

  // ── Day 2 · Feb 2 — Chennai → Pondicherry day trip (~130km spread) ─────────
  console.log("\n  Day 2 · Feb 2 — Chennai → Pondicherry day trip (spread-out same day)\n");
  await add("2026-02-02", "Breakfast at Marina Beach café", "food", 2200, meera.id, PLACES.chennaiMarina);
  await add("2026-02-02", "French Quarter walking tour tickets", "sightseeing", 3000, rohan.id, PLACES.pondicherryFrench);
  await add("2026-02-02", "Seafood lunch on the Promenade", "food", 6500, divya.id, PLACES.pondicherryPromenade);

  // ── Day 3 · Feb 3 — Chennai → Delhi flight (~1750km spread, cross-country) ─
  console.log("\n  Day 3 · Feb 3 — Fly Chennai → Delhi (cross-country same-day spread)\n");
  await add("2026-02-03", "Airport lounge snacks before departure", "food", 1500, arjun.id, PLACES.chennaiAirport);
  await add("2026-02-03", "Late dinner near hotel, Connaught Place", "food", 3800, me.id, PLACES.delhiCP);

  // ── Day 4 · Feb 4 — Delhi sightseeing (6 close-together pins → clustering) ─
  console.log("\n  Day 4 · Feb 4 — Delhi sightseeing (many same-day pins, clustering test)\n");
  await add("2026-02-04", "Red Fort entry tickets (5 pax)", "sightseeing", 2000, meera.id, PLACES.delhiRedFort);
  await add("2026-02-04", "Street food crawl at Chandni Chowk", "food", 3200, rohan.id, PLACES.delhiChandniChowk);
  await add("2026-02-04", "Auto-rickshaw rides across Old Delhi", "transport", 1200, divya.id, PLACES.delhiChandniChowk);
  await add("2026-02-04", "Humayun's Tomb entry tickets (5 pax)", "sightseeing", 1500, me.id, PLACES.delhiHumayun);
  await add("2026-02-04", "Souvenir shopping at Dilli Haat", "shopping", 5400, arjun.id, PLACES.delhiDilliHaat);
  await add("2026-02-04", "Dinner at Connaught Place", "food", 4600, meera.id, PLACES.delhiCP);

  // ── Day 5 · Feb 5 — Delhi → Agra (~230km spread) ───────────────────────────
  console.log("\n  Day 5 · Feb 5 — Drive Delhi → Agra (spread-out same day)\n");
  await add("2026-02-05", "Hotel checkout breakfast, Connaught Place", "food", 2100, rohan.id, PLACES.delhiCP);
  await add("2026-02-05", "Expressway tolls and fuel to Agra", "transport", 2800, divya.id, PLACES.agraExpressway);

  // ── Day 6 · Feb 6 — Agra (1 isolated pin → individual rich-chip test) ──────
  console.log("\n  Day 6 · Feb 6 — Agra (single isolated pin)\n");
  await add("2026-02-06", "Taj Mahal entry tickets and guide (5 pax)", "sightseeing", 4000, me.id, PLACES.agraTaj);

  // ── Day 7 · Feb 7 — Agra → Jaipur (~240km spread) ──────────────────────────
  console.log("\n  Day 7 · Feb 7 — Drive Agra → Jaipur (spread-out same day)\n");
  await add("2026-02-07", "Lunch at highway dhaba near Dausa", "food", 2600, arjun.id, PLACES.jaipurEnRoute);
  await add("2026-02-07", "Hawa Mahal & City Palace entry tickets (5 pax)", "sightseeing", 3500, meera.id, PLACES.jaipurHawaMahal);

  // ── Summary ────────────────────────────────────────────────────────────────
  const allExpenses = await db.select().from(expenses).where(eq(expenses.groupId, trip.id));
  const total = allExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

  console.log(`\n${"─".repeat(64)}`);
  console.log(`✅  ${count} located expenses · ${all.length} members`);
  console.log(`💰  Total: ${fmt(total)}  |  Per person: ${fmt(Math.round(total / all.length))}`);
  console.log(`\n🔗  Trip:  http://localhost:3000/groups/${trip.id}`);
  console.log(`🗺️   Map:   http://localhost:3000/groups/${trip.id}/expenses (toggle to Map view)\n`);

  process.exit(0);
}

main().catch((e) => { console.error("❌  Seed failed:", e); process.exit(1); });
