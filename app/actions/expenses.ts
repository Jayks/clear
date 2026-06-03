"use server";

import { db } from "@/lib/db/client";
import { expenses } from "@/lib/db/schema/expenses";
import { expenseSplits } from "@/lib/db/schema/expense-splits";
import { groupMembers } from "@/lib/db/schema/group-members";
import { addExpenseSchema, addTemplateSchema, type AddExpenseInput, type AddTemplateInput } from "@/lib/validations/expense";
import { computeSplits } from "@/lib/splits/compute";
import { eq, and, inArray } from "drizzle-orm";
import { getCurrentUser, getMembership } from "@/lib/db/queries/auth";
import { getGroupTemplates } from "@/lib/db/queries/expenses";
import { revalidatePath, revalidateTag } from "next/cache";
import { sendExpenseNotification } from "@/lib/notifications/send-expense-notification";
import { sendPushToMembers } from "@/lib/notifications/send-push-notification";
import { canAddExpense, canUseNonEqualSplit, canUseTemplates } from "@/lib/subscription/gates";

async function validateSplitMembers(groupId: string, splits: { memberId: string }[]) {
  const ids = [...new Set(splits.map((s) => s.memberId))];
  if (ids.length === 0) return false;
  const rows = await db.select({ id: groupMembers.id }).from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), inArray(groupMembers.id, ids)));
  return rows.length === ids.length;
}

export async function addExpense(input: AddExpenseInput) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" } as const;

  const parsed = addExpenseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" } as const;

  const { groupId, paidByMemberId, description, category, customCategory, amount, currency, expenseDate, endDate, notes, splitMode, splits } = parsed.data;

  const membership = await getMembership(groupId, user.id);
  if (!membership) return { ok: false, error: "Not a member" } as const;

  const [paidByMember] = await db.select({ id: groupMembers.id }).from(groupMembers)
    .where(and(eq(groupMembers.id, paidByMemberId), eq(groupMembers.groupId, groupId)));
  if (!paidByMember) return { ok: false, error: "Invalid member" } as const;

  const validMembers = await validateSplitMembers(groupId, splits);
  if (!validMembers) return { ok: false, error: "Invalid split members" } as const;

  const result = computeSplits(splitMode, amount, splits);
  if (!result.ok) return { ok: false, error: result.error } as const;

  try {
    if (!(await canAddExpense(groupId)))
      return { ok: false, error: "Free plan allows up to 50 expenses per group. Upgrade to Clear Plus for unlimited expenses." } as const;

    if (splitMode !== "equal" && !(await canUseNonEqualSplit(groupId)))
      return { ok: false, error: "Advanced splits require Clear Plus. Upgrade to use exact, percentage, or share splits." } as const;

    // C-7 fix: wrap expense + splits in a transaction so a failed splits INSERT
    // cannot leave an orphaned expense row with no splits (corrupted balances).
    const expense = await db.transaction(async (tx) => {
      const [exp] = await tx.insert(expenses).values({
        groupId,
        paidByMemberId,
        description,
        category,
        customCategory: customCategory ?? null,
        amount: String(amount),
        currency,
        expenseDate,
        endDate: endDate || null,
        notes: notes || null,
        createdByUserId: user.id,
      }).returning();

      await tx.insert(expenseSplits).values(
        result.splits.map((s) => ({
          groupId,
          expenseId: exp.id,
          memberId: s.memberId,
          shareAmount: String(s.shareAmount),
          splitType: splitMode,
          splitValue: s.splitValue != null ? String(s.splitValue) : null,
        }))
      );

      return exp;
    });

    revalidatePath(`/groups/${groupId}`, "layout");
    revalidateTag(`balances-${groupId}`, "max");

    const notifyParams = {
      groupId,
      description,
      amount,
      currency,
      actorName: membership.displayName ?? "A member",
      actorUserId: user.id,
    };
    await Promise.all([
      sendExpenseNotification(notifyParams).catch(() => {}),
      sendPushToMembers(notifyParams).catch(() => {}),
    ]);

    return { ok: true, expenseId: expense.id } as const;
  } catch {
    return { ok: false, error: "Failed to add expense" } as const;
  }
}

