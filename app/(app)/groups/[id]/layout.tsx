import { RealtimeRefresh } from "@/components/shared/realtime-refresh";
import { GroupMobileNav } from "@/components/shared/group-mobile-nav";
import { getGroupName } from "@/lib/db/queries/meta";

export default async function TripLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const groupName = await getGroupName(id);

  return (
    <>
      {/* Invisible — subscribes to Supabase Realtime for this trip.
          Any change on expenses / splits / settlements / members
          triggers router.refresh() so all server components update. */}
      <RealtimeRefresh groupId={id} />

      {/* Slim contextual header on mobile — replaces the full AppNav.
          Uses negative margins to break out of <main>'s p-6 padding
          so it renders full-width. Sticky so it stays at top while scrolling. */}
      {groupName && (
        <div className="-mx-6 -mt-6 mb-4 sticky top-0 z-40 md:hidden">
          <GroupMobileNav groupId={id} groupName={groupName} />
        </div>
      )}

      {children}
    </>
  );
}
