"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { addExpenseSchema, type AddExpenseInput } from "@/lib/validations/expense";
import { addExpense } from "@/app/actions/expenses";
import { SplitEditor } from "@/components/expense/split-editor";
import { QuickAddBar } from "@/components/expense/quick-add-bar";
import { CATEGORIES } from "@/lib/categories";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useWarnBeforeLeave } from "@/hooks/use-warn-before-leave";
import type { Trip } from "@/lib/db/schema/trips";
import type { TripMember } from "@/lib/db/schema/trip-members";
import { getMemberName, smartDefaultDate } from "@/lib/utils";
import type { SplitMode, SplitInput } from "@/lib/splits/compute";
import type { ParsedExpense } from "@/lib/parser/parse-expense";

interface Props {
  trip: Trip;
  members: TripMember[];
}

export function AddExpenseForm({ trip, members }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [splitMode, setSplitMode] = useState<SplitMode>("equal");
  const [splitEditorKey, setSplitEditorKey] = useState(0);
  const [initialSplitIds, setInitialSplitIds] = useState<Set<string>>(
    new Set(members.map((m) => m.id))
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<AddExpenseInput>({
    resolver: zodResolver(addExpenseSchema),
    defaultValues: {
      tripId: trip.id,
      currency: trip.defaultCurrency,
      expenseDate: smartDefaultDate(trip.startDate, trip.endDate),
      category: "other",
      paidByMemberId: members[0]?.id ?? "",
      splitMode: "equal",
      splits: members.map((m) => ({ memberId: m.id })),
    },
  });

  const amount = Number(watch("amount")) || 0;
  const currency = watch("currency");
  const category = watch("category");

  useWarnBeforeLeave(isDirty);

  function handleModeChange(mode: SplitMode) {
    setSplitMode(mode);
    setValue("splitMode", mode);
  }

  function handleSplitsChange(newSplits: SplitInput[]) {
    setValue("splits", newSplits);
  }

  function handleQuickAdd(parsed: ParsedExpense) {
    if (parsed.description) setValue("description", parsed.description);
    if (parsed.amount !== null) setValue("amount", parsed.amount);
    if (parsed.paidByMemberId) setValue("paidByMemberId", parsed.paidByMemberId);
    setValue("expenseDate", parsed.expenseDate ?? smartDefaultDate(trip.startDate, trip.endDate));
    setValue("category", parsed.category);

    let nextIds: Set<string>;
    if (parsed.splitMemberIds && parsed.splitMemberIds.length > 0) {
      // AI resolved specific member IDs (by name or position)
      nextIds = new Set(parsed.splitMemberIds);
    } else if (typeof parsed.splitCount === "number") {
      // Simple count — take first N members
      nextIds = new Set(members.slice(0, parsed.splitCount).map((m) => m.id));
    } else {
      // All members (default)
      nextIds = new Set(members.map((m) => m.id));
    }

    setInitialSplitIds(nextIds);
    setSplitEditorKey((k) => k + 1);
  }

  async function onSubmit(data: AddExpenseInput) {
    if (trip.startDate && data.expenseDate < trip.startDate) {
      toast.error(`Date must be on or after ${trip.startDate}`);
      return;
    }
    if (trip.endDate && data.expenseDate > trip.endDate) {
      toast.error(`Date must be on or before ${trip.endDate}`);
      return;
    }
    if (data.endDate && data.endDate < data.expenseDate) {
      toast.error("Check-out date must be after check-in date");
      return;
    }
    setSubmitting(true);
    const result = await addExpense(data);
    setSubmitting(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Expense added!");
    router.push(`/trips/${trip.id}/expenses`);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <input type="hidden" {...register("tripId")} />

      <QuickAddBar
        members={members}
        currency={watch("currency")}
        tripStartDate={trip.startDate}
        tripEndDate={trip.endDate}
        onParsed={handleQuickAdd}
      />

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
          Description <span className="text-red-400">*</span>
        </label>
        <input
          {...register("description")}
          placeholder="e.g. Dinner at Thalassa"
          className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400 placeholder:text-slate-400 dark:placeholder:text-slate-500"
        />
        {errors.description && <p className="mt-1 text-xs text-red-500">{errors.description.message}</p>}
      </div>

      {/* Amount + Currency */}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
            Amount <span className="text-red-400">*</span>
          </label>
          <input
            {...register("amount", { valueAsNumber: true })}
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            placeholder="0.00"
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400 placeholder:text-slate-400 dark:placeholder:text-slate-500 tabular"
          />
          {errors.amount && <p className="mt-1 text-xs text-red-500">{errors.amount.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">Currency</label>
          <input
            {...register("currency")}
            readOnly
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 cursor-default select-none"
          />
        </div>
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">Category</label>
        <select
          {...register("category")}
          className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400"
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      {/* Date + Paid by */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
            {category === "accommodation" ? "Check-in" : "Date"}
          </label>
          <input
            {...register("expenseDate")}
            type="date"
            min={trip.startDate ?? undefined}
            max={trip.endDate ?? undefined}
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400"
          />
          {errors.expenseDate && <p className="mt-1 text-xs text-red-500">{errors.expenseDate.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">Paid by</label>
          <select
            {...register("paidByMemberId")}
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400"
          >
            {members.map((m) => (
              <option key={m.id} value={m.id}>{getMemberName(m)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Check-out date — accommodation only */}
      {category === "accommodation" && (
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">Check-out</label>
          <input
            {...register("endDate")}
            type="date"
            min={trip.startDate ?? undefined}
            max={trip.endDate ?? undefined}
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400"
          />
          {errors.endDate && <p className="mt-1 text-xs text-red-500">{errors.endDate.message}</p>}
        </div>
      )}

      {/* Split editor */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">Split</label>
        <SplitEditor
          key={splitEditorKey}
          members={members}
          amount={amount}
          currency={currency}
          mode={splitMode}
          onModeChange={handleModeChange}
          onSplitsChange={handleSplitsChange}
          initialSelectedIds={initialSplitIds}
        />
        {errors.splits && <p className="mt-1 text-xs text-red-500">Select at least one member.</p>}
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">Notes</label>
        <textarea
          {...register("notes")}
          rows={2}
          placeholder="Optional note"
          className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400 resize-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-2.5 bg-gradient-to-br from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white font-medium rounded-xl shadow-md shadow-cyan-500/20 transition-all disabled:opacity-60"
      >
        {submitting ? "Saving…" : "Save expense"}
      </button>
    </form>
  );
}
