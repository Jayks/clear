"use client";

import { useState, useMemo, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  UserPlus, Search, X, ArrowLeft, Home, MapPin,
  ClipboardList, Share2, Check, Users, Lock,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { importMembersFromGroup } from "@/app/actions/members";
import { hapticLight, hapticSuccess } from "@/lib/haptics";
import { useSheetDismiss } from "@/hooks/use-sheet-dismiss";
import type { getNetworkMembers, getGroupsForImport } from "@/lib/db/queries/groups";

type NetworkMember = Awaited<ReturnType<typeof getNetworkMembers>>[number];
type SourceGroup   = Awaited<ReturnType<typeof getGroupsForImport>>[number];

type Mode = "main" | "group-picker" | "group-members" | "share";

// A selected person: stable key + the name that will be inserted as guestName
type Selection = { key: string; name: string };

interface Props {
  groupId: string;
  groupName: string;
  inviteUrl: string;
  networkMembers: NetworkMember[];
  sourceGroups: SourceGroup[];
  existingNames: Set<string>; // lowercased names already in the group
  isPlusUser: boolean;
}

// ── helpers ──────────────────────────────────────────────────────────────────

function parseBulk(text: string): string[] {
  return [...new Set(
    text.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean),
  )];
}

function networkKey(m: NetworkMember): string {
  return m.userId ? `uid:${m.userId}` : `guest:${m.name.toLowerCase()}`;
}

// ── component ─────────────────────────────────────────────────────────────────

