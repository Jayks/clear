import { RealtimeRefresh } from "@/components/shared/realtime-refresh";
import { GroupMobileNav } from "@/components/shared/group-mobile-nav";
import { GroupBottomNav } from "@/components/shared/group-bottom-nav";
import { GroupDesktopNav } from "@/components/shared/group-desktop-nav";
import { GroupTypeSyncer } from "@/components/shared/group-type-syncer";
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

      {/* Invisible — writes the current group's type to localStorage so
          AppSidebar can highlight Trips / Nests / Circles while inside a group. */}
      {groupSummary && <GroupTypeSyncer groupType={groupSummary.groupType} />}

      {/* Slim contextual header on mobile — replaces the full AppNav.
          Uses negative margins to break out of <main>'s p-6 padding
          so it renders full-width. Sticky so it stays at top while scrolling. */}
      {groupSummary && (
        <div className="-mx-6 -mt-6 mb-4 sticky top-0 z-40 md:hidden">
          <GroupMobileNav
            groupId={id}
            groupName={groupSummary.name}
            groupType={groupSummary.groupType}
            circleMode={groupSummary.circleMode}
            currency={groupSummary.defaultCurrency}
            isArchived={groupSummary.isArchived ?? false}
            isAdmin={isAdmin}
            shareToken={groupSummary.shareToken}
            groupStartDate={groupSummary.startDate}
            groupEndDate={groupSummary.endDate}
          />
        </div>
      )}

      {/* Desktop in-group tab strip — sticky at the very top of the viewport.
          Desktop no longer has a horizontal AppNav above it (AppSidebar is a
          left rail instead, contributing no vertical space), so top-0 — not
          top-14 — is correct here. Cancels only <main>'s top padding (-mt-8)
          so it sits flush at the top; left/right stay within <main>'s normal
          padding so the bar's edges — background included — line up with the
          rest of the page's content instead of full-bleeding wider than
          everything below it. */}
      {groupSummary && (
        <div className="hidden md:block sticky top-0 z-30 -mt-8 mb-6">
          <GroupDesktopNav
            groupId={id}
            groupName={groupSummary.name}
            groupType={groupSummary.groupType}
            circleMode={groupSummary.circleMode}
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

      {/* Contextual in-group bottom nav (mobile only). The global MobileNav
          hides while inside a group (see mobile-nav.tsx), so this replaces it —
          one-tap lateral movement between the group's pages. */}
      {groupSummary && (
        <GroupBottomNav
          groupId={id}
          groupType={groupSummary.groupType}
          circleMode={groupSummary.circleMode}
        />
      )}
    </>
  );
}
