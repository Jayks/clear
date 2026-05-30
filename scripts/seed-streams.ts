/**
 * Seed script — creates 3 Stream counterparts with 10–12 records each.
 * Covers every status: pending, confirmed, disputed, settled, forgiven.
 * Also seeds stream_settlements for all settled records.
 *
 * Usage: pnpm tsx scripts/seed-streams.ts
 *
 * Requires at least one group in the DB (to discover the current user's ID).
 */
import "dotenv/config";
import { db } from "../lib/db/client";
import { groups } from "../lib/db/schema/groups";
import { groupMembers } from "../lib/db/schema/group-members";
import { streamGuests } from "../lib/db/schema/stream-guests";
import { streamRecords } from "../lib/db/schema/stream-records";
import { streamSettlements } from "../lib/db/schema/stream-settlements";
import { createAdminClient } from "../lib/supabase/admin";
import type { NewStreamRecord } from "../lib/db/schema/stream-records";
import { isNotNull, eq, desc } from "drizzle-orm";

// ── Date helpers ──────────────────────────────────────────────────────────────

/** Returns a Date that is `daysAgo` days before today */
function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

/** 48hrs from a given date */
function plus48h(d: Date): Date {
  return new Date(d.getTime() + 48 * 60 * 60 * 1000);
}

// ── Formatting ────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

// ── Status label ──────────────────────────────────────────────────────────────

