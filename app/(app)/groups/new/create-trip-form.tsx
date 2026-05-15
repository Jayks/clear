"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createGroupSchema, type CreateGroupInput } from "@/lib/validations/trip";
import { createGroup } from "@/app/actions/groups";
import { CoverPhotoPicker } from "@/components/trip/cover-photo-picker";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import { useWarnBeforeLeave } from "@/hooks/use-warn-before-leave";
import { Upload, Loader2 } from "lucide-react";
import { parseItineraryFromFile } from "@/app/actions/parse-itinerary";
import { GROUP_CONFIG } from "@/lib/group-config";
import type { GroupType } from "@/lib/group-config";
import { SUPPORTED_CURRENCIES } from "@/lib/utils";

export function CreateTripForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  const itinerary = watch("itinerary") ?? "";
  const config = GROUP_CONFIG[groupType];

  function selectType(type: GroupType) {
    setValue("groupType", type);
    if (type === "nest") {
      setValue("startDate", "");
      setValue("endDate", "");
      setValue("itinerary", "");
    }
  }

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
            {SUPPORTED_CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
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

      <div className="flex gap-3">
        <Link
          href="/groups"
          className="flex-1 py-2.5 text-center text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 py-2.5 bg-gradient-to-br from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white font-medium rounded-xl shadow-md shadow-cyan-500/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitting ? "Creating…" : `Create ${config.labels.singular.toLowerCase()}`}
        </button>
      </div>
    </form>
  );
}
