"use client";

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import "mapbox-gl/dist/mapbox-gl.css";
import { useTheme } from "next-themes";
import { format, parseISO } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { MapPin, ChevronLeft, ChevronRight, Play, Pause, X, RotateCcw, Maximize2, AlertTriangle } from "lucide-react";
import { parseExpenseLocation } from "@/lib/db/schema/expenses";
import type { Expense } from "@/lib/db/schema/expenses";
import type { GroupMember } from "@/lib/db/schema/group-members";
import { ExpenseDetailSheet } from "./expense-detail-sheet";
import {
  computeScrubDates,
  computeDistanceRevealFraction,
  computeDistanceRevealFractionThroughIndex,
  groupLocationsIntoStops,
  buildAllDayStops,
  buildScrubPositions,
  getPayerNames,
  getLocatedExpenses,
  getCategoryEmoji,
  truncateAtWord,
  isSpreadOut,
  easeOutCubic,
  lerp,
  pointAlongLine,
} from "@/lib/expense/map-helpers";
import type { DayStops } from "@/lib/expense/map-helpers";
import type { ExpenseInteractionCount } from "@/lib/db/queries/interactions";
import { getCategory } from "@/lib/categories";
import { formatCurrency } from "@/lib/utils";
import { hapticLight } from "@/lib/haptics";
import { useFocusTrap } from "@/hooks/use-focus-trap";

/** Reveal-animation duration range, in ms — scaled by how much of the route's
 *  total DISTANCE a scrub step actually covers (see `revealDurationForDelta`).
 *  A fixed duration made every step — a 30km local hop and a 1750km
 *  inter-city leap alike — complete in the same span: the short hops felt
 *  fine, but big jumps covered enormous ground in that same instant and read
 *  as a teleport/snap rather than "traveling". Both bounds sit clear of the
 *  camera's 500ms pan (floor still lets the camera arrive first and the route
 *  keep extending for a beat — the "drawing itself" sensation; ceiling caps
 *  how long a single mega-leg can hold up the next scrub step). */
const PATH_REVEAL_MIN_DURATION_MS = 700;
const PATH_REVEAL_MAX_DURATION_MS = 2200;

/** Pause between consecutive stops in a multi-stop day's one-by-one AUTOPLAY
 *  reveal. The cinema player has exactly one walked-reveal path now
 *  (autoplay) — manual navigation (drag scrubber, day chevrons, tapping a
 *  segment) is INSTANT, jumping straight to its target via `manualSubStepRef`
 *  rather than running this timer at all (see the sub-step sequencer effect
 *  below for how it tells the two apart) — so there's no longer a competing
 *  "manual needs to feel brisk" pace to balance against. That frees this to
 *  run at the LONGER pace the close-up cinema zoom actually needs: each
 *  arrival floats the zoom floor up to `ZOOM_CINEMA_CLOSEUP` so Standard's 3D
 *  buildings/landmarks have something to extrude into — a fresh, more-
 *  detailed zoom level the map likely hasn't fetched/rendered tiles for yet.
 *  1600ms cut it too close on a full-screen laptop (confirmed in testing —
 *  the next stop's reveal fired before the previous one's tiles/buildings had
 *  actually popped in); 2600ms matches this file's earlier cinema-specific
 *  tuning, giving tiles time to load before the camera moves on. */
const SUB_STEP_MS = 2600;

/** Maps a reveal-fraction delta (how much of the route's total length this
 *  scrub step newly covers, in [0, 1]) to an animation duration — linear
 *  interpolation between the floor and ceiling above. A tiny same-city hop
 *  (delta ≈ 0.02) animates near the floor; jumping clear across the country
 *  in one step (delta ≈ 1, e.g. stepping straight from "All" to day 1, or a
 *  single day covering most of the trip's ground) takes the full ceiling —
 *  long enough to actually read as "covering serious distance". */
function revealDurationForDelta(deltaFraction: number): number {
  const clamped = Math.min(Math.abs(deltaFraction), 1);
  return lerp(PATH_REVEAL_MIN_DURATION_MS, PATH_REVEAL_MAX_DURATION_MS, clamped);
}

/** Compact amount label for map pins (e.g. ₹1.2k, ₹15k). */
function compactAmount(amount: number, currency: string): string {
  // Use Intl compact for large numbers to keep pin labels short
  const sym = currency === "INR" ? "₹"
    : currency === "USD" ? "$"
    : currency === "EUR" ? "€"
    : currency === "GBP" ? "£"
    : currency === "SGD" ? "S$"
    : currency === "AED" ? "AED "
    : currency === "THB" ? "฿"
    : currency === "MYR" ? "RM"
    : `${currency} `;
  if (amount >= 1000) {
    return `${sym}${(amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 1)}k`;
  }
  return `${sym}${Math.round(amount)}`;
}

/** How long the establishing shot (full route + trip name/dates/total) holds
 *  before auto-advancing to Day 1 — long enough to actually read three lines
 *  of text (name, dates, total), short enough that "tap to skip" rarely
 *  feels necessary. (1500ms read too "blink and it's gone" in testing.) */
const ESTABLISHING_SHOT_MS = 2400;

/** "Jun 1 – Jun 10, 2026" for the establishing shot's date line. `parseISO`
 *  (not `new Date(str)`) avoids the UTC-midnight-shifts-a-day-back footgun
 *  for users west of UTC — same reasoning as the `scrubLabel` date parsing
 *  inside the component below. */
function formatEstablishingDateRange(start: string, end: string): string {
  try {
    return `${format(parseISO(start), "MMM d")} – ${format(parseISO(end), "MMM d, yyyy")}`;
  } catch {
    return "";
  }
}

// ── Map pin CSS classes are defined in app/globals.css ───────────────────────

interface Props {
  expenses:         Expense[];
  members:          GroupMember[];
  currentUserId:    string;
  currentMemberId?: string;
  isAdmin:          boolean;
  currency:         string;
  groupStartDate?:  string | null;
  groupEndDate?:    string | null;
  // active category filter passed down from ExpenseFilters
  filteredExpenses: Expense[];
  interactionCounts?: Record<string, ExpenseInteractionCount>;
  /** Stable id used to key the establishing shot's "seen N times" localStorage
   *  counter — see `openCinema` below. */
  groupId:   string;
  groupName: string;
}

