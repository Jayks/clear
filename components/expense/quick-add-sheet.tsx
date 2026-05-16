"use client";

import { useState, useTransition, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Loader2, ArrowUpRight, Mic, MicOff } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import type { GroupMember } from "@/lib/db/schema/group-members";
import type { ParsedExpense } from "@/lib/parser/parse-expense";
import { QuickAddBar } from "./quick-add-bar";
import { addExpense } from "@/app/actions/expenses";
import { getGroupMembersForQuickAdd } from "@/app/actions/quick-add";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import type { AddExpenseInput } from "@/lib/validations/expense";

interface Props {
  groupId: string;
  groupName: string;
  currency: string;
  isOpen: boolean;
  groupStartDate?: string | null;
  groupEndDate?: string | null;
  /** Pre-loaded members — when available (expenses page), skips the fetch. */
  members?: GroupMember[];
  onClose: () => void;
}

function buildExpenseInput(
  parsed: ParsedExpense,
  members: GroupMember[],
  groupId: string,
  currency: string,
): AddExpenseInput | null {
  if (!parsed.amount || parsed.amount <= 0 || !parsed.description) return null;
  if (members.length === 0) return null;

  const today = new Date().toISOString().split("T")[0];
  const paidByMemberId = parsed.paidByMemberId ?? members[0].id;

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
    expenseDate: parsed.expenseDate ?? today,
    splitMode: "equal",
    splits: splitMembers.map((m) => ({ memberId: m.id })),
  };
}

export function QuickAddSheet({
  groupId,
  groupName,
  currency,
  isOpen,
  groupStartDate,
  groupEndDate,
  members: initialMembers,
  onClose,
}: Props) {
  const [members, setMembers] = useState<GroupMember[] | null>(initialMembers ?? null);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [parsed, setParsed] = useState<ParsedExpense | null>(null);
  const [saving, startSave] = useTransition();
  const [mounted, setMounted] = useState(false);
  // Each voice transcript gets a unique id so the QuickAddBar effect always fires,
  // even if the user says the same phrase twice.
  const [voiceTrigger, setVoiceTrigger] = useState<{ text: string; id: number } | null>(null);
  // Increments each time the sheet opens so QuickAddBar clears and focuses the input.
  const [openCount, setOpenCount] = useState(0);

  // Ref (not state) so the "already fetched" flag survives isOpen toggles
  // without triggering a re-render or re-fetch on subsequent opens.
  const fetchedRef = useRef(false);
  const scrollBodyRef = useRef<HTMLDivElement>(null);

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
  useEffect(() => {
    if (isOpen) {
      setOpenCount((c) => c + 1);
    } else {
      if (isListening) stop();
      setVoiceTrigger(null);
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

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

  function handleSave() {
    if (!parsed || !members) return;
    const input = buildExpenseInput(parsed, members, groupId, currency);
    if (!input) {
      toast.error("Add an amount and description first");
      return;
    }
    startSave(async () => {
      const result = await addExpense(input);
      if (result.ok) {
        toast.success("Expense added");
        onClose();
      } else {
        toast.error(result.error ?? "Failed to save expense");
      }
    });
  }

  const canSave =
    parsed !== null &&
    parsed.amount !== null &&
    parsed.amount > 0 &&
    Boolean(parsed.description);

  if (!mounted) return null;

  return createPortal(
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
            <div>
              <p className="text-xs font-medium text-slate-400 dark:text-slate-500">Add expense</p>
              <h3
                className="text-base text-slate-800 dark:text-slate-100"
                style={{ fontFamily: "var(--font-fraunces)" }}
              >
                {groupName}
              </h3>
            </div>
            <div className="flex items-center gap-2">
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
                <QuickAddBar
                  members={members}
                  currency={currency}
                  groupStartDate={groupStartDate}
                  groupEndDate={groupEndDate}
                  onParsed={setParsed}
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

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!canSave || saving}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white font-medium text-sm shadow-md shadow-cyan-500/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Save expense
                    </>
                  )}
                </button>
              </>
            ) : null}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
