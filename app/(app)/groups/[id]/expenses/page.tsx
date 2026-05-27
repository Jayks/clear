import { notFound } from "next/navigation";
import { getGroupWithMembers } from "@/lib/db/queries/groups";
import { getExpenses, getGroupTemplates } from "@/lib/db/queries/expenses";
import { getGroupName } from "@/lib/db/queries/meta";
import { getExpenseInteractionCounts } from "@/lib/db/queries/interactions";
import { ArrowLeft, Plus, Receipt } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { ExpenseFilters } from "@/components/expense/expense-filters";
import { ChatImportDialog } from "@/components/expense/chat-import-dialog";
import { ExpenseQuickAddFab } from "@/components/expense/expense-quick-add-fab";
import { TemplateSection } from "./template-section";
import { NestHint } from "@/components/shared/nest-hint";
import { ExportCsvButton } from "./export-csv-button";
import { getExpenseNudge, canUseTemplates, canUseAI } from "@/lib/subscription/gates";
import { PlanNudgeBanner } from "@/components/shared/plan-nudge-banner";
import { formatCurrency } from "@/lib/utils";
import { getCurrentUser } from "@/lib/db/queries/auth";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const name = await getGroupName(id);
  return { title: name ? `Expenses — ${name} | Clear` : "Clear" };
}

export default async function ExpensesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [data, expenses, templates, expenseNudge, templatesAllowed, user] = await Promise.all([
    getGroupWithMembers(id),
    getExpenses(id),
    getGroupTemplates(id),
    getExpenseNudge(id),
    canUseTemplates(id),
    getCurrentUser(),
  ]);
  const aiAllowed = user ? await canUseAI(user.id) : false;
  if (!data) notFound();

  const { group, members, currentMember, currentUser } = data;
  const isAdmin = currentMember?.role === "admin";
  const isNest = group.groupType === "nest";
  const currentMemberId = currentMember?.id ?? "";

  // Fetch interaction counts (reactions, comments, disputes) for all expenses on this page
  const interactionCounts = expenses.length > 0
    ? await getExpenseInteractionCounts(expenses.map((e) => e.id), currentMemberId)
    : {};
  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const templateList = isNest ? templates : [];

  return (
    <div className="pb-24 md:pb-0">
      {expenseNudge && <PlanNudgeBanner nudge={expenseNudge} resource="expenses" />}
      {/* Header */}
      <div className="flex items-center gap-2 mb-6 flex-wrap" data-tour="expense-add-btn">
        <Link
          href={`/groups/${id}`}
          className="hidden md:inline-flex items-center gap-1.5 min-h-[44px] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-sm font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center shadow-sm shadow-cyan-500/30 shrink-0">
            <Receipt className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-2xl text-slate-800 dark:text-slate-100" style={{ fontFamily: "var(--font-fraunces)" }}>
            Expenses
          </h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ChatImportDialog
            groupId={id}
            members={members}
            currency={group.defaultCurrency}
            defaultMemberId={currentMember?.id ?? members[0]?.id ?? ""}
            groupStartDate={group.startDate ?? null}
            groupEndDate={group.endDate ?? null}
            canUseAI={aiAllowed}
          />
          {expenses.length > 0 && <ExportCsvButton groupId={id} />}
          <Link
            href={`/groups/${id}/expenses/new`}
            className="inline-flex items-center gap-1.5 bg-gradient-to-br from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white text-sm font-medium rounded-xl px-4 py-2 shadow-md shadow-cyan-500/25 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add
          </Link>
        </div>
      </div>

      {/* Recurring templates — nest only */}
      {isNest && <NestHint />}
      {isNest && (
        <TemplateSection
          templates={templateList}
          members={members}
          groupId={id}
          currency={group.defaultCurrency}
          isAdmin={isAdmin}
          canUseTemplates={templatesAllowed}
        />
      )}

      {/* Visual divider between recurring and expenses — nest only */}
      {isNest && (
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-slate-200/80 dark:bg-slate-700/50" />
          <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-widest">Expenses</span>
          <div className="flex-1 h-px bg-slate-200/80 dark:bg-slate-700/50" />
        </div>
      )}

      {/* Mobile FAB — opens quick-add sheet on mobile, above bottom nav */}
      <ExpenseQuickAddFab
        groupId={id}
        groupName={group.name}
        groupType={group.groupType}
        currency={group.defaultCurrency}
        members={members}
        groupStartDate={group.startDate}
        groupEndDate={group.endDate}
      />

      {expenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center mb-4 shadow-lg shadow-cyan-500/25">
            <Receipt className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-lg text-slate-800 dark:text-slate-100 mb-1" style={{ fontFamily: "var(--font-fraunces)" }}>
            No expenses yet
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-5">Log your first expense and start tracking.</p>
          <Link
            href={`/groups/${id}/expenses/new`}
            className="inline-flex items-center gap-1.5 bg-gradient-to-br from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white text-sm font-medium rounded-xl px-5 py-2.5 shadow-md shadow-cyan-500/25 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add first expense
          </Link>
        </div>
      ) : (
        <>
          {/* Inline total header — lighter than the old glass card */}
          <div className="flex items-center justify-between mb-4 px-0.5">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {expenses.length} expense{expenses.length !== 1 ? "s" : ""}
            </span>
            <span className="text-lg font-semibold text-slate-800 dark:text-slate-100 tabular" style={{ fontFamily: "var(--font-fraunces)" }}>
              {formatCurrency(total, group.defaultCurrency)}
            </span>
          </div>

          <ExpenseFilters
            expenses={expenses}
            members={members}
            currentUserId={currentUser.id}
            currentMemberId={currentMemberId}
            isAdmin={isAdmin}
            currency={group.defaultCurrency}
            groupStartDate={group.startDate}
            groupEndDate={group.endDate}
            groupByMonth={isNest}
            interactionCounts={interactionCounts}
          />
        </>
      )}
    </div>
  );
}
