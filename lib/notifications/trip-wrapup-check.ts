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
export async function checkTripWrapUps(
  userId: string,
  adminTrips: { id: string; name: string; isArchived: boolean; endDate: string | null }[],
  today: string
): Promise<void> {
  const due = adminTrips.filter((trip) =>
    isTripWrapUpDue({
      groupType: "trip",
      isAdmin: true,
      isArchived: trip.isArchived,
      endDate: trip.endDate,
      today,
    })
  );
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
