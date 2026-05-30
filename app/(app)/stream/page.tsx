import { getCurrentUser } from "@/lib/db/queries/auth";
import { getStreamDashboard } from "@/lib/db/queries/stream";
import { StreamDashboardClient } from "@/components/stream/stream-dashboard-client";

export default async function StreamPage() {
  const user = await getCurrentUser();
  // Layout handles unauthenticated redirect — user is always defined here
  if (!user) return null;

  const data = await getStreamDashboard(user.id);

  return <StreamDashboardClient data={data} />;
}
