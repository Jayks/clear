import { db } from "@/lib/db/client";
import { expenses } from "@/lib/db/schema/expenses";
import { expenseSplits } from "@/lib/db/schema/expense-splits";
import { eq, desc, inArray, and, sql } from "drizzle-orm";
import { getCurrentUser, getMembership } from "@/lib/db/queries/auth";

export async function getExpenses(groupId: string) {
  const user = await getCurrentUser();
  if (!user) return [];

  const membership = await getMembership(groupId, user.id);
  if (!membership) return [];

  return db
    .select()
    .from(expenses)
    .where(and(eq(expenses.groupId, groupId), eq(expenses.isTemplate, false)))
    .orderBy(desc(expenses.expenseDate), desc(expenses.createdAt));
}

export async function getGroupTemplates(groupId: string) {
  const user = await getCurrentUser();
  if (!user) return [];

  const membership = await getMembership(groupId, user.id);
  if (!membership) return [];

  const templates = await db
    .select()
    .from(expenses)
    .where(and(eq(expenses.groupId, groupId), eq(expenses.isTemplate, true)))
    .orderBy(expenses.createdAt);

  if (templates.length === 0) return [];

  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

  const [splits, loggedThisMonth] = await Promise.all([
    db
      .select()
      .from(expenseSplits)
      .where(inArray(expenseSplits.expenseId, templates.map((t) => t.id))),
    db
      .select({
        sourceTemplateId: expenses.sourceTemplateId,
        expenseDate: expenses.expenseDate,
      })
      .from(expenses)
      .where(
        and(
          eq(expenses.groupId, groupId),
          eq(expenses.isTemplate, false),
          sql`${expenses.sourceTemplateId} = ANY(ARRAY[${sql.join(templates.map((t) => sql`${t.id}::uuid`), sql`, `)}])`,
          sql`${expenses.expenseDate} >= ${monthStart}`,
          sql`${expenses.expenseDate} <= ${monthEnd}`
        )
      ),
  ]);

  const splitsByTemplate = new Map<string, typeof splits>();
  for (const s of splits) {
    const arr = splitsByTemplate.get(s.expenseId) ?? [];
    arr.push(s);
    splitsByTemplate.set(s.expenseId, arr);
  }

  const loggedMap = new Map<string, string>(); // templateId → expenseDate
  for (const row of loggedThisMonth) {
    if (row.sourceTemplateId) loggedMap.set(row.sourceTemplateId, row.expenseDate);
  }

  return templates.map((t) => ({
    template: t,
    splits: splitsByTemplate.get(t.id) ?? [],
    loggedThisMonth: loggedMap.has(t.id),
    lastLoggedDate: loggedMap.get(t.id) ?? null,
  }));
}

export async function getExpenseWithSplits(expenseId: string) {
  const user = await getCurrentUser();
  if (!user) return null;

  const [expense] = await db.select().from(expenses).where(eq(expenses.id, expenseId));
  if (!expense) return null;

  const membership = await getMembership(expense.groupId, user.id);
  if (!membership) return null;

  const splits = await db
    .select()
    .from(expenseSplits)
    .where(eq(expenseSplits.expenseId, expenseId));

  return { expense, splits };
}

export async function getTemplateWithSplits(templateId: string) {
  const user = await getCurrentUser();
  if (!user) return null;

  const [template] = await db.select().from(expenses).where(
    and(eq(expenses.id, templateId), eq(expenses.isTemplate, true))
  );
  if (!template) return null;

  const membership = await getMembership(template.groupId, user.id);
  if (!membership) return null;

  const splits = await db.select().from(expenseSplits)
    .where(eq(expenseSplits.expenseId, templateId));

  return { template, splits };
}

export async function getMonthlyExpenseSummary(groupId: string) {
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

  const monthExpenses = await db
    .select()
    .from(expenses)
    .where(
      and(
        eq(expenses.groupId, groupId),
        eq(expenses.isTemplate, false),
        sql`${expenses.expenseDate} >= ${monthStart}`,
        sql`${expenses.expenseDate} <= ${monthEnd}`
      )
    );

  if (monthExpenses.length === 0) return { total: 0, byMember: {} as Record<string, number>, byPayer: {} as Record<string, number>, monthLabel: "", expenseIds: [] as string[] };

  const monthLabel = now.toLocaleString("en-IN", { month: "long", year: "numeric" });
  const total = monthExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const expenseIds = monthExpenses.map((e) => e.id);

  // Per-payer: amount paid this month
  const byPayer: Record<string, number> = {};
  for (const e of monthExpenses) {
    byPayer[e.paidByMemberId] = (byPayer[e.paidByMemberId] ?? 0) + Number(e.amount);
  }

  const splits = expenseIds.length > 0
    ? await db.select().from(expenseSplits).where(inArray(expenseSplits.expenseId, expenseIds))
    : [];

  // Per-member: amount owed this month
  const byMember: Record<string, number> = {};
  for (const s of splits) {
    byMember[s.memberId] = (byMember[s.memberId] ?? 0) + Number(s.shareAmount);
  }

  return { total, byMember, byPayer, monthLabel, expenseIds };
}

export async function getGroupExpensesWithSplits(groupId: string) {
  const user = await getCurrentUser();
  if (!user) return [];

  const membership = await getMembership(groupId, user.id);
  if (!membership) return [];

  const groupExpenses = await db
    .select()
    .from(expenses)
    .where(eq(expenses.groupId, groupId))
    .orderBy(desc(expenses.expenseDate), desc(expenses.createdAt));

  if (groupExpenses.length === 0) return [];

  const splits = await db
    .select()
    .from(expenseSplits)
    .where(inArray(expenseSplits.expenseId, groupExpenses.map((e) => e.id)));

  const splitsByExpense = new Map<string, typeof splits>();
  for (const s of splits) {
    const arr = splitsByExpense.get(s.expenseId) ?? [];
    arr.push(s);
    splitsByExpense.set(s.expenseId, arr);
  }

  return groupExpenses.map((expense) => ({
    expense,
    splits: splitsByExpense.get(expense.id) ?? [],
  }));
}
