"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Sheet } from "@/components/shared/sheet";
import Link from "next/link";
import {
  Archive, ArchiveRestore, ArrowLeftRight, BarChart2,
  Loader2, PencilLine, Receipt,
  Share2, Users,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { archiveGroup } from "@/app/actions/groups";
import { QuickAddSheet } from "@/components/expense/quick-add-sheet";
import { LogExpenseTiles, type StartMode } from "@/components/expense/log-expense-tiles";
import { getContextTheme } from "@/lib/theme/context-theme";
import type { GroupMember } from "@/lib/db/schema/group-members";

// ─── types ───────────────────────────────────────────────────────────────────

export type { StartMode };

interface Props {
  isOpen:          boolean;
  onClose:         () => void;
  groupId:         string;
  groupName:       string;
  groupType:       string;      // 'trip' | 'nest' | 'circle'
  circleMode?:     string | null; // 'recurring' | 'one_time' (circles only)
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

// ─── Zone 2 — navigation tiles ───────────────────────────────────────────────

// Zone 2 "Jump to" tiles share the group's context colour (the icon names the
// destination) — same principle as the overview quick-action cards.
const TRIP_NEST_NAV = [
  { icon: Receipt,   label: "Expenses",  path: "expenses" },
  { icon: Users,     label: "Members",   path: "members"  },
  { icon: BarChart2, label: "Insights",  path: "insights" },
  { icon: Receipt,   label: "Settle Up", path: "settle"   },
];

// Circle groups only have expenses + members pages (no settle / insights).
const CIRCLE_NAV = [
  { icon: Receipt, label: "Expenses", path: "expenses" },
  { icon: Users,   label: "Members",  path: "members"  },
];

// Settle Up icon override — ArrowLeftRight fits better than Receipt
const NAV_ICON_OVERRIDES: Record<string, React.ElementType> = {
  settle: ArrowLeftRight,
};

// ─── component ───────────────────────────────────────────────────────────────

export function GroupActionHub({
  isOpen, onClose,
  groupId, groupName, groupType, circleMode, currency,
  isArchived, isAdmin,
  isPlusUser,
  joinUrl,
  groupStartDate, groupEndDate,
  members,
}: Props) {
  const [quickAddOpen, setQuickAddOpen]     = useState(false);
  const [startMode, setStartMode]           = useState<StartMode>("text");
  const [archiving, startArchive]           = useTransition();
  const router                              = useRouter();
  const onCloseRef                          = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  const isCircle = groupType === "circle";
  const navTiles = isCircle ? CIRCLE_NAV : TRIP_NEST_NAV;
  const theme    = getContextTheme(groupType, circleMode);

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

  // Archive is fully reversible — undo-first (apply immediately, Undo = inverse)
  // instead of the old two-step confirm. Matches every other reversible action.
  function handleArchive() {
    const target = !isArchived;
    startArchive(async () => {
      const result = await archiveGroup(groupId, target);
      if (!result.ok) {
        toast.error(result.error ?? "Failed to archive group");
        return;
      }
      router.refresh();
      onClose();
      toast.success(target ? "Group archived" : "Group unarchived", {
        duration: 5000,
        action: {
          label: "Undo",
          onClick: async () => {
            const undo = await archiveGroup(groupId, !target);
            if (!undo.ok) toast.error(undo.error ?? "Failed to undo");
            else router.refresh();
          },
        },
      });
    });
  }

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <>
      <Sheet isOpen={isOpen} onClose={onClose} ariaLabel={`${groupName} actions`}>
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
                      <LogExpenseTiles onPick={openQuickAdd} />
                    </section>
                  )}

                  {/* ── Zone 2: Jump to ───────────────────────────────────── */}
                  <section>
                    <SectionLabel>Jump to</SectionLabel>
                    <div className="grid grid-cols-2 gap-2">
                      {navTiles.map(({ icon: DefaultIcon, label, path }) => {
                        const Icon = NAV_ICON_OVERRIDES[path] ?? DefaultIcon;
                        return (
                          <Link
                            key={path}
                            href={`/groups/${groupId}/${path}`}
                            onClick={handleNavClick}
                            className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-100 dark:active:bg-slate-700 transition-colors"
                          >
                            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${theme.gradient} flex items-center justify-center shrink-0 shadow-sm ${theme.glow}`}>
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
                    {(
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

                        {/* Archive / Unarchive — admins only. Undo-first (reversible). */}
                        {isAdmin !== false && (
                          <button
                            type="button"
                            onClick={handleArchive}
                            disabled={archiving}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                          >
                            {archiving
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : isArchived
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
      </Sheet>

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
        isPlusUser={true} /* scan / logging-AI is free for all; server enforces the ceiling */
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
