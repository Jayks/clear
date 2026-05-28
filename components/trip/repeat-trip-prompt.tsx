"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plane, X, Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { createGroup } from "@/app/actions/groups";
import { importMembersFromGroup } from "@/app/actions/members";
import { hapticLight, hapticSuccess } from "@/lib/haptics";
import { useSheetDismiss } from "@/hooks/use-sheet-dismiss";

interface Props {
  groupId: string;
  groupName: string;
  /** Names of every non-current-user member to copy */
  memberNames: string[];
  defaultCurrency: string;
}

const DISMISS_KEY = (id: string) => `clear_repeat_trip_dismissed_${id}`;

export function RepeatTripPrompt({ groupId, groupName, memberNames, defaultCurrency }: Props) {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  // Read localStorage after mount to avoid SSR mismatch
  useEffect(() => {
    if (!localStorage.getItem(DISMISS_KEY(groupId))) setVisible(true);
  }, [groupId]);

  function closeSheet() {
    setOpen(false);
  }

  useSheetDismiss(open, closeSheet);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY(groupId), "1");
    setVisible(false);
    closeSheet();
  }

  function openSheet() {
    setName("");
    setStartDate("");
    setEndDate("");
    setSelected(new Set(memberNames)); // all pre-selected
    setOpen(true);
    hapticLight();
  }

  function toggleMember(name: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
    hapticLight();
  }

  function toggleAll() {
    setSelected(selected.size === memberNames.length ? new Set() : new Set(memberNames));
    hapticLight();
  }

  async function handleCreate() {
    if (!name.trim()) return;
    setSubmitting(true);

    const result = await createGroup({
      name: name.trim(),
      groupType: "trip",
      defaultCurrency,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });

    if (!result.ok) {
      setSubmitting(false);
      toast.error(result.error ?? "Failed to create trip");
      return;
    }

    const newGroupId = result.groupId;

    // Bulk-copy selected members
    const toImport = [...selected];
    if (toImport.length > 0) {
      await importMembersFromGroup(newGroupId, toImport);
    }

    hapticSuccess();
    toast.success("Trip created!", {
      description: toImport.length > 0
        ? `${toImport.length} member${toImport.length === 1 ? "" : "s"} copied from ${groupName}.`
        : "Add members from the Members page.",
    });

    setSubmitting(false);
    closeSheet();
    router.push(`/groups/${newGroupId}`);
  }

  if (!visible) return null;

  return (
    <>
      {/* Prompt card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="glass rounded-2xl p-5 mb-6 border border-cyan-100 dark:border-cyan-900/40 relative"
      >
        {/* Dismiss */}
        <button
          type="button"
          onClick={dismiss}
          className="absolute top-3 right-3 w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
          aria-label="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        <div className="flex items-start gap-3 pr-6">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center shrink-0 shadow-sm shadow-cyan-500/20 mt-0.5">
            <Plane className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-0.5">
              Planning another trip with this squad?
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Start a new trip and copy all{" "}
              {memberNames.length > 0 ? `${memberNames.length} members` : "members"} in one tap.
            </p>
            <button
              type="button"
              onClick={openSheet}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-br from-cyan-500 to-teal-500 text-white text-xs font-medium shadow-sm shadow-cyan-500/20 hover:from-cyan-600 hover:to-teal-600 transition-all active:scale-95"
            >
              <Plane className="w-3 h-3" />
              Start planning
            </button>
          </div>
        </div>
      </motion.div>

      {/* Sheet */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
              onClick={() => !submitting && closeSheet()}
            />

            <motion.div
              key="sheet"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              drag="y"
              dragConstraints={{ top: 0 }}
              dragElastic={{ top: 0.05, bottom: 0.3 }}
              onDragEnd={(_, info) => {
                if (!submitting && (info.offset.y > 80 || info.velocity.y > 400)) closeSheet();
              }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 rounded-t-2xl shadow-2xl"
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-9 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">
                  New trip with this squad
                </h2>
                <button
                  type="button"
                  onClick={() => !submitting && closeSheet()}
                  className="text-sm text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                  Cancel
                </button>
              </div>

              {/* Body */}
              <div className="px-5 py-5 space-y-4">
                {/* Trip name */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                    Trip name <span className="text-red-400">*</span>
                  </label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={`e.g. ${groupName.replace(/\d{4}/, (y) => String(Number(y) + 1))} or New adventure`}
                    autoFocus
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                      Start date
                      <span className="text-slate-400 dark:text-slate-500 font-normal text-xs ml-1">(optional)</span>
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                      End date
                      <span className="text-slate-400 dark:text-slate-500 font-normal text-xs ml-1">(optional)</span>
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      min={startDate || undefined}
                      className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Member pills */}
                {memberNames.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                          {selected.size} of {memberNames.length} members
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={toggleAll}
                        className="text-xs text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 font-medium transition-colors"
                      >
                        {selected.size === memberNames.length ? "Deselect all" : "Select all"}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {memberNames.map((memberName) => {
                        const isSelected = selected.has(memberName);
                        return (
                          <button
                            key={memberName}
                            type="button"
                            onClick={() => toggleMember(memberName)}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                              isSelected
                                ? "bg-gradient-to-br from-cyan-500 to-teal-500 text-white shadow-sm border-transparent"
                                : "bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                            }`}
                          >
                            {memberName}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-5 pb-8 pt-1">
                <button
                  type="button"
                  disabled={!name.trim() || submitting}
                  onClick={handleCreate}
                  className="w-full py-3 bg-gradient-to-br from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white text-sm font-medium rounded-xl shadow-md shadow-cyan-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating…
                    </>
                  ) : (
                    <>
                      <Plane className="w-4 h-4" />
                      Create trip
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
