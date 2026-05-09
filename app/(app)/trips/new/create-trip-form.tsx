"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createTripSchema, type CreateTripInput } from "@/lib/validations/trip";
import { createTrip } from "@/app/actions/trips";
import { CoverPhotoPicker } from "@/components/trip/cover-photo-picker";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useWarnBeforeLeave } from "@/hooks/use-warn-before-leave";

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
  } = useForm<CreateTripInput>({
    resolver: zodResolver(createTripSchema),
    defaultValues: { defaultCurrency: "INR" },
  });

  useWarnBeforeLeave(isDirty);
  const coverPhotoUrl = watch("coverPhotoUrl");

  async function onSubmit(data: CreateTripInput) {
    setSubmitting(true);
    const result = await createTrip(data);
    setSubmitting(false);

    if (!result.ok) {
      toast.error("Failed to create trip. Please try again.");
      return;
    }
    toast.success("Trip created!");
    router.push(`/trips/${result.tripId}`);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Cover photo */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">Cover photo</label>
        <CoverPhotoPicker
          value={coverPhotoUrl}
          onChange={(url) => setValue("coverPhotoUrl", url)}
        />
      </div>

      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
          Trip name <span className="text-red-400">*</span>
        </label>
        <input
          {...register("name")}
          placeholder="e.g. Goa 2025"
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
          placeholder="A quick note about the trip"
          className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-none"
        />
      </div>

      {/* Itinerary */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
          Trip plan <span className="text-slate-400 dark:text-slate-500 font-normal text-xs">(optional — helps AI write your trip story)</span>
        </label>
        <textarea
          {...register("itinerary")}
          rows={4}
          placeholder={"Day 1: Arrive Chennai, check in\nDay 2: Mahabalipuram – Shore Temple, beach\nDay 3: Kanchipuram temples\n..."}
          className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-none"
        />
      </div>

      {/* Dates */}
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

      {/* Currency + Budget */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">Default currency</label>
          <select
            {...register("defaultCurrency")}
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
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
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-2.5 bg-gradient-to-br from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white font-medium rounded-xl shadow-md shadow-cyan-500/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {submitting ? "Creating…" : "Create trip"}
      </button>
    </form>
  );
}