export async function updateExpense(expenseId: string, input: AddExpenseInput) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" } as const;

  const parsed = addExpenseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" } as const;

  const { groupId, paidByMemberId, description, category, customCategory, amount, currency, expenseDate, endDate, notes, splitMode, splits } = parsed.data;

  const [expense] = await db.select().from(expenses).where(eq(expenses.id, expenseId));
  if (!expense) return { ok: false, error: "Not found" } as const;
  if (expense.groupId !== groupId) return { ok: false, error: "Not found" } as const;

  const membership = await getMembership(groupId, user.id);
  if (!membership) return { ok: false, error: "Not a member" } as const;
  if (expense.createdByUserId !== user.id && membership.role !== "admin")
    return { ok: false, error: "Not authorized" } as const;

  const [paidByMember] = await db.select({ id: groupMembers.id }).from(groupMembers)
    .where(and(eq(groupMembers.id, paidByMemberId), eq(groupMembers.groupId, groupId)));
  if (!paidByMember) return { ok: false, error: "Invalid member" } as const;

  const validMembers = await validateSplitMembers(groupId, splits);
  if (!validMembers) return { ok: false, error: "Invalid split members" } as const;

  const result = computeSplits(splitMode, amount, splits);
  if (!result.ok) return { ok: false, error: result.error } as const;

  // E-1 fix: wrap all three DB writes in a transaction so a failed split
  // INSERT cannot leave the expense with no splits (corrupting balances).
  try {
    await db.transaction(async (tx) => {
      await tx.update(expenses).set({
        paidByMemberId, description, category,
        customCategory: customCategory ?? null,
        amount: String(amount), currency, expenseDate,
        endDate: endDate || null,
        notes: notes || null,
        updatedByUserId: user.id,
        updatedAt: new Date(),
      }).where(eq(expenses.id, expenseId));

      await tx.delete(expenseSplits).where(eq(expenseSplits.expenseId, expenseId));
      await tx.insert(expenseSplits).values(
        result.splits.map((s) => ({
          groupId,
          expenseId,
          memberId: s.memberId,
          shareAmount: String(s.shareAmount),
          splitType: splitMode,
          splitValue: s.splitValue != null ? String(s.splitValue) : null,
        }))
      );
    });

    revalidatePath(`/groups/${groupId}`, "layout");
    revalidateTag(`balances-${groupId}`, "max");
    return { ok: true } as const;
  } catch {
    return { ok: false, error: "Failed to update expense" } as const;
  }
}

export async function duplicateExpense(expenseId: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" } as const;

  const [expense] = await db.select().from(expenses).where(eq(expenses.id, expenseId));
  if (!expense) return { ok: false, error: "Not found" } as const;

  const membership = await getMembership(expense.groupId, user.id);
  if (!membership) return { ok: false, error: "Not a member" } as const;
  if (membership.role !== "admin") return { ok: false, error: "Not authorized" } as const;

  // E-3a fix: duplicating creates a real (non-template) expense that counts
  // toward the free-plan 50-expense limit, but the check was missing here.
  if (!(await canAddExpense(expense.groupId)))
    return { ok: false, error: "Free plan allows up to 50 expenses per group. Upgrade to Clear Plus for unlimited expenses." } as const;

  const originalSplits = await db.select().from(expenseSplits)
    .where(eq(expenseSplits.expenseId, expenseId));

  const today = new Date().toISOString().split("T")[0];

  // C-7 fix: wrap both INSERTs in a transaction.
  try {
    const newExpense = await db.transaction(async (tx) => {
      const [exp] = await tx.insert(expenses).values({
        groupId: expense.groupId,
        paidByMemberId: expense.paidByMemberId,
        description: `${expense.description} (copy)`,
        category: expense.category,
        amount: expense.amount,
        currency: expense.currency,
        expenseDate: today,
        endDate: expense.endDate,
        notes: expense.notes,
        createdByUserId: user.id,
      }).returning();

      if (originalSplits.length > 0) {
        await tx.insert(expenseSplits).values(
          originalSplits.map((s) => ({
            groupId: expense.groupId,
            expenseId: exp.id,
            memberId: s.memberId,
            shareAmount: s.shareAmount,
            splitType: s.splitType,
            splitValue: s.splitValue,
          }))
        );
      }

      return exp;
    });

    revalidatePath(`/groups/${expense.groupId}`, "layout");
    revalidateTag(`balances-${expense.groupId}`, "max");
    return { ok: true, expenseId: newExpense.id } as const;
  } catch {
    return { ok: false, error: "Failed to duplicate expense" } as const;
  }
}

