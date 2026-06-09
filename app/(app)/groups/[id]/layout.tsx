import { RealtimeRefresh } from "@/components/shared/realtime-refresh";
import { GroupMobileNav } from "@/components/shared/group-mobile-nav";
import { getGroupSummary } from "@/lib/db/queries/meta";
import { getCurrentUser, getMembership } from "@/lib/db/queries/auth";

export default async function TripLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // React cache() deduplicates both calls if the page components also call them
  // in the same render tree — no extra DB round-trips.
  const [groupSummary, user] = await Promise.all([
    getGroupSummary(id),
    getCurrentUser(),
  ]);

  const membership = user && groupSummary
    ? await getMembership(id, user.id)
    : null;
  const isAdmin = membership?.role === "admin";

  return (
    <>
      {/* Invisible — subscribes to Supabase Realtime for this trip.
          Any change on expenses / splits / settlements / members
          triggers router.refresh() so all server components update. */}
      <RealtimeRefresh groupId={id} />

      {/* Slim contextual header on mobile — replaces the full AppNav.
          Uses negative margins to break out of <main>'s p-6 padding
          so it renders full-width. Sticky so it stays at top while scrolling. */}
      {groupSummary && (
        <div className="-mx-6 -mt-6 mb-4 sticky top-0 z-40 md:hidden">
          <GroupMobileNav
            groupId={id}
            groupName={groupSummary.name}
            groupType={groupSummary.groupType}
            currency={groupSummary.defaultCurrency}
            isArchived={groupSummary.isArchived ?? false}
            isAdmin={isAdmin}
            shareToken={groupSummary.shareToken}
            groupStartDate={groupSummary.startDate}
            groupEndDate={groupSummary.endDate}
          />
        </div>
      )}

      {children}
    </>
  );
}
