"use client";

import { useState, useTransition, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Loader2, ArrowUpRight, Mic, MicOff, Check, RotateCcw, ChevronLeft, Camera, Sparkles } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { hapticLight } from "@/lib/haptics";
import type { GroupMember } from "@/lib/db/schema/group-members";
import type { ParsedExpense, CategoryValue } from "@/lib/parser/parse-expense";
import type { ParsedReceipt } from "@/lib/receipt/types";
import { QuickAddBar } from "./quick-add-bar";
import { ReceiptScannerSheet } from "./receipt-scanner-sheet";
import { addExpense } from "@/app/actions/expenses";
import { trackEvent } from "@/lib/analytics";
import { getGroupMembersForQuickAdd } from "@/app/actions/quick-add";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import type { AddExpenseInput } from "@/lib/validations/expense";
import { useRecentCategories } from "@/hooks/use-recent-categories";
import { getMemberName, formatDate, formatCurrency } from "@/lib/utils";
import { useSheetDismiss } from "@/hooks/use-sheet-dismiss";
import { mapToGroupCategory } from "@/lib/receipt/map-category";

interface Props {
  groupId: string;
  groupName: string;
  groupType: string;
  currency: string;
  isOpen: boolean;
  groupStartDate?: string | null;
  groupEndDate?: string | null;
  /** Pre-loaded members — when available (expenses page), skips the fetch. */
  members?: GroupMember[];
  onClose: () => void;
  /** When provided (global FAB flow), shows a ← back button to re-pick the group. */
  onBack?: () => void;
  /** Whether the current user has Plus (enables receipt scanner). */
  isPlusUser?: boolean;
  /**
   * When provided, auto-triggers the named input mode the moment the sheet opens:
   *   "scan"  → opens the receipt scanner immediately (skips the camera tap)
   *   "voice" → starts the mic automatically after the sheet animation settles
   *   "text"  → normal behaviour (focus the text input, no auto-trigger)
   */
  startMode?: "text" | "voice" | "scan";
}

type StickyContext = { paidByMemberId: string; expenseDate: string };

function buildExpenseInput(
  parsed: ParsedExpense,
  members: GroupMember[],
  groupId: string,
  currency: string,
  context?: StickyContext | null,
): AddExpenseInput | null {
  if (!parsed.amount || parsed.amount <= 0 || !parsed.description) return null;
  if (members.length === 0) return null;

  const today = new Date().toISOString().split("T")[0];
  // Use AI-parsed payer first, then sticky context, then first member
  const paidByMemberId = parsed.paidByMemberId ?? context?.paidByMemberId ?? members[0].id;

  let splitMembers: GroupMember[];
  if (parsed.splitMemberIds && parsed.splitMemberIds.length > 0) {
    splitMembers = members.filter((m) => parsed.splitMemberIds!.includes(m.id));
  } else if (parsed.splitCount != null && parsed.splitCount > 0) {
    splitMembers = members.slice(0, parsed.splitCount);
  } else {
    splitMembers = members;
  }
  if (splitMembers.length === 0) splitMembers = members;

  return {
    groupId,
    paidByMemberId,
    description: parsed.description,
    category: parsed.category ?? "other",
    customCategory: "",
    amount: parsed.amount,
    currency,
    // Use AI-parsed date first, then sticky context date, then today
    expenseDate: parsed.expenseDate ?? context?.expenseDate ?? today,
    splitMode: "equal",
    splits: splitMembers.map((m) => ({ memberId: m.id })),
  };
}

