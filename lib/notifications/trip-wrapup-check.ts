import { recordNotification } from "./record-notification";
import { isTripWrapUpDue, buildTripWrapUpNotification } from "@/lib/trip/wrap-up";

/**
 * Phase 4 of `NOTIFiCATIONS_INBOX_PLAN.md` §3.3b — lazy check-on-visit run
 * from the Home page (`app/(app)/groups/page.tsx`) against data it already
 * fetched (`trips` + `memberIds`), no extra query. For each of the current
 * user's admin trips that has newly wrapped up, persists a dedup-keyed
 * `trip_wrapup` inbox notification so it only ever fires once per trip —
 * repeat visits are no-ops via `insertNotification`'s `ON CONFLICT
 * (dedup_key) DO NOTHING`.
 *
 * Deliberately inbox-only, no push (`sendPush` is a no-op closure) — unlike
 * every other notification type, this one is *inferred* from page-load
 * state rather than triggered by a real-time action, and the user is by
 * definition already active on `/groups` when it fires, so pushing them
 * about something they can just see in the bell right now would be
 * redundant. See `app/CLAUDE.md`'s Notifications section for the full
 * design-decision trail.
 *
 * Call from the page wrapped in `after(() => checkTripWrapUps(...).catch(()
 * => {}))` — same "runs opportunistically on a page load, never blocks
 * render, fails silently" posture as `autoLogDueTemplates`.
 */
// Round 16 fix #6: caps how far back a wrapped-up trip's notification can
// still fire, on top of isTripWrapUpDue's own condition. Without this, the
// first deploy of this check would fire one backfill notification for every
// long-ended trip in the DB at once. Archived trips without an endDate
// always pass regardless of age — archiving is an explicit, recent act in
// practice, and dedup (see buildTripWrapUpNotification) caps the cost at one
// row ever even if that assumption is ever wrong.
const WRAPUP_MAX_AGE_DAYS = 30;

export async function checkTripWrapUps(
  userId: string,
  adminTrips: { id: string; name: string; isArchived: boolean; endDate: string | null }[],
  today: string
): Promise<void> {
  const cutoff = new Date(new Date(today).getTime() - WRAPUP_MAX_AGE_DAYS * 86_400_000)
    .toISOString()
    .slice(0, 10);

  const due = adminTrips.filter((trip) => {
    if (!isTripWrapUpDue({
      groupType: "trip",
      isAdmin: true,
      isArchived: trip.isArchived,
      endDate: trip.endDate,
      today,
    })) return false;

    // Only the *inbox notification* is gated by recency — the on-page
    // wrap-up card (isTripWrapUpDue) is intentionally untouched, so an old
    // trip still shows its card, it just won't also re-appear in the bell.
    if (trip.endDate && trip.endDate < cutoff) return false;

    return true;
  });
  if (due.length === 0) return;

  await Promise.all(
    due.map((trip) =>
      recordNotification({
        ...buildTripWrapUpNotification({ userId, groupId: trip.id, groupName: trip.name }),
        sendPush: async () => {},
      })
    )
  );
}