export async function deleteExpense(expenseId: string, groupId: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" } as const;

  const [expense] = await db.select().from(expenses).where(eq(expenses.id, expenseId));
  if (!expense || expense.groupId !== groupId) return { ok: false, error: "Not found" } as const;

  const membership = await getMembership(groupId, user.id);
  if (!membership) return { ok: false, error: "Not a member" } as const;
  if (expense.createdByUserId !== user.id && membership.role !== "admin")
    return { ok: false, error: "Not authorized" } as const;

  try {
    await db.delete(expenses).where(eq(expenses.id, expenseId));
    revalidatePath(`/groups/${groupId}`, "layout");
    revalidateTag(`balances-${groupId}`, "max");
    return { ok: true } as const;
  } catch {
    return { ok: false, error: "Failed to delete expense" } as const;
  }
}

export async function createExpenseTemplate(input: AddTemplateInput) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" } as const;

  const parsed = addTemplateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" } as const;

  const { groupId, paidByMemberId, description, category, amount, currency, recurrence, splitMode, splits } = parsed.data;

  const membership = await getMembership(groupId, user.id);
  if (!membership || membership.role !== "admin")
    return { ok: false, error: "Only group admins can create templates" } as const;

  if (!(await canUseTemplates(groupId)))
    return { ok: false, error: "Recurring templates require Clear Plus." } as const;

  const [paidByMember] = await db.select({ id: groupMembers.id }).from(groupMembers)
    .where(and(eq(groupMembers.id, paidByMemberId), eq(groupMembers.groupId, groupId)));
  if (!paidByMember) return { ok: false, error: "Invalid member" } as const;

  const ids = [...new Set(splits.map((s) => s.memberId))];
  const memberRows = await db.select({ id: groupMembers.id }).from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), inArray(groupMembers.id, ids)));
  if (memberRows.length !== ids.length) return { ok: false, error: "Invalid split members" } as const;

  const result = computeSplits(splitMode, amount, splits);
  if (!result.ok) return { ok: false, error: result.error } as const;

  const today = new Date().toISOString().split("T")[0];

  // C-7 fix: wrap both INSERTs in a transaction.
  try {
    const template = await db.transaction(async (tx) => {
      const [t] = await tx.insert(expenses).values({
        groupId,
        paidByMemberId,
        description,
        category,
        amount: String(amount),
        currency,
        expenseDate: today,
        isTemplate: true,
        recurrence,
        createdByUserId: user.id,
      }).returning();

      await tx.insert(expenseSplits).values(
        result.splits.map((s) => ({
          groupId,
          expenseId: t.id,
          memberId: s.memberId,
          shareAmount: String(s.shareAmount),
          splitType: splitMode,
          splitValue: s.splitValue != null ? String(s.splitValue) : null,
        }))
      );

      return t;
    });

    revalidatePath(`/groups/${groupId}/expenses`, "layout");
    return { ok: true, templateId: template.id } as const;
  } catch {
    return { ok: false, error: "Failed to create template" } as const;
  }
}

