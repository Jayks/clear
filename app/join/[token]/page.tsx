import { getTripByToken } from "@/lib/db/queries/trips";
import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { MapPin, Users } from "lucide-react";
import { JoinButton } from "./join-button";
import { formatDate } from "@/lib/utils";

export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const result = await getTripByToken(token);
  if (!result) notFound();

  const { trip, memberCount } = result;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/join/${token}`);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="glass rounded-2xl overflow-hidden">
          {/* Cover */}
          <div className="h-44 relative">
            {trip.coverPhotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={trip.coverPhotoUrl} alt={trip.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-cyan-500 to-teal-500" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4">
              <h1 className="text-white text-2xl" style={{ fontFamily: "var(--font-fraunces)" }}>
                {trip.name}
              </h1>
              {(trip.startDate || trip.endDate) && (
                <p className="text-white/75 text-sm mt-0.5">
                  {trip.startDate ? formatDate(trip.startDate) : ""}
                  {trip.startDate && trip.endDate ? " → " : ""}
                  {trip.endDate ? formatDate(trip.endDate) : ""}
                </p>
              )}
            </div>
          </div>

          <div className="p-5">
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-5">
              <Users className="w-4 h-4" />
              {memberCount} {Number(memberCount) === 1 ? "member" : "members"} already in
            </div>

            {trip.description && (
              <p className="text-slate-600 text-sm mb-5">{trip.description}</p>
            )}

            <JoinButton token={token} />
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">
          You&apos;re signed in as {user.email}
        </p>
      </div>
    </div>
  );
}
