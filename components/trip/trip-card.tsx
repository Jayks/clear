import Link from "next/link";
import Image from "next/image";
import { Users, Sparkles } from "lucide-react";
import type { Trip } from "@/lib/db/schema/trips";
import { formatDate } from "@/lib/utils";
import { TripCardShareButtons } from "./trip-card-share-buttons";

interface TripCardProps {
  trip: Trip;
  memberCount: number;
}

export function TripCard({ trip, memberCount }: TripCardProps) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const summaryUrl = `${appUrl}/summary/${trip.shareToken}`;

  return (
    <div
      className={`group glass rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-cyan-500/10 transition-all duration-200 hover:-translate-y-0.5${trip.isDemo ? " ring-2 ring-amber-400/40" : ""}`}
      data-tour={trip.isDemo ? "demo-trip" : undefined}
    >
      {/* Cover — clicking navigates into the trip */}
      <Link href={`/trips/${trip.id}`} className="block">
        <div className="h-44 relative">
          {trip.coverPhotoUrl ? (
            <Image
              src={trip.coverPhotoUrl}
              alt={trip.name}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-cyan-500 to-teal-500" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-slate-900/20 to-transparent" />

          {trip.isDemo && (
            <div className="absolute top-3 left-3 z-10">
              <span className="inline-flex items-center gap-1 bg-amber-500/90 backdrop-blur-sm text-white text-xs font-medium px-2 py-0.5 rounded-full">
                <Sparkles className="w-3 h-3" />
                Sample Trip
              </span>
            </div>
          )}

          <div className="absolute bottom-3 left-4 right-4">
            <h3
              className="text-white text-xl truncate"
              style={{ fontFamily: "var(--font-fraunces)" }}
            >
              {trip.name}
            </h3>
            {(trip.startDate || trip.endDate) && (
              <p className="text-white/75 text-xs mt-0.5">
                {trip.startDate ? formatDate(trip.startDate) : ""}
                {trip.startDate && trip.endDate ? " → " : ""}
                {trip.endDate ? formatDate(trip.endDate) : ""}
              </p>
            )}
          </div>
        </div>
      </Link>

      {/* Footer */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs">
          <Users className="w-3.5 h-3.5" />
          {memberCount} {memberCount === 1 ? "member" : "members"}
        </div>
        <div className="flex items-center gap-1">
          <TripCardShareButtons url={summaryUrl} tripName={trip.name} />
        </div>
      </div>
    </div>
  );
}