export function AddMembersSheet({
  groupId,
  groupName,
  inviteUrl,
  networkMembers,
  sourceGroups,
  existingNames,
  isPlusUser,
}: Props) {
  const router = useRouter();

  // Sheet state
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("main");

  // Main path: chip-based selection from network or typed
  const [selections, setSelections]   = useState<Selection[]>([]);
  const [search, setSearch]           = useState("");
  const searchRef                     = useRef<HTMLInputElement>(null);

  // Bulk sub-mode (inline in main)
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");

  // Group-import sub-flow
  const [sourceGroup, setSourceGroup]         = useState<SourceGroup | null>(null);
  const [groupSelections, setGroupSelections] = useState<Record<string, boolean>>({});

  // Submission + share step
  const [submitting, setSubmitting] = useState(false);
  const [addedCount, setAddedCount] = useState(0);
  const [copied, setCopied]         = useState(false);

  // ── open / close ─────────────────────────────────────────────────────────

  function handleOpen() {
    setMode("main");
    setSelections([]);
    setSearch("");
    setBulkOpen(false);
    setBulkText("");
    setSourceGroup(null);
    setGroupSelections({});
    setAddedCount(0);
    setCopied(false);
    setOpen(true);
    hapticLight();
  }

  function handleClose() { setOpen(false); }

  useSheetDismiss(open, handleClose);

  // ── derived ───────────────────────────────────────────────────────────────

  const selectionKeys = useMemo(() => new Set(selections.map((s) => s.key)), [selections]);

  const filteredNetwork = useMemo(() => {
    const q = search.toLowerCase();
    return networkMembers.filter((m) => !q || m.name.toLowerCase().includes(q));
  }, [networkMembers, search]);

  const searchIsNewName = useMemo(() => {
    if (!search.trim()) return false;
    const q = search.toLowerCase();
    return (
      !networkMembers.some((m) => m.name.toLowerCase() === q) &&
      !selections.some((s) => s.name.toLowerCase() === q) &&
      !existingNames.has(q)
    );
  }, [search, networkMembers, selections, existingNames]);

  const bulkNames    = useMemo(() => parseBulk(bulkText), [bulkText]);
  const bulkNewNames = useMemo(
    () => bulkNames.filter((n) => !existingNames.has(n.toLowerCase())),
    [bulkNames, existingNames],
  );

  // ── selection helpers ─────────────────────────────────────────────────────

  function toggleNetworkMember(m: NetworkMember) {
    if (!isPlusUser || existingNames.has(m.name.toLowerCase())) return;
    hapticLight();
    const key = networkKey(m);
    setSelections((prev) =>
      selectionKeys.has(key) ? prev.filter((s) => s.key !== key) : [...prev, { key, name: m.name }],
    );
  }

  function addTypedName() {
    const name = search.trim();
    if (!name) return;
    const key = `new:${name.toLowerCase()}`;
    if (selectionKeys.has(key) || existingNames.has(name.toLowerCase())) return;
    hapticLight();
    setSelections((prev) => [...prev, { key, name }]);
    setSearch("");
    searchRef.current?.focus();
  }

  function removeSelection(key: string) {
    hapticLight();
    setSelections((prev) => prev.filter((s) => s.key !== key));
  }

  // ── submit helpers ────────────────────────────────────────────────────────

  async function submitNames(names: string[]) {
    setSubmitting(true);
    const result = await importMembersFromGroup(groupId, names);
    setSubmitting(false);
    if (!result.ok) { toast.error(result.error); return false; }
    hapticSuccess();
    setAddedCount(result.added);
    return true;
  }

  async function handleMainSubmit() {
    const names = [...selections.map((s) => s.name), ...(bulkOpen ? bulkNewNames : [])];
    if (await submitNames(names)) { setMode("share"); router.refresh(); }
  }

  async function handleGroupSubmit() {
    if (!sourceGroup) return;
    const names = sourceGroup.members.filter((m) => groupSelections[m.id]).map((m) => m.name);
    if (await submitNames(names)) { setMode("share"); router.refresh(); }
  }

  // ── group-picker helpers ──────────────────────────────────────────────────

  function pickSourceGroup(g: SourceGroup) {
    setSourceGroup(g);
    const init: Record<string, boolean> = {};
    for (const m of g.members) init[m.id] = !existingNames.has(m.name.toLowerCase());
    setGroupSelections(init);
    setMode("group-members");
    hapticLight();
  }

  function toggleGroupMember(id: string) {
    setGroupSelections((prev) => ({ ...prev, [id]: !prev[id] }));
    hapticLight();
  }

  const groupSelectedNames =
    sourceGroup?.members.filter((m) => groupSelections[m.id]).map((m) => m.name) ?? [];

  // ── share step ────────────────────────────────────────────────────────────

  async function handleWhatsAppShare() {
    const text = `You've been added to "${groupName}" on Clear. Join here to track contributions and expenses:`;
    window.open(`https://wa.me/?text=${encodeURIComponent(`${text}\n${inviteUrl}`)}`, "_blank");
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      toast.success("Invite link copied!");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Couldn't copy link");
    }
  }

  // ── counts ────────────────────────────────────────────────────────────────

  const mainPendingCount = selections.length + (bulkOpen ? bulkNewNames.length : 0);

  // ── header ────────────────────────────────────────────────────────────────

  const headerTitle =
    mode === "group-picker" ? "Import from a group" :
    mode === "group-members" ? (sourceGroup?.name ?? "Select members") :
    mode === "share"         ? "Members added ✓" :
    "Add members";

  function handleBack() {
    if (mode === "group-members") { setMode("group-picker"); hapticLight(); }
    else if (mode === "group-picker") { setMode("main"); hapticLight(); }
  }

  // ── network section (Plus-gated) ──────────────────────────────────────────

  // How many dimmed rows to show in the teaser (max 3)
  const teaserRows = networkMembers.slice(0, 3);
  const showNetworkTeaser = !isPlusUser && networkMembers.length > 0;
  const showNetworkList   =  isPlusUser && filteredNetwork.length > 0;

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Trigger */}
      <button
        type="button"
        onClick={handleOpen}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white text-sm font-medium shadow-md shadow-violet-500/20 transition-all active:scale-[0.98]"
      >
        <UserPlus className="w-4 h-4" />
        Add members
      </button>

      {/* Backdrop + sheet */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
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
              className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 rounded-t-2xl shadow-2xl max-h-[88vh] flex flex-col"
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1 shrink-0">
                <div className="w-9 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
              </div>

              {/* Header */}
              <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
                {(mode === "group-picker" || mode === "group-members") && (
                  <button
                    type="button"
                    onClick={handleBack}
                    className="p-1 -ml-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  </button>
                )}
                <h2 className="flex-1 text-base font-semibold text-slate-800 dark:text-slate-100">
                  {headerTitle}
                </h2>
                {mode !== "share" && (
                  <button
                    type="button"
                    onClick={handleClose}
                    className="text-sm text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>

              <AnimatePresence mode="wait">

                {/* ── Main mode ──────────────────────────────────────────── */}
                {mode === "main" && (
                  <motion.div
                    key="main"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="flex flex-col flex-1 min-h-0"
                  >
                    {/* Selected chips */}
                    {selections.length > 0 && (
                      <div className="px-5 pt-3 pb-2 shrink-0 flex flex-wrap gap-1.5 border-b border-slate-100 dark:border-slate-800">
                        {selections.map((s) => (
                          <span
                            key={s.key}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300"
                          >
                            {s.name}
                            <button
                              type="button"
                              onClick={() => removeSelection(s.key)}
                              className="ml-0.5 hover:text-violet-900 dark:hover:text-violet-100 transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Search input */}
                    <div className="px-5 py-3 shrink-0">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
                        <input
                          ref={searchRef}
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter" && searchIsNewName) addTypedName(); }}
                          placeholder="Search or type a name…"
                          className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent placeholder:text-slate-400 dark:placeholder:text-slate-500"
                        />
                      </div>
                    </div>

                    {/* Scrollable body */}
                    <div
                      className="flex-1 overflow-y-auto px-5 pb-28 min-h-0"
                      style={{ touchAction: "pan-y" }}
                    >
                      {/* "Add [search] as a guest" typed-name CTA */}
                      {searchIsNewName && (
                        <button
                          type="button"
                          onClick={addTypedName}
                          className="w-full flex items-center gap-3 px-4 py-3 mb-3 rounded-xl border border-dashed border-violet-300 dark:border-violet-700 bg-violet-50/60 dark:bg-violet-900/20 text-left hover:bg-violet-100/60 dark:hover:bg-violet-900/30 transition-colors"
                        >
                          <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center shrink-0">
                            <UserPlus className="w-4 h-4 text-violet-500 dark:text-violet-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-violet-700 dark:text-violet-300">
                              Add &ldquo;{search.trim()}&rdquo; as a guest
                            </p>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                              They can claim their spot later via invite link
                            </p>
                          </div>
                        </button>
                      )}

                      {/* ── Plus: full network list ───────────────────────── */}
                      {showNetworkList && (
                        <div className="mb-4">
                          {!search && (
                            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-2">
                              Your Clear network
                            </p>
                          )}
                          <div className="space-y-1">
                            {filteredNetwork.map((m) => {
                              const key      = networkKey(m);
                              const selected = selectionKeys.has(key);
                              const isDupe   = existingNames.has(m.name.toLowerCase());
                              return (
                                <button
                                  key={m.id}
                                  type="button"
                                  disabled={isDupe}
                                  onClick={() => toggleNetworkMember(m)}
                                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all text-left ${
                                    isDupe
                                      ? "opacity-40 cursor-not-allowed border-slate-200 dark:border-slate-700 bg-white/40 dark:bg-slate-800/40"
                                      : selected
                                        ? "border-violet-300 dark:border-violet-700 bg-violet-50 dark:bg-violet-900/20"
                                        : "border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 hover:border-violet-200 dark:hover:border-violet-800 hover:bg-violet-50/40 dark:hover:bg-violet-900/10"
                                  }`}
                                >
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold ${
                                    selected
                                      ? "bg-violet-500 text-white"
                                      : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                                  }`}>
                                    {selected ? <Check className="w-4 h-4" /> : m.name.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-medium truncate ${
                                      isDupe
                                        ? "line-through text-slate-400 dark:text-slate-500"
                                        : "text-slate-800 dark:text-slate-100"
                                    }`}>
                                      {m.name}
                                      {isDupe && <span className="ml-1.5 text-xs font-normal">already added</span>}
                                    </p>
                                    <p className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">
                                      {m.groupNames.slice(0, 2).join(", ")}
                                      {m.groupNames.length > 2 && ` +${m.groupNames.length - 2} more`}
                                    </p>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Empty search result (Plus users) */}
                      {isPlusUser && search && filteredNetwork.length === 0 && !searchIsNewName && (
                        <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-4">
                          No match in your network
                        </p>
                      )}

                      {/* ── Free: personalised network teaser ────────────── */}
                      {showNetworkTeaser && !search && (
                        <div className="mb-4">
                          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-2">
                            Your Clear network
                          </p>
                          {/* Dimmed rows — non-interactive */}
                          <div className="relative">
                            <div className="space-y-1 pointer-events-none select-none opacity-50">
                              {teaserRows.map((m) => (
                                <div
                                  key={m.id}
                                  className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60"
                                >
                                  <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0 text-xs font-semibold text-slate-600 dark:text-slate-300">
                                    {m.name.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                                      {m.name}
                                    </p>
                                    <p className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">
                                      {m.groupNames.slice(0, 2).join(", ")}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Gradient fade + lock card */}
                            <div className="absolute bottom-0 left-0 right-0 pt-10 bg-gradient-to-t from-white dark:from-slate-900 to-transparent rounded-b-xl">
                              <div className="mx-0.5 glass rounded-xl border border-violet-200 dark:border-violet-800/60 p-4">
                                <div className="flex items-start gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center shrink-0 mt-0.5">
                                    <Lock className="w-4 h-4 text-violet-500 dark:text-violet-400" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-0.5">
                                      {networkMembers.length} {networkMembers.length === 1 ? "person" : "people"} in your Clear network
                                    </p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                                      Upgrade to add them in one tap — no re-typing names from past groups.
                                    </p>
                                    <button
                                      type="button"
                                      onClick={() => { handleClose(); router.push("/upgrade"); }}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 text-white text-xs font-semibold shadow-sm shadow-violet-500/20 hover:from-violet-600 hover:to-purple-700 transition-all"
                                    >
                                      ✦ Upgrade to Plus
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Divider + escape hatches (hide divider when searching) */}
                      {!search && (
                        <div className="mt-2">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                            <span className="text-xs text-slate-400 dark:text-slate-500">or</span>
                            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                          </div>

                          {/* Bulk paste — always free */}
                          <button
                            type="button"
                            onClick={() => { setBulkOpen((v) => !v); hapticLight(); }}
                            className="w-full flex items-center gap-3 px-4 py-3 mb-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-left"
                          >
                            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                              <ClipboardList className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                Paste multiple names
                              </p>
                              <p className="text-xs text-slate-400 dark:text-slate-500">
                                Comma or line-separated
                              </p>
                            </div>
                            <motion.div animate={{ rotate: bulkOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                              <ArrowLeft className="w-4 h-4 text-slate-300 dark:text-slate-600 -rotate-90" />
                            </motion.div>
                          </button>

                          {/* Bulk textarea (inline expand) */}
                          <AnimatePresence>
                            {bulkOpen && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden mb-2"
                              >
                                <div className="px-1 pt-1 pb-2">
                                  <textarea
                                    value={bulkText}
                                    onChange={(e) => setBulkText(e.target.value)}
                                    placeholder={"Priya\nRohit, Meera\nAditya"}
                                    rows={4}
                                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-none"
                                  />
                                  {bulkText.trim() && (
                                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 px-1">
                                      {bulkNewNames.length === 0
                                        ? "All names already in group"
                                        : `${bulkNewNames.length} new name${bulkNewNames.length === 1 ? "" : "s"} detected`}
                                    </p>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {/* Import from a group — Plus only, hidden for free users */}
                          {isPlusUser && sourceGroups.length > 0 && (
                            <button
                              type="button"
                              onClick={() => { setMode("group-picker"); hapticLight(); }}
                              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-left"
                            >
                              <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                                <Users className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                  Import from a group
                                </p>
                                <p className="text-xs text-slate-400 dark:text-slate-500">
                                  Copy an existing squad in one tap
                                </p>
                              </div>
                              <ArrowLeft className="w-4 h-4 text-slate-300 dark:text-slate-600 rotate-180 shrink-0" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Footer — Add button */}
                    {mainPendingCount > 0 && (
                      <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={handleMainSubmit}
                          className="w-full py-3 bg-gradient-to-br from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white text-sm font-medium rounded-xl shadow-md shadow-violet-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {submitting
                            ? "Adding…"
                            : `Add ${mainPendingCount} ${mainPendingCount === 1 ? "member" : "members"}`}
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* ── Group picker ──────────────────────────────────────── */}
                {mode === "group-picker" && (
                  <motion.div
                    key="group-picker"
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 16 }}
                    transition={{ duration: 0.15 }}
                    className="flex-1 overflow-y-auto px-5 py-3 min-h-0"
                    style={{ touchAction: "pan-y" }}
                  >
                    <div className="space-y-2 pb-4">
                      {sourceGroups.map((g) => {
                        const Icon = g.groupType === "nest" ? Home : MapPin;
                        return (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => pickSourceGroup(g)}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 hover:border-violet-300 dark:hover:border-violet-700 hover:bg-violet-50/50 dark:hover:bg-violet-900/20 transition-all text-left group"
                          >
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center shrink-0 group-hover:from-violet-100 group-hover:to-purple-100 dark:group-hover:from-violet-900/40 dark:group-hover:to-purple-900/40 transition-all">
                              <Icon className="w-4 h-4 text-slate-500 dark:text-slate-400 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{g.name}</p>
                              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                                {g.members.length} {g.members.length === 1 ? "member" : "members"}
                              </p>
                            </div>
                            <ArrowLeft className="w-4 h-4 text-slate-300 dark:text-slate-600 rotate-180 shrink-0" />
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

                {/* ── Group members ─────────────────────────────────────── */}
                {mode === "group-members" && sourceGroup && (
                  <motion.div
                    key="group-members"
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 16 }}
                    transition={{ duration: 0.15 }}
                    className="flex flex-col flex-1 min-h-0"
                  >
                    <div
                      className="flex-1 overflow-y-auto px-5 py-3 pb-28 min-h-0"
                      style={{ touchAction: "pan-y" }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                          {groupSelectedNames.length} of {sourceGroup.members.length} selected
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            const selectable = sourceGroup.members.filter(
                              (m) => !existingNames.has(m.name.toLowerCase()),
                            );
                            const allSelected = selectable.every((m) => groupSelections[m.id]);
                            const next = { ...groupSelections };
                            for (const m of selectable) next[m.id] = !allSelected;
                            setGroupSelections(next);
                            hapticLight();
                          }}
                          className="text-xs text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 font-medium transition-colors"
                        >
                          {sourceGroup.members
                            .filter((m) => !existingNames.has(m.name.toLowerCase()))
                            .every((m) => groupSelections[m.id])
                            ? "Deselect all"
                            : "Select all"}
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {sourceGroup.members.map((m) => {
                          const isDupe    = existingNames.has(m.name.toLowerCase());
                          const isChecked = groupSelections[m.id] ?? false;
                          return (
                            <button
                              key={m.id}
                              type="button"
                              disabled={isDupe}
                              onClick={() => !isDupe && toggleGroupMember(m.id)}
                              title={isDupe ? "Already in this group" : undefined}
                              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                                isDupe
                                  ? "opacity-35 cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 line-through"
                                  : isChecked
                                    ? "bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-sm border-transparent"
                                    : "bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                              }`}
                            >
                              {m.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
                      <button
                        type="button"
                        disabled={groupSelectedNames.length === 0 || submitting}
                        onClick={handleGroupSubmit}
                        className="w-full py-3 bg-gradient-to-br from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white text-sm font-medium rounded-xl shadow-md shadow-violet-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {submitting
                          ? "Adding…"
                          : groupSelectedNames.length === 0
                            ? "Select members to add"
                            : `Add ${groupSelectedNames.length} ${groupSelectedNames.length === 1 ? "member" : "members"}`}
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* ── Share step ────────────────────────────────────────── */}
                {mode === "share" && (
                  <motion.div
                    key="share"
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex-1 flex flex-col items-center justify-center px-6 py-8 text-center"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-4 shadow-lg shadow-violet-500/30">
                      <Check className="w-8 h-8 text-white" />
                    </div>
                    <h3
                      className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-1"
                      style={{ fontFamily: "var(--font-fraunces)" }}
                    >
                      {addedCount === 1 ? "1 member added!" : `${addedCount} members added!`}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-xs">
                      Share the invite link so they can join Clear and see the {groupName} circle.
                    </p>
                    <div className="w-full space-y-2.5">
                      <button
                        type="button"
                        onClick={handleWhatsAppShare}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#25D366] hover:bg-[#1ebe5d] text-white text-sm font-medium shadow-md transition-all active:scale-[0.98]"
                      >
                        <Share2 className="w-4 h-4" />
                        Share invite on WhatsApp
                      </button>
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-medium transition-all active:scale-[0.98] ${
                          copied
                            ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300"
                            : "border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                        }`}
                      >
                        {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                        {copied ? "Link copied!" : "Copy invite link"}
                      </button>
                      <button
                        type="button"
                        onClick={handleClose}
                        className="w-full py-3 text-sm text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                      >
                        Done
                      </button>
                    </div>
                  </motion.div>
                )}

              </AnimatePresence>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
