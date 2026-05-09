"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { addTemplateSchema, type AddTemplateInput } from "@/lib/validations/expense";
import { updateTemplate } from "@/app/actions/expenses";
import { SplitEditor } from "@/components/expense/split-editor";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Group } from "@/lib/db/schema/groups";
import type { GroupMember } from "@/lib/db/schema/group-members";
import type { Expense } from "@/lib/db/schema/expenses";
import type { ExpenseSplit } from "@/lib/db/schema/expense-splits";
import { getMemberName } from "@/lib/utils";
import { getGroupConfig } from "@/lib/group-config";
import type { SplitMode, SplitInput } from "@/lib/splits/compute";

interface Props {
  group: Group;
  members: GroupMember[];
  template: Expense;
  splits: ExpenseSplit[];
}

export function EditTemplateForm({ group, members, template, splits }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const groupConfig = getGroupConfig(group.groupType);

  const initialMode = (splits[0]?.splitType ?? "equal") as SplitMode;
  const [splitMode, setSplitMode] = useState<SplitMode>(initialMode);

  const initialSplitIds = new Set(splits.map((s) => s.memberId));
  const initialSplitValues: Record<string, number> = {};
  for (const s of splits) {
    if (s.splitValue != null) initialSplitValues[s.memberId] = Number(s.splitValue);
  }

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AddTemplateInput>({
    resolver: zodResolver(addTemplateSchema),
    defaultValues: {
      groupId: group.id,
      currency: group.defaultCurrency,
      paidByMemberId: template.paidByMemberId,
      description: template.description,
      category: template.category,
      amount: Number(template.amount),
      recurrence: (template.recurrence ?? "monthly") as "monthly" | "weekly",
      splitMode: initialMode,
      splits: splits.map((s) => ({
        memberId: s.memberId,
        value: s.splitValue != null ? Number(s.splitValue) : undefined,
      })),
    },
  });

  const amount = Number(watch("amount")) || 0;
  const currency = watch("currency");

  function handleModeChange(mode: SplitMode) {
    setSplitMode(mode);
    setValue("splitMode", mode);
  }

  function handleSplitsChange(newSplits: SplitInput[]) {
    setValue("splits", newSplits);
  }

  async function onSubmit(data: AddTemplateInput) {
    setSubmitting(true);
    const result = await updateTemplate(template.id, data);
    setSubmitting(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Template updated!");
    router.push(`/groups/${group.id}/expenses`);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <input type="hidden" {...register("groupId")} />
      <input type="hidden" {...register("currency")} />

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
          Description <span className="text-red-400">*</span>
        </label>
        <input
          {...register("description")}
          className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400 placeholder:text-slate-400"
        />
        {errors.description && <p className="mt-1 text-xs text-red-500">{errors.description.message}</p>}
      </div>

      {/* Amount */}
      <div>
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

      {/* Category + Recurrence */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">Category</label>
          <select
            {...register("category")}
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400"
          >
            {groupConfig.categories.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">Repeats</label>
          <select
            {...register("recurrence")}
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400"
          >
            <option value="monthly">Monthly</option>
            <option value="weekly">Weekly</option>
          </select>
        </div>
      </div>

      {/* Paid by */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">Usually paid by</label>
        <select
          {...register("paidByMemberId")}
          className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400"
        >
          {members.map((m) => (
            <option key={m.id} value={m.id}>{getMemberName(m)}</option>
          ))}
        </select>
      </div>

      {/* Split */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">Split</label>
        <SplitEditor
          members={members}
          amount={amount}
          currency={currency}
          mode={splitMode}
          onModeChange={handleModeChange}
          onSplitsChange={handleSplitsChange}
          initialSelectedIds={initialSplitIds}
          initialValues={initialSplitValues}
        />
        {errors.splits && <p className="mt-1 text-xs text-red-500">Select at least one member.</p>}
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-2.5 bg-gradient-to-br from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white font-medium rounded-xl shadow-md shadow-cyan-500/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {submitting ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
