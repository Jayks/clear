import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/db/queries/auth";
import { getStreamWithPerson } from "@/lib/db/queries/stream";
import { StreamPersonPageClient } from "@/components/stream/stream-person-page-client";

interface Props {
  params: Promise<{ personId: string }>;
}

export default async function StreamPersonPage({ params }: Props) {
  const { personId } = await params;
  const user = await getCurrentUser();
  if (!user) return null;

  const { records, person, net, currency } = await getStreamWithPerson(user.id, personId);

  // Unknown person — 404
  if (!person) notFound();

  return (
    <StreamPersonPageClient
      records={records}
      person={person}
      net={net}
      currency={currency}
      currentUserName={user.user_metadata?.full_name ?? undefined}
    />
  );
}
