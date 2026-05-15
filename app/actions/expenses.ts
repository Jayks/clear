"use server";

import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db/client";
import { expenses } from "@/lib/db/schema/expenses";
import { expenseSplits } from "@/lib/db/schema/expense-splits";
import { groupMembers } from "@/lib/db/schema/group-members";
import { addExpenseSchema, addTemplateSchema, type AddExpenseInput, type AddTemplateInput } from "@/lib/validations/expense";
import { computeSplits } from "@/lib/splits/compute";
import { eq, and, inArray } from "drizzle-orm";
import { getMembership } from "@/lib/db/queries/auth";
import { revalidatePath } from "next/cache";

async function validateSplitMembers(groupId: string, splits: { memberId: string }[]) {
  const ids = [...new Set(splits.map((s) => s.memberId))];
  if (ids.length === 0) return false;
  const rows = await db.select({ id: groupMembers.id }).from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), inArray(groupMembers.id, ids)));
  return rows.length === ids.length;
}

export async function addExpense(input: AddExpenseInput) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
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
    const [expense] = await db.insert(expenses).values({
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

    await db.insert(expenseSplits).values(
      result.splits.map((s) => ({
        expenseId: expense.id,
        memberId: s.memberId,
        shareAmount: String(s.shareAmount),
        splitType: splitMode,
        splitValue: s.splitValue != null ? String(s.splitValue) : null,
      }))
    );

    revalidatePath(`/groups/${groupId}`, "layout");
    return { ok: true, expenseId: expense.id } as const;
  } catch {
    return { ok: false, error: "Failed to add expense" } as const;
  }
}

export async function updateExpense(expenseId: string, input: AddExpenseInput) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
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

  try {
    await db.update(expenses).set({
      paidByMemberId, description, category,
      customCategory: customCategory ?? null,
      amount: String(amount), currency, expenseDate,
      endDate: endDate || null,
      notes: notes || null,
      updatedAt: new Date(),
    }).where(eq(expenses.id, expenseId));

    await db.delete(expenseSplits).where(eq(expenseSplits.expenseId, expenseId));
    await db.insert(expenseSplits).values(
      result.splits.map((s) => ({
        expenseId,
        memberId: s.memberId,
        shareAmount: String(s.shareAmount),
        splitType: splitMode,
        splitValue: s.splitValue != null ? String(s.splitValue) : null,
      }))
    );

    revalidatePath(`/groups/${groupId}`, "layout");
    return { ok: true } as const;
  } catch {
    return { ok: false, error: "Failed to update expense" } as const;
  }
}

export async function duplicateExpense(expenseId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" } as const;

  const [expense] = await db.select().from(expenses).where(eq(expenses.id, expenseId));
  if (!expense) return { ok: false, error: "Not found" } as const;

  const membership = await getMembership(expense.groupId, user.id);
  if (!membership) return { ok: false, error: "Not a member" } as const;
  if (membership.role !== "admin") return { ok: false, error: "Not authorized" } as const;

  const originalSplits = await db.select().from(expenseSplits)
    .where(eq(expenseSplits.expenseId, expenseId));

  const today = new Date().toISOString().split("T")[0];

  try {
    const [newExpense] = await db.insert(expenses).values({
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
      await db.insert(expenseSplits).values(
        originalSplits.map((s) => ({
          expenseId: newExpense.id,
          memberId: s.memberId,
          shareAmount: s.shareAmount,
          splitType: s.splitType,
          splitValue: s.splitValue,
        }))
      );
    }

    revalidatePath(`/groups/${expense.groupId}/expenses`);
    return { ok: true, expenseId: newExpense.id } as const;
  } catch {
    return { ok: false, error: "Failed to duplicate expense" } as const;
  }
}

export async function deleteExpense(expenseId: string, groupId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
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
    return { ok: true } as const;
  } catch {
    return { ok: false, error: "Failed to delete expense" } as const;
  }
}

export async function createExpenseTemplate(input: AddTemplateInput) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" } as const;

  const parsed = addTemplateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" } as const;

  const { groupId, paidByMemberId, description, category, amount, currency, recurrence, splitMode, splits } = parsed.data;

  const membership = await getMembership(groupId, user.id);
  if (!membership) return { ok: false, error: "Not a member" } as const;

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

  try {
    const [template] = await db.insert(expenses).values({
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

    await db.insert(expenseSplits).values(
      result.splits.map((s) => ({
        expenseId: template.id,
        memberId: s.memberId,
        shareAmount: String(s.shareAmount),
        splitType: splitMode,
        splitValue: s.splitValue != null ? String(s.splitValue) : null,
      }))
    );

    revalidatePath(`/groups/${groupId}/expenses`, "layout");
    return { ok: true, templateId: template.id } as const;
  } catch {
    return { ok: false, error: "Failed to create template" } as const;
  }
}

export async function logFromTemplate(templateId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" } as const;

  const [template] = await db.select().from(expenses).where(
    and(eq(expenses.id, templateId), eq(expenses.isTemplate, true))
  );
  if (!template) return { ok: false, error: "Template not found" } as const;

  const membership = await getMembership(template.groupId, user.id);
  if (!membership) return { ok: false, error: "Not a member" } as const;

  const templateSplits = await db.select().from(expenseSplits)
    .where(eq(expenseSplits.expenseId, templateId));

  // Date to the 1st of the current month — keeps recurring expenses cleanly bucketed by month
  const now = new Date();
  const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

  try {
    const [logged] = await db.insert(expenses).values({
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
      await db.insert(expenseSplits).values(
        templateSplits.map((s) => ({
          expenseId: logged.id,
          memberId: s.memberId,
          shareAmount: s.shareAmount,
          splitType: s.splitType,
          splitValue: s.splitValue,
        }))
      );
    }

    revalidatePath(`/groups/${template.groupId}`, "layout");
    return { ok: true, expenseId: logged.id } as const;
  } catch {
    return { ok: false, error: "Failed to log expense" } as const;
  }
}

export async function updateTemplate(templateId: string, input: AddTemplateInput) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" } as const;

  const parsed = addTemplateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" } as const;

  const [template] = await db.select().from(expenses).where(
    and(eq(expenses.id, templateId), eq(expenses.isTemplate, true))
  );
  if (!template) return { ok: false, error: "Template not found" } as const;

  const membership = await getMembership(template.groupId, user.id);
  if (!membership) return { ok: false, error: "Not a member" } as const;

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

  try {
    await db.update(expenses).set({
      paidByMemberId, description, category,
      amount: String(amount), recurrence,
      updatedAt: new Date(),
    }).where(eq(expenses.id, templateId));

    await db.delete(expenseSplits).where(eq(expenseSplits.expenseId, templateId));
    await db.insert(expenseSplits).values(
      result.splits.map((s) => ({
        expenseId: templateId,
        memberId: s.memberId,
        shareAmount: String(s.shareAmount),
        splitType: splitMode,
        splitValue: s.splitValue != null ? String(s.splitValue) : null,
      }))
    );

    revalidatePath(`/groups/${template.groupId}/expenses`, "layout");
    return { ok: true } as const;
  } catch {
    return { ok: false, error: "Failed to update template" } as const;
  }
}

export async function deleteTemplate(templateId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
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