export async function logFromTemplate(templateId: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" } as const;

  const [template] = await db.select().from(expenses).where(
    and(eq(expenses.id, templateId), eq(expenses.isTemplate, true))
  );
  if (!template) return { ok: false, error: "Template not found" } as const;

  const membership = await getMembership(template.groupId, user.id);
  if (!membership) return { ok: false, error: "Not a member" } as const;

  if (!(await canUseTemplates(template.groupId)))
    return { ok: false, error: "Recurring templates require Clear Plus." } as const;

  // E-3b fix: logged instances count toward the free-plan expense limit.
  if (!(await canAddExpense(template.groupId)))
    return { ok: false, error: "Free plan allows up to 50 expenses per group. Upgrade to Clear Plus for unlimited expenses." } as const;

  const templateSplits = await db.select().from(expenseSplits)
    .where(eq(expenseSplits.expenseId, templateId));

  // Date to the 1st of the current month — keeps recurring expenses cleanly bucketed by month
  const now = new Date();
  const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

  // E-4 fix (updated): move the double-log guard INSIDE the transaction so it
  // is atomic with the INSERT.  The original guard ran outside the transaction,
  // creating a race window where two concurrent requests both passed the SELECT
  // check before either INSERT committed — matching autoLogDueTemplates (line 496).
  try {
    const logged = await db.transaction(async (tx) => {
      // Guard inside tx: concurrent invocation that already inserted will be
      // visible here and cause this call to return null (no-op).
      const [alreadyLogged] = await tx
        .select({ id: expenses.id })
        .from(expenses)
        .where(
          and(
            eq(expenses.sourceTemplateId, templateId),
            eq(expenses.expenseDate, firstOfMonth),
            eq(expenses.isTemplate, false),
          )
        )
        .limit(1);
      if (alreadyLogged) return null; // concurrent request already logged this template

      const [exp] = await tx.insert(expenses).values({
        groupId: template.groupId,
        paidByMemberId: template.paidByMemberId,
        description: template.description,
        category: template.category,
        amount: template.amount,
        currency: template.currency,
        expenseDate: firstOfMonth,
        notes: template.notes,
        isTemplate: false,
        sourceTemplateId: templateId,
        createdByUserId: user.id,
      }).returning();

      if (templateSplits.length > 0) {
        await tx.insert(expenseSplits).values(
          templateSplits.map((s) => ({
            groupId: template.groupId,
            expenseId: exp.id,
            memberId: s.memberId,
            shareAmount: s.shareAmount,
            splitType: s.splitType,
            splitValue: s.splitValue,
          }))
        );
      }

      return exp;
    });

    if (!logged) {
      // null = alreadyLogged guard fired inside the transaction
      return { ok: false, error: "This template has already been logged for this month" } as const;
    }

    revalidatePath(`/groups/${template.groupId}`, "layout");
    revalidateTag(`balances-${template.groupId}`, "max");
    return { ok: true, expenseId: logged.id } as const;
  } catch {
    return { ok: false, error: "Failed to log expense" } as const;
  }
}

