"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import {
  Archive, ArchiveRestore, AlertTriangle, ArrowLeftRight, BarChart2,
  Camera, Loader2, Mic, PencilLine, Receipt,
  Share2, Sparkles, Users,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { archiveGroup } from "@/app/actions/groups";
import { QuickAddSheet } from "@/components/expense/quick-add-sheet";
import type { GroupMember } from "@/lib/db/schema/group-members";

// ─── types ───────────────────────────────────────────────────────────────────

export type StartMode = "text" | "voice" | "scan";

interface Props {
  isOpen:          boolean;
  onClose:         () => void;
  groupId:         string;
  groupName:       string;
  groupType:       string;      // 'trip' | 'nest' | 'circle'
  currency:        string;
  isArchived:      boolean;
  isAdmin?:        boolean;     // when false, Archive/Edit are hidden
  isPlusUser?:     boolean;     // shows Plus badge on Scan tile when false
  joinUrl?:        string;      // pre-built invite URL for Share action
  groupStartDate?: string | null;
  groupEndDate?:   string | null;
  members?:        GroupMember[]; // pre-loaded members (inner group pages)
}

// ─── Zone 1 — quick-log tiles ─────────────────────────────────────────────

const ADD_TILES: {
  id:       StartMode;
  icon:     React.ElementType;
  label:    string;
  sub:      string;
  gradient: string;
  shadow:   string;
  plusOnly: boolean;
}[] = [
  {
    id:       "scan",
    icon:     Camera,
    label:    "Scan",
    sub:      "Receipt",
    gradient: "from-violet-500 to-purple-600",
    shadow:   "shadow-violet-500/30",
    plusOnly: true,
  },
  {
    id:       "voice",
    icon:     Mic,
    label:    "Voice",
    sub:      "Speak it",
    gradient: "from-rose-500 to-pink-500",
    shadow:   "shadow-rose-500/30",
    plusOnly: false,
  },
  {
    id:       "text",
    icon:     Sparkles,
    label:    "Type",
    sub:      "AI parses",
    gradient: "from-cyan-500 to-teal-500",
    shadow:   "shadow-cyan-500/30",
    plusOnly: false,
  },
];

// ─── Zone 2 — navigation tiles ───────────────────────────────────────────────

const TRIP_NEST_NAV = [
  { icon: Receipt,        label: "Expenses", path: "expenses", gradient: "from-cyan-500 to-teal-500",    shadow: "shadow-cyan-500/30"    },
  { icon: Users,          label: "Members",  path: "members",  gradient: "from-violet-500 to-purple-500", shadow: "shadow-violet-500/30" },
  { icon: BarChart2,      label: "Insights", path: "insights", gradient: "from-amber-500 to-orange-400", shadow: "shadow-amber-500/30"   },
  { icon: Receipt,        label: "Settle Up",path: "settle",   gradient: "from-emerald-500 to-green-500", shadow: "shadow-emerald-500/30" },
];

// Circle groups only have expenses + members pages (no settle / insights).
const CIRCLE_NAV = [
  { icon: Receipt, label: "Expenses", path: "expenses", gradient: "from-cyan-500 to-teal-500",    shadow: "shadow-cyan-500/30"    },
  { icon: Users,   label: "Members",  path: "members",  gradient: "from-violet-500 to-purple-500", shadow: "shadow-violet-500/30" },
];

// Settle Up icon override — ArrowLeftRight fits better than Receipt
const NAV_ICON_OVERRIDES: Record<string, React.ElementType> = {
  settle: ArrowLeftRight,
};

// ─── component ───────────────────────────────────────────────────────────────

