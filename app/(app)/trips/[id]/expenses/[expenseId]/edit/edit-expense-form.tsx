"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { addExpenseSchema, type AddExpenseInput } from "@/lib/validations/expense";
import { updateExpense } from "@/app/actions/expenses";
import { SplitEditor } from "@/components/expense/split-editor";
import { CATEGORIES } from "@/lib/categories";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Trip } from "@/lib/db/schema/trips";
import type { TripMember } from "@/lib/db/schema/trip-members";
import type { Expense } from "@/lib/db/schema/expenses";
import type { ExpenseSplit } from "@/lib/db/schema/expense-splits";
import { getMemberName } from "@/lib/utils";
import type { SplitMode, SplitInput } from "@/lib/splits/compute";

interface Props {
  trip: Trip;
  members: TripMember[];
  expense: Expense;
  splits: ExpenseSplit[];
}

export function EditExpenseForm({ trip, members, expense, splits }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  // Reconstruct split mode and raw values from stored splits
  const initialMode = (splits[0]?.splitType ?? "equal") as SplitMode;
  const initialValues: Record<string, number> = {};
  const initialSelectedIds = new Set<string>();
  for (const s of splits) {
    initialSelectedIds.add(s.memberId);
    if (s.splitValue != null) initialValues[s.memberId] = Number(s.splitValue);
  }

  const [splitMode, setSplitMode] = useState<SplitMode>(initialMode);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AddExpenseInput>({
    resolver: zodResolver(addExpenseSchema),
    defaultValues: {
      tripId: trip.id,
      paidByMemberId: expense.paidByMemberId,
      description: expense.description,
      category: expense.category,
      amount: Number(expense.amount),
      currency: expense.currency,
      expenseDate: expense.expenseDate,
      endDate: expense.endDate ?? "",
      notes: expense.notes ?? "",
      splitMode: initialMode,
      splits: splits.map((s) => ({
        memberId: s.memberId,
        value: s.splitValue != null ? Number(s.splitValue) : undefined,
      })),
    },
  });

  const amount = Number(watch("amount")) || 0;
  const currency = watch("currency");
  const category = watch("category");

  function handleModeChange(mode: SplitMode) {
    setSplitMode(mode);
    setValue("splitMode", mode);
  }

  function handleSplitsChange(newSplits: SplitInput[]) {
    setValue("splits", newSplits);
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
    const result = await updateExpense(expense.id, data);
    setSubmitting(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Expense updated!");
    router.push(`/trips/${trip.id}/expenses`);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <input type="hidden" {...register("tripId")} />

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
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400 tabular"
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

      {/* Split editor — pre-populated */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">Split</label>
        <SplitEditor
          members={members}
          amount={amount}
          currency={currency}
          mode={splitMode}
          onModeChange={handleModeChange}
          onSplitsChange={handleSplitsChange}
          initialValues={initialValues}
          initialSelectedIds={initialSelectedIds}
        />
        {errors.splits && <p className="mt-1 text-xs text-red-500">Select at least one member.</p>}
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">Notes</label>
        <textarea
          {...register("notes")}
          rows={2}
          className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400 resize-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-2.5 bg-gradient-to-br from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white font-medium rounded-xl shadow-md shadow-cyan-500/20 transition-all disabled:opacity-60"
      >
        {submitting ? "Saving…" : "Update expense"}
      </button>
    </form>
  );
}
