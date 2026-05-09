"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createGroupSchema, type CreateGroupInput } from "@/lib/validations/trip";
import { updateGroup } from "@/app/actions/groups";
import { CoverPhotoPicker } from "@/components/trip/cover-photo-picker";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Group } from "@/lib/db/schema/groups";
import { getGroupConfig } from "@/lib/group-config";

const CURRENCIES = ["INR", "USD", "EUR", "GBP", "SGD", "AED", "JPY", "CAD", "AUD"];

export function EditTripForm({ trip }: { trip: Group }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const config = getGroupConfig(trip.groupType);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateGroupInput>({
    resolver: zodResolver(createGroupSchema),
    defaultValues: {
      name: trip.name,
      description: trip.description ?? "",
      coverPhotoUrl: trip.coverPhotoUrl ?? "",
      defaultCurrency: trip.defaultCurrency,
      groupType: trip.groupType,
      startDate: trip.startDate ?? "",
      endDate: trip.endDate ?? "",
      budget: trip.budget ? Number(trip.budget) : undefined,
      itinerary: trip.itinerary ?? "",
    },
  });

  const coverPhotoUrl = watch("coverPhotoUrl");

  async function onSubmit(data: CreateGroupInput) {
    setSubmitting(true);
    const result = await updateGroup(trip.id, data);
    setSubmitting(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`${config.labels.singular} updated!`);
    router.push(`/groups/${trip.id}`);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <input type="hidden" {...register("groupType")} />

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
          className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
        />
        {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">Description</label>
        <textarea
          {...register("description")}
          rows={2}
          className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent resize-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
        />
      </div>

      {/* Trip-only: itinerary */}
      {config.showItinerary && (
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
            Trip plan <span className="text-slate-400 font-normal text-xs">(optional — helps AI write your trip story)</span>
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
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">Budget (optional)</label>
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
        className="w-full py-2.5 bg-gradient-to-br from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white font-medium rounded-xl shadow-md shadow-cyan-500/20 transition-all disabled:opacity-60"
      >
        {submitting ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
