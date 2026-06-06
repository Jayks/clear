"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Search, X, ChevronDown, ChevronLeft, ChevronRight, CalendarDays, LayoutList, List } from "lucide-react";
import { differenceInDays, parseISO, format, addDays } from "date-fns";
import { motion, useInView, useMotionValue, useMotionValueEvent, animate } from "framer-motion";
import type { Expense } from "@/lib/db/schema/expenses";
import type { GroupMember } from "@/lib/db/schema/group-members";
import type { ExpenseInteractionCount } from "@/lib/db/queries/interactions";
import { getCategory, CATEGORY_HEX } from "@/lib/categories";
import { SwipeableExpenseCard } from "./swipeable-expense-card";
import { formatCurrency, getMemberName } from "@/lib/utils";
import { CategoryIcon } from "./category-icon";
import { SwipeHint } from "@/components/shared/swipe-hint";
import { AnimatedList } from "@/components/shared/animated-list";

type SortOption = "date-desc" | "date-asc" | "amount-desc" | "amount-asc";

interface Props {
  expenses: Expense[];
  members: GroupMember[];
  currentUserId: string;
  currentMemberId?: string;
  isAdmin: boolean;
  currency: string;
  groupStartDate?: string | null;
  groupEndDate?: string | null;
  groupByMonth?: boolean;
  interactionCounts?: Record<string, ExpenseInteractionCount>;
}

const ITEMS_PER_PAGE = 10;
// Groups with ≤ this many total expenses skip pagination and show everything.
const PAGE_ALL_THRESHOLD = 20;

