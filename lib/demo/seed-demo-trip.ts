import { db } from "@/lib/db/client";
import { groups } from "@/lib/db/schema/groups";
import { groupMembers } from "@/lib/db/schema/group-members";
import { expenses } from "@/lib/db/schema/expenses";
import { expenseSplits } from "@/lib/db/schema/expense-splits";

const COVER_PHOTO =
  "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=800&q=80";

export async function seedDemoGroup(userId: string, displayName: string | null) {
  // 1. Group
  const [group] = await db
    .insert(groups)
    .values({
      name: "Goa 2025 · Sample",
      description: "A pre-loaded sample trip — explore all features freely!",
      groupType: "trip",
      defaultCurrency: "INR",
      startDate: "2025-03-01",
      endDate: "2025-03-05",
      budget: "45000",
      coverPhotoUrl: COVER_PHOTO,
      createdBy: userId,
      isDemo: true,
    })
    .returning();

  // 2. Members
  const [userM, raj, priya, ankit, meera] = await db
    .insert(groupMembers)
    .values([
      { groupId: group.id, userId, displayName, role: "admin" },
      { groupId: group.id, guestName: "Raj Sharma" },
      { groupId: group.id, guestName: "Priya Patel" },
      { groupId: group.id, guestName: "Ankit Mehta" },
      { groupId: group.id, guestName: "Meera Nair" },
    ])
    .returning();

  const all5 = [userM.id, raj.id, priya.id, ankit.id, meera.id];

  // 3. Expenses + splits
  const [e1] = await db.insert(expenses).values({
    groupId: group.id, paidByMemberId: userM.id,
    description: "Hotel check-in", category: "accommodation",
    amount: "12000", currency: "INR", expenseDate: "2025-03-01", createdByUserId: userId,
  }).returning();
  await db.insert(expenseSplits).values(all5.map((memberId) => ({
    expenseId: e1.id, memberId, shareAmount: "2400", splitType: "equal" as const, splitValue: null,
  })));

  const [e2] = await db.insert(expenses).values({
    groupId: group.id, paidByMemberId: raj.id,
    description: "Airport taxi", category: "transport",
    amount: "2000", currency: "INR", expenseDate: "2025-03-01", createdByUserId: userId,
  }).returning();
  await db.insert(expenseSplits).values(all5.map((memberId) => ({
    expenseId: e2.id, memberId, shareAmount: "400", splitType: "equal" as const, splitValue: null,
  })));

  const [e3] = await db.insert(expenses).values({
    groupId: group.id, paidByMemberId: priya.id,
    description: "Welcome dinner", category: "food",
    amount: "4500", currency: "INR", expenseDate: "2025-03-01", createdByUserId: userId,
  }).returning();
  await db.insert(expenseSplits).values(all5.map((memberId) => ({
    expenseId: e3.id, memberId, shareAmount: "900", splitType: "equal" as const, splitValue: null,
  })));

  const [e4] = await db.insert(expenses).values({
    groupId: group.id, paidByMemberId: userM.id,
    description: "Scuba diving", category: "activities",
    amount: "8000", currency: "INR", expenseDate: "2025-03-02", createdByUserId: userId,
  }).returning();
  await db.insert(expenseSplits).values(
    [userM.id, raj.id, priya.id, ankit.id].map((memberId) => ({
      expenseId: e4.id, memberId, shareAmount: "2000", splitType: "exact" as const, splitValue: "2000",
    }))
  );

  const [e5] = await db.insert(expenses).values({
    groupId: group.id, paidByMemberId: ankit.id,
    description: "Flea market shopping", category: "shopping",
    amount: "3600", currency: "INR", expenseDate: "2025-03-02", createdByUserId: userId,
  }).returning();
  await db.insert(expenseSplits).values([
    { expenseId: e5.id, memberId: userM.id,  shareAmount: "900", splitType: "shares" as const, splitValue: "2" },
    { expenseId: e5.id, memberId: raj.id,    shareAmount: "450", splitType: "shares" as const, splitValue: "1" },
    { expenseId: e5.id, memberId: priya.id,  shareAmount: "900", splitType: "shares" as const, splitValue: "2" },
    { expenseId: e5.id, memberId: ankit.id,  shareAmount: "450", splitType: "shares" as const, splitValue: "1" },
    { expenseId: e5.id, memberId: meera.id,  shareAmount: "900", splitType: "shares" as const, splitValue: "2" },
  ]);

  const [e6] = await db.insert(expenses).values({
    groupId: group.id, paidByMemberId: meera.id,
    description: "Beach shack lunch", category: "food",
    amount: "1800", currency: "INR", expenseDate: "2025-03-03", createdByUserId: userId,
  }).returning();
  await db.insert(expenseSplits).values(all5.map((memberId) => ({
    expenseId: e6.id, memberId, shareAmount: "360", splitType: "equal" as const, splitValue: null,
  })));

  const [e7] = await db.insert(expenses).values({
    groupId: group.id, paidByMemberId: userM.id,
    description: "Jet ski rental", category: "activities",
    amount: "5000", currency: "INR", expenseDate: "2025-03-03", createdByUserId: userId,
  }).returning();
  await db.insert(expenseSplits).values([
    { expenseId: e7.id, memberId: userM.id,  shareAmount: "1500", splitType: "percentage" as const, splitValue: "30" },
    { expenseId: e7.id, memberId: raj.id,    shareAmount: "1000", splitType: "percentage" as const, splitValue: "20" },
    { expenseId: e7.id, memberId: priya.id,  shareAmount: "1000", splitType: "percentage" as const, splitValue: "20" },
    { expenseId: e7.id, memberId: ankit.id,  shareAmount: "750",  splitType: "percentage" as const, splitValue: "15" },
    { expenseId: e7.id, memberId: meera.id,  shareAmount: "750",  splitType: "percentage" as const, splitValue: "15" },
  ]);

  const [e8] = await db.insert(expenses).values({
    groupId: group.id, paidByMemberId: raj.id,
    description: "Grocery run", category: "groceries",
    amount: "650", currency: "INR", expenseDate: "2025-03-04", createdByUserId: userId,
  }).returning();
  await db.insert(expenseSplits).values(all5.map((memberId) => ({
    expenseId: e8.id, memberId, shareAmount: "130", splitType: "equal" as const, splitValue: null,
  })));

  return group;
}