export function ExpenseMapView({
  expenses,
  members,
  currentUserId,
  currentMemberId,
  isAdmin,
  currency,
  groupStartDate,
  groupEndDate,
  filteredExpenses,
  interactionCounts,
  groupId,
  groupName,
}: Props) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstance     = useRef<import("mapbox-gl").Map | null>(null);
  const markersRef      = useRef<import("mapbox-gl").Marker[]>([]);
  // Tracks the trip-path's current/last-animated reveal fraction (independent
  // of React state — read inside a rAF loop) so a new scrub step interpolates
  // from wherever the line visually is right now, not from the previous
  // target's start. Also lets the "layer was just recreated at [0,1]" case
  // (theme-toggle remount) snap back to the correct value without re-animating
  // from zero — see the reveal effect below.
  const revealedFractionRef = useRef(0);
  const revealAnimFrameRef  = useRef<number | null>(null);
  // Glowing dot that rides the tip of the trip-path's reveal animation —
  // makes the line's "drawing in" motion actually perceptible (a thin 2.5px
  // line slowly growing is a weak visual signal on its own; a moving dot is
  // not). Lazily created on first use inside the reveal effect (needs the
  // dynamically-imported mapboxgl.Marker constructor); persists across scrub
  // steps and is repositioned each animation frame, removed in the "All"
  // state (no single "current position" exists when showing the whole route).
  const leadingMarkerRef = useRef<import("mapbox-gl").Marker | null>(null);
  const [mapReady, setMapReady]           = useState(false);
  // Bumped every time a *new* mapboxgl.Map instance becomes ready (initial
  // mount AND theme-change recreate). `mapReady` alone isn't a reliable effect
  // dependency for "did the underlying map instance change?": on a theme
  // toggle, the old instance is destroyed (`setMapReady(false)`) and a new one
  // created (`setMapReady(true)`) — but if the new map's "load" fires inside
  // the same React batch (cached style/tiles), React can collapse `true → false
  // → true` into a no-op render, so dependent effects never see `mapReady`
  // change and never re-bind to the new instance (markers/listeners stay
  // attached to the destroyed map → blank screen, exactly the "dark mode shows
  // nothing" symptom). `mapInstance.current` is a ref — mutating it doesn't
  // trigger re-renders either. This counter always changes on recreation, so
  // it's a dependable re-run signal regardless of batching.
  const [mapGeneration, setMapGeneration] = useState(0);
  // Set when Mapbox itself reports a load-blocking error (auth/URL-restriction
  // 401/403, rate-limit 429, or a network-level failure with no HTTP status at
  // all) — see the "error" listener in initMap below. Found via a real
  // production incident: a Mapbox token's URL allow-list pointed at the old
  // domain only, so every tile request 403'd post-domain-migration while the
  // lighter style-metadata request still succeeded — `mapReady` flipped true
  // (attribution + custom layers rendered) but the basemap stayed blank, with
  // nothing telling the user (or us) why. This surfaces that failure visibly
  // instead of silently leaving a broken-looking map.
  const [mapTilesError, setMapTilesError] = useState(false);
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null);
  const { resolvedTheme } = useTheme();

  // ── Cinema player (movie-style trip replay) ─────────────────────────────────
  // Full-screen autoplay through the trip — the "share this as a memory" payoff.
  // Reuses the SAME map instance/container (just expands it via fixed
  // positioning + `map.resize()`) rather than mounting a second Mapbox.Map —
  // far simpler than a portal-based DOM move, and avoids the canvas-context
  // issues that come with detaching/reattaching a WebGL canvas.
  const [cinemaOpen, setCinemaOpen]   = useState(false);
  // Full-route intro card shown for the first few opens (see `openCinema`) —
  // a separate flag from `cinemaOpen` because it changes what chrome renders
  // (caption/player bar are hidden while it's up; see the render below).
  const [establishingShot, setEstablishingShot] = useState(false);
  const [isPlaying, setIsPlaying]     = useState(false);
  // True only once autoplay itself reaches the end ("All", credits-roll) —
  // deliberately NOT the same thing as "scrubDate is null", because the ⊞
  // Overview button also sets scrubDate to null on demand and must NOT pop
  // the epilogue card (that's reserved for "the movie actually finished").
  const [autoplayComplete, setAutoplayComplete] = useState(false);
  const autoplayTimerRef              = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Set by a manual navigation (drag scrubber / day chevron / segment tap /
  // goToDay1) to "stopIdx + 1" immediately before changing `scrubDate` —
  // consumed once by the sub-step reset block below, then cleared back to
  // null. `null` means "no manual target; use the default" (cinematic walk
  // start for a multi-stop day, full reveal otherwise) — the signal that
  // distinguishes a fresh autoplay arrival from an instant manual jump. See
  // the sub-step sequencer effect for the other half of this mechanism.
  const manualSubStepRef = useRef<number | null>(null);
  // Mirrors `isPlaying` for the marker-tap handler (declared inside the
  // clustering effect, far below) to read without becoming a dependency of
  // that effect — adding it there would tear down and rebuild every marker
  // on every play/pause toggle. Same documented-safe "ref written during
  // render" pattern used throughout this file.
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  // Focus-trap anchor for the cinema overlay — see the `role="dialog"` panel
  // in the render below. `useFocusTrap` is called further down, once
  // `exitCinema` exists.
  const cinemaPanelRef = useRef<HTMLDivElement>(null);
  const PITCH_CINEMA = 52; // degrees — enough perspective to feel "3D" without disorienting at country zoom
  // Standard's `show3dObjects` buildings/landmarks only render as visible
  // relief from roughly street-level zoom upward — at the regular scrub
  // floor (13, "neighbourhood/district level") footprints are too small to
  // extrude into anything perceptible, so toggling 3D on does ~nothing
  // visually there. Reserved for arrivals where lingering close on ONE
  // significant place IS the story for that day — a single-stop day (e.g.
  // Taj Mahal) or holding on the last known spot during a gap day — so the
  // "wow" the 3D toggle exists for appears exactly where there's nothing
  // else competing for the frame.
  const ZOOM_CINEMA_CLOSEUP = 16;
  // Walking through a MULTI-stop day's individual stops one by one — e.g.
  // Delhi's Red Fort → Chandni Chowk → Humayun's Tomb → Dilli Haat — used to
  // float each arrival up to `ZOOM_CINEMA_CLOSEUP` too, but yo-yoing the
  // camera to street-level on every stop within the SAME city loses "where
  // am I in the city" / "how do these stops relate" — confirmed in testing:
  // it reads as disorienting close-ups, not a journey. This stays at a
  // neighbourhood-level zoom instead — close enough to highlight which stop
  // just got revealed, far enough to stay oriented relative to the others —
  // and roughly matches the eventual `dayComplete` fitBounds zoom-out for a
  // close-together day (15, just below — see the `dayComplete` branch), so
  // the hand-off there doesn't itself read as a sudden zoom jump.
  const ZOOM_CINEMA_MULTISTOP_WALK = 14;
  const AUTOPLAY_STEP_MS = 3400; // per-day pace — long enough to register the reveal + pan + caption read
  const MAP_INTRO_MAX_VIEWS = 3; // establishing shot stops showing after this many cinema opens, per group

  // ── Discovery banner — SSR-safe localStorage read ───────────────────────────
  const [hasSeenMapHint, setHasSeenMapHint] = useState(true); // assume seen until client loads
  useEffect(() => {
    setHasSeenMapHint(!!localStorage.getItem("clear_map_view_hint_dismissed"));
  }, []);
  function dismissHint() {
    localStorage.setItem("clear_map_view_hint_dismissed", "1");
    setHasSeenMapHint(true);
  }

  // Located expenses from the full list (not paginated) — used for map pins + path.
  // Memoized: getLocatedExpenses(...) returns a fresh array reference every call,
  // and these feed several useEffect dependency arrays (clustering, path, scrubber
  // pan). Without memoization, every render — including ones triggered by
  // selectedExpenseId changing on pin tap — produces new array identities, which
  // re-fires those effects mid-flight (interrupting in-progress easeTo/fitBounds
  // animations and recreating markers), producing exactly the jumpy/inconsistent
  // pin visibility the manual tests surfaced.
  const allLocated = useMemo(() => getLocatedExpenses(expenses), [expenses]);
  const filteredLocated = useMemo(
    () => getLocatedExpenses(filteredExpenses),
    [filteredExpenses],
  );

  // Chronological route geometry — same sort order used to build the
  // "trip-path" GeoJSON LineString below. Memoized and shared with the
  // reveal-fraction calculation AND the leading-edge marker effect so all
  // three always agree on the EXACT same line; if they computed their own
  // sorted lists independently, a transient mismatch (e.g. mid-render during
  // a filter change) could detach the marker — or the reveal itself — from
  // the line it's meant to trace. `expenseDate` is carried alongside each
  // point because `computeDistanceRevealFraction` needs to know which
  // waypoints fall on/before the scrubbed day (see its doc comment for why
  // a uniform per-day fraction can't substitute for this).
  // Full expense objects in chronological route order — the SAME sort as
  // `routeLocations` below (in fact `routeLocations` is now derived FROM this,
  // so the two can never diverge — exactly the kind of "two lists computing
  // their own sort independently" mismatch this file's comments warn about
  // elsewhere). Keeping the full `Expense` (not just lat/lng+date) is what
  // lets sub-day stepping show a per-stop caption — description, category
  // emoji, amount — for each beat as the camera visits it one by one.
  const chronologicalLocated = useMemo(
    () =>
      [...filteredLocated].sort((a, b) => {
        const byDate = a.expenseDate.localeCompare(b.expenseDate);
        if (byDate !== 0) return byDate;
        // Same-day tie-break: `expenses` arrives ordered `expenseDate DESC,
        // createdAt DESC` (newest-logged-first, right for a list view) — a
        // PLAIN stable re-sort on `expenseDate` alone would silently inherit
        // that DESC tie-order, drawing the route in REVERSE for any day with
        // 2+ locations (e.g. "lounge snacks in Chennai" then "dinner in
        // Connaught Place, Delhi" would route Delhi→Chennai→Delhi — a
        // confusing backtrack zigzag with no story behind it). `createdAt`
        // ASC is the best available proxy for "the order things actually
        // happened" (no time-of-day field exists) — people log same-day
        // expenses roughly as the day unfolds.
        return a.createdAt.getTime() - b.createdAt.getTime();
      }),
    [filteredLocated],
  );

  const routeLocations = useMemo(
    () =>
      chronologicalLocated.map((e) => ({ ...parseExpenseLocation(e.location)!, expenseDate: e.expenseDate })),
    [chronologicalLocated],
  );

  const scrubDates = useMemo(
    () => computeScrubDates(groupStartDate, groupEndDate, allLocated.map((e) => e.expenseDate)),
    [groupStartDate, groupEndDate, allLocated],
  );

  // ── Per-day highlight captions (cinema mode milestone flags) ─────────────────
  // "Day 3 · Feb 3 · 🍽 Late dinner near Connaught Place · ₹5.3k across 2 stops"
  // — built once from `routeLocations` (already correctly chronologically
  // ordered — see its sort comment) so the caption's "biggest stop" always
  // matches what's visibly highlighted on the route for that day.
  const dayCaptions = useMemo(() => {
    type DayCaption = { total: number; count: number; topAmount: number; topDescription: string; topEmoji: string };
    const byDate = new Map<string, DayCaption>();
    for (const e of filteredLocated) {
      const amount  = Number(e.amount);
      const existing = byDate.get(e.expenseDate);
      if (!existing) {
        byDate.set(e.expenseDate, {
          total: amount,
          count: 1,
          topAmount: amount,
          topDescription: e.description,
          topEmoji: getCategoryEmoji(e.category),
        });
      } else {
        existing.total += amount;
        existing.count += 1;
        if (amount > existing.topAmount) {
          existing.topAmount     = amount;
          existing.topDescription = e.description;
          existing.topEmoji       = getCategoryEmoji(e.category);
        }
      }
    }
    return byDate;
  }, [filteredLocated]);

  // The card (launcher) view always shows the full route — "All" — with no
  // scrubbing; only the cinema player ever sets this to a specific day. See
  // `openCinema`/`goToDay1`/`exitCinema` below.
  const [scrubDate, setScrubDate] = useState<string | null>(null);

  // ── Sub-day stepping: every day's distinct stops, computed upfront ──────────
  // The cinema player scrubs at STOP granularity across the WHOLE trip (drag
  // the scrubber, jump via a day segment) — not just whichever day happens to
  // be scrubbed right now — so this needs to exist for every day, not be
  // recomputed per-scrub. Grouped by EXACT coordinate (see
  // `groupLocationsIntoStops` doc) — "the cluster should have different
  // locations, only then does one-by-one stepping make sense".
  const allDayStops = useMemo(
    () => buildAllDayStops(scrubDates, chronologicalLocated),
    [scrubDates, chronologicalLocated],
  );
  // Flat `{date, stopIdx}[]` — the linear index the >10-day range scrubber
  // drags through (segmented day-bar trips don't need this; they scrub by
  // day directly off `allDayStops`).
  const scrubPositions = useMemo(() => buildScrubPositions(allDayStops), [allDayStops]);

  // The currently-scrubbed day's stops — derived from `allDayStops` rather
  // than recomputed, so the two can never disagree. A day with one stop
  // (however many expenses pile up there) behaves exactly as before:
  // `subStepCount <= 1` short-circuits the sequencer below to reveal
  // everything immediately, no animation.
  const currentDayStops = useMemo(
    () => (scrubDate ? allDayStops.find((d) => d.date === scrubDate)?.stops ?? [] : []),
    [scrubDate, allDayStops],
  );
  const subStepCount = currentDayStops.length;

  // How many of today's distinct stops have been progressively revealed.
  // Driven by the sequencer effect below — NOT by direct user input — so it
  // stays correct regardless of how the user arrived at this `scrubDate`
  // (autoplay, chevron tap, or dragging the scrubber all funnel through the
  // same `scrubDate` change and trigger the same one-by-one sequence).
  //
  // Reset SYNCHRONOUSLY DURING RENDER — React's documented "adjust state
  // while rendering" pattern (https://react.dev/reference/react/useState#storing-information-from-previous-renders)
  // — rather than in a `useEffect`. An effect-based reset runs AFTER the
  // date/filter change has already committed and painted, so there is always
  // one rendered (and visible) frame where `currentDayStops` reflects the NEW
  // day but `scrubSubStep` is still the OLD day's terminal value — e.g.
  // landing on a 3-stop day right after a 2-stop day briefly indexes
  // `currentDayStops[1]` (skipping stop 0 entirely), or the reverse: landing
  // on a 2-stop day after a 3-stop one immediately satisfies `dayComplete`
  // and skips that day's whole sequence. That stale single frame is exactly
  // the camera "hopping to the wrong stop out of order" the user saw.
  // Resetting here keeps `scrubSubStep` and `currentDayStops` always in
  // agreement within the same committed render — no observable mismatch.
  const [scrubSubStep, setScrubSubStep] = useState(0);
  const subStepResetKey = scrubDate ? `${scrubDate}:${subStepCount}` : null;
  const [lastSubStepResetKey, setLastSubStepResetKey] = useState<string | null>(null);
  if (subStepResetKey !== lastSubStepResetKey) {
    setLastSubStepResetKey(subStepResetKey);
    // A manual navigation (drag / day-chevron / segment tap / goToDay1) sets
    // `manualSubStepRef` to its exact target just before changing `scrubDate`
    // — consume it here so the very first committed value for the new day is
    // already correct (no visible jump-then-correct). Otherwise: single-/
    // no-stop days reveal everything immediately (matches pre-sub-step
    // behaviour, no animation); multi-stop days start at "nothing revealed
    // yet" — the sequencer effect below walks through each stop from here.
    const targetStep = manualSubStepRef.current ?? (subStepCount <= 1 ? subStepCount : 0);
    manualSubStepRef.current = null;
    setScrubSubStep(targetStep);
  }

  // The index (into `routeLocations`/`chronologicalLocated`) of the LAST
  // location belonging to the most-recently-revealed stop — i.e. "how far
  // along the chronological route the reveal currently extends". Single-stop
  // (or stop-less/gap) days fall straight through to `computeDistanceRevealFraction`'s
  // existing "through end of day X" semantics — byte-identical to pre-sub-step
  // behaviour — via the `dayComplete` branch.
  const dayComplete = subStepCount <= 1 || scrubSubStep >= subStepCount;
  const subStepRevealThroughIndex = useMemo(() => {
    if (!scrubDate || dayComplete || subStepCount === 0) return -1;
    const firstIdx = routeLocations.findIndex((l) => l.expenseDate === scrubDate);
    if (firstIdx === -1) return -1;
    // Count how many raw locations the revealed stops (1..scrubSubStep) span —
    // a stop can bundle 2+ identical-coordinate expenses (e.g. three meals at
    // the same hotel), each occupying its own slot in `routeLocations`.
    let span = 0;
    for (let i = 0; i < scrubSubStep; i++) span += currentDayStops[i].length;
    return firstIdx + span - 1;
  }, [scrubDate, dayComplete, subStepCount, scrubSubStep, currentDayStops, routeLocations]);

  // Times the AUTOPLAY walk through a multi-stop day's distinct stops, one at
  // a time — the direct fix for "everything seems to appear at once" on
  // cluster days. Manual navigation (drag / chevron / segment tap) is
  // instant — it jumps straight to its target via `manualSubStepRef`, never
  // through this timer — so these two effects together must tell the two
  // apart AND let pausing mid-walk actually freeze it (confirmed missing in
  // testing: pausing only stopped the DAY-to-day advance below; the in-
  // progress per-stop reveal kept ticking on its own until the day finished,
  // because the original single-effect version never depended on
  // `isPlaying` at all).
  //
  // Effect 1 decides ONCE per arrival (on `[scrubDate, subStepCount]` only —
  // deliberately not `isPlaying`) whether this is a fresh autoplay arrival
  // eligible to walk: the render-time reset above lands a fresh arrival at
  // exactly 0 (no manual target was set); a manual jump lands at its target
  // (>0). That decision must survive every later isPlaying toggle, so it's
  // stashed in a ref rather than re-derived.
  const isAutoWalkRef = useRef(false);
  useEffect(() => {
    isAutoWalkRef.current = !!scrubDate && subStepCount > 1 && scrubSubStep === 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrubDate, subStepCount]);

  // Effect 2 does the actual ticking, and IS reactive to both `scrubSubStep`
  // and `isPlaying` — schedules exactly one step forward, `SUB_STEP_MS`
  // ahead, whenever a walk is in progress and currently playing. Pausing
  // (isPlaying → false) simply lets this effect return early without
  // scheduling anything, freezing in place; resuming re-fires it, which
  // reads the CURRENT `scrubSubStep` (already at wherever it paused) and
  // continues from exactly there — no separate "resume" path needed.
  useEffect(() => {
    if (!isAutoWalkRef.current || !isPlaying) return;
    if (scrubSubStep >= subStepCount) return; // fully revealed — nothing left to walk
    const timer = setTimeout(() => setScrubSubStep((s) => s + 1), SUB_STEP_MS);
    return () => clearTimeout(timer);
  }, [scrubDate, subStepCount, scrubSubStep, isPlaying]);

  // Pin visibility for the current scrub position — `null` means "show
  // everything" ("All"). Built from the SAME `currentDayStops` grouping that
  // drives the sequencer/camera/captions, so a pin can never appear on the map
  // a beat before (or after) its caption announces it. Prior days always show
  // in full; the scrubbed day reveals stop-by-stop as `scrubSubStep` advances.
  const scrubVisibleExpenseIds = useMemo(() => {
    if (!scrubDate) return null;
    const stopIndexByExpenseId = new Map<string, number>();
    currentDayStops.forEach((stop, stopIdx) => {
      for (const loc of stop) stopIndexByExpenseId.set(loc.expense.id, stopIdx);
    });
    const ids = new Set<string>();
    for (const e of chronologicalLocated) {
      if (e.expenseDate < scrubDate) { ids.add(e.id); continue; }
      if (e.expenseDate > scrubDate) continue;
      const stopIdx = stopIndexByExpenseId.get(e.id);
      if (stopIdx !== undefined && stopIdx < scrubSubStep) ids.add(e.id);
    }
    return ids;
  }, [scrubDate, scrubSubStep, currentDayStops, chronologicalLocated]);

  // ── Map init ─────────────────────────────────────────────────────────────────
  const initMap = useCallback(
    (restoreCenter?: { lng: number; lat: number }, restoreZoom?: number) => {
      if (!mapContainerRef.current) return;
      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      if (!token) {
        console.error("[ExpenseMapView] NEXT_PUBLIC_MAPBOX_TOKEN not set");
        return;
      }

      import("mapbox-gl").then((mapboxgl) => {
        mapboxgl.default.accessToken = token;

        if (!mapContainerRef.current) return;

        // Guard against overlapping init calls. React Strict Mode double-invokes
        // effects in dev (mount → cleanup → mount again), and this function's
        // body resumes asynchronously after the dynamic import resolves — so a
        // stale call can still be in flight when a fresh one starts. Without
        // this guard, TWO live mapboxgl.Map instances can end up attached to
        // the same container: the second constructor's internal DOM setup wipes
        // the first instance's canvas out from under it, orphaning any markers
        // already `.addTo()`'d on the first map (created, `getClusters()` finds
        // them, yet nothing is visible — exactly the "blank on first load, fixed
        // by switching views and back" symptom). Tearing down any previous
        // instance — markers included — before constructing a new one guarantees
        // exactly one live map, correctly sized to its final container.
        if (mapInstance.current) {
          markersRef.current.forEach((m) => m.remove());
          markersRef.current = [];
          if (leadingMarkerRef.current) {
            leadingMarkerRef.current.remove();
            leadingMarkerRef.current = null;
          }
          mapInstance.current.remove();
          mapInstance.current = null;
          setMapReady(false);
        }

        // Clear any stale DOM before handing the container to Mapbox.
        // React never renders children inside this div, so wiping it is safe.
        while (mapContainerRef.current.firstChild) {
          mapContainerRef.current.removeChild(mapContainerRef.current.firstChild);
        }

        // Reset HERE — before constructing the new instance — rather than
        // inside "load" below. "load" can fire even when tiles are actively
        // 403ing (confirmed in production: style/sprite/glyphs loaded fine,
        // only the tile requests were rejected), so "error" and "load" race
        // with no guaranteed order. Resetting at the top of every fresh
        // attempt avoids that race entirely: this instance's own error
        // listener (below) is the only thing allowed to set it true again.
        setMapTilesError(false);

        const locList = allLocated.map((e) => parseExpenseLocation(e.location)!);
        const lngs    = locList.map((l) => l.lng).sort((a, b) => a - b);
        const lats    = locList.map((l) => l.lat).sort((a, b) => a - b);
        const midLng  = lngs[Math.floor(lngs.length / 2)] ?? 0;
        const midLat  = lats[Math.floor(lats.length / 2)] ?? 0;

        // Mapbox Standard (not light-v11/dark-v11) — far richer out of the box:
        // colour-coded land use, hospital/landmark POI icons, road hierarchy —
        // exactly the "brighter, more detailed, clearer place names" look asked
        // for. Both themes share ONE style URL; light/dark is now a `lightPreset`
        // CONFIG PROPERTY (set below, post-load) rather than a different style —
        // Standard's `day`/`night` presets recolour the whole basemap to match.
        const map = new mapboxgl.default.Map({
          container: mapContainerRef.current,
          style:     "mapbox://styles/mapbox/standard",
          center: restoreCenter ? [restoreCenter.lng, restoreCenter.lat] : [midLng, midLat],
          zoom:   restoreZoom ?? 11,
        });

        // Mapbox fires "error" for a wide range of things — a single missing
        // sprite icon, one failed tile request at the edge of coverage, etc.
        // Only surface the ones that mean the basemap genuinely can't load:
        // an AJAXError-shaped failure carrying an HTTP status (401/403 = auth
        // or URL-restriction rejection, 429 = rate-limited), or no status at
        // all (a network-level failure — DNS, offline, blocked request).
        // Anything else (a stray 404 on one tile) is too noisy to alarm on.
        map.on("error", (e) => {
          const status = (e.error as { status?: number } | undefined)?.status;
          const isLoadBlocking = status === undefined || status === 401 || status === 403 || status === 429;
          if (!isLoadBlocking) return;
          console.error("[ExpenseMapView] map error event:", e.error);
          setMapTilesError(true);
        });

        map.on("load", () => {
          // Resize first so Mapbox knows the real canvas dimensions (container
          // may still be laying out or animating in when new Map() was called).
          map.resize();

          // `lightPreset` is the Standard-style equivalent of swapping
          // light-v11 ⇄ dark-v11 — recolours the whole basemap (sky, water,
          // buildings, labels) to match the app's theme. Set on every (re)create
          // — including the destroy/recreate that already runs on theme toggle —
          // so a freshly (re)built map always opens in the CURRENT theme's preset
          // rather than Standard's `day` default.
          map.setConfigProperty("basemap", "lightPreset", resolvedTheme === "dark" ? "night" : "day");

          if (!restoreCenter && allLocated.length > 0) {
            const bounds = new mapboxgl.default.LngLatBounds();
            allLocated.forEach((e) => {
              const loc = parseExpenseLocation(e.location)!;
              bounds.extend([loc.lng, loc.lat]);
            });
            // maxZoom 13 = neighbourhood/district level; 14 is too close (street-level)
            map.fitBounds(bounds, { padding: 48, maxZoom: 13, duration: 0 });
          }
          mapInstance.current = map;
          setMapReady(true);
          setMapGeneration((g) => g + 1);
        });
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [resolvedTheme],
  );

  // Initial mount
  useEffect(() => {
    if (allLocated.length === 0) return;
    initMap();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Theme change — save position, destroy, recreate
  useEffect(() => {
    if (!mapInstance.current) return;
    const savedCenter = mapInstance.current.getCenter();
    const savedZoom   = mapInstance.current.getZoom();
    setMapReady(false);
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    if (leadingMarkerRef.current) {
      leadingMarkerRef.current.remove();
      leadingMarkerRef.current = null;
    }
    mapInstance.current.remove();
    mapInstance.current = null;
    initMap(savedCenter, savedZoom);
  }, [resolvedTheme]); // eslint-disable-line react-hooks/exhaustive-deps

  // Unmount cleanup — prevent "Map already destroyed" errors
  useEffect(() => {
    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      if (leadingMarkerRef.current) {
        leadingMarkerRef.current.remove();
        leadingMarkerRef.current = null;
      }
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Markers + clustering ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapInstance.current) return;
    const map = mapInstance.current;

    // Guards async resolution races: if this effect is cleaned up (deps changed,
    // unmount) before import() resolves, `cancelled` prevents the stale callback
    // from registering a listener that would never get torn down.
    let cancelled = false;
    let detachMoveEnd = () => {};

    // Resolve BOTH dynamic deps up front so render() below is fully synchronous.
    // It used to re-`import("mapbox-gl")` on every call — since render() runs on
    // every "moveend" and our scrubber now drives programmatic easeTo/fitBounds
    // (firing several move/moveend events per step), overlapping render() calls
    // raced: a later call's synchronous markersRef-clear could run before an
    // earlier call's async marker-creation finished, orphaning/dropping markers
    // and leaving an inconsistent final set ("previous pin not visible", "wrong
    // pin shown"). Resolving mapboxgl once eliminates the interleaving entirely.
    Promise.all([import("supercluster"), import("mapbox-gl")]).then(
      ([{ default: Supercluster }, mapboxgl]) => {
        if (cancelled || !mapReady || !mapInstance.current) return;

        // Scrub-filter BEFORE clustering — pins for expenses after the scrubbed
        // date (or not yet "announced" by the sub-day sequencer — see
        // `scrubVisibleExpenseIds`) must never be created, otherwise render()
        // (e.g. on map pan/zoom moveend) would recreate them from scratch and
        // undo any display toggle applied after the fact.
        const scrubVisible = filteredLocated.filter(
          (e) => scrubVisibleExpenseIds === null || scrubVisibleExpenseIds.has(e.id),
        );

        // map/reduce let Supercluster carry an aggregated `amount` total on
        // cluster features (point_count is built in; the running total isn't).
        // This powers the "N · ₹total" cluster bubble label — computed once
        // during index.load, not re-summed on every render.
        const index = new Supercluster<
          { id: string; amount: number; description: string; category: string; expenseDate: string },
          { amount: number }
        >({
          radius: 60,
          maxZoom: 14,
          map: (props) => ({ amount: props.amount }),
          reduce: (acc, props) => { acc.amount += props.amount; },
        });
        index.load(
          scrubVisible.map((e) => {
            const loc = parseExpenseLocation(e.location)!;
            return {
              type:       "Feature" as const,
              geometry:   { type: "Point" as const, coordinates: [loc.lng, loc.lat] },
              properties: {
                id:          e.id,
                amount:      Number(e.amount),
                description: e.description,
                category:    e.category,
                expenseDate: e.expenseDate,
              },
            };
          }),
        );

        // Query the FULL world extent — not the live viewport (map.getBounds()).
        // The scrubber auto-pans the map toward each new day's pin, so the
        // viewport keeps moving; querying it would mean every already-revealed
        // pin that has scrolled offscreen simply never gets returned by
        // getClusters (it's not "hidden", it's never queried) — exactly the
        // "previous pin not visible" / "wrong pin shown" symptom reported.
        // Trip-scale pin counts are small (tens, not thousands), so querying
        // the whole world is cheap; clustering still adapts correctly to the
        // current zoom level via Math.floor(map.getZoom()).
        const WORLD_BBOX: [number, number, number, number] = [-180, -85, 180, 85];

        function render() {
          if (cancelled || !map) return;
          markersRef.current.forEach((m) => m.remove());
          markersRef.current = [];

          const clusters = index.getClusters(WORLD_BBOX, Math.floor(map.getZoom()));

          // Two expenses logged at the very same spot (e.g. "Street food
          // crawl" + "Auto-rickshaw rides" both pinned to Chandni Chowk) have
          // zero pixel distance, so Supercluster clusters them at every zoom
          // up to its maxZoom (14) — but past that it returns them as separate
          // raw points still anchored to the identical lng/lat, stacking their
          // chips exactly on top of each other into an illegible overlap. Fan
          // same-spot individual chips out with a small per-index pixel offset
          // (diagonal stagger) so each stays readable and independently
          // tappable — `cluster-pin` bubbles never hit this since they always
          // collapse same-spot points into one feature regardless of zoom.
          const seenAt = new Map<string, number>();

          clusters.forEach((cluster) => {
            const el     = document.createElement("div");
            const coords = cluster.geometry.coordinates as [number, number];
            const isCluster = !!(cluster.properties as { cluster?: boolean }).cluster;

            let markerOffset: [number, number] = [0, 0];
            if (!isCluster) {
              const key = `${coords[0].toFixed(5)},${coords[1].toFixed(5)}`;
              const dupeIdx = seenAt.get(key) ?? 0;
              seenAt.set(key, dupeIdx + 1);
              if (dupeIdx > 0) markerOffset = [dupeIdx * 16, dupeIdx * -12];
            }

            if (isCluster) {
              // Supercluster decided these pins are too close together to
              // stand alone at this zoom — show a count + total summary
              // bubble rather than trying to cram N descriptions into one spot.
              const { point_count: count, amount: total } = cluster.properties as {
                point_count: number;
                amount: number;
              };
              el.className   = "cluster-pin";
              el.textContent = `${count} · ${compactAmount(total, currency)}`;
              el.onclick = () =>
                map.easeTo({ center: coords, zoom: map.getZoom() + 3 });
            } else {
              // Supercluster decided this pin has enough breathing room to
              // render alone — that's exactly the signal that it's safe to
              // show the richer "🍽 Lunch at Sara… · ₹450" chip here. We're
              // not fighting the declutter, we're riding on top of it.
              const { id: expId, amount, description, category } = cluster.properties as {
                id: string;
                amount: number;
                description: string;
                category: string;
              };
              const isSelected = selectedExpenseId === expId;
              const emoji      = getCategoryEmoji(category);
              const label      = truncateAtWord(description, 18);

              el.className        = `expense-chip-pin${isSelected ? " selected" : ""}`;
              el.dataset.expenseId = expId;
              el.innerHTML = "";
              const emojiSpan = document.createElement("span");
              emojiSpan.className = "chip-emoji";
              emojiSpan.textContent = emoji;
              const labelSpan = document.createElement("span");
              labelSpan.className = "chip-label";
              labelSpan.textContent = label;
              const amountSpan = document.createElement("span");
              amountSpan.className = "chip-amount";
              amountSpan.textContent = `· ${compactAmount(amount, currency)}`;
              el.append(emojiSpan, labelSpan, amountSpan);
              // Tapping a pin during autoplay pauses first, THEN opens the
              // detail sheet — reading `isPlayingRef` (not `isPlaying`
              // directly) so this closure, created once per render() call,
              // never goes stale without forcing the whole clustering effect
              // (and its marker rebuild) to depend on `isPlaying`.
              el.onclick = () => {
                if (isPlayingRef.current) setIsPlaying(false);
                setSelectedExpenseId(expId);
              };
            }

            markersRef.current.push(
              new mapboxgl.default.Marker({ element: el, anchor: "bottom", offset: markerOffset })
                .setLngLat(coords)
                .addTo(map),
            );
          });
        }

        map.on("moveend", render);
        detachMoveEnd = () => map.off("moveend", render);
        render();
      },
    );

    // Cleanup MUST be returned directly from the effect body — not from inside
    // the .then() — otherwise React never calls it and listeners pile up across
    // re-runs (each carrying its own stale `index` snapshot, racing each other).
    return () => {
      cancelled = true;
      detachMoveEnd();
    };
  }, [mapReady, mapGeneration, filteredLocated, selectedExpenseId, currency, scrubDate, scrubVisibleExpenseIds]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Trip path (line-trim-offset) ─────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapInstance.current) return;
    const map = mapInstance.current;

    // Remove old layers first (both reference the same source), then the source.
    // Order matters: Mapbox rejects removeSource() while any layer still uses it.
    if (map.getLayer("trip-path"))      map.removeLayer("trip-path");
    if (map.getLayer("trip-path-bg"))   map.removeLayer("trip-path-bg");
    if (map.getLayer("trip-path-glow")) map.removeLayer("trip-path-glow");
    if (map.getSource("trip-path"))     map.removeSource("trip-path");

    if (routeLocations.length < 2) return; // LineString requires ≥2 coords

    // Shares the exact sorted geometry the leading-edge marker walks — see
    // the `routeLocations` memo comment for why these must never diverge.
    const coords = routeLocations.map((loc) => [loc.lng, loc.lat]);

    // Standard's `day`/`night` lightPresets are dramatically different
    // basemap luminances — a single hex pair can't read clearly against
    // both. (First attempt: amber-500/emerald-500 looked great by day,
    // "not visible clearly" by night per user testing.) Keeps the SAME hue
    // identity in both themes (green = traveled, amber = upcoming) but
    // shifts it along the tint/shade axis — brighter, lighter tints for the
    // dark "night" basemap; deeper, richer shades for the bright "day"
    // basemap — exactly mirroring how every Tailwind colour class elsewhere
    // in this app carries a `dark:` counterpart (CLAUDE.md "every colour
    // class needs a dark: counterpart"). Recomputed on every theme toggle —
    // this effect already depends on `mapGeneration`, which increments
    // whenever the theme-driven map recreation completes.
    const isDark = resolvedTheme === "dark";
    const [traveledStart, traveledMid, traveledEnd] = isDark
      ? ["#34D399", "#6EE7B7", "#A7F3D0"] // emerald 400→300→200 — bright against a dark basemap
      : ["#047857", "#059669", "#10B981"]; // emerald 700→600→500 — deep enough to hold up against a bright basemap
    const upcomingColor   = isDark ? "#FCD34D" : "#D97706"; // amber-300 (dark) / amber-600 (light)
    const upcomingOpacity = isDark ? 0.6 : 0.45;
    const glowColor       = isDark ? "#FCD34D" : "#F59E0B";
    const glowOpacity     = isDark ? 0.28 : 0.22;

    map.addSource("trip-path", {
      type:        "geojson",
      lineMetrics: true, // required for line-trim-offset to work
      data: { type: "Feature", geometry: { type: "LineString", coordinates: coords }, properties: {} },
    });
    // `slot: "top"` places these layers above Standard's basemap layers in
    // DRAW ORDER — necessary so the path isn't buried under 3D buildings/
    // labels — but it does NOT exempt them from Standard's scene-wide
    // lighting/fog colour grading: that's a post-process applied across the
    // whole render, "top" slot included, which is why the first attempt
    // still came out a uniform cyan-ish blue wash in the "night" preset
    // (de-saturating + cooling the authored greens and ambers alike toward
    // the same hue — "no diff between paths" all over again, just less black
    // about it). `*-emissive-strength` is Standard's documented escape hatch:
    // it makes a layer "glow with its own authored colour" — self-illuminated,
    // independent of the scene's lighting/fog model — exactly the "visible in
    // all theme layouts" requirement. Set to 1 (fully self-lit) on all three
    // path layers so the green/amber hues render true in BOTH lightPresets.
    //
    // Ambient glow underlay — a wide, heavily-blurred duplicate of the FULL
    // route at low opacity. Gives the path a soft "lit from within" presence
    // against busy map tiles (echoes the pin glow language above) without
    // needing to stay in sync with the reveal animation — it's atmosphere,
    // not signal, so it can simply always show the whole planned route.
    // Sits below `trip-path-bg` so the crisp dashed/solid lines stay legible
    // on top of it. Amber to match `trip-path-bg`'s "road ahead" identity —
    // a warm ambient wash under the whole route, with the green "traveled"
    // overlay popping brightly on top of it where the journey has progressed.
    map.addLayer({
      id:     "trip-path-glow",
      type:   "line",
      slot:   "top",
      source: "trip-path",
      paint:  {
        "line-color":             glowColor,
        "line-width":             16,
        "line-blur":              9,
        "line-opacity":           glowOpacity,
        "line-emissive-strength": 1,
      },
    });
    // Faint dashed background = the full planned route, always visible — i.e.
    // "the road ahead". Muted amber/yellow per the user's explicit ask for a
    // "subtle... muted color for upcoming path", reading clearly as "not yet
    // traveled" against the brighter green overlay that gets drawn on top of
    // it (below) as the journey is revealed. Bumped opacity from the original
    // 0.15 — at the old low-signal cyan tint this layer was nearly invisible,
    // which was *why* "traveled vs upcoming" read as "no difference" before:
    // there was nothing distinct to contrast the revealed overlay against.
    map.addLayer({
      id:     "trip-path-bg",
      type:   "line",
      slot:   "top",
      source: "trip-path",
      paint:  {
        "line-color":             upcomingColor,
        "line-width":             2,
        "line-opacity":           upcomingOpacity,
        "line-dasharray":         [0, 4, 3],
        "line-emissive-strength": 1,
      },
    });
    // Solid "revealed so far" overlay. line-trim-offset ONLY takes visual effect
    // when line-gradient is also set (confirmed against the Mapbox style spec —
    // without it the trim is silently a no-op and the full line always renders,
    // which is exactly what was happening here). line-gradient + line-dasharray
    // is unsupported in Mapbox GL JS, so this overlay is solid; the dashed look
    // lives on the background layer above instead.
    //
    // Drawn LAST (renders on top of `trip-path-bg`'s full-route amber dashes),
    // so the "traveled" stretch visually overwrites the "upcoming" amber with
    // a brighter solid green wherever `line-trim-offset` has revealed it —
    // this layering IS the traveled/upcoming contrast the user asked for, not
    // a separate indicator to track in sync. Emerald gradient — darker/deeper
    // at the trip's start, brightening toward the leading edge — "glowing
    // green" per the user's ask, and reads as "where the journey currently is"
    // without needing a separate leading-edge treatment.
    map.addLayer({
      id:     "trip-path",
      type:   "line",
      slot:   "top",
      source: "trip-path",
      paint:  {
        "line-color":             traveledMid,
        "line-width":             2.5,
        "line-gradient":          [
          "interpolate", ["linear"], ["line-progress"],
          0,    traveledStart, // deeper/dimmer at the trip's start
          0.5,  traveledMid,
          1,    traveledEnd,   // brighter at the leading edge — "where the journey currently is"
        ],
        "line-trim-offset":       [0, 1], // fully hidden = correct start state
        "line-emissive-strength": 1,
      },
    });
  }, [mapReady, mapGeneration, routeLocations, resolvedTheme]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Scrubber → reveal trip path + leading-edge marker (animated) ─────────────
  // Pin visibility is handled by the marker/clustering effect (scrub-filters
  // BEFORE building the supercluster index — see comment there for why).
  //
  // `setPaintProperty` applies instantly — without this animation loop the
  // route line would snap straight to its new revealed length in one frame,
  // which (even alongside the camera's 500ms glide — see the pan effect below)
  // barely registered as motion. Interpolating the trim fraction over
  // PATH_REVEAL_DURATION_MS (longer than the camera pan — see its comment)
  // with an ease-out makes the line visibly "draw itself" toward the new pin —
  // BUT a thin 2.5px line slowly growing is still a weak signal on its own
  // (people notice moving objects far more readily than a creeping endpoint).
  // So a small glowing dot rides the exact tip of the reveal — its position
  // each frame is `pointAlongLine(routeLocations, currentFraction)`, the same
  // fraction driving the trim, so it never visibly detaches from the line.
  useEffect(() => {
    if (!mapReady || !mapInstance.current) return;
    const map = mapInstance.current;
    if (!map.getLayer("trip-path")) return;

    let cancelled = false;

    import("mapbox-gl").then((mapboxgl) => {
      if (cancelled || !mapInstance.current || !mapInstance.current.getLayer("trip-path")) return;

      if (revealAnimFrameRef.current !== null) {
        cancelAnimationFrame(revealAnimFrameRef.current);
        revealAnimFrameRef.current = null;
      }

      // Positions (or hides) the leading-edge dot for a given reveal fraction.
      // No single "current position" exists in the "All" state (scrubDate ===
      // null — the whole route is shown at once, there's no "now") or when
      // there's no line to walk, so the marker is removed rather than parked
      // somewhere meaningless.
      function syncLeadingMarker(fraction: number) {
        if (cancelled || !mapInstance.current) return;
        if (!scrubDate || routeLocations.length < 2) {
          if (leadingMarkerRef.current) {
            leadingMarkerRef.current.remove();
            leadingMarkerRef.current = null;
          }
          return;
        }
        const point = pointAlongLine(routeLocations, fraction);
        if (!point) return;
        if (!leadingMarkerRef.current) {
          const el = document.createElement("div");
          el.className = "route-lead-marker";
          el.innerHTML =
            '<span class="route-lead-marker-pulse"></span><span class="route-lead-marker-dot"></span>';
          leadingMarkerRef.current = new mapboxgl.default.Marker({ element: el, anchor: "center" })
            .setLngLat([point.lng, point.lat])
            .addTo(mapInstance.current);
        } else {
          leadingMarkerRef.current.setLngLat([point.lng, point.lat]);
        }
      }

      // Sub-day stepping: while a multi-stop day is mid-sequence, reveal only
      // through the most-recently-announced stop (`subStepRevealThroughIndex`)
      // rather than the whole day at once — the line "draws itself" in beats,
      // matching the pins/captions appearing one by one. Once the day completes
      // (`dayComplete`), this MUST fall through to the exact same date-based
      // calculation as before — `computeDistanceRevealFractionThroughIndex` is
      // built to land on an identical fraction at that hand-off (see its doc
      // comment), so there's no visible jump when the sequence finishes.
      const target = dayComplete
        ? computeDistanceRevealFraction(scrubDate, routeLocations)
        : computeDistanceRevealFractionThroughIndex(subStepRevealThroughIndex, routeLocations);
      const start  = revealedFractionRef.current;

      // Nothing to animate — e.g. initial mount at day 1 (target === 0 ===
      // start), or a theme-toggle remount where the freshly-recreated layer
      // needs to be restored straight to its already-correct value (no
      // visible "re-draw"). Marker still needs (re)placing/hiding to match.
      if (Math.abs(target - start) < 0.0005) {
        revealedFractionRef.current = target;
        mapInstance.current.setPaintProperty("trip-path", "line-trim-offset", [target, 1]);
        syncLeadingMarker(target);
        return;
      }

      // How much of the route's total length this step newly reveals — NOT
      // the camera-pan duration's concern (that's about framing the new pin),
      // but central to how "far" the line + marker visually travel right now.
      // Scaling the duration by this delta is what makes a short hop glide
      // briskly while a cross-country leap takes long enough to actually
      // register as covering serious ground (see `revealDurationForDelta`).
      const duration  = revealDurationForDelta(target - start);
      const startTime = performance.now();

      function step(now: number) {
        // Re-check on every frame — the map can be torn down (theme toggle,
        // unmount) mid-animation; writing to a destroyed layer throws.
        if (cancelled || !mapInstance.current || !mapInstance.current.getLayer("trip-path")) {
          revealAnimFrameRef.current = null;
          return;
        }
        const elapsed = now - startTime;
        const t       = Math.min(elapsed / duration, 1);
        const value   = lerp(start, target, easeOutCubic(t));
        revealedFractionRef.current = value;
        mapInstance.current.setPaintProperty("trip-path", "line-trim-offset", [value, 1]);
        syncLeadingMarker(value);

        revealAnimFrameRef.current = t < 1 ? requestAnimationFrame(step) : null;
      }
      revealAnimFrameRef.current = requestAnimationFrame(step);
    });

    return () => {
      cancelled = true;
      if (revealAnimFrameRef.current !== null) {
        cancelAnimationFrame(revealAnimFrameRef.current);
        revealAnimFrameRef.current = null;
      }
    };
  }, [mapReady, mapGeneration, scrubDate, routeLocations, dayComplete, subStepRevealThroughIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Scrubber → pan map toward the day's pin(s) ───────────────────────────────
  // Without this, stepping the scrubber can reveal a pin outside the current
  // viewport and the user has to manually drag the map to find it. Ease the
  // view toward the centroid of that day's expenses (or the most recent prior
  // one, if nothing is dated exactly on the scrubbed day) on every step.
  // Reaching "All" (scrubDate === null, the final forward step past the last
  // day) zooms back out to fit every visible pin — mirroring the initial
  // fitBounds — rather than leaving the map looking "stuck" on the last spot.
  useEffect(() => {
    if (!mapReady || !mapInstance.current) return;
    const map = mapInstance.current;

    if (!scrubDate) {
      if (filteredLocated.length === 0) return;
      import("mapbox-gl").then((mapboxgl) => {
        const bounds = new mapboxgl.default.LngLatBounds();
        filteredLocated.forEach((e) => {
          const loc = parseExpenseLocation(e.location)!;
          bounds.extend([loc.lng, loc.lat]);
        });
        map.fitBounds(bounds, { padding: 48, maxZoom: 13, duration: 500, pitch: cinemaOpen ? PITCH_CINEMA : 0 });
      });
      return;
    }

    // Explicit `pitch` on EVERY camera transition below — Mapbox's
    // `fitBounds`/`easeTo` silently reset pitch to 0 when the option is
    // omitted (cameraForBounds defaults bearing/pitch to 0 unless told
    // otherwise). Without this, the cinema player's 52° tilt (set once on
    // entry by the pitch-lifecycle effect) would be flattened back to
    // flat-map on the very first day-scrub pan — which is exactly why only
    // day 1 looked "3D" and every subsequent stop looked flat.
    //
    // `scrubDate` is only ever non-null while the cinema player is open (the
    // card/launcher view always sits at "All" — see `scrubDate`'s initial
    // state) — so every branch below this point always runs WITH the cinema
    // player's close-up zoom; no `cinemaOpen ? … : …` ternary needed on the
    // per-day branches (only the "All" branch above needs one, since that
    // state is reachable from both the card view and the cinema overview).
    const pitch = cinemaOpen ? PITCH_CINEMA : 0;

    if (currentDayStops.length === 0) {
      // No located expenses today (a "rest day" gap, or a future/past day with
      // nothing logged) — hold on the most recent prior location rather than
      // leaving the camera looking "stuck" on yesterday's full-day frame.
      const target = filteredLocated
        .filter((e) => e.expenseDate <= scrubDate)
        .sort((a, b) => b.expenseDate.localeCompare(a.expenseDate))
        .slice(0, 1);
      if (target.length === 0) return;
      const { lng, lat } = parseExpenseLocation(target[0].location)!;
      map.easeTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), ZOOM_CINEMA_CLOSEUP), duration: 500, pitch });
      return;
    }

    if (currentDayStops.length === 1 || dayComplete) {
      // Single-stop day (byte-identical to the pre-sub-step behaviour — no
      // sequencing was ever needed here), OR a multi-stop day's one-by-one
      // sequence has just finished: zoom OUT to frame every distinct stop
      // together — the familiar "here's the whole cluster" landing that caps
      // off the sequence, exactly like the old single-jump behaviour ended.
      if (currentDayStops.length > 1) {
        const reps   = currentDayStops.map((stop) => stop[0]); // one representative coordinate per distinct stop
        const spread = isSpreadOut(reps);
        import("mapbox-gl").then((mapboxgl) => {
          const bounds = new mapboxgl.default.LngLatBounds();
          reps.forEach((l) => bounds.extend([l.lng, l.lat]));
          // Multi-stop days always fitBounds rather than ease toward the
          // centroid. A plain ease-to-midpoint has two failure modes:
          //   - Spread out (Chennai lunch + Delhi dinner, ~1750km): the
          //     average lands on a meaningless midpoint over open country.
          //   - Close together (T. Nagar + Marina, ~10km): panning alone
          //     leaves the pins merged in a single cluster bubble instead of
          //     "blooming" into individual rich chips. fitBounds computes a
          //     zoom that naturally clears Supercluster's clustering radius.
          map.fitBounds(bounds, {
            padding: spread ? 64 : 80,
            maxZoom:  spread ? 12 : 15,
            duration: 500,
            pitch,
          });
        });
      } else {
        const { lng, lat } = currentDayStops[0][0];
        map.easeTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), ZOOM_CINEMA_CLOSEUP), duration: 500, pitch });
      }
      return;
    }

    if (scrubSubStep === 0) {
      // Just arrived on a multi-stop day — the sequencer's opening "nothing
      // revealed yet" tick (mirrors the caption's day-aggregate placeholder
      // for this same beat). No stop has appeared, so there's nothing to
      // frame a close-up on yet (currentDayStops[-1] is undefined): hold the
      // camera where it is. The first close-up arrival fires the instant
      // stop 1 reveals, one tick from now.
      return;
    }

    // Mid-sequence on a multi-stop day — frame ONLY the just-revealed stop,
    // at the moderate `ZOOM_CINEMA_MULTISTOP_WALK` level (NOT the tight
    // single-place close-up — see its declaration for why). This is the
    // camera half of "show every stop one by one rather than dumping the
    // whole cluster at once": each beat gets its own arrival (caption reads,
    // pin drops in) before the final fitBounds above zooms to tie them
    // together as a single "here's the whole day" view.
    const { lng, lat } = currentDayStops[scrubSubStep - 1][0];
    map.easeTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), ZOOM_CINEMA_MULTISTOP_WALK), duration: 500, pitch });
  }, [mapReady, mapGeneration, scrubDate, filteredLocated, cinemaOpen, currentDayStops, dayComplete, scrubSubStep]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Find the selected expense ─────────────────────────────────────────────────
  const selectedExpense = selectedExpenseId
    ? expenses.find((e) => e.id === selectedExpenseId) ?? null
    : null;

  // ── Scrubber navigation helpers ───────────────────────────────────────────────
  const scrubLabel = scrubDate
    ? (() => {
        try {
          const d    = new Date(scrubDate + "T00:00:00");
          const day  = groupStartDate
            ? Math.floor((d.getTime() - new Date(groupStartDate + "T00:00:00").getTime()) / 86400000) + 1
            : null;
          const dateLabel = format(d, "MMM d");
          return day !== null && groupStartDate && groupEndDate
            ? `${dateLabel} · Day ${day}`
            : dateLabel;
        } catch {
          return scrubDate;
        }
      })()
    : "All";

  // True only once autoplay has actually finished — drives the epilogue card
  // and the central button's RotateCcw icon. See `autoplayComplete`'s
  // declaration for why this is NOT simply `scrubDate === null`.
  const isAtEnd = cinemaOpen && autoplayComplete;

  // ── Cinema caption — per-stop mid-sequence, day-aggregate once complete ─────
  // "Show every stop one by one" extends to the milestone caption too: a
  // 3-stop day no longer jumps straight to "₹5.3k across 3 stops" — each stop
  // gets its own beat ("🍽 Lunch near Marina") before the day-aggregate caption
  // takes over as the closing summary, mirroring the camera's per-stop arrivals
  // then final zoom-out (see the day-scrub pan effect just above).
  type CinemaCaption = {
    key: string; label: string; emoji: string;
    description: string; amountLine: string;
    payerLine: string | null;
  };
  const cinemaCaption: CinemaCaption | null = useMemo(() => {
    if (!scrubDate) return null;
    // `scrubSubStep === 0` is the brief "arrived on this day, nothing
    // revealed yet" tick the sequencer effect always starts at — there is no
    // "just-revealed" stop to caption yet (currentDayStops[-1] is undefined).
    // Fall through to the day-aggregate caption as a placeholder for that
    // one beat; the per-stop captions take over the instant stop 1 reveals.
    if (!dayComplete && currentDayStops.length > 1 && scrubSubStep > 0) {
      const stop = currentDayStops[scrubSubStep - 1];
      const top = stop.reduce((best, loc) =>
        Number(loc.expense.amount) > Number(best.expense.amount) ? loc : best, stop[0]);
      const stopTotal = stop.reduce((sum, loc) => sum + Number(loc.expense.amount), 0);
      return {
        key:         `${scrubDate}-stop-${scrubSubStep}`,
        label:       `${scrubLabel} · stop ${scrubSubStep} of ${currentDayStops.length}`,
        emoji:       getCategoryEmoji(top.expense.category),
        description: truncateAtWord(top.expense.description, 42),
        amountLine:  stop.length > 1
          ? `${compactAmount(stopTotal, currency)} · ${stop.length} expenses here`
          : compactAmount(stopTotal, currency),
        payerLine:   getPayerNames(stop.map((l) => l.expense), members),
      };
    }
    const dayAgg = dayCaptions.get(scrubDate);
    if (!dayAgg) return null;
    return {
      key:         scrubDate,
      label:       scrubLabel,
      emoji:       dayAgg.topEmoji,
      description: truncateAtWord(dayAgg.topDescription, 42),
      amountLine:  `${compactAmount(dayAgg.total, currency)} across ${dayAgg.count} ${dayAgg.count === 1 ? "stop" : "stops"}`,
      payerLine:   getPayerNames(filteredLocated.filter((e) => e.expenseDate === scrubDate), members),
    };
  }, [scrubDate, dayComplete, currentDayStops, scrubSubStep, scrubLabel, dayCaptions, currency, members, filteredLocated]);

  // ── Cinema player controls ──────────────────────────────────────────────────
  // `scrubToPosition` is the single low-level "jump to this exact stop"
  // primitive — every manual navigation (segment tap, drag, day chevrons,
  // goToDay1) funnels through it. Same-day jumps (e.g. dragging within the
  // currently-scrubbed day) set `scrubSubStep` directly, because `scrubDate`
  // wouldn't change and the render-time reset block (which `manualSubStepRef`
  // normally feeds) never re-fires when React bails out on an identical
  // state value. Cross-day jumps go through `manualSubStepRef` instead — see
  // its declaration and the reset block above.
  function scrubToPosition(date: string, stopIdx: number) {
    setIsPlaying(false);
    setAutoplayComplete(false);
    if (date === scrubDate) {
      setScrubSubStep(stopIdx + 1);
      return;
    }
    manualSubStepRef.current = stopIdx + 1;
    setScrubDate(date);
  }

  // Jumps straight to a day's "dayComplete" state — every stop already
  // revealed, no walk. Used by the day chevrons and by `goToDay1`.
  function jumpToDayComplete(date: string) {
    const stopsCount = allDayStops.find((d) => d.date === date)?.stops.length ?? 0;
    scrubToPosition(date, Math.max(stopsCount - 1, 0));
  }

  function goToDay1() {
    const firstDate = scrubDates[0];
    if (!firstDate) return;
    jumpToDayComplete(firstDate);
    setEstablishingShot(false);
  }

  // Opens the cinema player. Shown for the first few opens per group (the
  // establishing shot — full route + trip name/dates/total); after that it
  // skips straight to the Day 1/dayComplete-paused landing. `groupId` keys
  // the "seen N times" counter so each trip's intro plays out independently.
  function openCinema() {
    setCinemaOpen(true);
    setIsPlaying(false);
    setAutoplayComplete(false);
    setScrubDate(null); // "All" — the full route shown during the establishing shot
    if (!groupId) { goToDay1(); return; } // no stable id to key the intro count by — skip straight in
    const key = `clear_map_intro_count_${groupId}`;
    const count = parseInt(localStorage.getItem(key) ?? "0", 10);
    if (count < MAP_INTRO_MAX_VIEWS) {
      setEstablishingShot(true);
      localStorage.setItem(key, String(count + 1));
    } else {
      goToDay1();
    }
  }

  function exitCinema() {
    if (autoplayTimerRef.current) {
      clearTimeout(autoplayTimerRef.current);
      autoplayTimerRef.current = null;
    }
    setIsPlaying(false);
    setCinemaOpen(false);
    setEstablishingShot(false);
    setAutoplayComplete(false);
    setScrubDate(null);
  }

  // Pressing play just flips `isPlaying` — the autoplay effect already
  // advances correctly from ANY `dayComplete` day, including the last one
  // (straight through to "All" + the epilogue), so no special "sitting on
  // the last day" case is needed here. An earlier version restarted from
  // Day 1 whenever `scrubIdx` was at the last day before resuming — a
  // leftover from the pre-cinema-player design (no dedicated day chevrons
  // existed then) that actively broke "jump to the last day, press play to
  // trigger the ending" once chevrons made that a normal thing to do
  // (confirmed in testing: it silently replayed the whole trip from the top
  // instead of advancing straight to the epilogue).
  function togglePlayback() {
    hapticLight();
    if (isAtEnd) { openCinema(); return; } // epilogue showing — full replay, from the establishing shot
    setIsPlaying((p) => !p);
  }

  // Day chevrons — whole-day steps, INSTANT (jump to dayComplete), in either
  // direction. Disabled state for each button is computed in the render below.
  function stepDay(delta: 1 | -1) {
    const idx = scrubDate ? scrubDates.indexOf(scrubDate) : scrubDates.length;
    const nextIdx = idx + delta;
    if (nextIdx < 0 || nextIdx >= scrubDates.length) return;
    hapticLight();
    jumpToDayComplete(scrubDates[nextIdx]);
  }

  // ⊞ Overview — shows the full route, deliberately NOT the epilogue (that's
  // reserved for autoplay actually finishing — see `autoplayComplete`).
  function showOverview() {
    setIsPlaying(false);
    setAutoplayComplete(false);
    setScrubDate(null);
  }

  // Escape key + Android/browser back-button dismissal — hand-rolled rather
  // than the shared `useSheetDismiss` hook. `ExpenseDetailSheet` (opened from
  // a pin tap WHILE cinema is open) uses THAT SAME hook internally for its
  // own Escape/back handling — two independent instances both listening to
  // the one global `popstate` event, neither aware of the other's pushed
  // history entry, cross-talk: closing (or, in dev Strict Mode, the
  // double-invoked mount/cleanup/mount of) the INNER sheet's effect pops ITS
  // entry, and the resulting popstate ALSO reaches cinema's listener, which —
  // seeing its own pop-guard still false — treats it as a real back press and
  // exits the whole cinema. That's exactly the "detail sheet briefly appears,
  // then cinema exits" bug found in testing. Fix: only react to Escape/
  // popstate when NO nested sheet is currently open (`selectedExpenseIdRef`);
  // when one is, let IT consume the event and stay dormant — mirroring how
  // `useFocusTrap`'s stack already defers to the innermost trap.
  const selectedExpenseIdRef = useRef(selectedExpenseId);
  selectedExpenseIdRef.current = selectedExpenseId;
  const cinemaPoppingRef = useRef(false); // true while OUR OWN go(-1) (from exitCinema) is in flight

  useEffect(() => {
    if (!cinemaOpen) return;
    window.history.pushState({ clearCinema: true }, "");

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !selectedExpenseIdRef.current) exitCinema();
    }
    function onPopState() {
      if (cinemaPoppingRef.current) { cinemaPoppingRef.current = false; return; }
      if (selectedExpenseIdRef.current) return; // a nested sheet owns this pop
      exitCinema();
    }
    document.addEventListener("keydown", onKey);
    window.addEventListener("popstate", onPopState);

    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("popstate", onPopState);
      if (window.history.state?.clearCinema) {
        cinemaPoppingRef.current = true;
        window.history.go(-1);
        // Safety: if no new listener mounts to consume the resulting
        // popstate (e.g. cinema closed and wasn't reopened), reset the flag
        // so a future open doesn't silently swallow its first back press.
        setTimeout(() => { cinemaPoppingRef.current = false; }, 100);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cinemaOpen]);

  useFocusTrap(cinemaOpen, cinemaPanelRef);

  // Space (play/pause) + ←/→ (day step) — Escape is already handled above,
  // so this effect deliberately leaves it alone. Suppressed during the
  // establishing shot (tap-anywhere-to-skip owns input then, not playback
  // controls for a player bar that isn't even rendered).
  useEffect(() => {
    if (!cinemaOpen || establishingShot) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === " ") { e.preventDefault(); togglePlayback(); }
      if (e.key === "ArrowLeft") stepDay(-1);
      if (e.key === "ArrowRight") stepDay(1);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cinemaOpen, establishingShot, isPlaying, scrubDate, scrubDates]);

  // Freezes user-driven map gestures while autoplay is running — the camera
  // is choreographed by the pan effect above; a stray drag/pinch mid-sequence
  // would fight it. Programmatic camera moves (easeTo/fitBounds) are
  // unaffected — only USER input gestures are gated by these toggles.
  useEffect(() => {
    if (!mapReady || !mapInstance.current) return;
    const map = mapInstance.current;
    if (isPlaying) {
      map.dragPan.disable();
      map.scrollZoom.disable();
      map.touchZoomRotate.disable();
      map.doubleClickZoom.disable();
    } else {
      map.dragPan.enable();
      map.scrollZoom.enable();
      map.touchZoomRotate.enable();
      map.doubleClickZoom.enable();
    }
  }, [isPlaying, mapReady, mapGeneration]);

  // Tilt the camera into a "3D-ish" cinematic perspective on entry, flatten it
  // back on exit — and resize the map's canvas to match its new fixed-fullscreen
  // (or restored card) dimensions. `requestAnimationFrame` lets the CSS layout
  // settle first; calling `resize()` before the container's new size is committed
  // measures the PRE-transition box and leaves Mapbox's canvas mis-sized/blurry.
  //
  // `show3dObjects` is flipped alongside the pitch — buildings/landmarks/trees
  // rise into relief exactly when there's a tilted camera to appreciate them
  // from (at the regular flat top-down pitch they'd just look like coloured
  // rooftops, plus extra render cost for no visual gain). This is the
  // "satellite 3D" wow asked for, WITHOUT a style swap: Standard already ships
  // 3D buildings/landmarks as a config toggle on the SAME style/tiles already
  // loaded — no reload, no flicker, no loss of the place labels that make each
  // cinema close-up legible (a literal satellite swap would cost exactly that
  // legibility at the close zooms the cinema player lives at — see the design
  // discussion this was weighed against).
  useEffect(() => {
    if (!mapReady || !mapInstance.current) return;
    const map = mapInstance.current;
    const raf = requestAnimationFrame(() => {
      map.resize();
      map.easeTo({ pitch: cinemaOpen ? PITCH_CINEMA : 0, duration: 700 });
      map.setConfigProperty("basemap", "show3dObjects", cinemaOpen);
    });
    return () => cancelAnimationFrame(raf);
  }, [cinemaOpen, mapReady, mapGeneration]); // eslint-disable-line react-hooks/exhaustive-deps

  // Autoplay loop — advances the scrubber one day per tick while playing.
  // Reuses the EXACT same `setScrubDate` path as manual scrubbing, so the
  // reveal animation, camera pan, pin filtering, and captions all stay
  // perfectly in sync without any cinema-specific rendering branch. Reaching
  // the end lands on "All" + `autoplayComplete` (the epilogue's cue) and
  // stops — `togglePlayback`/`EpilogueCard.onReplay` restart from the top.
  //
  // GATED on `dayComplete`: a multi-stop day now plays out its own one-by-one
  // sequence (see the sub-step sequencer effect) before it's "done" — without
  // this gate, autoplay would race ahead mid-sequence and land on tomorrow
  // before today finished revealing, exactly the "jumps past Day 4" behaviour
  // that prompted this feature. Each `scrubSubStep` tick re-fires this effect;
  // it simply no-ops (no timer scheduled) until the day completes, then the
  // normal per-day pacing takes over for the advance.
  useEffect(() => {
    if (!cinemaOpen || !isPlaying || !dayComplete) return;
    autoplayTimerRef.current = setTimeout(() => {
      const idx     = scrubDate ? scrubDates.indexOf(scrubDate) : scrubDates.length;
      const nextIdx = idx + 1;
      if (nextIdx >= scrubDates.length) {
        setScrubDate(null);   // "All" — the finished, full-route credits view
        setIsPlaying(false);
        setAutoplayComplete(true);
      } else {
        hapticLight();
        setScrubDate(scrubDates[nextIdx]);
      }
    }, AUTOPLAY_STEP_MS);
    return () => {
      if (autoplayTimerRef.current) {
        clearTimeout(autoplayTimerRef.current);
        autoplayTimerRef.current = null;
      }
    };
  }, [cinemaOpen, isPlaying, scrubDate, scrubDates, dayComplete]);

  if (allLocated.length === 0) return null;

  // At least 2 stops are needed for a "journey" — a single pin has nothing to
  // walk between (matches the "1 located expense → no Replay Journey button"
  // requirement). Filtered, not all-time — the button should reflect what's
  // actually about to play under the active filters.
  const canReplay = filteredLocated.length >= 2;
  const cinemaPositionLabel = scrubDate
    ? `Day ${scrubDates.indexOf(scrubDate) + 1}/${scrubDates.length}`
    : "Overview";

  return (
    <div className="relative flex flex-col">
      {/* ── Discovery banner ────────────────────────────────────────────────── */}
      {!hasSeenMapHint && (
        <div className="mb-3 flex items-start gap-3 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200/60 dark:border-cyan-800/50 px-4 py-3">
          <MapPin className="w-4 h-4 text-cyan-600 dark:text-cyan-400 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-cyan-800 dark:text-cyan-200">
              Expenses with location data appear as pins on the map
            </p>
            <p className="text-xs text-cyan-600 dark:text-cyan-400 mt-0.5">
              Tap ▶ Replay Journey to relive your trip day by day
            </p>
          </div>
          <button
            type="button"
            onClick={dismissHint}
            className="text-xs text-cyan-500 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-200 shrink-0"
          >
            Got it
          </button>
        </div>
      )}

      {/* ── Map container ────────────────────────────────────────────────────── */}
      {/* Glass frame in the card/launcher state — translucent border + ambient
          cyan shadow, echoing the `.glass` card / TripCard `shadow-cyan-500/15`
          language so the map reads as "part of the experience". In the cinema
          player the SAME container expands to fill the viewport via
          `position: fixed` — no portal, no second Mapbox instance, just CSS +
          `map.resize()` (see the pitch-lifecycle effect). Reusing the live map
          avoids the canvas-context issues that come with detaching/
          reattaching WebGL. */}
      <div
        ref={cinemaPanelRef}
        role={cinemaOpen ? "dialog" : undefined}
        aria-modal={cinemaOpen ? true : undefined}
        aria-label={cinemaOpen ? "Trip replay" : undefined}
        tabIndex={cinemaOpen ? -1 : undefined}
        style={cinemaOpen ? { outline: "none" } : undefined}
        className={
          cinemaOpen
            ? "map-cinema-container-cinema fixed inset-0 z-[100] bg-black"
            : "map-cinema-container-card relative p-1.5 glass shadow-lg shadow-cyan-500/15 dark:shadow-cyan-950/40"
        }
      >
        <div
          className={
            cinemaOpen
              ? "relative w-full h-full"
              : "relative h-[360px] md:h-[480px] rounded-2xl overflow-hidden shadow-inner"
          }
        >
          <div
            ref={mapContainerRef}
            className="w-full h-full"
            onClick={() => { if (isPlaying) setIsPlaying(false); }}
          />

          {/* Empty state overlay */}
          {filteredLocated.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-slate-900/80 rounded-2xl">
              <div className="text-center p-6">
                <MapPin className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  No located expenses match this filter
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  Remove filters to see all pinned expenses
                </p>
              </div>
            </div>
          )}

          {/* Loading state */}
          {!mapReady && filteredLocated.length > 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-2xl">
              <div className="flex flex-col items-center gap-2">
                <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-slate-500">Loading map…</p>
              </div>
            </div>
          )}

          {/* Tile-load error banner — Mapbox can fire "load" even when the
              basemap tiles themselves are being rejected (auth/URL-restriction,
              rate-limit, or a network failure), so this is intentionally NOT
              gated on `!mapReady` — it can show alongside a "loaded" map that's
              actually blank, not just during the loading spinner above.
              `pointer-events-none` so it never blocks the Replay Journey tap
              target underneath. Generic copy — this reaches every visitor, not
              just admins, so no token/HTTP-status detail here; see the
              console.error in the "error" listener for that. */}
          {mapTilesError && (
            <div className="absolute top-2 left-2 right-2 z-10 flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50/95 dark:bg-amber-900/90 border border-amber-200 dark:border-amber-800/60 shadow-sm pointer-events-none">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Map couldn't fully load. Check your connection and try again.
              </p>
            </div>
          )}

          {/* ── Card launcher — "▶ Replay Journey" over the resting map ──────── */}
          {!cinemaOpen && canReplay && (
            <button
              type="button"
              onClick={openCinema}
              className="absolute inset-0 flex flex-col items-center justify-center gap-2 group"
            >
              <div className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white group-hover:bg-black/55 transition-all shadow-lg">
                <Play className="w-4 h-4 fill-current" />
                <span style={{ fontFamily: "var(--font-fraunces)" }}>Replay Journey</span>
              </div>
              <p className="text-xs text-white/60">Replay day by day</p>
            </button>
          )}

          {/* ── Cinema player chrome ──────────────────────────────────────────── */}
          {/* `AnimatePresence` here is what makes `EstablishingShot`'s `exit`
              animation actually fire — without a wrapper, React just rips it
              out of the DOM the instant `establishingShot` flips false (no
              fade, no "beat" — read as a flicker in testing). */}
          {cinemaOpen && (
            <AnimatePresence>
              {establishingShot && (
                <EstablishingShot
                  key="establishing-shot"
                  groupName={groupName}
                  groupStartDate={groupStartDate}
                  groupEndDate={groupEndDate}
                  totalSpend={filteredLocated.reduce((s, e) => s + Number(e.amount), 0)}
                  currency={currency}
                  onDismiss={goToDay1}
                />
              )}
            </AnimatePresence>
          )}
          {cinemaOpen && !establishingShot && (
            <>
              {/* Top gradient scrim — keeps the close button + caption legible
                  over busy tiles without a hard bar (matches the "cinematic",
                  screen-recordable feel). */}
              <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/40 to-transparent pointer-events-none" />
              <button
                type="button"
                onClick={exitCinema}
                aria-label="Exit trip replay"
                className="absolute top-[max(1rem,env(safe-area-inset-top))] right-4 z-20 w-10 h-10 flex items-center justify-center rounded-full bg-white/15 backdrop-blur-sm border border-white/25 text-white hover:bg-white/25 active:scale-95 transition-all"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Central play button — appears whenever paused (initial Day 1
                  landing, map-tap pause, pin-tap pause, manual navigation) so
                  resuming is always obvious with a big, dedicated tap target —
                  the familiar YouTube/Netflix "tap to pause, big center play
                  icon to resume" convention. Tapping elsewhere on the map
                  while paused deliberately does nothing else (no symmetric
                  tap-anywhere-to-resume) — this button is the one way back in.
                  Hidden during the epilogue, which has its own restart CTAs.
                  Outer wrapper is `pointer-events-none` (purely for centering)
                  so only the circle itself — not the full-screen layout box —
                  is ever clickable. */}
              <AnimatePresence>
                {!isPlaying && !isAtEnd && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                    <motion.button
                      type="button"
                      onClick={togglePlayback}
                      aria-label="Play replay"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.2 }}
                      className="pointer-events-auto w-20 h-20 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-md border border-white/25 text-white shadow-lg hover:bg-black/55 active:scale-95 transition-all"
                    >
                      <Play className="w-8 h-8 fill-current ml-1" />
                    </motion.button>
                  </div>
                )}
              </AnimatePresence>

              {/* Milestone caption — the "story" payoff, now at the TOP (the
                  bottom is the player bar's territory). Cross-fades stop to
                  stop (mid-sequence) and day to day, reusing `cinemaCaption`
                  so the highlighted moment always matches what the route just
                  traced to and which pin just dropped in. Payer line names
                  who paid for that stop/day. */}
              <AnimatePresence mode="wait">
                {cinemaCaption && (
                  <motion.div
                    key={cinemaCaption.key}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="absolute left-4 right-4 z-20 top-[max(3.5rem,calc(1rem+env(safe-area-inset-top)))] text-center px-5 py-3 rounded-2xl bg-black/45 backdrop-blur-md border border-white/15 text-white shadow-lg"
                  >
                    <p className="text-[11px] font-medium tracking-wide text-cyan-300 uppercase">
                      {cinemaCaption.label}
                    </p>
                    <p className="mt-0.5 text-sm font-semibold" style={{ fontFamily: "var(--font-fraunces)" }}>
                      {cinemaCaption.emoji} {cinemaCaption.description}
                    </p>
                    <p className="mt-0.5 text-xs text-white/70">
                      {cinemaCaption.amountLine}
                    </p>
                    {cinemaCaption.payerLine && (
                      <p className="mt-0.5 text-xs text-white/50">{cinemaCaption.payerLine}</p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {isAtEnd && (
                <EpilogueCard
                  scrubDates={scrubDates}
                  filteredLocated={filteredLocated}
                  currency={currency}
                  dayCaptions={dayCaptions}
                  onReplay={openCinema}
                  onClose={exitCinema}
                />
              )}

              <CinemaPlayerBar
                scrubDates={scrubDates}
                allDayStops={allDayStops}
                scrubPositions={scrubPositions}
                scrubDate={scrubDate}
                scrubSubStep={scrubSubStep}
                dayComplete={dayComplete}
                isPlaying={isPlaying}
                isAtEnd={isAtEnd}
                positionLabel={cinemaPositionLabel}
                onTogglePlay={togglePlayback}
                onStepBack={() => stepDay(-1)}
                onStepForward={() => stepDay(1)}
                onScrubToPosition={scrubToPosition}
                onOverview={showOverview}
              />
            </>
          )}
        </div>
      </div>

      {/* ── Pin legend — card view only; cinema covers the whole viewport ────── */}
      {!cinemaOpen && (
        <div className="mt-2 flex items-center gap-3 px-0.5">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-full bg-cyan-500 shrink-0" />
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Expense</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-full bg-cyan-500/40 ring-1 ring-cyan-500 shrink-0" />
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Cluster (tap to zoom)</span>
          </div>
          {filteredLocated.length > 0 && (
            <span className="ml-auto text-[11px] text-slate-400 dark:text-slate-500">
              {filteredLocated.length} pin{filteredLocated.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      )}

      {/* ── Expense detail sheet ─────────────────────────────────────────────── */}
      {selectedExpense && (
        <ExpenseDetailSheet
          expense={selectedExpense}
          members={members}
          currentUserId={currentUserId}
          currentMemberId={currentMemberId ?? ""}
          isAdmin={isAdmin}
          isOpen={!!selectedExpenseId}
          onClose={() => setSelectedExpenseId(null)}
          interactionCount={interactionCounts?.[selectedExpense.id]}
          // Cinema sits at z-[100] — clear it so a pin-tapped detail sheet
          // (opened while cinema is open) is actually visible, not hidden
          // behind the full-screen overlay. See the prop's doc comment.
          zIndexClass={cinemaOpen ? "z-[110]" : undefined}
        />
      )}
    </div>
  );
}

// ── EstablishingShot ──────────────────────────────────────────────────────────
// Opening beat of the cinema player — full route, trip name/dates/total —
// shown for the first few opens per group (see `openCinema`/`MAP_INTRO_MAX_VIEWS`).
// Tap anywhere (or wait `ESTABLISHING_SHOT_MS`) to advance to Day 1.

interface EstablishingShotProps {
  groupName: string;
  groupStartDate?: string | null;
  groupEndDate?: string | null;
  totalSpend: number;
  currency: string;
  onDismiss: () => void;
}

function EstablishingShot({
  groupName, groupStartDate, groupEndDate, totalSpend, currency, onDismiss,
}: EstablishingShotProps) {
  // `onDismiss` (effectively `goToDay1`) is a fresh closure every render of
  // the parent — captured via a ref, NOT as the effect's dependency, so the
  // auto-advance timer is set exactly ONCE on mount regardless of how often
  // the parent re-renders while this is showing (a dependency here would
  // reset the timer on every such render, risking it never firing).
  const onDismissRef = useRef(onDismiss);
  useEffect(() => { onDismissRef.current = onDismiss; });
  useEffect(() => {
    const t = setTimeout(() => onDismissRef.current(), ESTABLISHING_SHOT_MS);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const dateRange = groupStartDate && groupEndDate
    ? formatEstablishingDateRange(groupStartDate, groupEndDate)
    : "";

  return (
    <motion.div
      className="absolute inset-0 z-30 flex items-center justify-center"
      onClick={onDismiss}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* The card pops (scale + fade), not just the backdrop fading — a plain
          opacity fade alone read as "barely there" in testing. */}
      <motion.div
        className="text-center text-white px-6 py-4 rounded-2xl bg-black/45 backdrop-blur-md border border-white/15"
        initial={{ opacity: 0, scale: 0.92, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        <p style={{ fontFamily: "var(--font-fraunces)" }} className="text-2xl">
          {groupName}
        </p>
        {dateRange && <p className="text-sm text-white/70 mt-1">{dateRange}</p>}
        <p className="text-lg font-semibold mt-1">{formatCurrency(totalSpend, currency)}</p>
        <p className="text-xs text-white/40 mt-3">Tap to skip</p>
      </motion.div>
    </motion.div>
  );
}

// ── CinemaPlayerBar ────────────────────────────────────────────────────────────
// Bottom media-player bar for the cinema overlay: progress (segmented day bar
// for ≤10-day trips, range scrubber otherwise) + step chevrons + play/pause +
// day counter + ⊞ Overview.

interface CinemaPlayerBarProps {
  scrubDates: string[];
  allDayStops: DayStops[];
  scrubPositions: { date: string; stopIdx: number }[];
  scrubDate: string | null;
  scrubSubStep: number;
  dayComplete: boolean;
  isPlaying: boolean;
  isAtEnd: boolean;
  positionLabel: string;
  onTogglePlay: () => void;
  onStepBack: () => void;
  onStepForward: () => void;
  onScrubToPosition: (date: string, stopIdx: number) => void;
  onOverview: () => void;
}

function CinemaPlayerBar({
  scrubDates, allDayStops, scrubPositions, scrubDate, scrubSubStep, dayComplete,
  isPlaying, isAtEnd, positionLabel,
  onTogglePlay, onStepBack, onStepForward, onScrubToPosition, onOverview,
}: CinemaPlayerBarProps) {
  const useSegmented = scrubDates.length <= 10;
  const scrubIdx = scrubDate ? scrubDates.indexOf(scrubDate) : scrubDates.length;
  const positionIdx = scrubDate
    ? Math.max(
        scrubPositions.findIndex((p) => p.date === scrubDate && p.stopIdx === Math.max(scrubSubStep - 1, 0)),
        0,
      )
    : scrubPositions.length;

  return (
    <div className="absolute inset-x-0 bottom-0 z-20 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 bg-gradient-to-t from-black/60 to-transparent">
      {/* Progress bar */}
      <div className="flex items-center gap-1 mb-3">
        {useSegmented ? (
          allDayStops.map(({ date, stops }) => {
            const isCurrent = scrubDate === date;
            const isPast = scrubDate ? date < scrubDate : false;
            const isDone = isCurrent && dayComplete;
            return (
              <button
                key={date}
                type="button"
                onClick={() => onScrubToPosition(date, Math.max(stops.length - 1, 0))}
                aria-label={`Jump to ${date}`}
                className={`relative flex-1 h-1.5 rounded-full overflow-hidden ${isPast || isDone ? "bg-emerald-400" : "bg-white/20"}`}
              >
                {isCurrent && !dayComplete && (
                  <div className="cinema-day-segment-active absolute inset-0 rounded-full" />
                )}
                {/* Sub-tick dividers — one per stop boundary within a multi-stop day */}
                {stops.length > 1 && stops.slice(1).map((_, i) => (
                  <div
                    key={i}
                    className="absolute top-0 bottom-0 w-px bg-black/30"
                    style={{ left: `${((i + 1) / stops.length) * 100}%` }}
                  />
                ))}
              </button>
            );
          })
        ) : (
          <input
            type="range"
            min={0}
            max={scrubPositions.length}
            value={Math.min(positionIdx, scrubPositions.length)}
            onChange={(e) => {
              const idx = Number(e.target.value);
              const pos = scrubPositions[idx];
              if (pos) onScrubToPosition(pos.date, pos.stopIdx);
              else onOverview();
            }}
            className="map-scrubber relative z-10 flex-1"
            style={{ "--scrub-pct": `${(Math.min(positionIdx, scrubPositions.length) / Math.max(scrubPositions.length, 1)) * 100}%` } as React.CSSProperties}
          />
        )}
      </div>

      {/* Controls row — the day label and ⊞ Overview button anchor the two
          ends (fixed widths, never grow), while the ◀ ▶/⏸ ▶ playback cluster
          is centered in the REMAINING space via its own `flex-1 justify-
          center` wrapper. A single shared `flex-1` on the label alone (the
          earlier version) let it eat all the slack itself, shoving the whole
          button cluster to the far left and stranding ⊞ alone at the screen's
          right edge on a wide viewport — easy to miss, looked disconnected
          from the rest of the controls (confirmed in testing). */}
      <div className="flex items-center gap-3">
        <span className="w-20 shrink-0 text-xs text-white/70 tabular-nums">{positionLabel}</span>

        <div className="flex-1 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={onStepBack}
            disabled={scrubIdx <= 0}
            aria-label="Previous day"
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 text-white disabled:opacity-30 disabled:pointer-events-none hover:bg-white/20 active:scale-95 transition-all shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onTogglePlay}
            aria-label={isPlaying ? "Pause replay" : isAtEnd ? "Replay trip" : "Play replay"}
            className="w-12 h-12 flex items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-teal-500 text-white shadow-lg shadow-cyan-500/40 hover:shadow-xl hover:shadow-cyan-500/50 active:scale-95 transition-all shrink-0"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : isAtEnd ? (
              <RotateCcw className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={onStepForward}
            disabled={!scrubDate || scrubIdx >= scrubDates.length - 1}
            aria-label="Next day"
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 text-white disabled:opacity-30 disabled:pointer-events-none hover:bg-white/20 active:scale-95 transition-all shrink-0"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={onOverview}
          aria-label="Show full route overview"
          className="w-9 h-9 shrink-0 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 active:scale-95 transition-all"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ── EpilogueCard ───────────────────────────────────────────────────────────────
// Shown when autoplay actually finishes (`isAtEnd`) — trip stats + Watch
// again / Done. NOT shown for a manual ⊞ Overview tap — see `autoplayComplete`.

interface EpilogueCardProps {
  scrubDates: string[];
  filteredLocated: Expense[];
  currency: string;
  dayCaptions: Map<string, { total: number; count: number; topAmount: number; topDescription: string; topEmoji: string }>;
  onReplay: () => void;
  onClose: () => void;
}

function EpilogueCard({ scrubDates, filteredLocated, currency, dayCaptions, onReplay, onClose }: EpilogueCardProps) {
  const totalSpend = filteredLocated.reduce((s, e) => s + Number(e.amount), 0);

  // Highest TOTAL AMOUNT category (not most frequent) — "top spend".
  const topCategory = useMemo(() => {
    const totals = new Map<string, number>();
    for (const e of filteredLocated) totals.set(e.category, (totals.get(e.category) ?? 0) + Number(e.amount));
    let best: string | null = null;
    let bestTotal = 0;
    for (const [cat, total] of totals) {
      if (total > bestTotal) { best = cat; bestTotal = total; }
    }
    return best;
  }, [filteredLocated]);

  const biggestDay = useMemo(() => {
    let best: { date: string; total: number } | null = null;
    for (const [date, agg] of dayCaptions) {
      if (!best || agg.total > best.total) best = { date, total: agg.total };
    }
    return best;
  }, [dayCaptions]);

  return (
    <motion.div
      className="absolute inset-x-4 bottom-28 z-20 rounded-2xl bg-black/55 backdrop-blur-md border border-white/15 text-white p-5 text-center"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <p className="text-xs text-cyan-300 uppercase tracking-wide mb-1">Trip complete</p>
      <p style={{ fontFamily: "var(--font-fraunces)" }} className="text-xl mb-3">✓</p>
      <div className="grid grid-cols-2 gap-2 text-xs mb-4">
        <div className="glass-sm rounded-xl p-2">
          <p className="text-white/50">Days</p>
          <p className="font-semibold">{scrubDates.length}</p>
        </div>
        <div className="glass-sm rounded-xl p-2">
          <p className="text-white/50">Total</p>
          <p className="font-semibold">{formatCurrency(totalSpend, currency)}</p>
        </div>
        <div className="glass-sm rounded-xl p-2">
          <p className="text-white/50">Top spend</p>
          <p className="font-semibold">
            {topCategory ? `${getCategoryEmoji(topCategory)} ${getCategory(topCategory).label}` : "—"}
          </p>
        </div>
        <div className="glass-sm rounded-xl p-2">
          <p className="text-white/50">Biggest day</p>
          <p className="font-semibold">{biggestDay ? formatCurrency(biggestDay.total, currency) : "—"}</p>
        </div>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={onReplay} className="flex-1 py-2 rounded-xl bg-white/10 text-sm">
          ↺ Watch again
        </button>
        <button type="button" onClick={onClose} className="flex-1 py-2 rounded-xl bg-cyan-500/80 text-sm font-medium">
          Done
        </button>
      </div>
    </motion.div>
  );
}

// ── MapErrorBoundary ──────────────────────────────────────────────────────────

interface ErrorBoundaryState { hasError: boolean }

export class MapErrorBoundary extends React.Component<
  React.PropsWithChildren,
  ErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="h-[480px] rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
          <div className="text-center p-6">
            <MapPin className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">Map unavailable</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
