"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { addExpenseSchema, type AddExpenseInput } from "@/lib/validations/expense";
import { addExpense } from "@/app/actions/expenses";
import { getSignedReceiptUploadUrl } from "@/app/actions/upload-receipt";
import { updateExpenseMedia } from "@/app/actions/update-expense-media";
import { SplitEditor } from "@/components/expense/split-editor";
import { QuickAddBar } from "@/components/expense/quick-add-bar";
import { ReceiptScannerSheet } from "@/components/expense/receipt-scanner-sheet";
import { LocationInput } from "@/components/expense/location-input";
import { getGroupConfig } from "@/lib/group-config";
import { mapToGroupCategory } from "@/lib/receipt/map-category";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import { hapticLight } from "@/lib/haptics";
import { useWarnBeforeLeave } from "@/hooks/use-warn-before-leave";
import type { Group } from "@/lib/db/schema/groups";
import type { GroupMember } from "@/lib/db/schema/group-members";
import type { ExpenseLocation } from "@/lib/db/schema/expenses";
import { getMemberName, smartDefaultDate, formatCurrency } from "@/lib/utils";
import type { SplitMode, SplitInput } from "@/lib/splits/compute";
import type { ParsedExpense } from "@/lib/parser/parse-expense";
import type { ParsedReceipt } from "@/lib/receipt/types";
import { useRecentCategories } from "@/hooks/use-recent-categories";
import { Camera, Paperclip, Receipt } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  group:            Group;
  members:          GroupMember[];
  canUseNonEqual?:  boolean;
  currentMemberId?: string;
  isPlusUser?:      boolean;
}

