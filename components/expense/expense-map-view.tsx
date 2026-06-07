"use client";

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import "mapbox-gl/dist/mapbox-gl.css";
import { useTheme } from "next-themes";
import { format } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { MapPin, SlidersHorizontal, ChevronLeft, ChevronRight, Play, Pause, X, RotateCcw } from "lucide-react";
import { parseExpenseLocation } from "@/lib/db/schema/expenses";
import type { Expense } from "@/lib/db/schema/expenses";
import type { GroupMember } from "@/lib/db/schema/group-members";
import { ExpenseDetailSheet } from "./expense-detail-sheet";
import {
  isTripActive,
  computeScrubDates,
  computeDistanceRevealFraction,
  computeDistanceRevealFractionThroughIndex,
  groupLocationsIntoStops,
  getLocatedExpenses,
  getCategoryEmoji,
  truncateAtWord,
  isSpreadOut,
  easeOutCubic,
  lerp,
  pointAlongLine,
} from "@/lib/expense/map-helpers";
import type { ExpenseInteractionCount } from "@/lib/db/queries/interactions";

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

/** Pause between consecutive stops in a multi-stop day's one-by-one reveal
 *  sequence — long enough to register each stop as its own "beat" (camera
 *  settles, caption reads) without feeling sluggish when stepping through a
 *  busy day. Applies uniformly whether the sequence was triggered by autoplay,
 *  a chevron tap, or dragging the scrubber onto that day. */
