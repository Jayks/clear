"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { addTemplateSchema, type AddTemplateInput } from "@/lib/validations/expense";
import { createExpenseTemplate } from "@/app/actions/expenses";
import { SplitEditor } from "@/components/expense/split-editor";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Group } from "@/lib/db/schema/groups";
import type { GroupMember } from "@/lib/db/schema/group-members";
import { getMemberName } from "@/lib/utils";
import { getGroupConfig } from "@/lib/group-config";
import type { SplitMode, SplitInput } from "@/lib/splits/compute";

interface Props {
  group: Group;
  members: GroupMember[];
}

export function AddTemplateForm({ group, members }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [splitMode, setSplitMode] = useState<SplitMode>("equal");
  const groupConfig = getGroupConfig(group.groupType);

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
      recurrence: "monthly",
      splitMode: "equal",
      splits: members.map((m) => ({ memberId: m.id })),
      paidByMemberId: members[0]?.id ?? "",
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

  async function onSubmit(data: AddTemplateInput) {
    setSubmitting(true);
    const result = await createExpenseTemplate(data);
    setSubmitting(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Recurring expense added!");
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
          placeholder="e.g. Monthly rent, Netflix, Electricity bill"
          className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400 placeholder:text-slate-400 dark:placeholder:text-slate-500"
        />
        {errors.description && <p className="mt-1 text-xs text-red-500">{errors.description.message}</p>}
      </div>

      {/* Amount */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
          Amount <span className="text-red-400">*</span>
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400 dark:text-slate-500 pointer-events-none select-none">
            {currency}
          </span>
          <input
            {...register("amount", { valueAsNumber: true })}
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            placeholder="0.00"
            className="w-full pl-10 pr-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400 placeholder:text-slate-400 dark:placeholder:text-slate-500 tabular"
          />
        </div>
        {errors.amount && <p className="mt-1 text-xs text-red-500">{errors.amount.message}</p>}
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">Category</label>
        <div className="grid grid-cols-3 gap-1.5">
          {groupConfig.categories.map((c) => {
            const active = category === c.value;
            return (
              <button
                key={c.value}
                type="button"
                onClick={() => setValue("category", c.value, { shouldValidate: true })}
                className={`flex flex-col items-center gap-1 px-1 py-2.5 rounded-xl font-medium transition-all border ${
                  active
                    ? `bg-gradient-to-br ${c.gradient} text-white shadow-sm border-transparent`
                    : "bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                }`}
              >
                <c.icon className="w-4 h-4 shrink-0" />
                <span className="text-[10px] leading-tight text-center">{c.shortLabel ?? c.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recurrence */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">Repeats</label>
        <select
          {...register("recurrence")}
          className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400"
        >
          <option value="monthly">Monthly</option>
          <option value="weekly">Weekly</option>
        </select>
      </div>

      {/* Paid by */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">Usually paid by</label>
        <select
          {...register("paidByMemberId")}
          className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400"
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
          initialSelectedIds={new Set(members.map((m) => m.id))}
        />
        {errors.splits && <p className="mt-1 text-xs text-red-500">Select at least one member.</p>}
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3 bg-gradient-to-br from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white font-medium rounded-xl shadow-md shadow-cyan-500/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {submitting ? "Saving…" : "Save recurring expense"}
      </button>
    </form>
  );
}
