"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Plus, MapPin, Building2, ChevronLeft, ChevronRight, X, Coins, ArrowLeftRight, Loader2 } from "lucide-react";
import { QuickAddSheet } from "@/components/expense/quick-add-sheet";
import { LogExpenseTiles, type StartMode } from "@/components/expense/log-expense-tiles";
import { StreamLogSheet } from "@/components/stream/stream-log-sheet";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { Sheet } from "@/components/shared/sheet";
import { useSheetDismiss } from "@/hooks/use-sheet-dismiss";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { hapticLight } from "@/lib/haptics";
import { getRecentStreamCounterpartsAction } from "@/app/actions/stream";
import { resolvePickerSections } from "@/components/shared/global-fab-logic";
import type { Group } from "@/lib/db/schema/groups";

// A Stream counterpart (matches StreamLogSheet's preselectedPerson shape)
type PersonOption = { personId: string; type: "user" | "guest"; name: string };

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GroupItem {
  group: Group;
  memberCount: number;
}

interface Props {
  trips:       GroupItem[];
  nests:       GroupItem[];
  circles:     GroupItem[];
  isPlusUser?: boolean;
  /** Whether the user has any Streams — gates the People section in the picker. */
  hasStreams?: boolean;
}

// Max tiles shown in "Recent" section
const RECENT_COUNT = 2;

// FAB uses Clear's cyan brand gradient
const FAB_GRADIENT = "from-cyan-500 to-teal-500";
const FAB_SHADOW   = "shadow-cyan-500/35";

// ── Component ─────────────────────────────────────────────────────────────────

export function GlobalFab({ trips, nests, circles, isPlusUser = false, hasStreams = false }: Props) {
  const [mounted,        setMounted]        = useState(false);
  const [pickerOpen,     setPickerOpen]     = useState(false);
  const [chooserOpen,    setChooserOpen]    = useState(false);
  const [quickAddGroup,  setQuickAddGroup]  = useState<GroupItem | null>(null);
  const [quickAddOpen,   setQuickAddOpen]   = useState(false);
  const [quickAddMode,   setQuickAddMode]   = useState<StartMode>("text");
  const [streamOpen,     setStreamOpen]     = useState(false);
  const [streamPerson,   setStreamPerson]   = useState<PersonOption | undefined>(undefined);
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

  const allActive = [...trips, ...nests, ...circles];

  // ── Handlers ───────────────────────────────────────────────────────────────

  // FAB now opens the unified "Add to…" picker directly — no type-first fan.
  function handleFabClick() {
    hapticLight();
    setPickerOpen(true);
  }

  function handleGroupSelect(item: GroupItem) {
    setPickerOpen(false);
    setQuickAddGroup(item);
    // Let picker sheet start its exit animation before the mode chooser appears
    setTimeout(() => setChooserOpen(true), 150);
  }

  // Person picked from the People section → log a Stream entry with them.
  function handlePersonSelect(person: PersonOption) {
    setPickerOpen(false);
    setStreamPerson(person);
    setTimeout(() => setStreamOpen(true), 150);
  }

  // "Someone else…" → open the stream sheet on its own pick-person step.
  function handleNewPerson() {
    setPickerOpen(false);
    setStreamPerson(undefined);
    setTimeout(() => setStreamOpen(true), 150);
  }

  // Mode chooser → QuickAddSheet with the picked Scan/Voice/Type mode. Matches
  // the GroupActionHub + ExpenseQuickAddFab flows (shared LogExpenseTiles).
  function handleModePick(mode: StartMode) {
    setQuickAddMode(mode);
    setChooserOpen(false);
    setTimeout(() => setQuickAddOpen(true), 150);
  }

  function handleChooserClose() {
    setChooserOpen(false);
    setTimeout(() => setQuickAddGroup(null), 350);
  }

  // "← Change group" from the chooser (only when there's more than one group)
  function handleChooserBack() {
    setChooserOpen(false);
    setTimeout(() => { setQuickAddGroup(null); setPickerOpen(true); }, 150);
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
      {/* ── Main FAB — opens the unified "Add to…" picker ──────────────────── */}
      {/* motion.div handles auto-hide: slides down + fades out on scroll down */}
      <motion.div
        animate={{
          y:       fabVisible ? 0 : 96,
          opacity: fabVisible ? 1 : 0,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 28, mass: 0.8 }}
        className="fixed bottom-nav-safe right-4 z-50 pointer-events-none"
      >
        <button
          onClick={handleFabClick}
          aria-label="Quick add"
          className={`pointer-events-auto w-14 h-14 rounded-full flex items-center justify-center
                     bg-gradient-to-br ${FAB_GRADIENT}
                     shadow-xl ${FAB_SHADOW} text-white
                     hover:opacity-90 active:scale-95 transition-opacity`}
        >
          <Plus className="w-6 h-6" />
        </button>
      </motion.div>

      {/* ── Unified "Add to…" picker — groups + people ─────────────────────── */}
      <GroupPickerSheet
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handleGroupSelect}
        onSelectPerson={handlePersonSelect}
        onSelectNewPerson={handleNewPerson}
        hasStreams={hasStreams}
        trips={trips}
        nests={nests}
        circles={circles}
      />

      {/* ── Mode chooser — Scan / Voice / Type tiles (matches GroupActionHub) ── */}
      <Sheet isOpen={chooserOpen} onClose={handleChooserClose} ariaLabel="Choose how to log">
        <div className="px-5 pt-2 pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-400 dark:text-slate-500">Log expense</p>
            <p
              className="text-lg font-semibold text-slate-800 dark:text-slate-100 truncate"
              style={{ fontFamily: "var(--font-fraunces)" }}
            >
              {quickAddGroup?.group.name}
            </p>
          </div>
          {allActive.length > 1 && (
            <button
              type="button"
              onClick={handleChooserBack}
              className="shrink-0 inline-flex items-center gap-1 text-xs font-medium text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Change group
            </button>
          )}
        </div>
        <div className="px-4 pt-4 pb-6">
          <LogExpenseTiles onPick={handleModePick} />
        </div>
      </Sheet>

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
          startMode={quickAddMode}
          groupStartDate={quickAddGroup.group.startDate}
          groupEndDate={quickAddGroup.group.endDate}
          isPlusUser={isPlusUser}
        />
      )}

      {/* ── Stream log sheet ───────────────────────────────────────────────── */}
      <StreamLogSheet
        isOpen={streamOpen}
        onClose={() => {
          setStreamOpen(false);
          // Clear the preselection after the exit animation so the sheet resets
          // to its pick-person step for the next open.
          setTimeout(() => setStreamPerson(undefined), 350);
        }}
        preselectedPerson={streamPerson}
      />
    </>
  );
}