export function AddExpenseForm({ group, members, canUseNonEqual = true, currentMemberId, isPlusUser = false }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const groupConfig = getGroupConfig(group.groupType);
  const isTrip = groupConfig.showDates && !groupConfig.isCircle;
  const [recentCategories, addRecentCategory] = useRecentCategories(group.groupType);
  const [splitMode, setSplitMode] = useState<SplitMode>("equal");
  const [splitEditorKey, setSplitEditorKey] = useState(0);
  const [initialSplitIds, setInitialSplitIds] = useState<Set<string>>(
    new Set(members.map((m) => m.id))
  );

  // ── Scanner state ──────────────────────────────────────────────────────────
  const [scannerOpen, setScannerOpen]         = useState(false);
  const [aiFilledFields, setAiFilledFields]   = useState<Set<string>>(new Set());
  const [wasScanFilled, setWasScanFilled]     = useState(false);
  const [proofPending, setProofPending]       = useState(false);
  const pendingProofFileRef                   = useRef<File | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<AddExpenseInput>({
    resolver: zodResolver(addExpenseSchema),
    defaultValues: {
      groupId:        group.id,
      currency:       group.defaultCurrency,
      expenseDate:    smartDefaultDate(group.startDate, group.endDate),
      category:       "other",
      customCategory: "",
      paidByMemberId: currentMemberId ?? members[0]?.id ?? "",
      splitMode:      "equal",
      splits:         members.map((m) => ({ memberId: m.id })),
    },
  });

  const amount      = Number(watch("amount")) || 0;
  const currency    = watch("currency");
  const category    = watch("category");
  const currentDate = watch("expenseDate");
  const receiptItems = watch("receiptItems");
  const locationVal  = watch("location") as ExpenseLocation | null | undefined;
  const today     = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 864e5).toISOString().split("T")[0];

  useWarnBeforeLeave(isDirty);

  // ── Helpers ────────────────────────────────────────────────────────────────
  function clearAiFill(field: string) {
    setAiFilledFields((prev) => {
      const next = new Set(prev);
      next.delete(field);
      return next;
    });
  }

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
    setValue("expenseDate", parsed.expenseDate ?? smartDefaultDate(group.startDate, group.endDate));
    setValue("category", parsed.category);
    setValue("customCategory", "");
    // Clear AI fill highlights when user manually edits via QuickAddBar
    setAiFilledFields(new Set());
    setWasScanFilled(false);

    let nextIds: Set<string>;
    if (parsed.splitMemberIds && parsed.splitMemberIds.length > 0) {
      nextIds = new Set(parsed.splitMemberIds);
    } else if (typeof parsed.splitCount === "number") {
      nextIds = new Set(members.slice(0, parsed.splitCount).map((m) => m.id));
    } else {
      nextIds = new Set(members.map((m) => m.id));
    }

    setInitialSplitIds(nextIds);
    setSplitEditorKey((k) => k + 1);
  }

  // ── Receipt scanner callback ────────────────────────────────────────────
  function handleReceiptExtracted(result: ParsedReceipt, keepProof: boolean) {
    const filled = new Set<string>();

    if (result.description) {
      setValue("description", result.description);
      filled.add("description");
    }
    if (result.amount !== null) {
      setValue("amount", result.amount);
      filled.add("amount");
    }
    if (result.expenseDate) {
      setValue("expenseDate", result.expenseDate);
      filled.add("expenseDate");
    }

    // Map AI category to this group's valid categories
    const mappedCat = mapToGroupCategory(result.category, group.groupType as "trip" | "nest" | "circle");
    setValue("category", mappedCat);
    setValue("customCategory", "");
    filled.add("category");

    // Location: trips always show, nests only if AI filled it
    if (result.location) {
      setValue("location", result.location);
      filled.add("location");
    }

    // Receipt items for item-split chip
    if (result.receiptItems?.length) {
      setValue("receiptItems", result.receiptItems);
    }

    setValue("wasAiScanned", true);
    setAiFilledFields(filled);
    setWasScanFilled(true);
    setProofPending(keepProof);
  }

  // ── Background proof upload (fire-and-forget after navigation) ──────────
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

  async function onSubmit(data: AddExpenseInput) {
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

    addRecentCategory(data.category);
    hapticLight();

    // Background proof upload — navigate immediately, upload runs in background
    const proofFile = pendingProofFileRef.current;
    if (proofFile && result.expenseId) {
      pendingProofFileRef.current = null;
      setProofPending(false);
      uploadReceiptProofInBackground(result.expenseId, group.id, proofFile);
    }

    const isFirst = !localStorage.getItem("first_expense_added");
    if (isFirst) {
      localStorage.setItem("first_expense_added", "1");
      toast.success("First expense logged!", {
        description: "Ready to settle up with the group?",
        action: { label: "Settle up →", onClick: () => router.push(`/groups/${group.id}/settle`) },
        duration: 6000,
      });
    } else {
      toast.success("Expense added!");
    }
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

      {/* Proof-pending indicator — shown when user enabled "Keep as proof" in scanner */}
      {proofPending && (
        <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 -mt-1 ml-1">
          <Paperclip className="w-3 h-3 shrink-0" />
          <span>Receipt proof will attach on save</span>
        </div>
      )}

      <QuickAddBar
        members={members}
        currency={watch("currency")}
        groupStartDate={group.startDate}
        groupEndDate={group.endDate}
        onParsed={handleQuickAdd}
      />

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
          Description <span className="text-red-400">*</span>
        </label>
        <input
          {...register("description", { onChange: () => clearAiFill("description") })}
          placeholder="e.g. Dinner at Thalassa"
          className={`w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all ${
            aiFilledFields.has("description") ? "ring-1 ring-emerald-400/50" : ""
          }`}
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
              {...register("amount", { valueAsNumber: true, onChange: () => clearAiFill("amount") })}
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              placeholder="0.00"
              className={`w-full pl-10 pr-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400 placeholder:text-slate-400 dark:placeholder:text-slate-500 tabular transition-all ${
                aiFilledFields.has("amount") ? "ring-1 ring-emerald-400/50" : ""
              }`}
            />
          </div>
          {errors.amount && <p className="mt-1 text-xs text-red-500">{errors.amount.message}</p>}
          {/* Quick-amount chips */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {[50, 100, 200, 500, 1000, 2000].map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => { setValue("amount", amt, { shouldValidate: true }); clearAiFill("amount"); }}
                className="px-2.5 py-1 text-xs font-medium rounded-lg
                           bg-slate-100 dark:bg-slate-800
                           text-slate-600 dark:text-slate-300
                           border border-slate-200 dark:border-slate-700
                           hover:bg-cyan-50 dark:hover:bg-cyan-950/40
                           hover:text-cyan-700 dark:hover:text-cyan-300
                           hover:border-cyan-300 dark:hover:border-cyan-700/50
                           active:scale-95 transition-all"
              >
                {formatCurrency(amt, currency)}
              </button>
            ))}
          </div>
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
        {/* Recent category pills */}
        {recentCategories.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {recentCategories.map((cat) => {
              const meta = groupConfig.categories.find((c) => c.value === cat);
              if (!meta) return null;
              const active = category === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => { setValue("category", cat); setValue("customCategory", ""); clearAiFill("category"); }}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                    active
                      ? `bg-gradient-to-br ${meta.gradient} text-white shadow-sm`
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
                  }`}
                >
                  <meta.icon className="w-3 h-3" />
                  {meta.label}
                </button>
              );
            })}
          </div>
        )}
        <div className={`grid gap-1.5 ${aiFilledFields.has("category") ? "ring-1 ring-emerald-400/50 rounded-xl p-1" : ""} grid-cols-3`}>
          {groupConfig.categories.map((c) => {
            const active = category === c.value;
            return (
              <button
                key={c.value}
                type="button"
                onClick={() => {
                  setValue("category", c.value, { shouldValidate: true });
                  if (c.value !== "other") setValue("customCategory", "");
                  clearAiFill("category");
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
            placeholder="e.g. Visa fees, Parking, Tips"
            className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400 placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
          {errors.customCategory && <p className="mt-1 text-xs text-red-500">{errors.customCategory.message}</p>}
        </div>
      )}

      {/* Date + Paid by */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
            {category === "accommodation" ? "Check-in" : "Date"}
          </label>
          <input
            {...register("expenseDate", { onChange: () => clearAiFill("expenseDate") })}
            type="date"
            className={`w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 dark:[color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-cyan-400 transition-all ${
              aiFilledFields.has("expenseDate") ? "ring-1 ring-emerald-400/50" : ""
            }`}
          />
          <div className="flex gap-1.5 mt-1.5">
            {[{ label: "Today", value: today }, { label: "Yesterday", value: yesterday }].map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => { setValue("expenseDate", s.value, { shouldValidate: true }); clearAiFill("expenseDate"); }}
                className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full transition-all ${
                  currentDate === s.value
                    ? "bg-cyan-500 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          {errors.expenseDate && <p className="mt-1 text-xs text-red-500">{errors.expenseDate.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">Paid by</label>
          <select
            {...register("paidByMemberId")}
            className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 dark:[color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-cyan-400"
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
            className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 dark:[color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-cyan-400"
          />
          {errors.endDate && <p className="mt-1 text-xs text-red-500">{errors.endDate.message}</p>}
        </div>
      )}

      {/* Location — trips always show; nests only if AI filled */}
      {(isTrip || aiFilledFields.has("location")) && (
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
            Location
          </label>
          <LocationInput
            value={locationVal}
            onChange={(loc) => { setValue("location", loc); clearAiFill("location"); }}
            isAiFilled={aiFilledFields.has("location")}
            showSearch={isTrip}
          />
        </div>
      )}

      {/* "Split by item?" chip — shown when AI found multiple items */}
      {Array.isArray(receiptItems) && receiptItems.length > 1 && !groupConfig.isCircle && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 px-3 py-2 rounded-xl
                     bg-cyan-50 dark:bg-cyan-950/40
                     border border-cyan-200/60 dark:border-cyan-800/50"
        >
          <Receipt className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
          <span className="text-xs text-cyan-700 dark:text-cyan-300 flex-1">
            {receiptItems.length} items detected — item-split coming soon
          </span>
        </motion.div>
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
          canUseNonEqual={canUseNonEqual}
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
          className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400 resize-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3 bg-gradient-to-br from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white font-medium rounded-xl shadow-md shadow-cyan-500/20 transition-all disabled:opacity-60"
      >
        {submitting ? "Saving…" : "Save expense"}
      </button>

      {/* Receipt scanner sheet */}
      <ReceiptScannerSheet
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onExtracted={handleReceiptExtracted}
        mode="expense"
        groupType={group.groupType}
        isPlusUser={isPlusUser}
        pendingProofRef={pendingProofFileRef}
      />
    </form>
  );
}
