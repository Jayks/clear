"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { addCircleExpenseSchema, type AddCircleExpenseInput } from "@/lib/validations/circle-expense";
import { addCircleExpense } from "@/app/actions/circle";
import { getSignedReceiptUploadUrl } from "@/app/actions/upload-receipt";
import { updateExpenseMedia } from "@/app/actions/update-expense-media";
import { ReceiptScannerSheet } from "@/components/expense/receipt-scanner-sheet";
import { getGroupConfig } from "@/lib/group-config";
import { mapToGroupCategory } from "@/lib/receipt/map-category";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import { hapticLight } from "@/lib/haptics";
import type { Group } from "@/lib/db/schema/groups";
import { Camera, Wallet } from "lucide-react";
import type { ParsedReceipt } from "@/lib/receipt/types";

interface Props {
  group:       Group;
  isPlusUser?: boolean;
}

export function AddCircleExpenseForm({ group, isPlusUser = false }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const groupConfig = getGroupConfig(group.groupType);

  const today     = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 864e5).toISOString().split("T")[0];

  // ── Scanner state ──────────────────────────────────────────────────────────
  const [scannerOpen, setScannerOpen]   = useState(false);
  const [wasScanFilled, setWasScanFilled] = useState(false);
  const pendingProofFileRef              = useRef<File | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AddCircleExpenseInput>({
    resolver: zodResolver(addCircleExpenseSchema),
    defaultValues: {
      groupId:        group.id,
      currency:       group.defaultCurrency,
      expenseDate:    today,
      category:       "other",
      customCategory: "",
      isAdvance:      false,
    },
  });

  const category    = watch("category");
  const currentDate = watch("expenseDate");
  const isAdvance   = watch("isAdvance");
  const currency    = watch("currency");

  // ── Receipt scanner callback (fills amount, description, date, category only) ──
  function handleReceiptExtracted(result: ParsedReceipt, _keepProof: boolean) {
    if (result.description) setValue("description", result.description);
    if (result.amount !== null) setValue("amount", result.amount);
    if (result.expenseDate) setValue("expenseDate", result.expenseDate);

    const mappedCat = mapToGroupCategory(result.category, "circle");
    setValue("category", mappedCat);
    setValue("customCategory", "");
    setValue("wasAiScanned", true);
    setWasScanFilled(true);
  }

  // ── Background proof upload ────────────────────────────────────────────────
  async function uploadReceiptProofInBackground(expenseId: string, groupId: string, file: File) {
    try {
      const upload = await getSignedReceiptUploadUrl({ mimeType: "image/jpeg", groupId });
      if (!upload.ok) return;
      const supabase = createClient();
      await supabase.storage.from("receipt-photos").uploadToSignedUrl(upload.path, upload.token, file);
      await updateExpenseMedia(expenseId, groupId, { receiptUrl: upload.publicUrl });
    } catch {
      toast.warning("Couldn't save receipt photo — expense was saved without it");
    }
  }

  async function onSubmit(data: AddCircleExpenseInput) {
    setSubmitting(true);
    const result = await addCircleExpense(data);
    setSubmitting(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    hapticLight();

    // Background proof upload
    const proofFile = pendingProofFileRef.current;
    if (proofFile && result.expenseId) {
      pendingProofFileRef.current = null;
      uploadReceiptProofInBackground(result.expenseId, group.id, proofFile);
    }

    toast.success(data.isAdvance ? "Advance logged!" : "Wallet expense logged!");
    router.push(`/groups/${group.id}/expenses`);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <input type="hidden" {...register("groupId")} />

      {/* Scan receipt button */}
      <button
        type="button"
        onClick={() => setScannerOpen(true)}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                   bg-white/40 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/40
                   hover:border-cyan-400/60 dark:hover:border-cyan-600/40 transition-all group"
      >
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-teal-500
                        flex items-center justify-center shrink-0
                        group-hover:shadow-sm group-hover:shadow-cyan-500/25 transition-shadow">
          <Camera className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="flex-1 text-sm font-medium text-left text-slate-600 dark:text-slate-300">
          Scan receipt
        </span>
        {!isPlusUser ? (
          <span className="text-xs font-semibold bg-gradient-to-r from-cyan-500 to-teal-500
                           bg-clip-text text-transparent">Plus</span>
        ) : wasScanFilled ? (
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">✨ Filled</span>
        ) : null}
      </button>

      {/* Source toggle — wallet draw vs organiser advance */}
      <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
        <button
          type="button"
          onClick={() => setValue("isAdvance", false)}
          className={`w-full px-4 py-3 flex items-center gap-3 text-left transition-colors ${
            !isAdvance
              ? "bg-indigo-50 dark:bg-indigo-900/20 border-b border-indigo-200 dark:border-indigo-700/50"
              : "bg-white/60 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/80"
          }`}
        >
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
            !isAdvance
              ? "bg-indigo-100 dark:bg-indigo-900/40"
              : "bg-slate-100 dark:bg-slate-800"
          }`}>
            <span className="text-base">🏦</span>
          </div>
          <div>
            <p className={`text-sm font-semibold ${
              !isAdvance ? "text-indigo-700 dark:text-indigo-300" : "text-slate-600 dark:text-slate-300"
            }`}>
              From wallet
            </p>
            <p className={`text-xs ${
              !isAdvance ? "text-indigo-500 dark:text-indigo-400" : "text-slate-400 dark:text-slate-500"
            }`}>
              Paid directly from the shared wallet
            </p>
          </div>
          {!isAdvance && (
            <div className="ml-auto w-4 h-4 rounded-full bg-indigo-500 flex items-center justify-center shrink-0">
              <div className="w-2 h-2 rounded-full bg-white" />
            </div>
          )}
        </button>
        <button
          type="button"
          onClick={() => setValue("isAdvance", true)}
          className={`w-full px-4 py-3 flex items-center gap-3 text-left transition-colors ${
            isAdvance
              ? "bg-amber-50 dark:bg-amber-900/20"
              : "bg-white/60 dark:bg-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/80"
          }`}
        >
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
            isAdvance
              ? "bg-amber-100 dark:bg-amber-900/40"
              : "bg-slate-100 dark:bg-slate-800"
          }`}>
            <Wallet className={`w-4 h-4 ${isAdvance ? "text-amber-600 dark:text-amber-400" : "text-slate-400"}`} />
          </div>
          <div>
            <p className={`text-sm font-semibold ${
              isAdvance ? "text-amber-700 dark:text-amber-300" : "text-slate-600 dark:text-slate-300"
            }`}>
              I paid from my pocket
            </p>
            <p className={`text-xs ${
              isAdvance ? "text-amber-500 dark:text-amber-400" : "text-slate-400 dark:text-slate-500"
            }`}>
              You advanced the money; wallet owes you back
            </p>
          </div>
          {isAdvance && (
            <div className="ml-auto w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center shrink-0">
              <div className="w-2 h-2 rounded-full bg-white" />
            </div>
          )}
        </button>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
          Description <span className="text-red-400">*</span>
        </label>
        <input
          {...register("description")}
          placeholder="e.g. Ground rental for June"
          className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder:text-slate-400 dark:placeholder:text-slate-500"
        />
        {errors.description && <p className="mt-1 text-xs text-red-500">{errors.description.message}</p>}
      </div>

      {/* Amount + Currency */}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
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
              className="w-full pl-10 pr-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder:text-slate-400 dark:placeholder:text-slate-500 tabular"
            />
          </div>
          {errors.amount && <p className="mt-1 text-xs text-red-500">{errors.amount.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">Currency</label>
          <input
            {...register("currency")}
            readOnly
            className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 cursor-default select-none"
          />
        </div>
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">Category</label>
        <div className="grid grid-cols-4 gap-1.5">
          {groupConfig.categories.map((c) => {
            const active = category === c.value;
            return (
              <button
                key={c.value}
                type="button"
                onClick={() => {
                  setValue("category", c.value, { shouldValidate: true });
                  if (c.value !== "other") setValue("customCategory", "");
                }}
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

      {/* Custom category — "Other" only */}
      {category === "other" && (
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
            Specify <span className="text-red-400">*</span>
          </label>
          <input
            {...register("customCategory")}
            placeholder="e.g. Referee fees, Water, Snacks"
            className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
          {errors.customCategory && <p className="mt-1 text-xs text-red-500">{errors.customCategory.message}</p>}
        </div>
      )}

      {/* Date */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">Date</label>
        <input
          {...register("expenseDate")}
          type="date"
          className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 dark:[color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <div className="flex gap-1.5 mt-1.5">
          {[{ label: "Today", value: today }, { label: "Yesterday", value: yesterday }].map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => setValue("expenseDate", s.value, { shouldValidate: true })}
              className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full transition-all ${
                currentDate === s.value
                  ? "bg-indigo-500 text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        {errors.expenseDate && <p className="mt-1 text-xs text-red-500">{errors.expenseDate.message}</p>}
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">Notes</label>
        <textarea
          {...register("notes")}
          rows={2}
          placeholder="Optional note"
          className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className={`w-full py-3 text-white font-medium rounded-xl shadow-md transition-all disabled:opacity-60 ${
          isAdvance
            ? "bg-gradient-to-br from-amber-500 to-orange-400 hover:from-amber-600 hover:to-orange-500 shadow-amber-500/20"
            : "bg-gradient-to-br from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 shadow-indigo-500/20"
        }`}
      >
        {submitting ? "Saving…" : isAdvance ? "Log advance" : "Log wallet expense"}
      </button>

      {/* Receipt scanner sheet */}
      <ReceiptScannerSheet
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onExtracted={handleReceiptExtracted}
        mode="circle"
        groupType="circle"
        isPlusUser={isPlusUser}
        pendingProofRef={pendingProofFileRef}
      />
    </form>
  );
}
