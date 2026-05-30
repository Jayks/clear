"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Plus, Receipt, ArrowLeftRight, MapPin, Home, ChevronRight, X } from "lucide-react";
import { QuickAddSheet } from "@/components/expense/quick-add-sheet";
import { StreamLogSheet } from "@/components/stream/stream-log-sheet";
import { useSheetDismiss } from "@/hooks/use-sheet-dismiss";
import { hapticLight } from "@/lib/haptics";
import type { Group } from "@/lib/db/schema/groups";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GroupItem {
  group: Group;
  memberCount: number;
}

interface Props {
  trips: GroupItem[];
  nests: GroupItem[];
}

// Max tiles shown in "Recent" section
const RECENT_COUNT = 2;

// FAB uses a warm sunset gradient — pops against the app's cool blue-green background
const FAB_GRADIENT = "from-orange-400 to-rose-500";
const FAB_SHADOW   = "shadow-orange-500/35";

// ── Component ─────────────────────────────────────────────────────────────────

export function GlobalFab({ trips, nests }: Props) {
  const [mounted,        setMounted]        = useState(false);
  const [fabOpen,        setFabOpen]        = useState(false);
  const [pickerOpen,     setPickerOpen]     = useState(false);
  const [quickAddGroup,  setQuickAddGroup]  = useState<GroupItem | null>(null);
  const [quickAddOpen,   setQuickAddOpen]   = useState(false);
  const [streamOpen,     setStreamOpen]     = useState(false);
  const [fabVisible,     setFabVisible]     = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => { setMounted(true); }, []);

  // Auto-hide FAB when scrolling down, reveal when scrolling up
  useEffect(() => {
    const onScroll = () => {
      const currentY = window.scrollY;
      const delta    = currentY - lastScrollY.current;
      // Only react to deliberate scrolls (>8px) to avoid micro-jitter
      if (Math.abs(delta) > 8) {
        // Always show near the top; hide when scrolling down
        setFabVisible(delta < 0 || currentY < 80);
      }
      lastScrollY.current = currentY;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const allActive = [...trips, ...nests];
  const hasGroups = allActive.length > 0;

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleFabClick() {
    hapticLight();
    setFabOpen((v) => !v);
  }

  function handleLogExpense() {
    hapticLight();
    setFabOpen(false);
    if (!hasGroups) return;
    if (allActive.length === 1) {
      // Only one group — skip the picker
      setQuickAddGroup(allActive[0]);
      requestAnimationFrame(() => setQuickAddOpen(true));
    } else {
      setPickerOpen(true);
    }
  }

  function handleLogEntry() {
    hapticLight();
    setFabOpen(false);
    setStreamOpen(true);
  }

  function handleGroupSelect(item: GroupItem) {
    setPickerOpen(false);
    setQuickAddGroup(item);
    // Let picker sheet start its exit animation before QuickAdd appears
    setTimeout(() => setQuickAddOpen(true), 150);
  }

  const handleQuickAddClose = useCallback(() => {
    setQuickAddOpen(false);
    // Keep group data until exit animation finishes so sheet doesn't flash empty
    setTimeout(() => setQuickAddGroup(null), 350);
  }, []);

  const handleBack = useCallback(() => {
    setQuickAddOpen(false);
    setTimeout(() => {
      setQuickAddGroup(null);
      setPickerOpen(true);
    }, 200);
  }, []);

  if (!mounted) return null;

  return (
    <>
      {/* ── Backdrop — closes fan ─────────────────────────────────────────── */}
      <AnimatePresence>
        {fabOpen && (
          <motion.div
            key="fab-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setFabOpen(false)}
            className="fixed inset-0 bg-black/20 backdrop-blur-[1.5px] z-40"
          />
        )}
      </AnimatePresence>

      {/* ── FAB stack ────────────────────────────────────────────────────── */}
      {/* flex-col-reverse: main FAB is last child → visually at bottom; items stack upward */}
      {/* motion.div handles auto-hide: slides down + fades out on scroll down */}
      <motion.div
        animate={{
          y:       (fabVisible || fabOpen) ? 0 : 96,
          opacity: (fabVisible || fabOpen) ? 1 : 0,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 28, mass: 0.8 }}
        className="fixed bottom-nav-safe right-4 z-50 flex flex-col-reverse items-end gap-3 pointer-events-none"
      >

        {/* Main FAB */}
        <motion.button
          onClick={handleFabClick}
          animate={{ rotate: fabOpen ? 45 : 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          aria-label={fabOpen ? "Close" : "Quick add"}
          className={`pointer-events-auto w-14 h-14 rounded-full flex items-center justify-center
                     bg-gradient-to-br ${FAB_GRADIENT}
                     shadow-xl ${FAB_SHADOW} text-white
                     hover:opacity-90 active:scale-95 transition-opacity`}
        >
          <Plus className="w-6 h-6" />
        </motion.button>

        {/* Fan items — render only when open */}
        <AnimatePresence>
          {fabOpen && (
            <>
              {/* Log expense — closer to main FAB (primary action) */}
              <FanItem
                key="expense"
                label="Log expense"
                icon={<Receipt className="w-[18px] h-[18px]" />}
                gradient="from-cyan-500 to-teal-500"
                shadow="shadow-cyan-500/30"
                delay={0.05}
                disabled={!hasGroups}
                onClick={handleLogExpense}
              />
              {/* Log entry — higher in fan (secondary action) */}
              <FanItem
                key="entry"
                label="Log entry"
                icon={<ArrowLeftRight className="w-[18px] h-[18px]" />}
                gradient="from-indigo-500 to-violet-500"
                shadow="shadow-indigo-500/30"
                delay={0.11}
                onClick={handleLogEntry}
              />
            </>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Group picker sheet ─────────────────────────────────────────────── */}
      <GroupPickerSheet
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handleGroupSelect}
        trips={trips}
        nests={nests}
      />

      {/* ── QuickAdd sheet — always rendered so exit animation plays cleanly ── */}
      {quickAddGroup && (
        <QuickAddSheet
          groupId={quickAddGroup.group.id}
          groupName={quickAddGroup.group.name}
          groupType={quickAddGroup.group.groupType}
          currency={quickAddGroup.group.defaultCurrency}
          isOpen={quickAddOpen}
          onClose={handleQuickAddClose}
          onBack={allActive.length > 1 ? handleBack : undefined}
          groupStartDate={quickAddGroup.group.startDate}
          groupEndDate={quickAddGroup.group.endDate}
        />
      )}

      {/* ── Stream log sheet ───────────────────────────────────────────────── */}
      <StreamLogSheet
        isOpen={streamOpen}
        onClose={() => setStreamOpen(false)}
      />
    </>
  );
}

// ── Fan item ──────────────────────────────────────────────────────────────────

interface FanItemProps {
  label:    string;
  icon:     React.ReactNode;
  gradient: string;
  shadow:   string;
  delay:    number;
  disabled?: boolean;
  onClick:  () => void;
}

function FanItem({ label, icon, gradient, shadow, delay, disabled, onClick }: FanItemProps) {
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0, y: 18 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0, opacity: 0, y: 18 }}
      transition={{ delay, type: "spring", stiffness: 420, damping: 26 }}
      className="flex items-center gap-3 pointer-events-auto"
    >
      {/* Label pill — slides in from right */}
      <motion.span
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 12 }}
        transition={{ delay: delay + 0.07, duration: 0.18 }}
        className="text-[13px] font-medium text-white
                   bg-slate-900/78 dark:bg-slate-800/90
                   backdrop-blur-sm rounded-full px-3 py-1.5
                   shadow-md whitespace-nowrap select-none"
      >
        {label}
      </motion.span>

      {/* Mini FAB */}
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`w-12 h-12 rounded-full flex items-center justify-center
                    bg-gradient-to-br ${gradient}
                    shadow-lg ${shadow} text-white
                    hover:opacity-90 active:scale-95 transition-all
                    disabled:opacity-40 disabled:cursor-not-allowed`}
      >
        {icon}
      </button>
    </motion.div>
  );
}

