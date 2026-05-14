import Link from "next/link";
import Image from "next/image";
import { Users, Sparkles, MapPin, Home } from "lucide-react";
import type { Group } from "@/lib/db/schema/groups";
import { formatDate } from "@/lib/utils";
import { TripCardShareButtons } from "./trip-card-share-buttons";
import { TripCardQuickAdd } from "./trip-card-quick-add";

interface TripCardProps {
  group: Group;
  memberCount: number;
}

export function TripCard({ group, memberCount }: TripCardProps) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const summaryUrl = `${appUrl}/summary/${group.shareToken}`;
  const isNest = group.groupType === "nest";

  return (
    <div
      className={`group/card glass rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-cyan-500/10 transition-all duration-200 hover:-translate-y-0.5${group.isDemo ? " ring-2 ring-amber-400/40" : ""}`}
      data-tour={group.isDemo ? (isNest ? "demo-nest" : "demo-trip") : undefined}
    >
      <Link href={`/groups/${group.id}`} className="block">
        <div className="h-44 relative">
          {group.coverPhotoUrl ? (
            <Image
              src={group.coverPhotoUrl}
              alt={group.name}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              className="object-cover"
            />
          ) : (
            <div className={`w-full h-full bg-gradient-to-br ${isNest ? "from-teal-500 to-emerald-500" : "from-cyan-500 to-teal-500"}`} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-slate-900/20 to-transparent" />

          {/* Badges */}
          <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5">
            {group.isDemo && (
              <span className="inline-flex items-center gap-1 bg-amber-500/90 backdrop-blur-sm text-white text-xs font-medium px-2 py-0.5 rounded-full">
                <Sparkles className="w-3 h-3" />
                {isNest ? "Sample Nest" : "Sample Trip"}
              </span>
            )}
            <span className="inline-flex items-center gap-1 bg-black/40 backdrop-blur-sm text-white text-xs font-medium px-2 py-0.5 rounded-full">
              {isNest ? <Home className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
              {isNest ? "Nest" : "Trip"}
            </span>
          </div>

          <div className="absolute bottom-3 left-4 right-4">
            <h3 className="text-white text-xl truncate" style={{ fontFamily: "var(--font-fraunces)" }}>
              {group.name}
            </h3>
            {isNest ? (
              <p className="text-white/75 text-xs mt-0.5">Shared tab</p>
            ) : (group.startDate || group.endDate) ? (
              <p className="text-white/75 text-xs mt-0.5">
                {group.startDate ? formatDate(group.startDate) : ""}
                {group.startDate && group.endDate ? " → " : ""}
                {group.endDate ? formatDate(group.endDate) : ""}
              </p>
            ) : null}
          </div>
        </div>
      </Link>

      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs">
          <Users className="w-3.5 h-3.5" />
          {memberCount} {memberCount === 1 ? (isNest ? "mate" : "member") : (isNest ? "mates" : "members")}
        </div>
        <div className="flex items-center gap-1">
          <TripCardQuickAdd
            groupId={group.id}
            groupName={group.name}
            currency={group.defaultCurrency}
            groupStartDate={group.startDate}
            groupEndDate={group.endDate}
          />
          <TripCardShareButtons url={summaryUrl} tripName={group.name} />
        </div>
      </div>
    </div>
  );
}
