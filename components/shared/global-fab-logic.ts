// Pure decision logic for the GlobalFab's unified "Add to…" picker.
// Kept DB-free and DOM-free so it can be unit-tested in isolation
// (same pattern as count-up-logic.ts / error-utils.ts).

/** Minimal shape the picker logic needs — avoids constructing full Group objects in tests. */
export interface PickerGroupLike {
  group: { id: string; isDemo?: boolean | null };
}

export interface PickerSectionsInput<T extends PickerGroupLike> {
  trips: T[];
  nests: T[];
  circles: T[];
  /** Number of recent group tiles to surface at the top. */
  recentCount: number;
  /** Whether the user has any Streams — gates the People section (hybrid rule). */
  hasStreams: boolean;
}

export interface PickerSections<T extends PickerGroupLike> {
  /** First N non-demo groups (across all types, in trip→nest→circle order). */
  recentGroups: T[];
  /** Per-type lists with the recent tiles removed (demos kept). */
  remainingTrips: T[];
  remainingNests: T[];
  remainingCircles: T[];
  /** True when any per-type list still has rows after pulling out recents. */
  showFullList: boolean;
  /** True when the People (Streams) section should render. */
  showPeople: boolean;
}

/**
 * Decides what the picker renders from the raw group lists.
 *
 * - "Recent" = first `recentCount` non-demo groups, combined in trip→nest→circle order
 *   (matches how the home page already orders them).
 * - The full list excludes whatever landed in Recent, but keeps demo groups so a
 *   user with only sample groups still sees them somewhere.
 * - People shows only when the user actually has Streams (the chosen hybrid:
 *   groups-only users get a clean, single-purpose expense picker).
 */
export function resolvePickerSections<T extends PickerGroupLike>(
  input: PickerSectionsInput<T>,
): PickerSections<T> {
  const { trips, nests, circles, recentCount, hasStreams } = input;

  const allActive = [...trips, ...nests, ...circles];
  const nonDemo   = allActive.filter((g) => !g.group.isDemo);

  const recentGroups = nonDemo.slice(0, Math.max(0, recentCount));
  const recentIds    = new Set(recentGroups.map((r) => r.group.id));

  const remainingTrips   = trips.filter((g) => !recentIds.has(g.group.id));
  const remainingNests   = nests.filter((g) => !recentIds.has(g.group.id));
  const remainingCircles = circles.filter((g) => !recentIds.has(g.group.id));

  const showFullList =
    remainingTrips.length + remainingNests.length + remainingCircles.length > 0;

  return {
    recentGroups,
    remainingTrips,
    remainingNests,
    remainingCircles,
    showFullList,
    showPeople: hasStreams,
  };
}
