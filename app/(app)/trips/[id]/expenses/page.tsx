import { notFound } from "next/navigation";
import { getTripWithMembers } from "@/lib/db/queries/trips";
import { getExpenses } from "@/lib/db/queries/expenses";
import { getTripName } from "@/lib/db/queries/meta";
import { ArrowLeft, Plus, Receipt, Download } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { ExpenseFilters } from "@/components/expense/expense-filters";
import { ChatImportDialog } from "@/components/expense/chat-import-dialog";
import { formatCurrency } from "@/lib/utils";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const name = await getTripName(id);
  return { title: name ? `Expenses — ${name} | Wayfare` : "Wayfare" };
}

export default async function ExpensesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [data, expenses] = await Promise.all([
    getTripWithMembers(id),
    getExpenses(id),
  ]);
  if (!data) notFound();

  const { trip, members, currentMember, currentUser } = data;
  const isAdmin = currentMember?.role === "admin";
  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <Link
          href={`/trips/${id}`}
          className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-sm font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
        <h1 className="text-2xl text-slate-800 dark:text-slate-100 flex-1" style={{ fontFamily: "var(--font-fraunces)" }}>
          Expenses
        </h1>
        {/* Action buttons — always on same line as title, icon-only on mobile */}
        <div className="flex items-center gap-2 shrink-0">
          <ChatImportDialog
            tripId={id}
            members={members}
            currency={trip.defaultCurrency}
            defaultMemberId={currentMember?.id ?? members[0]?.id ?? ""}
            tripStartDate={trip.startDate ?? null}
            tripEndDate={trip.endDate ?? null}
          />
          {expenses.length > 0 && (
            <a
              href={`/api/trips/${id}/export`}
              download
              title="Export CSV"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 bg-white/60 hover:bg-white/80 dark:bg-slate-800/60 dark:hover:bg-slate-700/60 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-xl transition-colors"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </a>
          )}
          <Link
            href={`/trips/${id}/expenses/new`}
            data-tour="expense-add-btn"
            className="inline-flex items-center gap-1.5 bg-gradient-to-br from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white text-sm font-medium rounded-xl px-4 py-2 shadow-md shadow-cyan-500/25 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add
          </Link>
        </div>
      </div>

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
            href={`/trips/${id}/expenses/new`}
            className="inline-flex items-center gap-1.5 bg-gradient-to-br from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white text-sm font-medium rounded-xl px-5 py-2.5 shadow-md shadow-cyan-500/25 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add first expense
          </Link>
        </div>
      ) : (
        <>
          {/* Grand total banner */}
          <div className="glass rounded-xl px-4 py-3 flex items-center justify-between mb-4">
            <span className="text-sm text-slate-500 dark:text-slate-400">Total spent</span>
            <span className="text-lg font-semibold text-slate-800 dark:text-slate-100 tabular" style={{ fontFamily: "var(--font-fraunces)" }}>
              {formatCurrency(total, trip.defaultCurrency)}
            </span>
          </div>

          {/* Filter + list (client component) */}
          <ExpenseFilters
            expenses={expenses}
            members={members}
            currentUserId={currentUser.id}
            isAdmin={isAdmin}
            currency={trip.defaultCurrency}
            tripStartDate={trip.startDate}
            tripEndDate={trip.endDate}
          />
        </>
      )}
    </div>
  );
}
