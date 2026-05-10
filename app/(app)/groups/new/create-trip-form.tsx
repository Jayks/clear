"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createGroupSchema, type CreateGroupInput } from "@/lib/validations/trip";
import { createGroup } from "@/app/actions/groups";
import { CoverPhotoPicker } from "@/components/trip/cover-photo-picker";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useWarnBeforeLeave } from "@/hooks/use-warn-before-leave";
import { GROUP_CONFIG } from "@/lib/group-config";
import type { GroupType } from "@/lib/group-config";

const CURRENCIES = ["INR", "USD", "EUR", "GBP", "SGD", "AED", "JPY", "CAD", "AUD"];

export function CreateTripForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<CreateGroupInput>({
    resolver: zodResolver(createGroupSchema),
    defaultValues: { defaultCurrency: "INR", groupType: "trip" },
  });

  useWarnBeforeLeave(isDirty);
  const coverPhotoUrl = watch("coverPhotoUrl");
  const groupType = (watch("groupType") ?? "trip") as GroupType;
  const config = GROUP_CONFIG[groupType];

  function selectType(type: GroupType) {
    setValue("groupType", type);
    if (type === "nest") {
      setValue("startDate", "");
      setValue("endDate", "");
      setValue("itinerary", "");
    }
  }

  async function onSubmit(data: CreateGroupInput) {
    setSubmitting(true);
    const result = await createGroup(data);
    setSubmitting(false);

    if (!result.ok) {
      toast.error("Failed to create group. Please try again.");
      return;
    }
    toast.success(`${config.labels.singular} created!`);
    router.push(`/groups/${result.groupId}`);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Type selector */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">Group type</label>
        <div className="grid grid-cols-2 gap-3">
          {(["trip", "nest"] as GroupType[]).map((type) => {
            const cfg = GROUP_CONFIG[type];
            const Icon = cfg.icon;
            const active = groupType === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => selectType(type)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left ${
                  active
                    ? "border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20"
                    : "border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-600"
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${active ? "bg-gradient-to-br from-cyan-500 to-teal-500" : "bg-slate-100 dark:bg-slate-700"}`}>
                  <Icon className={`w-4 h-4 ${active ? "text-white" : "text-slate-500 dark:text-slate-400"}`} />
                </div>
                <div>
                  <p className={`text-sm font-medium ${active ? "text-cyan-700 dark:text-cyan-300" : "text-slate-700 dark:text-slate-200"}`}>
                    {cfg.labels.singular}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    {type === "trip" ? "Travel expenses" : "Shared tab expenses"}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
        <input type="hidden" {...register("groupType")} />
      </div>

      {/* Cover photo */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">Cover photo</label>
        <CoverPhotoPicker value={coverPhotoUrl} onChange={(url) => setValue("coverPhotoUrl", url)} />
      </div>

      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
          {config.labels.singular} name <span className="text-red-400">*</span>
        </label>
        <input
          {...register("name")}
          placeholder={groupType === "trip" ? "e.g. Goa 2025" : "e.g. Flat 4B"}
          className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent placeholder:text-slate-400 dark:placeholder:text-slate-500"
        />
        {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">Description</label>
        <textarea
          {...register("description")}
          rows={2}
          placeholder={groupType === "trip" ? "A quick note about the trip" : "What's this shared tab for?"}
          className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-none"
        />
      </div>

      {/* Trip-only: itinerary */}
      {config.showItinerary && (
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
            Trip plan <span className="text-slate-400 dark:text-slate-500 font-normal text-xs">(optional — helps AI write your trip story)</span>
          </label>
          <textarea
            {...register("itinerary")}
            rows={4}
            placeholder={"Day 1: Arrive Chennai, check in\nDay 2: Mahabalipuram – Shore Temple\n..."}
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-none"
          />
        </div>
      )}

      {/* Trip-only: dates */}
      {config.showDates && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">Start date</label>
            <input
              {...register("startDate")}
              type="date"
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">End date</label>
            <input
              {...register("endDate")}
              type="date"
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
            />
            {errors.endDate && <p className="mt-1 text-xs text-red-500">{errors.endDate.message}</p>}
          </div>
        </div>
      )}

      {/* Currency + Budget */}
      <div className={`grid gap-3 ${config.showBudget ? "grid-cols-2" : "grid-cols-1"}`}>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">Default currency</label>
          <select
            {...register("defaultCurrency")}
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
          >
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        {config.showBudget && (
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
              Budget <span className="text-slate-400 dark:text-slate-500 font-normal text-xs">(optional)</span>
            </label>
            <input
              {...register("budget", { valueAsNumber: true })}
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              placeholder="0.00"
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-2.5 bg-gradient-to-br from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white font-medium rounded-xl shadow-md shadow-cyan-500/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {submitting ? "Creating…" : `Create ${config.labels.singular.toLowerCase()}`}
      </button>
    </form>
  );
}
