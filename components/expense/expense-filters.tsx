"use client";

import { useState, useMemo } from "react";
import { Search, X, ChevronDown } from "lucide-react";
import type { Expense } from "@/lib/db/schema/expenses";
import type { TripMember } from "@/lib/db/schema/trip-members";
import { CATEGORIES } from "@/lib/categories";
import { SwipeableExpenseCard } from "./swipeable-expense-card";
import { formatCurrency, getMemberName } from "@/lib/utils";
import { CategoryIcon } from "./category-icon";

type SortOption = "date-desc" | "date-asc" | "amount-desc" | "amount-asc";

interface Props {
  expenses: Expense[];
  members: TripMember[];
  currentUserId: string;
  isAdmin: boolean;
  currency: string;
  tripStartDate?: string | null;
  tripEndDate?: string | null;
}

export function ExpenseFilters({ expenses, members, currentUserId, isAdmin, currency, tripStartDate, tripEndDate }: Props) {
  const [search, setSearch]         = useState("");
  const [category, setCategory]     = useState<string | null>(null);
  const [payerId, setPayerId]        = useState<string | null>(null);
  const [dateFrom, setDateFrom]      = useState("");
  const [dateTo, setDateTo]          = useState("");
  const [sort, setSort]              = useState<SortOption>("date-desc");
  // Optimistically removed expense IDs — disappear instantly, restore on error
  const [removedIds, setRemovedIds]  = useState<Set<string>>(new Set());

  function optimisticDelete(expenseId: string) {
    setRemovedIds((prev) => new Set([...prev, expenseId]));
  }

  function restoreDelete(expenseId: string) {
    setRemovedIds((prev) => { const next = new Set(prev); next.delete(expenseId); return next; });
  }

  const usedCategories = useMemo(
    () => [...new Set(expenses.map((e) => e.category))],
    [expenses]
  );

  const payers = useMemo(
    () => members.filter((m) => expenses.some((e) => e.paidByMemberId === m.id)),
    [expenses, members]
  );

  const filtered = useMemo(() => {
    let result = expenses.filter((e) => !removedIds.has(e.id));

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((e) => e.description.toLowerCase().includes(q));
    }
    if (category)  result = result.filter((e) => e.category === category);
    if (payerId)   result = result.filter((e) => e.paidByMemberId === payerId);
    if (dateFrom)  result = result.filter((e) => (e.endDate ?? e.expenseDate) >= dateFrom);
    if (dateTo)    result = result.filter((e) => e.expenseDate <= dateTo);

    result.sort((a, b) => {
      if (sort === "date-desc")   return b.expenseDate.localeCompare(a.expenseDate);
      if (sort === "date-asc")    return a.expenseDate.localeCompare(b.expenseDate);
      if (sort === "amount-desc") return Number(b.amount) - Number(a.amount);
      if (sort === "amount-asc")  return Number(a.amount) - Number(b.amount);
      return 0;
    });

    return result;
  }, [expenses, removedIds, search, category, payerId, dateFrom, dateTo, sort]);

  const filteredTotal = filtered.reduce((sum, e) => sum + Number(e.amount), 0);
  const isFiltered = !!(search || category || payerId || dateFrom || dateTo);

  function clearAll() {
    setSearch(""); setCategory(null); setPayerId(null);
    setDateFrom(""); setDateTo("");
  }

  return (
    <div>
      {/* ── Search + Sort ───────────────────────────────────────── */}
      <div className="flex gap-2 mb-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search expenses…"
            className="w-full pl-9 pr-8 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-400 placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="relative">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="appearance-none pl-3 pr-7 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 focus:outline-none focus:ring-2 focus:ring-cyan-400 text-slate-600 dark:text-slate-300 cursor-pointer"
          >
            <option value="date-desc">Newest</option>
            <option value="date-asc">Oldest</option>
            <option value="amount-desc">Highest</option>
            <option value="amount-asc">Lowest</option>
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* ── Category pills ──────────────────────────────────────── */}
      <div className="flex gap-1.5 flex-wrap mb-2">
        <button
          onClick={() => setCategory(null)}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            !category
              ? "bg-gradient-to-br from-cyan-500 to-teal-500 text-white shadow-sm"
              : "bg-white/60 text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          All
        </button>
        {usedCategories.map((cat) => {
          const catMeta = CATEGORIES.find((c) => c.value === cat);
          if (!catMeta) return null;
          const active = category === cat;
          return (
            <button
              key={cat}
              onClick={() => setCategory(active ? null : cat)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                active
                  ? "bg-gradient-to-br from-cyan-500 to-teal-500 text-white shadow-sm"
                  : "bg-white/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
              }`}
            >
              <catMeta.icon className="w-3 h-3" />
              {catMeta.label}
            </button>
          );
        })}
      </div>

      {/* ── Payer + date range ──────────────────────────────────── */}
      <div className="flex gap-2 flex-wrap mb-3 items-center">
        <div className="relative">
          <select
            value={payerId ?? ""}
            onChange={(e) => setPayerId(e.target.value || null)}
            className="appearance-none pl-3 pr-7 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 focus:outline-none focus:ring-2 focus:ring-cyan-400 text-slate-600 dark:text-slate-300 cursor-pointer"
          >
            <option value="">All payers</option>
            {payers.map((m) => (
              <option key={m.id} value={m.id}>{getMemberName(m)}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
        </div>

        <input
          type="date"
          value={dateFrom}
          min={tripStartDate ?? undefined}
          max={dateTo || (tripEndDate ?? undefined)}
          onChange={(e) => setDateFrom(e.target.value)}
          className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 focus:outline-none focus:ring-2 focus:ring-cyan-400 text-slate-500 dark:text-slate-400"
        />
        <span className="text-slate-400 text-xs">to</span>
        <input
          type="date"
          value={dateTo}
          min={dateFrom || (tripStartDate ?? undefined)}
          max={tripEndDate ?? undefined}
          onChange={(e) => setDateTo(e.target.value)}
          className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 focus:outline-none focus:ring-2 focus:ring-cyan-400 text-slate-500 dark:text-slate-400"
        />

        {isFiltered && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors"
          >
            <X className="w-3 h-3" />
            Clear
          </button>
        )}
      </div>

      {/* ── Results bar ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-3 px-0.5">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {isFiltered
            ? `${filtered.length} of ${expenses.length} expenses`
            : `${expenses.length} expenses`}
        </p>
        <p
          className="text-sm font-semibold text-slate-700 dark:text-slate-200 tabular"
          style={{ fontFamily: "var(--font-fraunces)" }}
        >
          {formatCurrency(filteredTotal, currency)}
        </p>
      </div>

      {/* ── Expense list ────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="py-14 text-center text-slate-400 dark:text-slate-500 text-sm glass rounded-xl">
          No expenses match your filters.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((expense) => (
            <SwipeableExpenseCard
              key={expense.id}
              expense={expense}
              members={members}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              onDelete={(id) => { optimisticDelete(id); }}
              onDeleteFail={restoreDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