export function GroupActionHub({
  isOpen, onClose,
  groupId, groupName, groupType, currency,
  isArchived, isAdmin,
  isPlusUser,
  joinUrl,
  groupStartDate, groupEndDate,
  members,
}: Props) {
  const [mounted, setMounted]               = useState(false);
  const [quickAddOpen, setQuickAddOpen]     = useState(false);
  const [startMode, setStartMode]           = useState<StartMode>("text");
  const [archiveConfirm, setArchiveConfirm] = useState(false);
  const [archiving, startArchive]           = useTransition();
  const router                              = useRouter();
  const onCloseRef                          = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  const isCircle = groupType === "circle";
  const navTiles = isCircle ? CIRCLE_NAV : TRIP_NEST_NAV;

  useEffect(() => setMounted(true), []);

  // iOS body scroll lock
  useEffect(() => {
    if (!isOpen) return;
    const prevent = (e: TouchEvent) => e.preventDefault();
    document.addEventListener("touchmove", prevent, { passive: false });
    return () => document.removeEventListener("touchmove", prevent);
  }, [isOpen]);

  // Android back-button / browser back closes the sheet
  useEffect(() => {
    if (!isOpen) return;
    window.history.pushState({ hubSheet: true }, "");
    const handlePop = () => onCloseRef.current();
    window.addEventListener("popstate", handlePop);
    return () => {
      window.removeEventListener("popstate", handlePop);
      if (window.history.state?.hubSheet) window.history.go(-1);
    };
  }, [isOpen]);

  // Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handle = (e: KeyboardEvent) => { if (e.key === "Escape") onCloseRef.current(); };
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [isOpen]);

  // Reset archive confirm when sheet closes
  useEffect(() => {
    if (!isOpen) setArchiveConfirm(false);
  }, [isOpen]);

  // ── handlers ──────────────────────────────────────────────────────────────

  function openQuickAdd(mode: StartMode) {
    // Clear the hub's fake history entry synchronously with replaceState (NOT go(-1)).
    // go(-1) fires a popstate event which useSheetDismiss inside QuickAddSheet would
    // catch and immediately close the sheet — so it opens and disappears in one tick.
    if (window.history.state?.hubSheet) window.history.replaceState(null, "");
    setStartMode(mode);
    setQuickAddOpen(true);
    onClose();
  }

  function handleNavClick() {
    // Clear the fake history entry synchronously so Next.js route push isn't reversed.
    if (window.history.state?.hubSheet) window.history.replaceState(null, "");
    onClose();
  }

  function handleShare() {
    if (!joinUrl) { onClose(); return; }
    if (typeof navigator.share === "function") {
      navigator.share({ title: `Join ${groupName} on Clear`, url: joinUrl }).catch(() => {});
    } else {
      navigator.clipboard.writeText(joinUrl).then(() => {
        toast.success("Invite link copied!");
      }).catch(() => {
        toast.info("Invite link", { description: joinUrl });
      });
    }
    onClose();
  }

  function handleArchive() {
    startArchive(async () => {
      const result = await archiveGroup(groupId, !isArchived);
      if (result.ok) {
        toast.success(isArchived ? "Group unarchived" : "Group archived");
        router.refresh();
        onClose();
      } else {
        toast.error(result.error ?? "Failed to archive group");
        setArchiveConfirm(false);
      }
    });
  }

  // ── render ────────────────────────────────────────────────────────────────

  if (!mounted) return null;

  return (
    <>
      {createPortal(
        <AnimatePresence>
          {isOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm cursor-pointer"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
              />

              {/* Sheet */}
              <motion.div
                className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl"
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
              >
                {/* Drag handle */}
                <div className="flex justify-center pt-3 pb-1">
                  <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                </div>

                {/* Group name */}
                <div className="px-5 pt-2 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <p
                    className="text-lg font-semibold text-slate-800 dark:text-slate-100 truncate"
                    style={{ fontFamily: "var(--font-fraunces)" }}
                  >
                    {groupName}
                  </p>
                </div>

                <div className="px-4 pt-4 pb-2 space-y-5">

                  {/* ── Zone 1: Log expense (non-circles) ─────────────────── */}
                  {!isCircle && (
                    <section>
                      <SectionLabel>Log expense</SectionLabel>
                      <div className="grid grid-cols-3 gap-2.5">
                        {ADD_TILES.map(({ id, icon: Icon, label, sub, gradient, shadow, plusOnly }) => (
                          <button
                            key={id}
                            type="button"
                            onClick={() => openQuickAdd(id)}
                            className="relative flex flex-col items-center gap-2 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all text-center"
                          >
                            {/* Plus badge — only when we know user is not Plus */}
                            {plusOnly && isPlusUser === false && (
                              <span className="absolute top-2 right-2 text-[9px] font-bold text-violet-500 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/30 px-1.5 py-0.5 rounded-full leading-none">
                                Plus
                              </span>
                            )}
                            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-sm ${shadow}`}>
                              <Icon className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 leading-tight">
                                {label}
                              </p>
                              <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight mt-0.5">
                                {sub}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* ── Zone 2: Jump to ───────────────────────────────────── */}
                  <section>
                    <SectionLabel>Jump to</SectionLabel>
                    <div className="grid grid-cols-2 gap-2">
                      {navTiles.map(({ icon: DefaultIcon, label, path, gradient, shadow }) => {
                        const Icon = NAV_ICON_OVERRIDES[path] ?? DefaultIcon;
                        return (
                          <Link
                            key={path}
                            href={`/groups/${groupId}/${path}`}
                            onClick={handleNavClick}
                            className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-100 dark:active:bg-slate-700 transition-colors"
                          >
                            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0 shadow-sm ${shadow}`}>
                              <Icon className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                              {label}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  </section>

                  {/* ── Zone 3: Manage ────────────────────────────────────── */}
                  {/* Admins see Edit · Archive · Share; members see Share only. Hidden entirely when nothing to show. */}
                  {(isAdmin !== false || !!joinUrl) && <section className="border-t border-slate-100 dark:border-slate-800 pt-4">
                    {archiveConfirm ? (
                      /* Inline confirmation bar */
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200/60 dark:border-amber-800/50"
                      >
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                        <p className="text-sm text-amber-800 dark:text-amber-200 flex-1 min-w-0 truncate">
                          {isArchived ? "Unarchive" : "Archive"} "{groupName}"?
                        </p>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => setArchiveConfirm(false)}
                            className="text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors px-2 py-1"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleArchive}
                            disabled={archiving}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-60 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            {archiving && <Loader2 className="w-3 h-3 animate-spin" />}
                            Confirm
                          </button>
                        </div>
                      </motion.div>
                    ) : (
                      <div className="flex items-center justify-center flex-wrap gap-0.5">
                        {/* Edit — always visible to admins; omit for members */}
                        {isAdmin !== false && (
                          <Link
                            href={`/groups/${groupId}/edit`}
                            onClick={handleNavClick}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            <PencilLine className="w-3.5 h-3.5" />
                            Edit
                          </Link>
                        )}

                        {isAdmin !== false && (
                          <span className="text-slate-300 dark:text-slate-700 select-none px-1">·</span>
                        )}

                        {/* Archive / Unarchive — admins only */}
                        {isAdmin !== false && (
                          <button
                            type="button"
                            onClick={() => setArchiveConfirm(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            {isArchived
                              ? <ArchiveRestore className="w-3.5 h-3.5" />
                              : <Archive className="w-3.5 h-3.5" />
                            }
                            {isArchived ? "Unarchive" : "Archive"}
                          </button>
                        )}

                        {isAdmin !== false && joinUrl && (
                          <span className="text-slate-300 dark:text-slate-700 select-none px-1">·</span>
                        )}

                        {/* Share invite */}
                        {joinUrl && (
                          <button
                            type="button"
                            onClick={handleShare}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                            Share
                          </button>
                        )}
                      </div>
                    )}
                  </section>}

                </div>

                {/* Cancel */}
                <div className="px-4 pb-8 pt-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body,
      )}

      {/* QuickAddSheet — opened from Zone 1 tiles, renders its own portal */}
      <QuickAddSheet
        groupId={groupId}
        groupName={groupName}
        groupType={groupType}
        currency={currency}
        isOpen={quickAddOpen}
        startMode={startMode}
        groupStartDate={groupStartDate}
        groupEndDate={groupEndDate}
        members={members}
        isPlusUser={isPlusUser}
        onClose={() => setQuickAddOpen(false)}
      />
    </>
  );
}

// ─── local helpers ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-2.5">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
        {children}
      </span>
      <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
    </div>
  );
}
