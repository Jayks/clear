import { RealtimeRefresh } from "@/components/shared/realtime-refresh";

export default async function TripLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <>
      {/* Invisible — subscribes to Supabase Realtime for this trip.
          Any change on expenses / splits / settlements / members
          triggers router.refresh() so all server components update. */}
      <RealtimeRefresh groupId={id} />
      {children}
    </>
  );
}