const STATUS_ICON: Record<string, string> = {
  pending:   "⏳",
  confirmed: "✅",
  disputed:  "⚠️ ",
  settled:   "💚",
  forgiven:  "🤍",
};

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n🌊  Clear Stream seed — 3 counterparts, 30+ records\n");

  // ── Resolve user ID ──────────────────────────────────────────────────────────
  // Priority: 1) SEED_USER_EMAIL env var, 2) most recent admin group_member with a user_id
  let userId: string | undefined;

  // Use SEED_USER_EMAIL if set, fall back to PLATFORM_ADMIN_EMAIL (already in .env.local)
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
    console.log(`👤  User (from SEED_USER_EMAIL): ${userId} <${seedEmail}>`);
  } else {
    // Fall back to the most recently created group whose creator also has a group_members row
    // (i.e. a real authenticated user, not a guest-only group)
    const rows = await db
      .select({ userId: groupMembers.userId })
      .from(groupMembers)
      .where(isNotNull(groupMembers.userId))
      .orderBy(desc(groupMembers.joinedAt))
      .limit(50);

    // Pick the user_id that appears most often (most likely the app owner in dev)
    const counts = new Map<string, number>();
    for (const r of rows) {
      if (!r.userId) continue;
      counts.set(r.userId, (counts.get(r.userId) ?? 0) + 1);
    }
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    userId = sorted[0]?.[0];

    if (!userId) {
      console.error("❌  Could not find any authenticated users in group_members.");
      console.error("    Create a group via the UI first, or set SEED_USER_EMAIL=you@example.com in .env.local");
      process.exit(1);
    }
    console.log(`👤  User (most active member): ${userId}`);
    console.log(`    Tip: set SEED_USER_EMAIL=saijayakumar@gmail.com in .env.local to always pin to you.\n`);
  }
  // Narrow to string — process.exit above ensures we reach here only when userId is set
  const confirmedUserId: string = userId as string;
  console.log();

  // ─── Guest 1: Rahul (has email) ─────────────────────────────────────────────
  const [rahul] = await db.insert(streamGuests).values({
    createdBy: confirmedUserId,
    name:  "Rahul",
    email: "rahul@example.com",
  }).returning();
  console.log(`👤  Guest created: Rahul (${rahul.id})`);

  // ─── Guest 2: Priya (name only) ─────────────────────────────────────────────
  const [priya] = await db.insert(streamGuests).values({
    createdBy: confirmedUserId,
    name: "Priya",
  }).returning();
  console.log(`👤  Guest created: Priya (${priya.id})`);

  // ─── Guest 3: Karan (no email, no phone — edge case) ────────────────────────
  const [karan] = await db.insert(streamGuests).values({
    createdBy: confirmedUserId,
    name: "Karan",
  }).returning();
  console.log(`👤  Guest created: Karan (${karan.id})\n`);

  // ─── Stream record factory ───────────────────────────────────────────────────

  let total = 0;

  async function logRecord(params: {
    guestId:    string;
    amount:     number;
    direction:  "they_owe_me" | "i_owe_them";
    note:       string;
    status:     "pending" | "confirmed" | "disputed" | "settled" | "forgiven";
    createdDaysAgo: number;
    disputeReason?: string;
    disputeNote?:   string;
    forgivenNote?:  string;
    /** For settled records, how much was paid (defaults to full amount) */
    settleAmount?: number;
  }) {
    const createdAt = daysAgo(params.createdDaysAgo);
    const expiresAt = plus48h(createdAt); // token already expired for old records; fine for seed data

    const base: NewStreamRecord = {
      creatorId:             confirmedUserId,
      counterpartGuestId:    params.guestId,
      amount:                String(params.amount),
      currency:              "INR",
      direction:             params.direction,
      note:                  params.note,
      status:                params.status,
      confirmTokenExpiresAt: expiresAt,
      createdAt,
      updatedAt:             createdAt,
    };

    // Enrich with status-specific timestamps
    if (params.status === "confirmed" || params.status === "settled") {
      base.confirmedAt = new Date(createdAt.getTime() + 12 * 60 * 60 * 1000); // confirmed 12h later
    }
    if (params.status === "disputed") {
      base.disputedAt      = new Date(createdAt.getTime() + 6 * 60 * 60 * 1000);
      base.disputeReason   = params.disputeReason ?? "wrong_amount";
      base.disputeNote     = params.disputeNote ?? null;
    }
    if (params.status === "settled") {
      base.settledAt = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000); // settled 24h later
    }
    if (params.status === "forgiven") {
      base.forgivenAt   = new Date(createdAt.getTime() + 3 * 24 * 60 * 60 * 1000); // forgiven 3 days later
      base.forgivenNote = params.forgivenNote ?? null;
    }

    const [record] = await db.insert(streamRecords).values(base).returning();

    // Insert a stream_settlement for every settled record
    if (params.status === "settled") {
      const paid = params.settleAmount ?? params.amount;
      const settledAt = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000);
      await db.insert(streamSettlements).values({
        streamId:   record.id,
        amount:     String(paid),
        currency:   "INR",
        note:       "Settled via UPI",
        recordedBy: confirmedUserId,
        settledAt,
      });
    }

    total++;
    const icon = STATUS_ICON[params.status] ?? "•";
    const dir  = params.direction === "they_owe_me" ? "↑ they owe" : "↓ I owe  ";
    console.log(`  ${String(total).padStart(2, "0")}. ${icon} ${dir}  ${fmt(params.amount).padEnd(12)}  "${params.note}"`);

    return record;
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // RAHUL — 12 records
  // Backstory: old friend, regular split of meals + subscriptions + cabs.
  // Net = he owes me substantially.
  // ══════════════════════════════════════════════════════════════════════════════
  console.log("─────────────────────────────────────────────────────");
  console.log("🧑  RAHUL (guest, email on file) — 12 records");
  console.log("─────────────────────────────────────────────────────");

  // 1. Confirmed — I paid lunch, he owes me half
  await logRecord({ guestId: rahul.id, amount: 1500, direction: "they_owe_me",
    note: "Lunch at Chai Point", status: "confirmed", createdDaysAgo: 55 });

  // 2. Confirmed — He paid for my cab share
  await logRecord({ guestId: rahul.id, amount: 800, direction: "i_owe_them",
    note: "Autorickshaw to airport", status: "confirmed", createdDaysAgo: 50 });

  // 3. Settled — Movie tickets, fully settled next day
  await logRecord({ guestId: rahul.id, amount: 3200, direction: "they_owe_me",
    note: "Movie tickets + popcorn (4 people)", status: "settled", createdDaysAgo: 45 });

  // 4. Settled — Borrowed for parking, settled same day
  await logRecord({ guestId: rahul.id, amount: 600, direction: "i_owe_them",
    note: "Borrowed for parking", status: "settled", createdDaysAgo: 40, settleAmount: 600 });

  // 5. Confirmed — Big team dinner
  await logRecord({ guestId: rahul.id, amount: 2400, direction: "they_owe_me",
    note: "Team dinner at Truffles", status: "confirmed", createdDaysAgo: 35 });

  // 6. Confirmed — Weekly grocery run
  await logRecord({ guestId: rahul.id, amount: 1200, direction: "they_owe_me",
    note: "Grocery run at D-Mart", status: "confirmed", createdDaysAgo: 28 });

  // 7. Confirmed — He covered my coffee
  await logRecord({ guestId: rahul.id, amount: 450, direction: "i_owe_them",
    note: "Coffee at Blue Tokai", status: "confirmed", createdDaysAgo: 22 });

  // 8. Forgiven — Gym advance, decided not to chase it
  await logRecord({ guestId: rahul.id, amount: 3000, direction: "they_owe_me",
    note: "Gym membership advance", status: "forgiven", createdDaysAgo: 20,
    forgivenNote: "Not worth the awkwardness — letting it go" });

  // 9. Pending — Annual Spotify family plan (just shared link)
  await logRecord({ guestId: rahul.id, amount: 5500, direction: "they_owe_me",
    note: "Spotify family plan (annual)", status: "pending", createdDaysAgo: 15 });

  // 10. Pending — He paid pharmacy, I'll send it back
  await logRecord({ guestId: rahul.id, amount: 980, direction: "i_owe_them",
    note: "Medicines from pharmacy", status: "pending", createdDaysAgo: 10 });

  // 11. Pending — Birthday supplies
  await logRecord({ guestId: rahul.id, amount: 2200, direction: "they_owe_me",
    note: "Birthday cake and decorations", status: "pending", createdDaysAgo: 5 });

  // 12. Disputed — He says he already paid the Swiggy share
  await logRecord({ guestId: rahul.id, amount: 750, direction: "i_owe_them",
    note: "Swiggy order split", status: "disputed", createdDaysAgo: 3,
    disputeReason: "already_paid",
    disputeNote: "I transferred this last week via GPay" });

  // ══════════════════════════════════════════════════════════════════════════════
  // PRIYA — 10 records
  // Backstory: colleague, event + travel splits. She tends to owe me from events.
  // Net = she owes me moderately.
  // ══════════════════════════════════════════════════════════════════════════════
  console.log("\n─────────────────────────────────────────────────────");
  console.log("👩  PRIYA (guest, no email) — 10 records");
  console.log("─────────────────────────────────────────────────────");

  // 1. Confirmed — Cab to a wedding
  await logRecord({ guestId: priya.id, amount: 2000, direction: "they_owe_me",
    note: "Cab to Ruchita's wedding", status: "confirmed", createdDaysAgo: 45 });

  // 2. Confirmed — She paid my train fare
  await logRecord({ guestId: priya.id, amount: 1800, direction: "i_owe_them",
    note: "Train ticket to Mysore", status: "confirmed", createdDaysAgo: 42 });

  // 3. Settled — Biryani lunch, settled quickly
  await logRecord({ guestId: priya.id, amount: 900, direction: "they_owe_me",
    note: "Biryani order for 2", status: "settled", createdDaysAgo: 38 });

  // 4. Settled — Auto fare she covered for me
  await logRecord({ guestId: priya.id, amount: 650, direction: "i_owe_them",
    note: "Auto home from office", status: "settled", createdDaysAgo: 35 });

  // 5. Confirmed — Conference dinner, I fronted the bill
  await logRecord({ guestId: priya.id, amount: 3500, direction: "they_owe_me",
    note: "Conference dinner at Taj (6 people)", status: "confirmed", createdDaysAgo: 30 });

  // 6. Confirmed — She covered my Ola surge
  await logRecord({ guestId: priya.id, amount: 1400, direction: "i_owe_them",
    note: "Ola Prime share on rainy day", status: "confirmed", createdDaysAgo: 25 });

  // 7. Pending — Weekend resort, she needs to confirm her half
  await logRecord({ guestId: priya.id, amount: 2800, direction: "they_owe_me",
    note: "Resort booking advance (half)", status: "pending", createdDaysAgo: 18 });

  // 8. Forgiven — Small amount, decided to write off
  await logRecord({ guestId: priya.id, amount: 600, direction: "they_owe_me",
    note: "Books from Flipkart delivery", status: "forgiven", createdDaysAgo: 12,
    forgivenNote: "Too small to bother chasing" });

  // 9. Pending — Zomato split last week
  await logRecord({ guestId: priya.id, amount: 1200, direction: "i_owe_them",
    note: "Zomato order (she placed it)", status: "pending", createdDaysAgo: 7 });

  // 10. Disputed — Flight booking, she disputes the amount
  await logRecord({ guestId: priya.id, amount: 4500, direction: "i_owe_them",
    note: "Flight booking Bangalore → Mumbai", status: "disputed", createdDaysAgo: 2,
    disputeReason: "wrong_amount",
    disputeNote: "The actual fare was ₹3800 not ₹4500 — taxes were separate" });

  // ══════════════════════════════════════════════════════════════════════════════
  // KARAN — 8 records
  // Backstory: flatmate, shared household expenses.
  // Net = he owes me a bit; one large "I owe" pending.
  // ══════════════════════════════════════════════════════════════════════════════
  console.log("\n─────────────────────────────────────────────────────");
  console.log("🧑  KARAN (guest, no contact info) — 8 records");
  console.log("─────────────────────────────────────────────────────");

  // 1. Confirmed — Rent shortfall I covered
  await logRecord({ guestId: karan.id, amount: 4000, direction: "they_owe_me",
    note: "Rent shortfall (April)", status: "confirmed", createdDaysAgo: 25 });

  // 2. Settled — Small courier, settled cash
  await logRecord({ guestId: karan.id, amount: 800, direction: "i_owe_them",
    note: "Borrowed for Delhivery pickup", status: "settled", createdDaysAgo: 20 });

  // 3. Confirmed — OTT subscriptions split
  await logRecord({ guestId: karan.id, amount: 2500, direction: "they_owe_me",
    note: "Netflix + Prime annual split", status: "confirmed", createdDaysAgo: 15 });

  // 4. Confirmed — He paid electricity, I owe my share
  await logRecord({ guestId: karan.id, amount: 1100, direction: "i_owe_them",
    note: "Electricity bill (May)", status: "confirmed", createdDaysAgo: 12 });

  // 5. Pending — Pharmacy run
  await logRecord({ guestId: karan.id, amount: 600, direction: "they_owe_me",
    note: "Medicines from Apollo", status: "pending", createdDaysAgo: 8 });

  // 6. Pending — Large Amazon delivery I covered (he needs to confirm)
  await logRecord({ guestId: karan.id, amount: 3200, direction: "i_owe_them",
    note: "Amazon order (split delivery)", status: "pending", createdDaysAgo: 5 });

  // 7. Pending — Dinner group order
  await logRecord({ guestId: karan.id, amount: 1800, direction: "they_owe_me",
    note: "Group food delivery (5 people)", status: "pending", createdDaysAgo: 2 });

  // 8. Forgiven — Train ticket I booked for him during a chaotic trip
  await logRecord({ guestId: karan.id, amount: 2200, direction: "they_owe_me",
    note: "Train ticket Chennai → Bangalore", status: "forgiven", createdDaysAgo: 18,
    forgivenNote: "He was going through a tough time — let it go" });

  // ── Summary ────────────────────────────────────────────────────────────────

  console.log(`\n${"═".repeat(57)}`);
  console.log(`✅  ${total} stream records seeded across 3 counterparts`);
  console.log(`\n📊  Rahul  — 12 records (confirmed, settled, pending, disputed, forgiven)`);
  console.log(`📊  Priya  — 10 records (confirmed, settled, pending, disputed, forgiven)`);
  console.log(`📊  Karan  —  8 records (confirmed, settled, pending, forgiven)`);
  console.log(`\n🔗  Open Streams:  http://localhost:3000/stream`);
  console.log(`   Rahul:          http://localhost:3000/stream/${rahul.id}`);
  console.log(`   Priya:          http://localhost:3000/stream/${priya.id}`);
  console.log(`   Karan:          http://localhost:3000/stream/${karan.id}`);
  console.log(`${"═".repeat(57)}\n`);

  process.exit(0);
}

main().catch((e) => {
  console.error("❌  Stream seed failed:", e);
  process.exit(1);
});