export async function updateTemplate(templateId: string, input: AddTemplateInput) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" } as const;

  const parsed = addTemplateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" } as const;

  const [template] = await db.select().from(expenses).where(
    and(eq(expenses.id, templateId), eq(expenses.isTemplate, true))
  );
  if (!template) return { ok: false, error: "Template not found" } as const;

  const membership = await getMembership(template.groupId, user.id);
  if (!membership || membership.role !== "admin")
    return { ok: false, error: "Only group admins can edit templates" } as const;

  if (!(await canUseTemplates(template.groupId)))
    return { ok: false, error: "Recurring templates require Clear Plus." } as const;

  const { paidByMemberId, description, category, amount, recurrence, splitMode, splits } = parsed.data;

  const [paidByMember] = await db.select({ id: groupMembers.id }).from(groupMembers)
    .where(and(eq(groupMembers.id, paidByMemberId), eq(groupMembers.groupId, template.groupId)));
  if (!paidByMember) return { ok: false, error: "Invalid member" } as const;

  const ids = [...new Set(splits.map((s) => s.memberId))];
  const memberRows = await db.select({ id: groupMembers.id }).from(groupMembers)
    .where(and(eq(groupMembers.groupId, template.groupId), inArray(groupMembers.id, ids)));
  if (memberRows.length !== ids.length) return { ok: false, error: "Invalid split members" } as const;

  const result = computeSplits(splitMode, amount, splits);
  if (!result.ok) return { ok: false, error: result.error } as const;

  // E-2 fix: same atomicity issue as updateExpense — wrap in a transaction so
  // a failed split INSERT can't leave the template with no splits.
  try {
    await db.transaction(async (tx) => {
      await tx.update(expenses).set({
        paidByMemberId, description, category,
        amount: String(amount), recurrence,
        updatedAt: new Date(),
      }).where(eq(expenses.id, templateId));

      await tx.delete(expenseSplits).where(eq(expenseSplits.expenseId, templateId));
      await tx.insert(expenseSplits).values(
        result.splits.map((s) => ({
          groupId: template.groupId,
          expenseId: templateId,
          memberId: s.memberId,
          shareAmount: String(s.shareAmount),
          splitType: splitMode,
          splitValue: s.splitValue != null ? String(s.splitValue) : null,
        }))
      );
    });

    revalidatePath(`/groups/${template.groupId}/expenses`, "layout");
    return { ok: true } as const;
  } catch {
    return { ok: false, error: "Failed to update template" } as const;
  }
}