export function QuickAddSheet({
  groupId,
  groupName,
  groupType,
  currency,
  isOpen,
  groupStartDate,
  groupEndDate,
  members: initialMembers,
  onClose,
  onBack,
  isPlusUser = false,
  startMode,
}: Props) {
  const [members, setMembers] = useState<GroupMember[] | null>(initialMembers ?? null);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [parsed, setParsed] = useState<ParsedExpense | null>(null);
  const [saving, startSave] = useTransition();
  const [saved, setSaved] = useState(false);
  const [lastContext, setLastContext] = useState<StickyContext | null>(null);
  const [, addRecentCategory] = useRecentCategories(groupType);
  const [mounted, setMounted] = useState(false);

  // ── Scanner state ──────────────────────────────────────────────────────────
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanFilled, setScanFilled]   = useState(false);

  // Escape key + Android back-button dismissal
  useSheetDismiss(isOpen, onClose);

  // Each voice transcript gets a unique id so the QuickAddBar effect always fires,
  // even if the user says the same phrase twice.
  const [voiceTrigger, setVoiceTrigger] = useState<{ text: string; id: number } | null>(null);
  // Increments each time the sheet opens so QuickAddBar clears and focuses the input.
  const [openCount, setOpenCount] = useState(0);

  // Ref (not state) so the "already fetched" flag survives isOpen toggles
  // without triggering a re-render or re-fetch on subsequent opens.
  const fetchedRef = useRef(false);
  const scrollBodyRef = useRef<HTMLDivElement>(null);
  // Tracks the 1.5s auto-close timer so "Add another" can cancel it.
  const autoCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { isSupported: micSupported, isListening, interimTranscript, start, stop } =
    useSpeechRecognition({
      onFinal: (transcript) => setVoiceTrigger({ text: transcript, id: Date.now() }),
    });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lazy-fetch members only on first open (skipped when pre-loaded)
  useEffect(() => {
    if (!isOpen || fetchedRef.current || initialMembers) return;
    fetchedRef.current = true;
    setLoadingMembers(true);
    getGroupMembersForQuickAdd(groupId).then((result) => {
      if (result.ok) setMembers(result.members);
      else toast.error("Failed to load group members");
      setLoadingMembers(false);
    });
  }, [isOpen, groupId, initialMembers]);

  // Track each open to trigger clear + focus in QuickAddBar.
  // On close, also clear voiceTrigger — QuickAddBar unmounts/remounts on each
  // open, and its voiceTrigger effect runs on mount, so a stale trigger would
  // immediately re-fire the previous transcript on the next open.
  // Also cancel any pending auto-close timer if the sheet is closed externally.
  useEffect(() => {
    if (isOpen) {
      setOpenCount((c) => c + 1);
    } else {
      if (isListening) stop();
      setVoiceTrigger(null);
      setSaved(false);
      setScanFilled(false);
      setScannerOpen(false); // reset scanner so next open starts fresh
      setLastContext(null);
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
        autoCloseTimerRef.current = null;
      }
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── startMode auto-trigger ────────────────────────────────────────────────
  // Fires once per open session (keyed on openCount so it's ignored on mount).
  // Uses a ref for `startMode` so the effect dep list stays minimal — the value
  // is always current at the time openCount increments.
  const startModeRef = useRef(startMode);
  useEffect(() => { startModeRef.current = startMode; }, [startMode]);

  useEffect(() => {
    if (openCount === 0) return; // skip initial mount; first real open has openCount ≥ 1
    const mode = startModeRef.current;
    if (!mode || mode === "text") return; // default text mode: no special trigger needed
    if (mode === "scan") {
      setScannerOpen(true);
      return;
    }
    if (mode === "voice" && micSupported) {
      // Delay so the sheet spring animation finishes before the mic starts,
      // otherwise the OS mic-permission prompt appears over a half-open sheet.
      const t = setTimeout(() => start(), 350);
      return () => clearTimeout(t);
    }
  }, [openCount]); // eslint-disable-line react-hooks/exhaustive-deps

  // Prevent body scroll on iOS when open, but allow scroll inside the sheet body.
  const preventBodyScroll = useCallback((e: TouchEvent) => {
    if (scrollBodyRef.current?.contains(e.target as Node)) return;
    e.preventDefault();
  }, []);
  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener("touchmove", preventBodyScroll, { passive: false });
    return () => document.removeEventListener("touchmove", preventBodyScroll);
  }, [isOpen, preventBodyScroll]);

  // ── Receipt scanner callback ────────────────────────────────────────────
  function handleReceiptExtracted(result: ParsedReceipt) {
    const groupTypeStr = groupType as "trip" | "nest" | "circle";
    const mappedCat = mapToGroupCategory(result.category, groupTypeStr);
    setParsed({
      description:    result.description ?? "",
      amount:         result.amount ?? null,
      // CategoryValue is the union of all valid category strings — mapped result is always valid
      category:       mappedCat as CategoryValue,
      paidByMemberId: null,
      expenseDate:    result.expenseDate ?? null,
      splitMemberIds: null,
      splitCount:     null,
    });
    setScanFilled(true);
  }

  function handleSave() {
    if (!parsed || !members) return;
    const input = buildExpenseInput(parsed, members, groupId, currency, lastContext);
    if (!input) {
      toast.error("Add an amount and description first");
      return;
    }
    startSave(async () => {
      const result = await addExpense(input);
      if (result.ok) {
        hapticLight();
        trackEvent("expense_added", { source: "quick_add" });
        const isFirst = !localStorage.getItem("first_expense_added");
        if (isFirst) {
          localStorage.setItem("first_expense_added", "1");
          toast.success("First expense logged!", {
            description: "Ready to settle up with the group?",
            action: { label: "Settle up →", onClick: () => { window.location.href = `/groups/${groupId}/settle`; } },
            duration: 6000,
          });
        }
        addRecentCategory(input.category);
        // Store payer + date as sticky context for the next "Add another" entry
        setLastContext({ paidByMemberId: input.paidByMemberId, expenseDate: input.expenseDate });
        setSaved(true);
        // Auto-close after 2s — cancelled if user taps "Add another"
        autoCloseTimerRef.current = setTimeout(() => {
          setSaved(false);
          onClose();
        }, 2000);
      } else {
        toast.error(result.error ?? "Failed to save expense");
      }
    });
  }

  // Post-save: cancel auto-close and reset the form for another entry
  function handleAddAnother() {
    if (autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }
    setSaved(false);
    setScanFilled(false);
    setOpenCount((c) => c + 1);
  }

  const canSave =
    parsed !== null &&
    parsed.amount !== null &&
    parsed.amount > 0 &&
    Boolean(parsed.description);

  if (!mounted) return null;

  const portal = createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/40 z-50"
          onClick={onClose}
        />
      )}
      {isOpen && (
        <motion.div
          key="sheet"
          data-tour="quick-add-open"
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
          drag="y"
          dragConstraints={{ top: 0 }}
          dragElastic={{ top: 0.05, bottom: 0.3 }}
          onDragEnd={(_, info) => {
            if (info.offset.y > 80 || info.velocity.y > 400) onClose();
          }}
          className="fixed bottom-0 left-0 right-0 z-[51] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-700/60 rounded-t-2xl shadow-2xl max-h-[85vh] flex flex-col cursor-grab active:cursor-grabbing"
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 shrink-0 border-b border-slate-100 dark:border-slate-800">
            {onBack ? (
              /* Global FAB flow — back button re-opens group picker */
              <button
                type="button"
                onClick={onBack}
                className="flex items-center gap-1 text-left group -ml-1 rounded-lg px-1 py-0.5
                           hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-slate-400 dark:text-slate-500
                                        group-hover:text-slate-600 dark:group-hover:text-slate-300
                                        transition-colors shrink-0" />
                <div>
                  <p className="text-xs font-medium text-slate-400 dark:text-slate-500
                                group-hover:text-slate-500 dark:group-hover:text-slate-400">
                    Change group
                  </p>
                  <h3
                    className="text-base text-slate-800 dark:text-slate-100 leading-tight"
                    style={{ fontFamily: "var(--font-fraunces)" }}
                  >
                    {groupName}
                  </h3>
                </div>
              </button>
            ) : (
              <div>
                <p className="text-xs font-medium text-slate-400 dark:text-slate-500">Add expense</p>
                <h3
                  className="text-base text-slate-800 dark:text-slate-100"
                  style={{ fontFamily: "var(--font-fraunces)" }}
                >
                  {groupName}
                </h3>
              </div>
            )}
            <div className="flex items-center gap-2">
              {isPlusUser && (
                <button
                  type="button"
                  onClick={() => setScannerOpen(true)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400
                             hover:text-cyan-500 hover:bg-cyan-50 dark:hover:bg-cyan-950/30 transition-colors"
                  title="Scan receipt"
                >
                  <Camera className="w-4 h-4" />
                </button>
              )}
              <Link
                href={`/groups/${groupId}/expenses/new?from=groups`}
                onClick={onClose}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 dark:text-slate-500 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
              >
                Full form
                <ArrowUpRight className="w-3 h-3" />
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div
            ref={scrollBodyRef}
            className="flex-1 overflow-y-auto px-5 pt-4 pb-6 min-h-0"
            onPointerDown={(e) => e.stopPropagation()}
          >
            {loadingMembers ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 text-cyan-500 animate-spin" />
              </div>
            ) : members ? (
              <>
                {/* Sticky context chip — shown after "Add another" */}
                {lastContext && (
                  <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200/60 dark:border-cyan-900/50">
                    <RotateCcw className="w-3 h-3 text-cyan-500 shrink-0" />
                    <span className="text-xs text-cyan-700 dark:text-cyan-300 flex-1 min-w-0 truncate">
                      Using{" "}
                      <span className="font-medium">
                        {getMemberName(members.find((m) => m.id === lastContext.paidByMemberId) ?? members[0])}
                      </span>
                      {" · "}
                      <span className="font-medium">{formatDate(lastContext.expenseDate)}</span>
                      {" "}as defaults
                    </span>
                    <button
                      type="button"
                      onClick={() => setLastContext(null)}
                      className="shrink-0 text-cyan-400 hover:text-cyan-600 dark:hover:text-cyan-300 transition-colors"
                      aria-label="Clear context"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <QuickAddBar
                  members={members}
                  currency={currency}
                  groupStartDate={groupStartDate}
                  groupEndDate={groupEndDate}
                  onParsed={(p) => { setParsed(p); setScanFilled(false); }}
                  voiceTrigger={voiceTrigger}
                  isListening={isListening}
                  interimTranscript={interimTranscript}
                  resetTrigger={openCount}
                />

                {/* Prominent mic button */}
                {micSupported && (
                  <div className="flex flex-col items-center gap-2 mb-5">
                    <div className="flex items-center gap-3 w-full">
                      <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                      <span className="text-xs text-slate-400 dark:text-slate-500">or speak</span>
                      <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                    </div>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={isListening ? stop : start}
                        className={`relative w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95 ${
                          isListening
                            ? "bg-red-500 shadow-red-500/30"
                            : "bg-gradient-to-br from-cyan-500 to-teal-500 shadow-cyan-500/30"
                        }`}
                      >
                        {isListening
                          ? <MicOff className="w-6 h-6 text-white" />
                          : <Mic className="w-6 h-6 text-white" />
                        }
                        {isListening && (
                          <span className="absolute inset-0 rounded-full animate-ping bg-red-400 opacity-40" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      {isListening ? "Tap to stop" : "Tap to speak"}
                    </p>
                  </div>
                )}

                {/* Scan fill chip — shown when receipt was scanned */}
                {scanFilled && parsed && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl mb-3
                                  bg-emerald-50 dark:bg-emerald-950/30
                                  border border-emerald-200/60 dark:border-emerald-800/50">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="text-xs text-emerald-700 dark:text-emerald-300 flex-1 min-w-0 truncate">
                      {parsed.description && `${parsed.description} · `}
                      {parsed.amount ? formatCurrency(parsed.amount, currency) : "amount not found"}
                    </span>
                    <button
                      type="button"
                      onClick={() => { setParsed(null); setScanFilled(false); }}
                      className="shrink-0 text-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-200 transition-colors"
                      aria-label="Clear scan"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={!canSave || saving || saved}
                    className={`w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-sm shadow-md transition-all active:scale-[0.98] ${
                      saved
                        ? "bg-emerald-500 shadow-emerald-500/25 text-white disabled:opacity-100"
                        : "bg-gradient-to-br from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 shadow-cyan-500/25 text-white disabled:opacity-40 disabled:cursor-not-allowed"
                    }`}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving…
                      </>
                    ) : saved ? (
                      <>
                        <Check className="w-4 h-4" />
                        Saved!
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        Save expense
                      </>
                    )}
                  </button>

                  <AnimatePresence>
                    {saved && (
                      <motion.button
                        type="button"
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.15 }}
                        onClick={handleAddAnother}
                        className="w-full py-1.5 text-sm font-medium text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 transition-colors text-center"
                      >
                        + Add another expense →
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : null}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );

  return (
    <>
      {portal}
      {/* Scanner sheet — separate portal so it layers above the quick-add sheet */}
      <ReceiptScannerSheet
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onExtracted={handleReceiptExtracted}
        mode="expense"
        groupType={groupType}
        isPlusUser={isPlusUser}
      />
    </>
  );
}
