"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createGroupSchema, type CreateGroupInput } from "@/lib/validations/trip";
import { updateGroup } from "@/app/actions/groups";
import { CoverPhotoPicker } from "@/components/trip/cover-photo-picker";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import type { Group } from "@/lib/db/schema/groups";
import { Upload, Loader2 } from "lucide-react";
import { parseItineraryFromFile } from "@/app/actions/parse-itinerary";
import { getGroupConfig } from "@/lib/group-config";
import { SUPPORTED_CURRENCIES } from "@/lib/utils";

export function EditTripForm({ group }: { group: Group }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const config = getGroupConfig(group.groupType);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateGroupInput>({
    resolver: zodResolver(createGroupSchema),
    defaultValues: {
      name: group.name,
      description: group.description ?? "",
      coverPhotoUrl: group.coverPhotoUrl ?? "",
      defaultCurrency: group.defaultCurrency,
      groupType: group.groupType,
      startDate: group.startDate ?? "",
      endDate: group.endDate ?? "",
      budget: group.budget ? Number(group.budget) : undefined,
      itinerary: group.itinerary ?? "",
    },
  });

  const coverPhotoUrl = watch("coverPhotoUrl");
  const itinerary = watch("itinerary") ?? "";

  async function handleItineraryUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File is too large (max 10 MB)");
      return;
    }
    const mimeType = file.type === "application/pdf" ? "application/pdf" : "text/plain";
    setUploadingDoc(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const result = await parseItineraryFromFile({ base64, mimeType, fileName: file.name });
      if (result.ok) {
        setValue("itinerary", result.text, { shouldDirty: true });
        toast.success("Itinerary extracted successfully");
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Failed to read the file");
    } finally {
      setUploadingDoc(false);
    }
  }

  async function onSubmit(data: CreateGroupInput) {
    setSubmitting(true);
    const result = await updateGroup(group.id, data);
    setSubmitting(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`${config.labels.singular} updated!`);
    router.push(`/groups/${group.id}`);
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
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Trip plan <span className="text-slate-400 dark:text-slate-500 font-normal text-xs">(optional — helps AI write your trip story)</span>
            </label>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingDoc}
              className="inline-flex items-center gap-1 text-xs text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 disabled:opacity-50 transition-colors"
            >
              {uploadingDoc
                ? <><Loader2 className="w-3 h-3 animate-spin" />Parsing…</>
                : <><Upload className="w-3 h-3" />Upload document</>}
            </button>
            <input ref={fileInputRef} type="file" accept=".pdf,.txt" className="hidden" onChange={handleItineraryUpload} />
          </div>
          <textarea
            {...register("itinerary")}
            rows={6}
            placeholder={"Day 1: Arrive Chennai, check in\nDay 2: Mahabalipuram – Shore Temple\n..."}
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-none"
          />
          <div className="flex justify-end mt-1">
            <span className={`text-xs tabular ${itinerary.length > 10000 ? "text-red-500" : "text-slate-400 dark:text-slate-500"}`}>
              {itinerary.length.toLocaleString()} / 10,000
            </span>
          </div>
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
            {SUPPORTED_CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
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

      <div className="flex gap-3">
        <Link
          href={`/groups/${group.id}`}
          className="flex-1 py-2.5 text-center text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 py-2.5 bg-gradient-to-br from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white font-medium rounded-xl shadow-md shadow-cyan-500/20 transition-all disabled:opacity-60"
        >
          {submitting ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