export async function autoLogDueTemplates(groupId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  const membership = await getMembership(groupId, user.id);
  if (!membership) return;

  if (!(await canUseTemplates(groupId))) return;
  // E-3c fix: auto-log silently skips when the free-plan limit is reached
  // rather than pushing past it on every page load.
  if (!(await canAddExpense(groupId))) return;

  const templates = await getGroupTemplates(groupId);
  const due = templates.filter((t) => !t.loggedThisMonth);
  if (due.length === 0) return;

  const now = new Date();
  const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

  for (const { template, splits } of due) {
    // C-7 fix: each template iteration is its own transaction so a failed splits
    // INSERT for one template rolls back only that expense — others are unaffected.
    // C-7a fix: also guard against concurrent auto-log calls (two serverless
    // instances loading the same nest page simultaneously both see
    // loggedThisMonth=false from getGroupTemplates, then both try to insert for
    // the same template+month).  The SELECT runs inside the transaction so it is
    // atomic with the INSERT — a concurrent commit is visible to this read.
    try {
      await db.transaction(async (tx) => {
        const [alreadyLogged] = await tx
          .select({ id: expenses.id })
          .from(expenses)
          .where(
            and(
              eq(expenses.sourceTemplateId, template.id),
              eq(expenses.expenseDate, firstOfMonth),
              eq(expenses.isTemplate, false),
            )
          )
          .limit(1);
        if (alreadyLogged) return; // concurrent request already logged this template

        const [logged] = await tx.insert(expenses).values({
          groupId: template.groupId,
          paidByMemberId: template.paidByMemberId,
          description: template.description,
          category: template.category,
          amount: template.amount,
          currency: template.currency,
          expenseDate: firstOfMonth,
          notes: template.notes,
          isTemplate: false,
          sourceTemplateId: template.id,
          createdByUserId: user.id,
        }).returning();

        if (splits.length > 0) {
          await tx.insert(expenseSplits).values(
            splits.map((s) => ({
              groupId: template.groupId,
              expenseId: logged.id,
              memberId: s.memberId,
              shareAmount: s.shareAmount,
              splitType: s.splitType,
              splitValue: s.splitValue,
            }))
          );
        }
      });
    } catch {
      // Skip this template — don't block page load on a single failure
    }
  }

  revalidatePath(`/groups/${groupId}`, "layout");
  revalidateTag(`balances-${groupId}`, "max");
}

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export async function batchLogTemplates(groupId: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" } as const;

  const membership = await getMembership(groupId, user.id);
  if (!membership) return { ok: false, error: "Not a member" } as const;

  if (!(await canUseTemplates(groupId)))
    return { ok: false, error: "Recurring templates require Clear Plus." } as const;

  // E-3d fix: batch log was the last path that could push past the 50-expense limit.
  if (!(await canAddExpense(groupId)))
    return { ok: false, error: "Free plan allows up to 50 expenses per group. Upgrade to Clear Plus for unlimited expenses." } as const;

  const templates = await getGroupTemplates(groupId);
  const due = templates.filter((t) => !t.loggedThisMonth);
  if (due.length === 0) return { ok: true, count: 0, month: "" } as const;

  const now = new Date();
  const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const month = MONTH_NAMES[now.getMonth()];

  let count = 0;
  for (const { template, splits } of due) {
    // C-7 fix: each template is its own transaction — same reasoning as autoLogDueTemplates.
    // C-7a fix: same concurrent double-log guard as autoLogDueTemplates — the
    // batch-log button can also be tapped twice rapidly or by two admins at once.
    // Hoist `didLog` so count++ only fires when we actually inserted.
    try {
      let didLog = false;
      await db.transaction(async (tx) => {
        const [alreadyLogged] = await tx
          .select({ id: expenses.id })
          .from(expenses)
          .where(
            and(
              eq(expenses.sourceTemplateId, template.id),
              eq(expenses.expenseDate, firstOfMonth),
              eq(expenses.isTemplate, false),
            )
          )
          .limit(1);
        if (alreadyLogged) return; // already logged — skip without counting

        const [logged] = await tx.insert(expenses).values({
          groupId: template.groupId,
          paidByMemberId: template.paidByMemberId,
          description: template.description,
          category: template.category,
          amount: template.amount,
          currency: template.currency,
          expenseDate: firstOfMonth,
          notes: template.notes,
          isTemplate: false,
          sourceTemplateId: template.id,
          createdByUserId: user.id,
        }).returning();

        if (splits.length > 0) {
          await tx.insert(expenseSplits).values(
            splits.map((s) => ({
              groupId: template.groupId,
              expenseId: logged.id,
              memberId: s.memberId,
              shareAmount: s.shareAmount,
              splitType: s.splitType,
              splitValue: s.splitValue,
            }))
          );
        }
        didLog = true;
      });
      if (didLog) count++;
    } catch {
      // Skip failed templates, don't abort the batch
    }
  }

  revalidatePath(`/groups/${groupId}`, "layout");
  revalidateTag(`balances-${groupId}`, "max");
  return { ok: true, count, month } as const;
}

export async function fetchExpenseSplitsAction(expenseId: string) {
  const user = await getCurrentUser();
  if (!user) return null;

  const [expense] = await db.select().from(expenses).where(eq(expenses.id, expenseId));
  if (!expense) return null;

  const membership = await getMembership(expense.groupId, user.id);
  if (!membership) return null;

  return await db.select().from(expenseSplits).where(eq(expenseSplits.expenseId, expenseId));
}

export async function deleteTemplate(templateId: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" } as const;

  const [template] = await db.select().from(expenses).where(
    and(eq(expenses.id, templateId), eq(expenses.isTemplate, true))
  );
  if (!template) return { ok: false, error: "Not found" } as const;

  const membership = await getMembership(template.groupId, user.id);
  if (!membership || membership.role !== "admin")
    return { ok: false, error: "Not authorized" } as const;

  try {
    await db.delete(expenses).where(eq(expenses.id, templateId));
    revalidatePath(`/groups/${template.groupId}/expenses`, "layout");
    return { ok: true } as const;
  } catch {
    return { ok: false, error: "Failed to delete template" } as const;
  }
}