// ── Group picker sheet ─────────────────────────────────────────────────────────

interface PickerProps {
  isOpen:            boolean;
  onClose:           () => void;
  onSelect:          (item: GroupItem) => void;
  onSelectPerson:    (person: PersonOption) => void;
  onSelectNewPerson: () => void;
  hasStreams:        boolean;
  trips:             GroupItem[];
  nests:             GroupItem[];
  circles:           GroupItem[];
}

function GroupPickerSheet({
  isOpen, onClose, onSelect, onSelectPerson, onSelectNewPerson, hasStreams, trips, nests, circles,
}: PickerProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Escape key + Android back-button dismissal (same pattern as all other sheets)
  useSheetDismiss(isOpen, onClose);
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(isOpen, panelRef);

  // ── Recent stream counterparts — lazy-loaded when the picker opens ──────────
  const [people, setPeople]         = useState<PersonOption[]>([]);
  const [peopleLoaded, setLoaded]   = useState(false);

  useEffect(() => {
    if (isOpen && hasStreams && !peopleLoaded) {
      getRecentStreamCounterpartsAction()
        .then(setPeople)
        .catch(() => {}) // silent — offline/error just leaves "Someone else…" as the entry
        .finally(() => setLoaded(true));
    }
  }, [isOpen, hasStreams, peopleLoaded]);

  // Section layout is decided by the pure, tested helper.
  const { recentGroups, remainingTrips, remainingNests, remainingCircles, showFullList, showPeople } =
    resolvePickerSections({ trips, nests, circles, recentCount: RECENT_COUNT, hasStreams });

  const allActive = [...trips, ...nests, ...circles];
  const nonDemo   = allActive.filter((g) => !g.group.isDemo);
  const recent    = recentGroups;

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
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Add to a group or person"
            tabIndex={-1}
            style={{ outline: "none" }}
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
                {showPeople ? "Add to…" : "Add expense to…"}
              </h3>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
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
                        icon={<Building2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />}
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
                  {remainingCircles.length > 0 && (
                    <div>
                      <ListSectionHeader
                        label="Circles"
                        color="violet"
                        icon={<Coins className="w-3 h-3 text-violet-600 dark:text-violet-400" />}
                      />
                      <div className="space-y-0.5 mt-1.5">
                        {remainingCircles.map((item) => (
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
              {allActive.length === 0 && !showPeople && (
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

              {/* ── People (Streams) ──────────────────────────────────────── */}
              {/* Shown only when the user has Streams — pick a person to log a
                  personal-debt entry, or reach the full stream sheet via
                  "Someone else…". Groups-only users never see this. */}
              {showPeople && (
                <div className={(showFullList || recent.length > 0) ? "mt-5" : ""}>
                  <ListSectionHeader
                    label="People"
                    color="blue"
                    icon={<ArrowLeftRight className="w-3 h-3 text-blue-600 dark:text-blue-400" />}
                  />
                  <div className="space-y-0.5 mt-1.5">
                    {people.map((person) => (
                      <PersonListRow
                        key={person.personId || person.name}
                        person={person}
                        onClick={() => onSelectPerson(person)}
                      />
                    ))}

                    {/* Someone else / search — opens the stream sheet's pick step */}
                    <button
                      type="button"
                      onClick={onSelectNewPerson}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                                 hover:bg-slate-50 dark:hover:bg-slate-800/60
                                 active:bg-slate-100 dark:active:bg-slate-800
                                 transition-colors text-left"
                    >
                      <div className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center
                                      bg-blue-50 dark:bg-blue-900/30">
                        <Plus className="w-[18px] h-[18px] text-blue-600 dark:text-blue-400" />
                      </div>
                      <span className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-200">
                        {people.length > 0 ? "Someone else…" : "Log a personal debt"}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" />
                    </button>

                    {/* Loading shimmer while recents resolve */}
                    {!peopleLoaded && (
                      <div className="flex items-center gap-2 px-3 py-2 text-xs text-slate-400">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading people…
                      </div>
                    )}
                  </div>
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
  const isTrip   = group.groupType === "trip";
  const isCircle = group.groupType === "circle";

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
          ${isTrip ? "from-cyan-400 to-teal-500"
            : isCircle ? "from-violet-500 to-purple-600"
            : "from-emerald-400 to-teal-500"}`}
        />
      )}

      {/* Readable overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/68 via-black/15 to-transparent" />

      {/* Type badge */}
      <div className="absolute top-2 left-2">
        <div className={`w-5 h-5 rounded-md flex items-center justify-center
                        ${isTrip ? "bg-cyan-500/80" : isCircle ? "bg-violet-500/80" : "bg-emerald-500/80"}`}>
          {isTrip
            ? <MapPin className="w-3 h-3 text-white" />
            : isCircle
            ? <Coins  className="w-3 h-3 text-white" />
            : <Building2 className="w-3 h-3 text-white" />}
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
  const isTrip   = group.groupType === "trip";
  const isCircle = group.groupType === "circle";

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
            ${isTrip ? "from-cyan-400 to-teal-500"
              : isCircle ? "from-violet-500 to-purple-600"
              : "from-emerald-400 to-teal-500"}`}>
            {isTrip
              ? <MapPin className="w-[15px] h-[15px] text-white" />
              : isCircle
              ? <Coins  className="w-[15px] h-[15px] text-white" />
              : <Building2 className="w-[15px] h-[15px] text-white" />}
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

// ── Person list row (Stream counterpart) ───────────────────────────────────────

function PersonListRow({ person, onClick }: { person: PersonOption; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                 hover:bg-slate-50 dark:hover:bg-slate-800/60
                 active:bg-slate-100 dark:active:bg-slate-800
                 transition-colors text-left"
    >
      <div className="w-10 h-10 shrink-0 flex items-center justify-center">
        <MemberAvatar name={person.name} size="sm" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
          {person.name}
        </p>
        {person.type === "guest" && (
          <p className="text-xs text-slate-400 dark:text-slate-500">Guest</p>
        )}
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
  color: "cyan" | "emerald" | "violet" | "blue";
  icon:  React.ReactNode;
}) {
  const badge = color === "cyan"
    ? "bg-cyan-50 dark:bg-cyan-900/30"
    : color === "emerald"
    ? "bg-emerald-50 dark:bg-emerald-900/30"
    : color === "blue"
    ? "bg-blue-50 dark:bg-blue-900/30"
    : "bg-violet-50 dark:bg-violet-900/30";
  const rule = color === "cyan"
    ? "from-cyan-200/70 dark:from-cyan-800/40"
    : color === "emerald"
    ? "from-emerald-200/70 dark:from-emerald-800/40"
    : color === "blue"
    ? "from-blue-200/70 dark:from-blue-800/40"
    : "from-violet-200/70 dark:from-violet-800/40";

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
