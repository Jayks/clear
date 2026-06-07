"use client";

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import "mapbox-gl/dist/mapbox-gl.css";
import { useTheme } from "next-themes";
import { format } from "date-fns";
import { MapPin, SlidersHorizontal, ChevronLeft, ChevronRight } from "lucide-react";
import { parseExpenseLocation } from "@/lib/db/schema/expenses";
import type { Expense } from "@/lib/db/schema/expenses";
import type { GroupMember } from "@/lib/db/schema/group-members";
import { ExpenseDetailSheet } from "./expense-detail-sheet";
import {
  isTripActive,
  computeScrubDates,
  computeDistanceRevealFraction,
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
  const routeLocations = useMemo(
    () =>
      [...filteredLocated]
        .sort((a, b) => {
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
        })
        .map((e) => ({ ...parseExpenseLocation(e.location)!, expenseDate: e.expenseDate })),
    [filteredLocated],
  );

  const scrubDates = useMemo(
    () => computeScrubDates(groupStartDate, groupEndDate, allLocated.map((e) => e.expenseDate)),
    [groupStartDate, groupEndDate, allLocated],
  );

  // Active trips open scrubbed to "today" (where the trip currently stands).
  // Past/future trips open at day 1 — opening on "All" would dump the entire
  // path on load and contradict the discovery hint ("replay your trip day by
  // day"), so the scrubber starts at the beginning and invites stepping through.
  const [scrubDate, setScrubDate] = useState<string | null>(
    isActive ? todayStr : (scrubDates[0] ?? null),
  );

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
        // date must never be created, otherwise render() (e.g. on map pan/zoom
        // moveend) would recreate them from scratch and undo any display toggle
        // applied after the fact.
        const scrubVisible = filteredLocated.filter(
          (e) => !scrubDate || e.expenseDate <= scrubDate,
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
  }, [mapReady, mapGeneration, filteredLocated, selectedExpenseId, currency, scrubDate]); // eslint-disable-line react-hooks/exhaustive-deps

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

      const target = computeDistanceRevealFraction(scrubDate, routeLocations);
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
  }, [mapReady, mapGeneration, scrubDate, routeLocations]); // eslint-disable-line react-hooks/exhaustive-deps

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
        map.fitBounds(bounds, { padding: 48, maxZoom: 13, duration: 500 });
      });
      return;
    }

    const onDay = filteredLocated.filter((e) => e.expenseDate === scrubDate);
    const target = onDay.length > 0
      ? onDay
      : filteredLocated
          .filter((e) => e.expenseDate <= scrubDate)
          .sort((a, b) => b.expenseDate.localeCompare(a.expenseDate))
          .slice(0, 1);

    if (target.length === 0) return;
    const locs = target.map((e) => parseExpenseLocation(e.location)!);

    // Multi-stop days always fitBounds rather than ease toward the centroid.
    // A plain ease-to-midpoint has two failure modes:
    //   - Spread out (Chennai lunch + Delhi dinner, ~1750km): the average
    //     lands on a meaningless midpoint over open country — neither city
    //     would be visible.
    //   - Close together (T. Nagar + Marina, ~10km): the centroid IS visible,
    //     but panning alone leaves the camera at whatever zoom it already had
    //     (often the continent-wide initial view) — so the pins stay merged
    //     in a single cluster bubble instead of "blooming" into individual
    //     rich chips. fitBounds computes a zoom that frames the day's pins
    //     snugly, which naturally pushes them far enough apart on screen to
    //     clear Supercluster's clustering radius.
    // Padding/maxZoom differ by spread: far-apart pairs need a wide frame that
    // keeps both cities on screen; close pairs can — and should — zoom in much
    // tighter so their description + amount chips are readable.
    if (locs.length > 1) {
      const spread = isSpreadOut(locs);
      import("mapbox-gl").then((mapboxgl) => {
        const bounds = new mapboxgl.default.LngLatBounds();
        locs.forEach((l) => bounds.extend([l.lng, l.lat]));
        map.fitBounds(bounds, {
          padding: spread ? 64 : 80,
          maxZoom:  spread ? 12 : 15,
          duration: 500,
        });
      });
      return;
    }

    const [{ lng, lat }] = locs;
    map.easeTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), 13), duration: 500 });
  }, [mapReady, mapGeneration, scrubDate, filteredLocated]); // eslint-disable-line react-hooks/exhaustive-deps

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
      {/* Glass frame — translucent border + ambient cyan shadow, echoing the
          `.glass` card / TripCard `shadow-cyan-500/15` language used across the
          app, so the map reads as "part of the experience" rather than a plain
          embedded widget. The frame's padding shows the glass through as a soft
          border around the map's own rounded corners. */}
      <div className="relative p-1.5 rounded-[22px] glass shadow-lg shadow-cyan-500/15 dark:shadow-cyan-950/40">
        <div className="relative h-[360px] md:h-[480px] rounded-2xl overflow-hidden shadow-inner">
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
        </div>
      </div>

      {/* ── Date scrubber ─────────────────────────────────────────────────────── */}
      {scrubDates.length > 0 && (
        <div className="mt-3 flex items-center gap-2">
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