// ── Group picker sheet ─────────────────────────────────────────────────────────

interface PickerProps {
  isOpen:   boolean;
  onClose:  () => void;
  onSelect: (item: GroupItem) => void;
  trips:    GroupItem[];
  nests:    GroupItem[];
}

function GroupPickerSheet({ isOpen, onClose, onSelect, trips, nests }: PickerProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Escape key + Android back-button dismissal (same pattern as all other sheets)
  useSheetDismiss(isOpen, onClose);

  const allActive  = [...trips, ...nests];
  const nonDemo    = allActive.filter((g) => !g.group.isDemo);

  // "Recent" tiles = first N non-demo groups (already sorted by recency from getAllGroups)
  const recent     = nonDemo.slice(0, RECENT_COUNT);
  const recentIds  = new Set(recent.map((r) => r.group.id));

  // Remaining groups for the full list (exclude recent, keep demo in the list)
  const remainingTrips = trips.filter((g) => !recentIds.has(g.group.id));
  const remainingNests = nests.filter((g) => !recentIds.has(g.group.id));
  const showFullList   = remainingTrips.length + remainingNests.length > 0;

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="picker-bd"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
          />

          {/* Sheet */}
          <motion.div
            key="picker-sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0.05, bottom: 0.3 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 80 || info.velocity.y > 400) onClose();
            }}
            className="fixed bottom-0 left-0 right-0 z-[51]
                       bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl
                       border-t border-slate-200/80 dark:border-slate-700/60
                       rounded-t-2xl shadow-2xl max-h-[78vh] flex flex-col
                       cursor-grab active:cursor-grabbing"
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 shrink-0
                            border-b border-slate-100 dark:border-slate-800">
              <h3
                className="text-base text-slate-800 dark:text-slate-100"
                style={{ fontFamily: "var(--font-fraunces)" }}
              >
                Add expense to…
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center
                           text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 px-5 py-4 cursor-default">

              {/* ── Recent tiles ──────────────────────────────────────────── */}
              {recent.length > 0 && (
                <div className="mb-5">
                  <p className="text-xs font-medium text-slate-400 dark:text-slate-500 mb-2.5">
                    Recent
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {recent.map((item) => (
                      <GroupTile
                        key={item.group.id}
                        item={item}
                        onClick={() => onSelect(item)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* ── No real groups — show prompt ──────────────────────────── */}
              {allActive.length > 0 && nonDemo.length === 0 && (
                <div className="text-center py-6">
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                    You only have sample groups. Create a real one first.
                  </p>
                  <Link
                    href="/groups/new?type=trip"
                    onClick={onClose}
                    className="text-sm font-medium text-cyan-600 dark:text-cyan-400"
                  >
                    Create a group →
                  </Link>
                </div>
              )}

              {/* ── Full list ─────────────────────────────────────────────── */}
              {showFullList && (
                <div className="space-y-3">
                  {remainingTrips.length > 0 && (
                    <div>
                      <ListSectionHeader
                        label="Trips"
                        color="cyan"
                        icon={<MapPin className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />}
                      />
                      <div className="space-y-0.5 mt-1.5">
                        {remainingTrips.map((item) => (
                          <GroupListRow
                            key={item.group.id}
                            item={item}
                            onClick={() => onSelect(item)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  {remainingNests.length > 0 && (
                    <div>
                      <ListSectionHeader
                        label="Nests"
                        color="emerald"
                        icon={<Home className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />}
                      />
                      <div className="space-y-0.5 mt-1.5">
                        {remainingNests.map((item) => (
                          <GroupListRow
                            key={item.group.id}
                            item={item}
                            onClick={() => onSelect(item)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Truly empty ───────────────────────────────────────────── */}
              {allActive.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                    No groups yet
                  </p>
                  <Link
                    href="/groups/new?type=trip"
                    onClick={onClose}
                    className="text-sm font-medium text-cyan-600 dark:text-cyan-400"
                  >
                    Create your first group →
                  </Link>
                </div>
              )}

              {/* Safe-area bottom spacer */}
              <div className="h-4" />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}

// ── Group tile (cover-photo card) ──────────────────────────────────────────────

function GroupTile({ item, onClick }: { item: GroupItem; onClick: () => void }) {
  const { group, memberCount } = item;
  const isTrip = group.groupType === "trip";

  return (
    <button
      type="button"
      onClick={onClick}
      className="relative rounded-2xl overflow-hidden h-28 w-full text-left
                 hover:scale-[1.02] active:scale-[0.97]
                 transition-transform shadow-sm"
    >
      {/* Background */}
      {group.coverPhotoUrl ? (
        <Image
          src={group.coverPhotoUrl}
          alt={group.name}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 40vw, 200px"
        />
      ) : (
        <div className={`absolute inset-0 bg-gradient-to-br
          ${isTrip ? "from-cyan-400 to-teal-500" : "from-emerald-400 to-teal-500"}`}
        />
      )}

      {/* Readable overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/68 via-black/15 to-transparent" />

      {/* Type badge */}
      <div className="absolute top-2 left-2">
        <div className={`w-5 h-5 rounded-md flex items-center justify-center
                        ${isTrip ? "bg-cyan-500/80" : "bg-emerald-500/80"}`}>
          {isTrip
            ? <MapPin className="w-3 h-3 text-white" />
            : <Home   className="w-3 h-3 text-white" />}
        </div>
      </div>

      {/* Demo pill */}
      {group.isDemo && (
        <div className="absolute top-2 right-2">
          <span className="text-[10px] font-semibold text-white bg-amber-500/80
                           rounded px-1.5 py-0.5 leading-none">
            Sample
          </span>
        </div>
      )}

      {/* Name + member count */}
      <div className="absolute bottom-0 left-0 right-0 p-2.5">
        <p className="text-white text-[13px] font-semibold leading-tight truncate">
          {group.name}
        </p>
        <p className="text-white/70 text-[11px] mt-0.5">
          {memberCount} member{memberCount !== 1 ? "s" : ""}
        </p>
      </div>
    </button>
  );
}

// ── Group list row ────────────────────────────────────────────────────────────

function GroupListRow({ item, onClick }: { item: GroupItem; onClick: () => void }) {
  const { group, memberCount } = item;
  const isTrip = group.groupType === "trip";

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                 hover:bg-slate-50 dark:hover:bg-slate-800/60
                 active:bg-slate-100 dark:active:bg-slate-800
                 transition-colors text-left"
    >
      {/* Thumbnail */}
      <div className="relative w-10 h-10 rounded-xl overflow-hidden shrink-0">
        {group.coverPhotoUrl ? (
          <Image
            src={group.coverPhotoUrl}
            alt={group.name}
            fill
            className="object-cover"
            sizes="40px"
          />
        ) : (
          <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br
            ${isTrip ? "from-cyan-400 to-teal-500" : "from-emerald-400 to-teal-500"}`}>
            {isTrip
              ? <MapPin className="w-[15px] h-[15px] text-white" />
              : <Home   className="w-[15px] h-[15px] text-white" />}
          </div>
        )}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
          {group.name}
          {group.isDemo && (
            <span className="ml-1.5 text-xs text-amber-500 font-normal">Sample</span>
          )}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {memberCount} member{memberCount !== 1 ? "s" : ""}
        </p>
      </div>

      <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" />
    </button>
  );
}

// ── List section header ────────────────────────────────────────────────────────

function ListSectionHeader({
  label,
  color,
  icon,
}: {
  label: string;
  color: "cyan" | "emerald";
  icon:  React.ReactNode;
}) {
  const badge = color === "cyan"
    ? "bg-cyan-50 dark:bg-cyan-900/30"
    : "bg-emerald-50 dark:bg-emerald-900/30";
  const rule = color === "cyan"
    ? "from-cyan-200/70 dark:from-cyan-800/40"
    : "from-emerald-200/70 dark:from-emerald-800/40";

  return (
    <div className="flex items-center gap-2 mb-0.5">
      <div className={`w-5 h-5 rounded-md ${badge} flex items-center justify-center shrink-0`}>
        {icon}
      </div>
      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{label}</span>
      <div className={`flex-1 h-px bg-gradient-to-r ${rule} to-transparent dark:to-transparent`} />
    </div>
  );
}