const SUB_STEP_MS = 1100;

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
    : `${currency} `;
  if (amount >= 1000) {
    return `${sym}${(amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 1)}k`;
  }
  return `${sym}${Math.round(amount)}`;
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
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null);
  const { resolvedTheme } = useTheme();

  // ── Cinema mode (movie-style trip replay) ───────────────────────────────────
  // Full-screen autoplay through the trip — the "share this as a memory" payoff.
  // Reuses the SAME map instance/container (just expands it via fixed
  // positioning + `map.resize()`) rather than mounting a second Mapbox.Map —
  // far simpler than a portal-based DOM move, and avoids the canvas-context
  // issues that come with detaching/reattaching a WebGL canvas.
  const [cinemaMode, setCinemaMode]   = useState(false);
  const [isPlaying, setIsPlaying]     = useState(false);
  const autoplayTimerRef              = useRef<ReturnType<typeof setTimeout> | null>(null);
  const PITCH_CINEMA = 52; // degrees — enough perspective to feel "3D" without disorienting at country zoom
  const AUTOPLAY_STEP_MS = 3400; // per-day pace — long enough to register the reveal + pan + caption read

  // ── Discovery banner — SSR-safe localStorage read ───────────────────────────
  const [hasSeenMapHint, setHasSeenMapHint] = useState(true); // assume seen until client loads
  useEffect(() => {
    setHasSeenMapHint(!!localStorage.getItem("clear_map_view_hint_dismissed"));
  }, []);
  function dismissHint() {
    localStorage.setItem("clear_map_view_hint_dismissed", "1");
    setHasSeenMapHint(true);
  }

  // ── Today / active trip / scrubber ──────────────────────────────────────────
  const todayStr   = format(new Date(), "yyyy-MM-dd");
  const isActive   = isTripActive(groupStartDate, groupEndDate, todayStr);

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

  // Active trips open scrubbed to "today" (where the trip currently stands).
  // Past/future trips open at day 1 — opening on "All" would dump the entire
  // path on load and contradict the discovery hint ("replay your trip day by
  // day"), so the scrubber starts at the beginning and invites stepping through.
  const [scrubDate, setScrubDate] = useState<string | null>(
    isActive ? todayStr : (scrubDates[0] ?? null),
  );

  // ── Sub-day stepping: distinct stops for the currently-scrubbed day ─────────
  // Grouped by EXACT coordinate (see `groupLocationsIntoStops` doc) — "the
  // cluster should have different locations, only then does one-by-one
  // stepping make sense". A day with one stop (however many expenses pile up
  // there) behaves exactly as before: `subStepCount <= 1` short-circuits the
  // sequencer below to reveal everything immediately, no animation.
  const currentDayStops = useMemo(
    () =>
      scrubDate
        ? groupLocationsIntoStops(
            chronologicalLocated
              .filter((e) => e.expenseDate === scrubDate)
              .map((e) => ({ ...parseExpenseLocation(e.location)!, expense: e })),
          )
        : [],
    [scrubDate, chronologicalLocated],
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
    // Single-/no-stop days: reveal everything immediately — matches
    // pre-sub-step behaviour exactly, no animation. Multi-stop days: start
    // at "nothing revealed yet"; the timer effect below walks through each
    // stop from here.
    setScrubSubStep(subStepCount <= 1 ? subStepCount : 0);
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

  // Times the walk through a multi-stop day's distinct stops, one at a time —
  // the direct fix for "everything seems to appear at once" on cluster days.
  // Fires for EVERY arrival at a multi-stop `scrubDate`, regardless of how the
  // user got there (autoplay, chevrons, or dragging the scrubber) — "show
  // everything for Day 4 first" becomes "Day 4 always plays out its stops in
  // order before settling", uniformly, rather than a slider-position concern.
  // (The STARTING value of `scrubSubStep` for this date/stop-count is set
  // synchronously during render, just above — this effect owns only the
  // ongoing timer-driven advance through 1, 2, … `subStepCount`.)
  useEffect(() => {
    if (!scrubDate || subStepCount <= 1) return; // single-/no-stop — already fully revealed above; nothing to time
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let i = 0;
    function advance() {
      if (cancelled) return;
      i += 1;
      setScrubSubStep(i);
      if (i < subStepCount) timer = setTimeout(advance, SUB_STEP_MS);
    }
    timer = setTimeout(advance, SUB_STEP_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [scrubDate, subStepCount]);

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

        const locList = allLocated.map((e) => parseExpenseLocation(e.location)!);
        const lngs    = locList.map((l) => l.lng).sort((a, b) => a - b);
        const lats    = locList.map((l) => l.lat).sort((a, b) => a - b);
        const midLng  = lngs[Math.floor(lngs.length / 2)] ?? 0;
        const midLat  = lats[Math.floor(lats.length / 2)] ?? 0;

        const map = new mapboxgl.default.Map({
          container: mapContainerRef.current,
          style:     resolvedTheme === "dark"
            ? "mapbox://styles/mapbox/dark-v11"
            : "mapbox://styles/mapbox/light-v11",
          center: restoreCenter ? [restoreCenter.lng, restoreCenter.lat] : [midLng, midLat],
          zoom:   restoreZoom ?? 11,
        });

        map.on("load", () => {
          // Resize first so Mapbox knows the real canvas dimensions (container
          // may still be laying out or animating in when new Map() was called).
          map.resize();

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
              el.onclick = () => setSelectedExpenseId(expId);
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

    map.addSource("trip-path", {
      type:        "geojson",
      lineMetrics: true, // required for line-trim-offset to work
      data: { type: "Feature", geometry: { type: "LineString", coordinates: coords }, properties: {} },
    });
    // Ambient glow underlay — a wide, heavily-blurred duplicate of the FULL
    // route at low opacity. Gives the path a soft "lit from within" presence
    // against busy map tiles (echoes the pin glow language above) without
    // needing to stay in sync with the reveal animation — it's atmosphere,
    // not signal, so it can simply always show the whole planned route.
    // Sits below `trip-path-bg` so the crisp dashed/solid lines stay legible
    // on top of it.
    map.addLayer({
      id:     "trip-path-glow",
      type:   "line",
      source: "trip-path",
      paint:  {
        "line-color":   "#06B6D4",
        "line-width":   16,
        "line-blur":    9,
        "line-opacity": 0.3,
      },
    });
    // Faint dashed background = the full planned route, always visible.
    map.addLayer({
      id:     "trip-path-bg",
      type:   "line",
      source: "trip-path",
      paint:  {
        "line-color":     "#06B6D4",
        "line-width":     2,
        "line-opacity":   0.15,
        "line-dasharray": [0, 4, 3],
      },
    });
    // Solid "revealed so far" overlay. line-trim-offset ONLY takes visual effect
    // when line-gradient is also set (confirmed against the Mapbox style spec —
    // without it the trim is silently a no-op and the full line always renders,
    // which is exactly what was happening here). line-gradient + line-dasharray
    // is unsupported in Mapbox GL JS, so this overlay is solid; the dashed look
    // lives on the background layer above instead.
    //
    // Cyan → teal gradient along `line-progress` (matches the brand's
    // `from-cyan-500 to-teal-500` language used elsewhere) — the revealed
    // line itself now visually "travels" from the trip's start color to its
    // destination color as the journey progresses, not just grows in length.
    map.addLayer({
      id:     "trip-path",
      type:   "line",
      source: "trip-path",
      paint:  {
        "line-color":       "#06B6D4",
        "line-width":       2.5,
        "line-gradient":    [
          "interpolate", ["linear"], ["line-progress"],
          0,    "#06B6D4", // cyan-500
          0.5,  "#0D9F9F", // cyan↔teal blend midpoint
          1,    "#14B8A6", // teal-500
        ],
        "line-trim-offset": [0, 1], // fully hidden = correct start state
      },
    });
  }, [mapReady, mapGeneration, routeLocations]); // eslint-disable-line react-hooks/exhaustive-deps

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
        map.fitBounds(bounds, { padding: 48, maxZoom: 13, duration: 500, pitch: cinemaMode ? PITCH_CINEMA : 0 });
      });
      return;
    }

    // Explicit `pitch` on EVERY camera transition below — Mapbox's
    // `fitBounds`/`easeTo` silently reset pitch to 0 when the option is
    // omitted (cameraForBounds defaults bearing/pitch to 0 unless told
    // otherwise). Without this, cinema mode's 52° tilt (set once on entry by
    // the pitch-lifecycle effect) would be flattened back to flat-map on the
    // very first day-scrub pan — which is exactly why only day 1 looked "3D"
    // and every subsequent stop looked flat.
    const pitch = cinemaMode ? PITCH_CINEMA : 0;

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
      map.easeTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), 13), duration: 500, pitch });
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
        map.easeTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), 13), duration: 500, pitch });
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

    // Mid-sequence on a multi-stop day — frame ONLY the just-revealed stop.
    // This is the camera half of "show every stop one by one rather than
    // dumping the whole cluster at once": each beat gets its own close-up
    // arrival (caption reads, pin drops in) before the final fitBounds above
    // zooms out to tie them together as a single "here's the whole day" view.
    const { lng, lat } = currentDayStops[scrubSubStep - 1][0];
    map.easeTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), 13), duration: 500, pitch });
  }, [mapReady, mapGeneration, scrubDate, filteredLocated, cinemaMode, currentDayStops, dayComplete, scrubSubStep]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Find the selected expense ─────────────────────────────────────────────────
  const selectedExpense = selectedExpenseId
    ? expenses.find((e) => e.id === selectedExpenseId) ?? null
    : null;

  // ── Scrubber navigation helpers ───────────────────────────────────────────────
  const scrubIdx   = scrubDate ? scrubDates.indexOf(scrubDate) : scrubDates.length; // "All" = past end
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

  const isAtEnd = scrubDate === null && cinemaMode; // "All" reached via autoplay = the credits-roll moment

  // ── Cinema caption — per-stop mid-sequence, day-aggregate once complete ─────
  // "Show every stop one by one" extends to the milestone caption too: a
  // 3-stop day no longer jumps straight to "₹5.3k across 3 stops" — each stop
  // gets its own beat ("🍽 Lunch near Marina") before the day-aggregate caption
  // takes over as the closing summary, mirroring the camera's per-stop arrivals
  // then final zoom-out (see the day-scrub pan effect just above).
  type CinemaCaption = { key: string; label: string; emoji: string; description: string; amountLine: string };
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
    };
  }, [scrubDate, dayComplete, currentDayStops, scrubSubStep, scrubLabel, dayCaptions, currency]);

  // ── Cinema mode controls ─────────────────────────────────────────────────────
  const enterCinemaMode = useCallback(() => {
    setCinemaMode(true);
    setIsPlaying(true);
    // Always replay from day 1 — "press play on the trip", not "continue
    // scrubbing from wherever I happened to be". That's the movie framing.
    setScrubDate(scrubDates[0] ?? null);
  }, [scrubDates]);

  const exitCinemaMode = useCallback(() => {
    if (autoplayTimerRef.current) {
      clearTimeout(autoplayTimerRef.current);
      autoplayTimerRef.current = null;
    }
    setIsPlaying(false);
    setCinemaMode(false);
  }, []);

  function togglePlayback() {
    if (isAtEnd || (!isPlaying && scrubIdx >= scrubDates.length - 1 && scrubDate !== null)) {
      setScrubDate(scrubDates[0] ?? null); // replay from the top
    }
    setIsPlaying((p) => !p);
  }

  // Esc closes cinema mode from anywhere — explicitly requested ("should be
  // able to esc/cancel and come back to the map view at any point in time").
  // Inline handler (not useSheetDismiss) — this is a fixed-position overlay
  // reusing the existing map, not a portal/bottom-sheet on a form page; no
  // history entry is involved. See CLAUDE.md's useSheetDismiss gotcha.
  useEffect(() => {
    if (!cinemaMode) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") exitCinemaMode();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [cinemaMode, exitCinemaMode]);

  // Tilt the camera into a "3D-ish" cinematic perspective on entry, flatten it
  // back on exit — and resize the map's canvas to match its new fixed-fullscreen
  // (or restored card) dimensions. `requestAnimationFrame` lets the CSS layout
  // settle first; calling `resize()` before the container's new size is committed
  // measures the PRE-transition box and leaves Mapbox's canvas mis-sized/blurry.
  useEffect(() => {
    if (!mapReady || !mapInstance.current) return;
    const map = mapInstance.current;
    const raf = requestAnimationFrame(() => {
      map.resize();
      map.easeTo({ pitch: cinemaMode ? PITCH_CINEMA : 0, duration: 700 });
    });
    return () => cancelAnimationFrame(raf);
  }, [cinemaMode, mapReady, mapGeneration]); // eslint-disable-line react-hooks/exhaustive-deps

  // Autoplay loop — advances the scrubber one day per tick while playing.
  // Reuses the EXACT same `setScrubDate` path as manual scrubbing, so the
  // reveal animation, camera pan, pin filtering, and captions all stay
  // perfectly in sync without any cinema-mode-specific rendering branch.
  // Reaching the end lands on "All" (credits-roll) and stops — `togglePlayback`
  // restarts from day 1 when tapped again.
  //
  // GATED on `dayComplete`: a multi-stop day now plays out its own one-by-one
  // sequence (see the sub-step sequencer effect) before it's "done" — without
  // this gate, autoplay would race ahead mid-sequence and land on tomorrow
  // before today finished revealing, exactly the "jumps past Day 4" behaviour
  // that prompted this feature. Each `scrubSubStep` tick re-fires this effect;
  // it simply no-ops (no timer scheduled) until the day completes, then the
  // normal per-day pacing takes over for the advance.
  useEffect(() => {
    if (!cinemaMode || !isPlaying || !dayComplete) return;
    autoplayTimerRef.current = setTimeout(() => {
      const idx     = scrubDate ? scrubDates.indexOf(scrubDate) : scrubDates.length;
      const nextIdx = idx + 1;
      if (nextIdx >= scrubDates.length) {
        setScrubDate(null);   // "All" — the finished, full-route credits view
        setIsPlaying(false);
      } else {
        setScrubDate(scrubDates[nextIdx]);
      }
    }, AUTOPLAY_STEP_MS);
    return () => {
      if (autoplayTimerRef.current) {
        clearTimeout(autoplayTimerRef.current);
        autoplayTimerRef.current = null;
      }
    };
  }, [cinemaMode, isPlaying, scrubDate, scrubDates, dayComplete]);

  if (allLocated.length === 0) return null;

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
              Use the date scrubber to replay your trip day by day
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
      {/* Glass frame in normal state — translucent border + ambient cyan shadow,
          echoing the `.glass` card / TripCard `shadow-cyan-500/15` language so
          the map reads as "part of the experience". In cinema mode the SAME
          container expands to fill the viewport via `position: fixed` — no
          portal, no second Mapbox instance, just CSS + `map.resize()` (see the
          cinema-mode lifecycle effect). Reusing the live map avoids the
          canvas-context issues that come with detaching/reattaching WebGL. */}
      <div
        className={
          cinemaMode
            ? "fixed inset-0 z-[100] bg-black"
            : "relative p-1.5 rounded-[22px] glass shadow-lg shadow-cyan-500/15 dark:shadow-cyan-950/40"
        }
      >
        <div
          className={
            cinemaMode
              ? "relative w-full h-full"
              : "relative h-[360px] md:h-[480px] rounded-2xl overflow-hidden shadow-inner"
          }
        >
          <div ref={mapContainerRef} className="w-full h-full" />

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

          {/* ── Cinema mode chrome ──────────────────────────────────────────── */}
          {cinemaMode && (
            <>
              {/* Top gradient scrim — keeps the close button legible over busy tiles
                  without a hard bar (matches the "cinematic", screen-recordable feel). */}
              <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/40 to-transparent pointer-events-none" />
              <button
                type="button"
                onClick={exitCinemaMode}
                aria-label="Exit trip replay"
                className="absolute top-4 right-4 z-20 w-10 h-10 flex items-center justify-center rounded-full bg-white/15 backdrop-blur-sm border border-white/25 text-white hover:bg-white/25 active:scale-95 transition-all"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Milestone caption — the "story" payoff. Cross-fades stop to stop
                  (mid-sequence) and day to day, reusing `cinemaCaption` so the
                  highlighted moment always matches what the route just traced to
                  and which pin just dropped in. Hidden in the "All" end-state (no
                  single day/stop to caption) — the replay control takes over there. */}
              <AnimatePresence mode="wait">
                {cinemaCaption && (
                  <motion.div
                    key={cinemaCaption.key}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.45, ease: "easeOut" }}
                    className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 max-w-[88%] sm:max-w-md text-center px-5 py-3 rounded-2xl bg-black/45 backdrop-blur-md border border-white/15 text-white shadow-lg"
                  >
                    <p className="text-[11px] font-medium tracking-wide text-cyan-300 uppercase">
                      {cinemaCaption.label}
                    </p>
                    <p className="mt-0.5 text-sm sm:text-base font-semibold" style={{ fontFamily: "var(--font-fraunces)" }}>
                      {cinemaCaption.emoji} {cinemaCaption.description}
                    </p>
                    <p className="mt-0.5 text-xs text-white/70">
                      {cinemaCaption.amountLine}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Bottom scrim + play/pause/replay control */}
              <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
              <button
                type="button"
                onClick={togglePlayback}
                aria-label={isPlaying ? "Pause replay" : isAtEnd ? "Replay trip" : "Resume replay"}
                className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 w-14 h-14 flex items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-teal-500 text-white shadow-lg shadow-cyan-500/40 hover:shadow-xl hover:shadow-cyan-500/50 active:scale-95 transition-all"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 fill-current" />
                ) : isAtEnd ? (
                  <RotateCcw className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Date scrubber ─────────────────────────────────────────────────────── */}
      {scrubDates.length > 0 && !cinemaMode && (
        <div className="mt-3 flex items-center gap-2">
          {scrubDates.length > 1 && (
            <button
              type="button"
              onClick={enterCinemaMode}
              aria-label="Play this trip"
              title="Play this trip — full-screen replay"
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-teal-500 text-white shadow-sm shadow-cyan-500/30 hover:shadow-md hover:shadow-cyan-500/40 active:scale-95 transition-all shrink-0"
            >
              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              if (scrubIdx <= 0) return;
              setScrubDate(scrubDates[scrubIdx - 1] ?? null);
            }}
            disabled={scrubIdx <= 0}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 text-slate-500 disabled:opacity-30 disabled:pointer-events-none hover:border-cyan-400/60 transition-colors shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex-1 relative">
            <input
              type="range"
              min={0}
              max={scrubDates.length}
              value={scrubIdx}
              onChange={(e) => {
                const idx = Number(e.target.value);
                setScrubDate(idx >= scrubDates.length ? null : scrubDates[idx]);
              }}
              className="map-scrubber relative z-10"
              style={{ "--scrub-pct": `${(scrubIdx / scrubDates.length) * 100}%` } as React.CSSProperties}
            />
            {/* Day-tick marks — a faint rhythm of dots along the track giving an
                at-a-glance sense of "how many days this trip spans", echoing the
                Google Maps Timeline day-by-day feel. Purely decorative/ambient
                (not pixel-locked to thumb stops — the extra "All" step throws
                off perfect alignment) so `pointer-events-none` keeps dragging
                untouched. */}
            {scrubDates.length > 1 && (
              <div className="absolute inset-x-[8px] top-1/2 -translate-y-1/2 flex items-center justify-between pointer-events-none">
                {scrubDates.map((d) => (
                  <span key={d} className="w-[3px] h-[3px] rounded-full bg-white/80 dark:bg-slate-900/60" />
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              const nextIdx = scrubDate ? scrubDates.indexOf(scrubDate) + 1 : null;
              if (nextIdx === null || nextIdx >= scrubDates.length) {
                setScrubDate(null); // "All"
              } else {
                setScrubDate(scrubDates[nextIdx]);
              }
            }}
            disabled={!scrubDate}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 text-slate-500 disabled:opacity-30 disabled:pointer-events-none hover:border-cyan-400/60 transition-colors shrink-0"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300 min-w-[60px] text-right">
              {scrubLabel}
            </span>
            {scrubDate && (
              <button
                type="button"
                onClick={() => setScrubDate(null)}
                className="text-[10px] font-medium text-cyan-600 dark:text-cyan-400 hover:text-cyan-800 dark:hover:text-cyan-200"
              >
                All
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Pin legend ───────────────────────────────────────────────────────── */}
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
        />
      )}
    </div>
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
