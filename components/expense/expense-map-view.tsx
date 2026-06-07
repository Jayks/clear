"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
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
  computeRevealFraction,
  getLocatedExpenses,
} from "@/lib/expense/map-helpers";
import type { ExpenseInteractionCount } from "@/lib/db/queries/interactions";

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
  const [mapReady, setMapReady]           = useState(false);
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

  // Located expenses from the full list (not paginated) — used for map pins + path
  const allLocated      = getLocatedExpenses(expenses);
  const filteredLocated = getLocatedExpenses(filteredExpenses);

  const scrubDates = computeScrubDates(
    groupStartDate,
    groupEndDate,
    allLocated.map((e) => e.expenseDate),
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
    mapInstance.current.remove();
    mapInstance.current = null;
    initMap(savedCenter, savedZoom);
  }, [resolvedTheme]); // eslint-disable-line react-hooks/exhaustive-deps

  // Unmount cleanup — prevent "Map already destroyed" errors
  useEffect(() => {
    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
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

    import("supercluster").then(({ default: Supercluster }) => {
      if (cancelled || !mapReady || !mapInstance.current) return;

      // Scrub-filter BEFORE clustering — pins for expenses after the scrubbed
      // date must never be created, otherwise render() (e.g. on map pan/zoom
      // moveend) would recreate them from scratch and undo any display toggle
      // applied after the fact.
      const scrubVisible = filteredLocated.filter(
        (e) => !scrubDate || e.expenseDate <= scrubDate,
      );

      const index = new Supercluster({ radius: 60, maxZoom: 14 });
      index.load(
        scrubVisible.map((e) => {
          const loc = parseExpenseLocation(e.location)!;
          return {
            type:       "Feature" as const,
            geometry:   { type: "Point" as const, coordinates: [loc.lng, loc.lat] },
            properties: {
              id:          e.id,
              amount:      Number(e.amount),
              expenseDate: e.expenseDate,
            },
          };
        }),
      );

      function render() {
        if (cancelled || !map) return;
        markersRef.current.forEach((m) => m.remove());
        markersRef.current = [];

        const b = map.getBounds();
        if (!b) return;
        const bbox: [number, number, number, number] = [
          b.getWest(), b.getSouth(), b.getEast(), b.getNorth(),
        ];
        const clusters = index.getClusters(bbox, Math.floor(map.getZoom()));

        import("mapbox-gl").then((mapboxgl) => {
          if (cancelled) return;
          clusters.forEach((cluster) => {
            const el     = document.createElement("div");
            const coords = cluster.geometry.coordinates as [number, number];

            if ((cluster.properties as { cluster?: boolean }).cluster) {
              const count = (cluster.properties as { point_count: number }).point_count;
              el.className   = "cluster-pin";
              el.textContent = `${count}`;
              el.onclick = () =>
                map.easeTo({ center: coords, zoom: map.getZoom() + 3 });
            } else {
              const expId    = (cluster.properties as { id: string }).id;
              const amount   = (cluster.properties as { amount: number }).amount;
              const isSelected = selectedExpenseId === expId;
              el.className        = `expense-pin${isSelected ? " selected" : ""}`;
              el.dataset.expenseId = expId;
              el.textContent      = compactAmount(amount, currency);
              el.onclick = () => setSelectedExpenseId(expId);
            }

            markersRef.current.push(
              new mapboxgl.default.Marker({ element: el, anchor: "bottom" })
                .setLngLat(coords)
                .addTo(map),
            );
          });
        });
      }

      map.on("moveend", render);
      detachMoveEnd = () => map.off("moveend", render);
      render();
    });

    // Cleanup MUST be returned directly from the effect body — not from inside
    // the .then() — otherwise React never calls it and listeners pile up across
    // re-runs (each carrying its own stale `index` snapshot, racing each other).
    return () => {
      cancelled = true;
      detachMoveEnd();
    };
  }, [mapReady, filteredLocated, selectedExpenseId, currency, scrubDate]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Trip path (line-trim-offset) ─────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapInstance.current) return;
    const map = mapInstance.current;

    // Remove old layers first (both reference the same source), then the source.
    // Order matters: Mapbox rejects removeSource() while any layer still uses it.
    if (map.getLayer("trip-path"))    map.removeLayer("trip-path");
    if (map.getLayer("trip-path-bg")) map.removeLayer("trip-path-bg");
    if (map.getSource("trip-path"))   map.removeSource("trip-path");

    if (filteredLocated.length < 2) return; // LineString requires ≥2 coords

    const coords = [...filteredLocated]
      .sort((a, b) => a.expenseDate.localeCompare(b.expenseDate))
      .map((e) => {
        const loc = parseExpenseLocation(e.location)!;
        return [loc.lng, loc.lat];
      });

    map.addSource("trip-path", {
      type:        "geojson",
      lineMetrics: true, // required for line-trim-offset to work
      data: { type: "Feature", geometry: { type: "LineString", coordinates: coords }, properties: {} },
    });
    map.addLayer({
      id:     "trip-path-bg",
      type:   "line",
      source: "trip-path",
      paint:  { "line-color": "#06B6D4", "line-width": 2, "line-opacity": 0.15 },
    });
    map.addLayer({
      id:     "trip-path",
      type:   "line",
      source: "trip-path",
      paint:  {
        "line-color":        "#06B6D4",
        "line-width":        2.5,
        "line-dasharray":    [0, 4, 3],
        "line-trim-offset":  [0, 1], // fully hidden = correct start state
      },
    });
  }, [mapReady, filteredLocated]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Scrubber → reveal trip path ───────────────────────────────────────────────
  // Pin visibility is handled by the marker/clustering effect (scrub-filters
  // BEFORE building the supercluster index — see comment there for why).
  useEffect(() => {
    if (!mapReady || !mapInstance.current) return;
    const map = mapInstance.current;
    if (!map.getLayer("trip-path")) return;

    const revealed = computeRevealFraction(scrubDate, scrubDates);
    map.setPaintProperty("trip-path", "line-trim-offset", [revealed, 1]);
  }, [mapReady, scrubDate, scrubDates]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Scrubber → pan map toward the day's pin(s) ───────────────────────────────
  // Without this, stepping the scrubber can reveal a pin outside the current
  // viewport and the user has to manually drag the map to find it. Ease the
  // view toward the centroid of that day's expenses (or the most recent prior
  // one, if nothing is dated exactly on the scrubbed day) on every step.
  // "All" (scrubDate === null) leaves the map alone — the user is free-panning.
  useEffect(() => {
    if (!mapReady || !mapInstance.current || !scrubDate) return;
    const map = mapInstance.current;

    const onDay = filteredLocated.filter((e) => e.expenseDate === scrubDate);
    const target = onDay.length > 0
      ? onDay
      : filteredLocated
          .filter((e) => e.expenseDate <= scrubDate)
          .sort((a, b) => b.expenseDate.localeCompare(a.expenseDate))
          .slice(0, 1);

    if (target.length === 0) return;
    const locs = target.map((e) => parseExpenseLocation(e.location)!);
    const lng  = locs.reduce((sum, l) => sum + l.lng, 0) / locs.length;
    const lat  = locs.reduce((sum, l) => sum + l.lat, 0) / locs.length;
    map.easeTo({ center: [lng, lat], duration: 500 });
  }, [mapReady, scrubDate, filteredLocated]); // eslint-disable-line react-hooks/exhaustive-deps

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
      <div className="relative h-[360px] md:h-[480px] rounded-2xl overflow-hidden shadow-md">
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
              value={scrubDate ? scrubDates.indexOf(scrubDate) : scrubDates.length}
              onChange={(e) => {
                const idx = Number(e.target.value);
                setScrubDate(idx >= scrubDates.length ? null : scrubDates[idx]);
              }}
              className="w-full accent-cyan-500"
            />
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
