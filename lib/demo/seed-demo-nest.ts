import { db } from "@/lib/db/client";
import { groups } from "@/lib/db/schema/groups";
import { groupMembers } from "@/lib/db/schema/group-members";
import { expenses } from "@/lib/db/schema/expenses";
import { expenseSplits } from "@/lib/db/schema/expense-splits";
import { settlements } from "@/lib/db/schema/settlements";

const COVER_PHOTO =
  "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80";

// Helper: equal split across members with remainder to first
function equalSplits(memberIds: string[], amount: number) {
  const base = Math.floor((amount * 100) / memberIds.length) / 100;
  const remainder = Math.round((amount - base * memberIds.length) * 100) / 100;
  return memberIds.map((memberId, i) => ({
    memberId,
    shareAmount: String(i === 0 ? base + remainder : base),
    splitType: "equal" as const,
    splitValue: null,
  }));
}

export async function seedDemoNest(userId: string, displayName: string | null) {
  // ── 1. Group ─────────────────────────────────────────────────────────────
  const [group] = await db.insert(groups).values({
    name: "Mumbai Flat · Sample",
    description: "A pre-loaded sample nest — explore household splitting freely!",
    groupType: "nest",
    defaultCurrency: "INR",
    coverPhotoUrl: COVER_PHOTO,
    createdBy: userId,
    isDemo: true,
  }).returning();

  // ── 2. Members ───────────────────────────────────────────────────────────
  const [userM, karthik, sneha] = await db.insert(groupMembers).values([
    { groupId: group.id, userId, displayName, role: "admin" },
    { groupId: group.id, guestName: "Karthik Nair" },
    { groupId: group.id, guestName: "Sneha Iyer" },
  ]).returning();

  const all3 = [userM.id, karthik.id, sneha.id];

  // ── 3. Templates ─────────────────────────────────────────────────────────
  // T1: Monthly rent ₹30,000 — user pays, equal 3 ways
  const [tRent] = await db.insert(expenses).values({
    groupId: group.id, paidByMemberId: userM.id,
    description: "Monthly rent", category: "rent",
    amount: "30000", currency: "INR",
    expenseDate: "2026-05-01",
    isTemplate: true, recurrence: "monthly", createdByUserId: userId,
  }).returning();
  await db.insert(expenseSplits).values(equalSplits(all3, 30000).map((s) => ({ ...s, expenseId: tRent.id })));

  // T2: Electricity — Karthik pays, equal 3 ways
  const [tElec] = await db.insert(expenses).values({
    groupId: group.id, paidByMemberId: karthik.id,
    description: "Electricity bill", category: "utilities",
    amount: "1800", currency: "INR",
    expenseDate: "2026-05-01",
    isTemplate: true, recurrence: "monthly", createdByUserId: userId,
  }).returning();
  await db.insert(expenseSplits).values(equalSplits(all3, 1800).map((s) => ({ ...s, expenseId: tElec.id })));

  // T3: Netflix ₹649 — user pays, user + Sneha only
  const [tNetflix] = await db.insert(expenses).values({
    groupId: group.id, paidByMemberId: userM.id,
    description: "Netflix", category: "subscriptions",
    amount: "649", currency: "INR",
    expenseDate: "2026-05-01",
    isTemplate: true, recurrence: "monthly", createdByUserId: userId,
  }).returning();
  await db.insert(expenseSplits).values([
    { expenseId: tNetflix.id, memberId: userM.id, shareAmount: "325", splitType: "equal" as const, splitValue: null },
    { expenseId: tNetflix.id, memberId: sneha.id, shareAmount: "324", splitType: "equal" as const, splitValue: null },
  ]);

  // T4: WiFi ₹999 — user pays, equal 3 ways
  const [tWifi] = await db.insert(expenses).values({
    groupId: group.id, paidByMemberId: userM.id,
    description: "WiFi broadband", category: "utilities",
    amount: "999", currency: "INR",
    expenseDate: "2026-05-01",
    isTemplate: true, recurrence: "monthly", createdByUserId: userId,
  }).returning();
  await db.insert(expenseSplits).values(equalSplits(all3, 999).map((s) => ({ ...s, expenseId: tWifi.id })));

  // T5: Society maintenance ₹2,500 — user pays, equal 3 ways
  const [tSociety] = await db.insert(expenses).values({
    groupId: group.id, paidByMemberId: userM.id,
    description: "Society maintenance", category: "maintenance",
    amount: "2500", currency: "INR",
    expenseDate: "2026-05-01",
    isTemplate: true, recurrence: "monthly", createdByUserId: userId,
  }).returning();
  await db.insert(expenseSplits).values(equalSplits(all3, 2500).map((s) => ({ ...s, expenseId: tSociety.id })));

  // T6: Cooking gas ₹800 — Karthik pays, equal 3 ways
  const [tGas] = await db.insert(expenses).values({
    groupId: group.id, paidByMemberId: karthik.id,
    description: "Cooking gas", category: "utilities",
    amount: "800", currency: "INR",
    expenseDate: "2026-05-01",
    isTemplate: true, recurrence: "monthly", createdByUserId: userId,
  }).returning();
  await db.insert(expenseSplits).values(equalSplits(all3, 800).map((s) => ({ ...s, expenseId: tGas.id })));

  // T7: Weekly groceries ₹3,000 — Sneha pays, equal 3 ways
  const [tGroceries] = await db.insert(expenses).values({
    groupId: group.id, paidByMemberId: sneha.id,
    description: "Weekly groceries", category: "groceries",
    amount: "3000", currency: "INR",
    expenseDate: "2026-05-01",
    isTemplate: true, recurrence: "weekly", createdByUserId: userId,
  }).returning();
  await db.insert(expenseSplits).values(equalSplits(all3, 3000).map((s) => ({ ...s, expenseId: tGroceries.id })));

  // Helper to insert a logged recurring instance
  async function logRecurring(templateId: string, paidBy: string, desc: string, cat: string, amount: number, date: string, splitMembers: string[]) {
    const [e] = await db.insert(expenses).values({
      groupId: group.id, paidByMemberId: paidBy,
      description: desc, category: cat,
      amount: String(amount), currency: "INR",
      expenseDate: date, isTemplate: false,
      sourceTemplateId: templateId, createdByUserId: userId,
    }).returning();
    await db.insert(expenseSplits).values(equalSplits(splitMembers, amount).map((s) => ({ ...s, expenseId: e.id })));
    return e;
  }

  // Helper to insert a one-off expense
  async function addExpense(paidBy: string, desc: string, cat: string, amount: number, date: string, splitMembers: string[], customSplits?: { memberId: string; shareAmount: string }[]) {
    const [e] = await db.insert(expenses).values({
      groupId: group.id, paidByMemberId: paidBy,
      description: desc, category: cat,
      amount: String(amount), currency: "INR",
      expenseDate: date, isTemplate: false, createdByUserId: userId,
    }).returning();
    const splits = customSplits
      ? customSplits.map((s) => ({ ...s, expenseId: e.id, splitType: "exact" as const, splitValue: s.shareAmount }))
      : equalSplits(splitMembers, amount).map((s) => ({ ...s, expenseId: e.id }));
    await db.insert(expenseSplits).values(splits);
    return e;
  }

  // ── 4. February 2026 ─────────────────────────────────────────────────────
  // Recurring
  await logRecurring(tRent.id,     userM.id,   "Monthly rent",       "rent",          30000, "2026-02-01", all3);
  await logRecurring(tElec.id,     karthik.id, "Electricity bill",   "utilities",     1500,  "2026-02-01", all3);
  await logRecurring(tNetflix.id,  userM.id,   "Netflix",            "subscriptions", 649,   "2026-02-01", [userM.id, sneha.id]);
  await logRecurring(tWifi.id,     userM.id,   "WiFi broadband",     "utilities",     999,   "2026-02-01", all3);
  await logRecurring(tSociety.id,  userM.id,   "Society maintenance","maintenance",   2500,  "2026-02-01", all3);
  await logRecurring(tGas.id,      karthik.id, "Cooking gas",        "utilities",     800,   "2026-02-01", all3);

  // One-off
  await addExpense(userM.id,   "House cleaning",    "maintenance", 1500, "2026-02-08", all3);
  await addExpense(sneha.id,   "Groceries",         "groceries",   3200, "2026-02-12", all3);
  await addExpense(karthik.id, "Water cans",        "supplies",    240,  "2026-02-15", all3);
  await addExpense(karthik.id, "Dinner out",        "food",        2800, "2026-02-22", all3);
  await addExpense(userM.id,   "Medicine cabinet",  "healthcare",  650,  "2026-02-26", all3);

  // ── 5. March 2026 ────────────────────────────────────────────────────────
  // Recurring (higher electricity due to AC usage)
  await logRecurring(tRent.id,     userM.id,   "Monthly rent",       "rent",          30000, "2026-03-01", all3);
  await logRecurring(tElec.id,     karthik.id, "Electricity bill",   "utilities",     2400,  "2026-03-01", all3);
  await logRecurring(tNetflix.id,  userM.id,   "Netflix",            "subscriptions", 649,   "2026-03-01", [userM.id, sneha.id]);
  await logRecurring(tWifi.id,     userM.id,   "WiFi broadband",     "utilities",     999,   "2026-03-01", all3);
  await logRecurring(tSociety.id,  userM.id,   "Society maintenance","maintenance",   2500,  "2026-03-01", all3);
  await logRecurring(tGas.id,      karthik.id, "Cooking gas",        "utilities",     800,   "2026-03-01", all3);

  // One-off
  await addExpense(userM.id,   "Groceries",       "groceries",   2900, "2026-03-05", all3);
  await addExpense(userM.id,   "Plumbing repair", "maintenance", 1200, "2026-03-10", all3);
  await addExpense(sneha.id,   "Dining out",      "food",        3500, "2026-03-18", all3);
  await addExpense(karthik.id, "Cooking gas",     "utilities",   800,  "2026-03-25", all3);
  await addExpense(sneha.id,   "Hand wash & soap","supplies",    380,  "2026-03-28", all3);

  // Settlement — Karthik partially clears his debt
  await db.insert(settlements).values({
    groupId: group.id,
    fromMemberId: karthik.id,
    toMemberId: userM.id,
    amount: "15000",
    currency: "INR",
    note: "Partial — Feb + Mar share",
    settledAt: new Date("2026-03-31"),
  });

  // ── 6. April 2026 ────────────────────────────────────────────────────────
  // Recurring
  await logRecurring(tRent.id,     userM.id,   "Monthly rent",       "rent",          30000, "2026-04-01", all3);
  await logRecurring(tElec.id,     karthik.id, "Electricity bill",   "utilities",     1600,  "2026-04-01", all3);
  await logRecurring(tNetflix.id,  userM.id,   "Netflix",            "subscriptions", 649,   "2026-04-01", [userM.id, sneha.id]);
  await logRecurring(tWifi.id,     userM.id,   "WiFi broadband",     "utilities",     999,   "2026-04-01", all3);
  await logRecurring(tSociety.id,  userM.id,   "Society maintenance","maintenance",   2500,  "2026-04-01", all3);
  await logRecurring(tGas.id,      karthik.id, "Cooking gas",        "utilities",     800,   "2026-04-01", all3);

  // One-off
  await addExpense(karthik.id, "Groceries",              "groceries",   3100, "2026-04-03", all3);
  await addExpense(sneha.id,   "House cleaning",          "maintenance", 1500, "2026-04-10", all3);
  await addExpense(userM.id,   "Weekend snacks & drinks", "food",        2200, "2026-04-14", all3);
  await addExpense(userM.id,   "Sofa cushions",           "supplies",    1600, "2026-04-20", all3);
  await addExpense(karthik.id, "Air fresheners",          "supplies",    450,  "2026-04-25", all3);

  // Settlements — Sneha and Karthik make partial payments
  await db.insert(settlements).values({
    groupId: group.id,
    fromMemberId: sneha.id,
    toMemberId: userM.id,
    amount: "18000",
    currency: "INR",
    note: "Feb + Mar + Apr share",
    settledAt: new Date("2026-04-05"),
  });
  await db.insert(settlements).values({
    groupId: group.id,
    fromMemberId: karthik.id,
    toMemberId: userM.id,
    amount: "12000",
    currency: "INR",
    note: "Apr top-up",
    settledAt: new Date("2026-04-30"),
  });

  // ── 7. May 2026 (current, partial) ───────────────────────────────────────
  // Only rent is logged; Electricity, Netflix, WiFi are pending for the month
  await logRecurring(tRent.id, userM.id, "Monthly rent", "rent", 30000, "2026-05-01", all3);

  // One-off
  await addExpense(sneha.id,   "Groceries",       "groceries",   2700, "2026-05-05", all3);
  await addExpense(karthik.id, "Water cans",      "supplies",    300,  "2026-05-07", all3);
  await addExpense(userM.id,   "Dinner together", "food",        2100, "2026-05-09", all3);

  return group;
}
