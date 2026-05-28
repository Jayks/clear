"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Download, MapPin, Home } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { importMembersFromGroup } from "@/app/actions/members";
import { getGroupsForImport } from "@/lib/db/queries/groups";
import { hapticLight, hapticSuccess } from "@/lib/haptics";
import { useSheetDismiss } from "@/hooks/use-sheet-dismiss";

type SourceGroup = Awaited<ReturnType<typeof getGroupsForImport>>[number];

interface Props {
  groupId: string;
  // Pre-fetched on the server — passed in so the sheet has no async needs
  sourceGroups: SourceGroup[];
  // Names already in the target group — used to mark members as duplicates
  existingNames: Set<string>;
}

export function ImportMembersSheet({ groupId, sourceGroups, existingNames }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"pick-group" | "pick-members">("pick-group");
  const [selectedGroup, setSelectedGroup] = useState<SourceGroup | null>(null);
  // member id → selected
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);

  function handleOpen() {
    setStep("pick-group");
    setSelectedGroup(null);
    setSelected({});
    setOpen(true);
    hapticLight();
  }

  function handleClose() {
    setOpen(false);
  }

  useSheetDismiss(open, handleClose);

  function pickGroup(group: SourceGroup) {
    setSelectedGroup(group);
    // Pre-select everyone not already in the group
    const init: Record<string, boolean> = {};
    for (const m of group.members) {
      init[m.id] = !existingNames.has(m.name.toLowerCase());
    }
    setSelected(init);
    setStep("pick-members");
    hapticLight();
  }

  function toggleMember(id: string) {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
    hapticLight();
  }

  const selectedNames =
    selectedGroup?.members.filter((m) => selected[m.id]).map((m) => m.name) ?? [];

  async function handleImport() {
    if (selectedNames.length === 0) return;
    setSubmitting(true);
    const result = await importMembersFromGroup(groupId, selectedNames);
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    hapticSuccess();
    toast.success(
      result.added === 1
        ? "1 member imported"
        : `${result.added} members imported`,
    );
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      {/* Trigger button */}
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center gap-1.5 text-sm text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 font-medium transition-colors"
      >
        <Download className="w-3.5 h-3.5" />
        Import from group
      </button>

      {/* Backdrop */}
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
              onClick={handleClose}
            />

            {/* Sheet */}
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
                if (info.offset.y > 80 || info.velocity.y > 400) handleClose();
              }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 rounded-t-2xl shadow-2xl max-h-[80vh] flex flex-col"
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1 shrink-0">
                <div className="w-9 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
              </div>

              {/* Header */}
              <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
                {step === "pick-members" && (
                  <button
                    type="button"
                    onClick={() => setStep("pick-group")}
                    className="p-1 -ml-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  </button>
                )}
                <h2 className="flex-1 text-base font-semibold text-slate-800 dark:text-slate-100">
                  {step === "pick-group"
                    ? "Import from a group"
                    : selectedGroup?.name}
                </h2>
                <button
                  type="button"
                  onClick={handleClose}
                  className="text-sm text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                  Cancel
                </button>
              </div>

              {/* Body — touchAction:pan-y lets the browser handle scroll here
                   so the parent drag doesn't hijack vertical touch events */}
              <div className="flex-1 overflow-y-auto px-5 py-3 min-h-0" style={{ touchAction: "pan-y" }}>
                <AnimatePresence mode="wait">
                  {step === "pick-group" ? (
                    <motion.div
                      key="pick-group"
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -16 }}
                      transition={{ duration: 0.15 }}
                      className="space-y-2 pb-4"
                    >
                      {sourceGroups.length === 0 ? (
                        <p className="text-sm text-slate-400 dark:text-slate-500 py-6 text-center">
                          No other groups to import from yet.
                        </p>
                      ) : (
                        sourceGroups.map((g) => {
                          const Icon = g.groupType === "nest" ? Home : MapPin;
                          return (
                            <button
                              key={g.id}
                              type="button"
                              onClick={() => pickGroup(g)}
                              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 hover:border-cyan-300 dark:hover:border-cyan-700 hover:bg-cyan-50/50 dark:hover:bg-cyan-900/20 transition-all text-left group"
                            >
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center shrink-0 group-hover:from-cyan-100 group-hover:to-teal-100 dark:group-hover:from-cyan-900/40 dark:group-hover:to-teal-900/40 transition-all">
                                <Icon className="w-4 h-4 text-slate-500 dark:text-slate-400 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                                  {g.name}
                                </p>
                                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                                  {g.members.length}{" "}
                                  {g.members.length === 1 ? "member" : "members"}
                                </p>
                              </div>
                              <ArrowLeft className="w-4 h-4 text-slate-300 dark:text-slate-600 rotate-180 shrink-0" />
                            </button>
                          );
                        })
                      )}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="pick-members"
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 16 }}
                      transition={{ duration: 0.15 }}
                      className="pb-24"
                    >
                      {/* Selection count + deselect-all */}
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                          {selectedNames.length} of {selectedGroup?.members.length} selected
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            const allSelectable = selectedGroup?.members.filter(
                              (m) => !existingNames.has(m.name.toLowerCase()),
                            ) ?? [];
                            const allSelected = allSelectable.every((m) => selected[m.id]);
                            const next: Record<string, boolean> = { ...selected };
                            for (const m of allSelectable) next[m.id] = !allSelected;
                            setSelected(next);
                            hapticLight();
                          }}
                          className="text-xs text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 font-medium transition-colors"
                        >
                          {(selectedGroup?.members.filter(
                            (m) => !existingNames.has(m.name.toLowerCase()),
                          ) ?? []).every((m) => selected[m.id])
                            ? "Deselect all"
                            : "Select all"}
                        </button>
                      </div>

                      {/* Member pills */}
                      <div className="flex flex-wrap gap-2">
                        {selectedGroup?.members.map((m) => {
                          const isDupe = existingNames.has(m.name.toLowerCase());
                          const isChecked = selected[m.id] ?? false;
                          return (
                            <button
                              key={m.id}
                              type="button"
                              disabled={isDupe}
                              onClick={() => !isDupe && toggleMember(m.id)}
                              title={isDupe ? "Already in this group" : undefined}
                              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                                isDupe
                                  ? "opacity-35 cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 line-through"
                                  : isChecked
                                    ? "bg-gradient-to-br from-cyan-500 to-teal-500 text-white shadow-sm border-transparent"
                                    : "bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                              }`}
                            >
                              {m.name}
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Footer — only shown on member step */}
              {step === "pick-members" && (
                <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
                  <button
                    type="button"
                    disabled={selectedNames.length === 0 || submitting}
                    onClick={handleImport}
                    className="w-full py-3 bg-gradient-to-br from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white text-sm font-medium rounded-xl shadow-md shadow-cyan-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting
                      ? "Importing…"
                      : selectedNames.length === 0
                        ? "Select members to import"
                        : `Import ${selectedNames.length} ${selectedNames.length === 1 ? "member" : "members"}`}
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
