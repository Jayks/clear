import { db } from "@/lib/db/client";
import { expenses } from "@/lib/db/schema/expenses";
import { expenseSplits } from "@/lib/db/schema/expense-splits";
import { tripMembers } from "@/lib/db/schema/trip-members";
import { eq, desc, inArray, and } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";

async function assertMember(tripId: string, userId: string): Promise<boolean> {
  const [row] = await db
    .select()
    .from(tripMembers)
    .where(and(eq(tripMembers.tripId, tripId), eq(tripMembers.userId, userId)));
  return !!row;
}

export async function getExpenses(tripId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const isMember = await assertMember(tripId, user.id);
  if (!isMember) return [];

  return db
    .select()
    .from(expenses)
    .where(eq(expenses.tripId, tripId))
    .orderBy(desc(expenses.expenseDate), desc(expenses.createdAt));
}

export async function getExpenseWithSplits(expenseId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [expense] = await db.select().from(expenses).where(eq(expenses.id, expenseId));
  if (!expense) return null;

  const isMember = await assertMember(expense.tripId, user.id);
  if (!isMember) return null;

  const splits = await db
    .select()
    .from(expenseSplits)
    .where(eq(expenseSplits.expenseId, expenseId));

  return { expense, splits };
}

export async function getTripExpensesWithSplits(tripId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const isMember = await assertMember(tripId, user.id);
  if (!isMember) return [];

  const tripExpenses = await db
    .select()
    .from(expenses)
    .where(eq(expenses.tripId, tripId))
    .orderBy(desc(expenses.expenseDate), desc(expenses.createdAt));

  if (tripExpenses.length === 0) return [];

  const splits = await db
    .select()
    .from(expenseSplits)
    .where(inArray(expenseSplits.expenseId, tripExpenses.map((e) => e.id)));

  const splitsByExpense = new Map<string, typeof splits>();
  for (const s of splits) {
    const arr = splitsByExpense.get(s.expenseId) ?? [];
    arr.push(s);
    splitsByExpense.set(s.expenseId, arr);
  }

  return tripExpenses.map((expense) => ({
    expense,
    splits: splitsByExpense.get(expense.id) ?? [],
  }));
}