export function ExpenseFilters({ expenses, members, currentUserId, currentMemberId, isAdmin, currency, groupStartDate, groupEndDate, groupByMonth, interactionCounts }: Props) {
  const [search, setSearch]        = useState("");
  const [category, setCategory]    = useState<string | null>(null);
  const [payerId, setPayerId]       = useState<string | null>(null);
  const [dateFrom, setDateFrom]     = useState("");
  const [dateTo, setDateTo]         = useState("");
  const [sort, setSort]             = useState<SortOption>("date-desc");
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode]     = useState<"full" | "compact" | "timeline">("full");

  // Restore view mode from localStorage after hydration
  useEffect(() => {
    const saved = localStorage.getItem("clear_expense_view_mode") as "full" | "compact" | "timeline" | null;
    if (saved) setViewMode(saved);
  }, []);

  // Tour: auto-switch view mode when requested
  useEffect(() => {
    const toTimeline = () => setAndSaveViewMode("timeline");
    const toFull     = () => setAndSaveViewMode("full");
    window.addEventListener("tour-switch-timeline-view", toTimeline);
    window.addEventListener("tour-switch-full-view",     toFull);
    return () => {
      window.removeEventListener("tour-switch-timeline-view", toTimeline);
      window.removeEventListener("tour-switch-full-view",     toFull);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function setAndSaveViewMode(mode: "full" | "compact" | "timeline") {
    setViewMode(mode);
    localStorage.setItem("clear_expense_view_mode", mode);
  }

  // Reset to page 1 whenever filters, sort, or the expense list length changes (e.g. after adding/deleting)
  useEffect(() => { setCurrentPage(1); }, [search, category, payerId, dateFrom, dateTo, sort, expenses.length]);

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
      result = result.filter((e) =>
        e.description.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        (e.customCategory?.toLowerCase().includes(q) ?? false)
      );
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

  const isSearching = !!search.trim();
  // Small groups (≤ PAGE_ALL_THRESHOLD total expenses) skip pagination entirely.
  const usePagination = expenses.length > PAGE_ALL_THRESHOLD;
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const page = Math.min(currentPage, Math.max(1, totalPages));
  const pageStart = (page - 1) * ITEMS_PER_PAGE;
  const pageItems = filtered.slice(pageStart, pageStart + ITEMS_PER_PAGE);
  const displayItems = isSearching ? filtered.slice(0, 50) : usePagination ? pageItems : filtered;

  const filteredTotal = displayItems.reduce((sum, e) => sum + Number(e.amount), 0);
  const isFiltered = !!(search || category || payerId || dateFrom || dateTo);

  // Timeline: re-sort `filtered` chronologically regardless of `sort` state
  const timelineGroups = useMemo(() => {
    const sorted = [...filtered].sort((a, b) => a.expenseDate.localeCompare(b.expenseDate));
    const map = new Map<string, Expense[]>();
    for (const e of sorted) {
      const day = e.expenseDate ?? "unknown";
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(e);
    }
    return [...map.entries()];
  }, [filtered]);

  function clearAll() {
    setSearch(""); setCategory(null); setPayerId(null);
    setDateFrom(""); setDateTo("");
  }

  // Shared card renderer
  const renderCard = (expense: Expense) => (
    <SwipeableExpenseCard
      key={expense.id}
      expense={expense}
      members={members}
      currentUserId={currentUserId}
      currentMemberId={currentMemberId}
      isAdmin={isAdmin}
      onDelete={(id) => optimisticDelete(id)}
      onDeleteFail={restoreDelete}
      interactionCount={interactionCounts?.[expense.id]}
      compact={viewMode === "compact"}
    />
  );

  return (
    <div>
      {/*
        Tour spotlight target — wraps search/filter controls + first 2 expense
        cards so the spotlight is focused. Cards 3+ render outside this div and
        are dimmed by the tour backdrop, visible as context but not spotlighted.
      */}
      <div data-tour="expense-list-header">

        {/* ── View toggle — own row, icon + label, cyan active highlight ── */}
        <div className="flex items-center justify-end mb-3">
          <div className="flex rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0">
            {([
              { mode: "full",     Icon: LayoutList,  label: "Full"     },
              { mode: "compact",  Icon: List,         label: "Compact"  },
              ...(!groupByMonth ? [{ mode: "timeline" as const, Icon: CalendarDays, label: "Timeline" }] : []),
            ] as { mode: "full" | "compact" | "timeline"; Icon: React.ElementType; label: string }[]).map(({ mode, Icon, label }, idx) => (
              <div key={mode} className="flex">
                {idx > 0 && <div className="w-px bg-slate-200 dark:bg-slate-700" />}
                <button
                  type="button"
                  onClick={() => setAndSaveViewMode(mode)}
                  className={`flex items-center gap-1.5 px-2.5 py-2 text-xs font-medium transition-colors ${
                    viewMode === mode
                      ? "bg-cyan-50 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300"
                      : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  {label}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ── Search (always) + Sort (hidden in timeline — order is fixed) ─ */}
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
          {viewMode !== "timeline" && (
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
          )}
        </div>

        {/* ── Category pills — wrapping layout, all options visible ───────── */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          <button
            onClick={() => setCategory(null)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              !category
                ? "bg-gradient-to-br from-cyan-500 to-teal-500 text-white shadow-sm"
                : "bg-white/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
            }`}
          >
            All
          </button>
          {usedCategories.map((cat) => {
            const catMeta = getCategory(cat);
            const active = category === cat;
            return (
              <button
                key={cat}
                onClick={() => setCategory(active ? null : cat)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  active
                    ? `bg-gradient-to-br ${catMeta.gradient} text-white shadow-sm`
                    : "bg-white/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
                }`}
              >
                <catMeta.icon className="w-3 h-3" />
                {catMeta.shortLabel ?? catMeta.label}
              </button>
            );
          })}
        </div>

        {/* ── Payer pills — 2-5 payers ──────────────────────────────────── */}
        {payers.length >= 2 && payers.length <= 5 && (
          <>
            <div className="h-px bg-slate-200/60 dark:bg-slate-700/40 mb-3" />
            <div className="flex flex-wrap gap-1.5 mb-3">
              <button
                onClick={() => setPayerId(null)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  !payerId
                    ? "bg-gradient-to-br from-cyan-500 to-teal-500 text-white shadow-sm"
                    : "bg-white/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
                }`}
              >
                All
              </button>
              {payers.map((m) => {
                const isMe = !!currentMemberId && m.id === currentMemberId;
                const active = payerId === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setPayerId(active ? null : m.id)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                      active
                        ? "bg-gradient-to-br from-cyan-500 to-teal-500 text-white shadow-sm"
                        : "bg-white/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    {isMe ? "Mine" : getMemberName(m)}
                  </button>
                );
              })}
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
          </>
        )}

        {/* ── Payer dropdown (>5 payers) ───────────────────────────────── */}
        {payers.length > 5 && (
          <>
            <div className="h-px bg-slate-200/60 dark:bg-slate-700/40 mb-3" />
            <div className="flex gap-2 flex-wrap mb-3 items-center">
              <div className="relative">
                <select
                  value={payerId ?? ""}
                  onChange={(e) => setPayerId(e.target.value || null)}
                  className="appearance-none pl-3 pr-7 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 focus:outline-none focus:ring-2 focus:ring-cyan-400 text-slate-600 dark:text-slate-300 cursor-pointer"
                >
                  <option value="">All payers</option>
                  {payers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.id === currentMemberId ? `Me (${getMemberName(m)})` : getMemberName(m)}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </>
        )}

        {/* ── Date range — always visible ───────────────────────────────── */}
        <div className="h-px bg-slate-200/60 dark:bg-slate-700/40 mb-3" />
        <div className="flex gap-2 flex-wrap mb-3 items-center">
          <input
            type="date"
            value={dateFrom}
            min={groupStartDate ?? undefined}
            max={dateTo || (groupEndDate ?? undefined)}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 focus:outline-none focus:ring-2 focus:ring-cyan-400 text-slate-500 dark:text-slate-400"
          />
          <span className="text-slate-400 text-xs">to</span>
          <input
            type="date"
            value={dateTo}
            min={dateFrom || (groupStartDate ?? undefined)}
            max={groupEndDate ?? undefined}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 focus:outline-none focus:ring-2 focus:ring-cyan-400 text-slate-500 dark:text-slate-400"
          />
          {isFiltered && (
            <button
              onClick={clearAll}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors"
            >
              <X className="w-3 h-3" />
              Clear all
            </button>
          )}
        </div>

        {/* ── Timeline: header + results + day cards — all in one spotlightable block ── */}
        {viewMode === "timeline" && !groupByMonth ? (
          <div>
            {/* Day by day section header */}
            <div className="flex items-center gap-2.5 mb-4 mt-1">
              <div className="w-5 h-5 rounded-md bg-cyan-50 dark:bg-cyan-900/30 flex items-center justify-center shrink-0">
                <CalendarDays className="w-3 h-3 text-cyan-500 dark:text-cyan-400" />
              </div>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Day by day</span>
              <div className="flex-1 h-[1.5px] bg-gradient-to-r from-cyan-200/70 to-transparent dark:from-cyan-800/40 dark:to-transparent" />
            </div>

            {/* Results bar */}
            <div className="flex items-center justify-between mb-3 px-0.5">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isSearching
                  ? `${filtered.length} result${filtered.length !== 1 ? "s" : ""} for "${search.trim()}"`
                  : isFiltered
                  ? `${filtered.length} matching`
                  : `${expenses.length} expense${expenses.length !== 1 ? "s" : ""}`}
              </p>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 tabular" style={{ fontFamily: "var(--font-fraunces)" }}>
                {formatCurrency(filtered.reduce((sum, e) => sum + Number(e.amount), 0), currency)}
              </p>
            </div>

            {/* Timeline content */}
            {filtered.length === 0 ? (
              <div className="py-12 flex flex-col items-center gap-3 glass rounded-xl text-center">
                <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <Search className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No expenses found</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    {isSearching ? `Nothing matches "${search.trim()}"` : "Try adjusting your filters"}
                  </p>
                </div>
                {isFiltered && (
                  <button
                    onClick={clearAll}
                    className="text-xs font-medium text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 transition-colors"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            ) : (
              <DayGroupedTimeline
                days={timelineGroups}
                members={members}
                currentUserId={currentUserId}
                currentMemberId={currentMemberId}
                isAdmin={isAdmin}
                currency={currency}
                startDate={groupStartDate ?? null}
                endDate={groupEndDate ?? null}
                isFiltered={isFiltered}
                activeCategory={category}
                onCategoryClick={(cat) => { setCategory(cat); setCurrentPage(1); }}
                onDelete={optimisticDelete}
                onDeleteFail={restoreDelete}
                interactionCounts={interactionCounts}
              />
            )}
          </div>
        ) : (
          <>
            {/* ── Results bar (non-timeline modes) ──────────────────────── */}
            <div className="flex items-center justify-between mb-3 px-0.5">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isSearching
                  ? `${filtered.length} result${filtered.length !== 1 ? "s" : ""} for "${search.trim()}"`
                  : isFiltered
                  ? `${filtered.length} matching`
                  : usePagination
                  ? `${displayItems.length} of ${expenses.length} expense${expenses.length !== 1 ? "s" : ""}`
                  : `${expenses.length} expense${expenses.length !== 1 ? "s" : ""}`}
              </p>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 tabular" style={{ fontFamily: "var(--font-fraunces)" }}>
                {formatCurrency(filteredTotal, currency)}
              </p>
            </div>

            {/* ── First 2 cards / empty state (inside spotlight) ─────────── */}
            {filtered.length === 0 ? (
              <div className="py-12 flex flex-col items-center gap-3 glass rounded-xl text-center">
                <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <Search className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No expenses found</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    {isSearching ? `Nothing matches "${search.trim()}"` : "Try adjusting your filters"}
                  </p>
                </div>
                {isFiltered && (
                  <button
                    onClick={clearAll}
                    className="text-xs font-medium text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 transition-colors"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            ) : groupByMonth ? (
              <MonthGroupedList
                expenses={displayItems}
                members={members}
                currentUserId={currentUserId}
                currentMemberId={currentMemberId}
                isAdmin={isAdmin}
                currency={currency}
                onDelete={optimisticDelete}
                onDeleteFail={restoreDelete}
                interactionCounts={interactionCounts}
                compact={viewMode === "compact"}
              />
            ) : (
              <>
                <AnimatedList className="space-y-2" staggerMs={35}>
                  {displayItems.slice(0, 2).map(renderCard)}
                </AnimatedList>
                {/* One-time swipe-to-delete hint, touch devices only */}
                <SwipeHint />
              </>
            )}
          </>
        )}

      </div>{/* end data-tour="expense-list-header" */}

      {/* ── Cards 3+ outside spotlight (dimmed during tour) ─────────── */}
      {filtered.length > 0 && !groupByMonth && viewMode !== "timeline" && displayItems.length > 2 && (
        <AnimatedList
          className="space-y-2 mt-2"
          staggerMs={35}
          initialDelayMs={2 * 35}
        >
          {displayItems.slice(2).map(renderCard)}
        </AnimatedList>
      )}

      {/* ── Pagination — hidden while searching and in timeline mode ─── */}
      {!isSearching && usePagination && totalPages > 1 && viewMode !== "timeline" && (
        <div className="flex items-center justify-between mt-4 px-0.5">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-white/60 hover:bg-white/80 dark:bg-slate-800/60 dark:hover:bg-slate-700/60 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors disabled:opacity-40 disabled:pointer-events-none"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Prev
          </button>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {pageStart + 1}–{Math.min(pageStart + ITEMS_PER_PAGE, filtered.length)} of {filtered.length}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-white/60 hover:bg-white/80 dark:bg-slate-800/60 dark:hover:bg-slate-700/60 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors disabled:opacity-40 disabled:pointer-events-none"
          >
            Next
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Helper functions for day-by-day timeline ────────────────────────────────

function tlDayLabel(date: string, startDate: string | null, totalDays?: number | null): string {
  if (!startDate || date === "unknown") return "";
  try {
    const diff = differenceInDays(parseISO(date), parseISO(startDate));
    if (diff < 0) return "Pre-trip";
    const dayNum = diff + 1;
    if (totalDays && totalDays > 1) return `Day ${dayNum}/${totalDays}`;
    return `Day ${dayNum}`;
  } catch {
    return "";
  }
}

function tlFormatDay(date: string): string {
  if (date === "unknown") return "Unknown date";
  try {
    return format(parseISO(date), "EEE, MMM d");
  } catch {
    return date;
  }
}

// ─── DaySection: one scroll-animated day ─────────────────────────────────────

const MEMBER_AVATAR_COLORS = [
  "#06B6D4", // cyan-500
  "#8B5CF6", // violet-500
  "#F97316", // orange-500
  "#10B981", // emerald-500
  "#EC4899", // pink-500
  "#F59E0B", // amber-500
  "#3B82F6", // blue-500
  "#EF4444", // red-500
];

// Max payer avatars before showing "+N" overflow chip
const MAX_AVATARS = 4;

function DaySection({
  date, dayExpenses, index, badge, isOff, isBusiest, isToday, spendPct, dayTotal,
  isEmpty, activeCategory, onCategoryClick,
  currency, members, currentUserId, currentMemberId, isAdmin,
  onDelete, onDeleteFail, interactionCounts, dataTour,
}: {
  date: string;
  dayExpenses: Expense[];
  index: number;
  badge: string;
  isOff: boolean;
  isBusiest: boolean;
  isToday?: boolean;
  spendPct: number;
  dayTotal: number;
  isEmpty?: boolean;
  activeCategory: string | null;
  onCategoryClick: (cat: string | null) => void;
  currency: string;
  members: GroupMember[];
  currentUserId: string;
  currentMemberId?: string;
  isAdmin: boolean;
  onDelete: (id: string) => void;
  onDeleteFail: (id: string) => void;
  interactionCounts?: Record<string, ExpenseInteractionCount>;
  /** Optional data-tour attribute placed on the outermost wrapper (used to spotlight Day 1 in the tour). */
  dataTour?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "0px 0px -60px 0px" });

  // ── Count-up: animates 0 → dayTotal when section enters viewport ──
  const countMotion = useMotionValue(0);
  const [countText, setCountText] = useState(() => formatCurrency(0, currency));
  useMotionValueEvent(countMotion, "change", (v) => {
    setCountText(formatCurrency(Math.round(v), currency));
  });
  useEffect(() => {
    if (!isInView || isEmpty) return;
    const controls = animate(countMotion, dayTotal, { duration: 0.5, ease: "easeOut" });
    return () => controls.stop();
  }, [isInView, dayTotal, isEmpty, countMotion]);

  // ── Stacked category segments (biggest share first) ───────────────
  const segments = useMemo(() => {
    if (isEmpty || isOff || dayTotal === 0) return [];
    const map = new Map<string, number>();
    for (const e of dayExpenses) {
      map.set(e.category, (map.get(e.category) ?? 0) + Number(e.amount));
    }
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([cat, total]) => ({
        category: cat,
        color: CATEGORY_HEX[cat] ?? "#06B6D4",
        pct: (total / dayTotal) * 100,
      }));
  }, [dayExpenses, dayTotal, isEmpty, isOff]);

  // ── Unique payers, size-weighted by amount (√ scaling for area perception) ──
  const dayPayers = useMemo(() => {
    if (isEmpty) return [];

    // Sum each payer's total for the day
    const payerAmounts = new Map<string, number>();
    for (const e of dayExpenses) {
      payerAmounts.set(e.paidByMemberId, (payerAmounts.get(e.paidByMemberId) ?? 0) + Number(e.amount));
    }

    const result: {
      id: string; initials: string; color: string; name: string;
      amount: number; size: number; fontSize: number;
    }[] = [];
    const seen = new Set<string>();

    for (const e of dayExpenses) {
      if (seen.has(e.paidByMemberId)) continue;
      seen.add(e.paidByMemberId);
      const member = members.find((m) => m.id === e.paidByMemberId);
      const name = member ? getMemberName(member) : "?";
      const colorIdx = members.findIndex((m) => m.id === e.paidByMemberId);
      const amount = payerAmounts.get(e.paidByMemberId) ?? 0;
      // √ scaling: area ∝ spend (perceptually accurate); range 20 → 32 px
      const pct = dayTotal > 0 ? amount / dayTotal : 1;
      const size = Math.round(20 + Math.sqrt(pct) * 12);
      const fontSize = Math.round(9 + Math.sqrt(pct) * 4);
      result.push({
        id: e.paidByMemberId,
        initials: name.slice(0, 1).toUpperCase(),
        color: MEMBER_AVATAR_COLORS[Math.max(0, colorIdx) % MEMBER_AVATAR_COLORS.length],
        name, amount, size, fontSize,
      });
    }

    // Largest contributor first (left-to-right reading order)
    return result.sort((a, b) => b.amount - a.amount);
  }, [dayExpenses, members, isEmpty, dayTotal]);

  // Dominant category color → card background tint
  const dominantColor = !isEmpty && !isOff && segments.length > 0 ? segments[0].color : null;

  const lineColor = isOff
    ? "to-slate-200/60 dark:to-slate-700/40"
    : isBusiest
    ? "to-amber-300/70 dark:to-amber-700/40"
    : isToday
    ? "to-cyan-300/90 dark:to-cyan-700/60"
    : "to-cyan-200/70 dark:to-cyan-800/40";

  const badgeClass = isToday
    ? "bg-gradient-to-br from-cyan-500 to-teal-500 text-white shadow-sm shadow-cyan-500/20"
    : isOff
    ? "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
    : isBusiest
    ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300"
    : "bg-cyan-100 dark:bg-cyan-900/50 text-cyan-700 dark:text-cyan-300";

  // ── Compact ghost row for days with no expenses ───────────────────
  if (isEmpty) {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : {}}
        transition={{ duration: 0.3 }}
      >
        {index > 0 && (
          <div className="flex justify-center overflow-hidden mb-0.5">
            <motion.div
              className={`w-px bg-gradient-to-b from-transparent to-transparent ${
                isToday ? "via-cyan-300 dark:via-cyan-700/60" : "via-slate-200 dark:via-slate-700/40"
              }`}
              initial={{ height: 0 }}
              animate={isInView ? { height: 12 } : { height: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            />
          </div>
        )}
        {/* Today empty day: more visible; other empty days: ghost */}
        <div className={`flex items-center gap-2 my-0.5 ${isToday ? "opacity-70" : "opacity-25"}`}>
          <div className={`flex-1 h-px ${isToday ? "bg-cyan-200 dark:bg-cyan-800/50" : "bg-slate-200 dark:bg-slate-700/40"}`} />
          <div className="flex items-center gap-1.5 shrink-0">
            {badge && (
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                isToday
                  ? "bg-gradient-to-br from-cyan-500 to-teal-500 text-white"
                  : "text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800"
              }`}>
                {badge}
              </span>
            )}
            <span className={`text-[10px] ${isToday ? "text-slate-500 dark:text-slate-400" : "text-slate-400 dark:text-slate-500"}`}>
              {tlFormatDay(date)}
            </span>
          </div>
          <div className={`flex-1 h-px ${isToday ? "bg-cyan-200 dark:bg-cyan-800/50" : "bg-slate-200 dark:bg-slate-700/40"}`} />
        </div>
      </motion.div>
    );
  }

  // ── Full day card ─────────────────────────────────────────────────
  return (
    <motion.div
      ref={ref}
      data-tour={dataTour}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {/* Animated connector thread — draws downward as section enters view */}
      {index > 0 && (
        <div className="flex justify-center py-0.5 mb-1 overflow-hidden">
          <motion.div
            className="w-px bg-gradient-to-b from-transparent via-slate-200 to-transparent dark:via-slate-700/50"
            initial={{ height: 0 }}
            animate={isInView ? { height: 16 } : { height: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          />
        </div>
      )}

      {/* Day card — subtle tint of dominant category colour */}
      <div
        className="rounded-2xl px-3 pt-3 pb-2"
        style={{ backgroundColor: dominantColor ? `${dominantColor}12` : undefined }}
      >
        {/* ── Day label: centered node + gradient rules ─────────────── */}
        <div className="flex items-center gap-2 mb-2">
          <div className={`flex-1 h-px bg-gradient-to-r from-transparent ${lineColor}`} />
          <div className="flex items-center gap-1.5 shrink-0">
            {isToday ? (
              /* Pulsing live indicator for the current day */
              <span className="relative flex w-2 h-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full w-2 h-2 bg-cyan-500 dark:bg-cyan-400" />
              </span>
            ) : (
              <div className={`w-2 h-2 rounded-full shrink-0 ${
                isOff       ? "bg-slate-400 dark:bg-slate-500"
                : isBusiest ? "bg-amber-400 dark:bg-amber-500"
                :             "bg-cyan-400 dark:bg-cyan-500"
              }`} />
            )}
            {badge && (
              <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${badgeClass}`}>
                {badge}
              </span>
            )}
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {tlFormatDay(date)}
            </span>
            <span className="text-[10px] text-slate-300 dark:text-slate-600">·</span>
            <span
              className={`text-xs font-semibold tabular-nums ${
                isBusiest ? "text-amber-600 dark:text-amber-400" : "text-slate-600 dark:text-slate-300"
              }`}
              style={{ fontFamily: "var(--font-fraunces)" }}
            >
              {countText}
            </span>
          </div>
          <div className={`flex-1 h-px bg-gradient-to-l from-transparent ${lineColor}`} />
        </div>

        {/* ── Payer row: item count + avatar chips (√-scaled, max 4 + overflow) ── */}
        <div className="flex items-center justify-center gap-1.5 mb-2.5">
          <span className="text-[10px] text-slate-400 dark:text-slate-500">
            {dayExpenses.length}{dayExpenses.length === 1 ? " item" : " items"}
          </span>
          {dayPayers.length > 0 && (
            <>
              <span className="text-[10px] text-slate-300 dark:text-slate-600">·</span>
              {dayPayers.slice(0, MAX_AVATARS).map(({ id, initials, color, name, amount, size, fontSize }) => (
                <div
                  key={id}
                  title={`${name}: ${formatCurrency(amount, currency)}`}
                  className={`rounded-full flex items-center justify-center font-bold text-white shrink-0 transition-transform duration-150 hover:scale-110 ${
                    id === currentMemberId
                      ? "ring-2 ring-offset-1 ring-white/70 dark:ring-white/40 dark:ring-offset-slate-900"
                      : "ring-1 ring-white/20 dark:ring-black/20"
                  }`}
                  style={{ width: size, height: size, backgroundColor: color, fontSize }}
                >
                  {initials}
                </div>
              ))}
              {dayPayers.length > MAX_AVATARS && (
                <div
                  className="rounded-full flex items-center justify-center text-[9px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 ring-1 ring-slate-200 dark:ring-slate-600 shrink-0"
                  style={{ width: 20, height: 20 }}
                >
                  +{dayPayers.length - MAX_AVATARS}
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Stacked category bar — grows from center; icons inside segments ── */}
        <div className="relative h-5 bg-slate-100 dark:bg-slate-800/60 rounded-xl overflow-hidden">
          <div
            className="absolute inset-y-0 left-1/2 -translate-x-1/2 flex overflow-hidden rounded-xl"
            style={{
              width: isInView ? `${spendPct}%` : "0%",
              transition: "width 850ms cubic-bezier(0.34, 1.56, 0.64, 1) 80ms",
            }}
          >
            {isOff ? (
              <div className="flex-1 opacity-50" style={{ backgroundColor: "#94A3B8" }} />
            ) : (
              segments.map(({ category, color, pct }) => {
                const catMeta = getCategory(category);
                const Icon = catMeta.icon;
                const isActive = activeCategory === category;
                const isFiltered = activeCategory !== null;
                return (
                  <div
                    key={category}
                    role="button"
                    title={catMeta.label}
                    onClick={() => onCategoryClick(isActive ? null : category)}
                    className={`h-full flex-shrink-0 flex items-center justify-center overflow-hidden cursor-pointer transition-opacity duration-200 ${
                      isFiltered && !isActive ? "opacity-40" : "opacity-100"
                    }`}
                    style={{ width: `${pct}%`, backgroundColor: color }}
                  >
                    {pct >= 20 && (
                      isActive
                        ? <X className="w-2.5 h-2.5 text-white shrink-0" />
                        : <Icon className="w-2.5 h-2.5 text-white/90 shrink-0" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Intensity caption — only for extremes */}
        <div className="flex justify-center h-5 mt-0.5 mb-2">
          {isBusiest && (
            <span className="text-[10px] font-medium text-amber-500 dark:text-amber-400 tracking-wide">
              🔥 busiest day
            </span>
          )}
          {!isBusiest && spendPct <= 25 && !isOff && (
            <span className="text-[10px] font-medium text-teal-500 dark:text-teal-400 tracking-wide">
              light day
            </span>
          )}
        </div>

        {/* ── Expense cards: stagger in after section appears ────────── */}
        <div className="space-y-1.5 mb-1">
          {dayExpenses.map((expense, j) => (
            <motion.div
              key={expense.id}
              initial={{ opacity: 0, y: 8 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{
                duration: 0.3,
                delay: 0.12 + Math.min(j, 6) * 0.05,
                ease: [0.25, 0.1, 0.25, 1],
              }}
            >
              <SwipeableExpenseCard
                expense={expense}
                members={members}
                currentUserId={currentUserId}
                currentMemberId={currentMemberId}
                isAdmin={isAdmin}
                onDelete={onDelete}
                onDeleteFail={onDeleteFail}
                interactionCount={interactionCounts?.[expense.id]}
                compact={true}
              />
            </motion.div>
          ))}
        </div>
      </div>{/* end day card */}
    </motion.div>
  );
}

// ─── DayGroupedTimeline: orchestrates DaySection list ────────────────────────

function DayGroupedTimeline({
  days,
  members,
  currentUserId,
  currentMemberId,
  isAdmin,
  currency,
  startDate,
  endDate,
  isFiltered,
  activeCategory,
  onCategoryClick,
  onDelete,
  onDeleteFail,
  interactionCounts,
}: {
  days: [string, Expense[]][];
  members: GroupMember[];
  currentUserId: string;
  currentMemberId?: string;
  isAdmin: boolean;
  currency: string;
  startDate: string | null;
  endDate: string | null;
  isFiltered: boolean;
  activeCategory: string | null;
  onCategoryClick: (cat: string | null) => void;
  onDelete: (id: string) => void;
  onDeleteFail: (id: string) => void;
  interactionCounts?: Record<string, ExpenseInteractionCount>;
}) {
  // Quick lookup: date → expenses
  const daysMap = useMemo(() => new Map(days), [days]);

  // Full trip date range — only injected when unfiltered and trip has dates.
  // Filtering hides empty days to avoid "no food on Day 4" confusion.
  const allDates = useMemo<string[] | null>(() => {
    if (!startDate || !endDate || isFiltered) return null;
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    const dates: string[] = [];
    let cur = start;
    while (cur <= end) {
      dates.push(format(cur, "yyyy-MM-dd"));
      cur = addDays(cur, 1);
    }
    return dates;
  }, [startDate, endDate, isFiltered]);

  // Merged list: fill trip range with empty days, or just use actual days.
  // Pre-trip and post-trip expense dates are prepended / appended so they always
  // appear even though allDates only covers [startDate, endDate].
  const mergedDays = useMemo((): Array<{ date: string; expenses: Expense[] }> => {
    if (!allDates) return days.map(([date, expenses]) => ({ date, expenses }));

    const tripFirst = allDates[0];
    const tripLast  = allDates[allDates.length - 1];

    // Expense dates that fall before the trip start — sorted ascending
    const preTrip = days
      .filter(([d]) => d !== "unknown" && d < tripFirst)
      .map(([date, exps]) => ({ date, expenses: exps }));

    // The trip range (including empty days)
    const tripRange = allDates.map((date) => ({
      date,
      expenses: daysMap.get(date) ?? [],
    }));

    // Expense dates that fall after the trip end — sorted ascending
    const postTrip = days
      .filter(([d]) => d !== "unknown" && d > tripLast)
      .map(([date, exps]) => ({ date, expenses: exps }));

    return [...preTrip, ...tripRange, ...postTrip];
  }, [allDates, days, daysMap]);

  // Today's date string — used for trailing-trim guard and "Today" badge
  const todayStr = format(new Date(), "yyyy-MM-dd");

  // Strip trailing empty days (trip end with no spend) but always keep "Today"
  const trimmedDays = useMemo(() => {
    let lastKeepIdx = mergedDays.length - 1;
    while (lastKeepIdx >= 0) {
      const { date, expenses } = mergedDays[lastKeepIdx];
      if (expenses.length > 0 || date === todayStr) break;
      lastKeepIdx--;
    }
    return mergedDays.slice(0, lastKeepIdx + 1);
  }, [mergedDays, todayStr]);

  // maxDayTotal — trailing empty days are gone so scale is unaffected
  const maxDayTotal = useMemo(
    () => Math.max(...trimmedDays.map(({ expenses }) => expenses.reduce((s, e) => s + Number(e.amount), 0)), 1),
    [trimmedDays],
  );

  // Total trip days for "Day X/Y" badges
  const totalDays = startDate && endDate
    ? differenceInDays(parseISO(endDate), parseISO(startDate)) + 1
    : null;

  if (trimmedDays.length === 0) return null;

  return (
    <div>
      {trimmedDays.map(({ date, expenses }, i) => {
        const isEmpty = expenses.length === 0;
        const label = tlDayLabel(date, startDate, totalDays);
        const isPreTrip = label === "Pre-trip";
        const isPostTrip =
          endDate &&
          date !== "unknown" &&
          differenceInDays(parseISO(date), parseISO(endDate)) > 0;
        const isToday = date === todayStr;
        // "Today" overrides the day number; off-trip badges keep their own label
        const badge = isToday ? "Today" : isPreTrip ? "Pre-trip" : isPostTrip ? "Post-trip" : label;
        const isOff = isPreTrip || !!isPostTrip;
        const dayTotal = expenses.reduce((s, e) => s + Number(e.amount), 0);
        const spendPct = Math.round((dayTotal / maxDayTotal) * 100);
        const isBusiest = !isEmpty && spendPct === 100 && mergedDays.length > 1 && !isOff;

        return (
          <DaySection
            key={date}
            date={date}
            dayExpenses={expenses}
            index={i}
            badge={badge}
            isOff={isOff}
            isBusiest={isBusiest}
            isToday={isToday}
            spendPct={spendPct}
            dayTotal={dayTotal}
            isEmpty={isEmpty}
            activeCategory={activeCategory}
            onCategoryClick={onCategoryClick}
            currency={currency}
            members={members}
            currentUserId={currentUserId}
            currentMemberId={currentMemberId}
            isAdmin={isAdmin}
            onDelete={onDelete}
            onDeleteFail={onDeleteFail}
            interactionCounts={interactionCounts}
            dataTour={i === 0 ? "expense-timeline-day1" : undefined}
          />
        );
      })}
    </div>
  );
}

const MONTH_LABELS: Record<string, string> = {
  "01": "January", "02": "February", "03": "March", "04": "April",
  "05": "May", "06": "June", "07": "July", "08": "August",
  "09": "September", "10": "October", "11": "November", "12": "December",
};

function MonthGroupedList({ expenses, members, currentUserId, currentMemberId, isAdmin, currency, onDelete, onDeleteFail, interactionCounts, compact }: {
  expenses: Expense[];
  members: GroupMember[];
  currentUserId: string;
  currentMemberId?: string;
  isAdmin: boolean;
  currency: string;
  onDelete: (id: string) => void;
  onDeleteFail: (id: string) => void;
  interactionCounts?: Record<string, ExpenseInteractionCount>;
  compact?: boolean;
}) {
  // Group by YYYY-MM, newest month first
  const groups = useMemo(() => {
    const map = new Map<string, Expense[]>();
    for (const e of expenses) {
      const key = e.expenseDate.slice(0, 7); // YYYY-MM
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [expenses]);

  return (
    <div className="space-y-6">
      {groups.map(([yearMonth, group]) => {
        const [year, month] = yearMonth.split("-");
        const label = `${MONTH_LABELS[month]} ${year}`;
        const total = group.reduce((s, e) => s + Number(e.amount), 0);
        return (
          <div key={yearMonth}>
            {/* Month header with icon badge + divider */}
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-5 h-5 rounded-md bg-cyan-50 dark:bg-cyan-900/30 flex items-center justify-center shrink-0">
                <CalendarDays className="w-3 h-3 text-cyan-500 dark:text-cyan-400" />
              </div>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 shrink-0">
                {label}
              </span>
              <div className="flex-1 h-px bg-slate-200/70 dark:bg-slate-700/50" />
              <span className="text-sm font-semibold text-slate-600 dark:text-slate-300 tabular shrink-0">
                {formatCurrency(total, currency)}
              </span>
            </div>
            <AnimatedList className="space-y-2" staggerMs={30}>
              {group.map((expense) => (
                <SwipeableExpenseCard
                  key={expense.id}
                  expense={expense}
                  members={members}
                  currentUserId={currentUserId}
                  currentMemberId={currentMemberId}
                  isAdmin={isAdmin}
                  onDelete={onDelete}
                  onDeleteFail={onDeleteFail}
                  interactionCount={interactionCounts?.[expense.id]}
                  compact={compact}
                />
              ))}
            </AnimatedList>
          </div>
        );
      })}
    </div>
  );
}
