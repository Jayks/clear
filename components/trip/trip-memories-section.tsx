import { Camera } from "lucide-react";
import { BadgePop } from "@/components/shared/badge-pop";
import { getTripPhotos } from "@/lib/db/queries/trip-photos";
import { canUploadTripMemories } from "@/lib/subscription/gates";
import { TripMemoriesGrid } from "./trip-memories-grid";
import { TripMemoriesUpgrade } from "./trip-memories-upgrade";
import type { GroupMember } from "@/lib/db/schema/group-members";

interface TripMemoriesSectionProps {
  groupId: string;
  userId: string;
  currentMemberId: string;
  isAdmin: boolean;
  members: GroupMember[];
  photoAlbumUrl: string | null;
}

/**
 * RSC — fetches photos + Plus gate in parallel and delegates rendering
 * to the appropriate client component.
 *
 * Section color: rose (warm/nostalgic — new in the color system).
 * Badge bg: bg-rose-50 dark:bg-rose-900/30 / icon: text-rose-500 dark:text-rose-400
 * Rule:     from-rose-200/70 to-transparent dark:from-rose-800/40 dark:to-transparent
 */
export async function TripMemoriesSection({
  groupId,
  userId,
  currentMemberId,
  isAdmin,
  members,
  photoAlbumUrl,
}: TripMemoriesSectionProps) {
  const [photos, canUpload] = await Promise.all([
    getTripPhotos(groupId),
    canUploadTripMemories(userId),
  ]);

  // Build member name map for lightbox attribution
  const memberNames: Record<string, string> = {};
  for (const m of members) {
    memberNames[m.id] = m.displayName ?? m.guestName ?? "Member";
  }

  const hasPhotos = photos.length > 0;

  // Four states (see TRIP_MEMORIES_PLAN.md §2e):
  // canUpload=true, hasPhotos=true  → grid + add button
  // canUpload=true, hasPhotos=false → empty state with upload CTA (grid with just the add button)
  // canUpload=false, hasPhotos=true → read-only grid
  // canUpload=false, hasPhotos=false → upgrade gate

  if (!canUpload && !hasPhotos) {
    return (
      <div className="mb-6">
        {/* Section header */}
        <div className="flex items-center gap-2.5 mb-4">
          <BadgePop className="w-6 h-6 rounded-md bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center shrink-0">
            <Camera className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
          </BadgePop>
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Memories</span>
          <div className="flex-1 h-[1.5px] bg-gradient-to-r from-rose-200/70 to-transparent dark:from-rose-800/40 dark:to-transparent animate-rule-enter" />
        </div>

        <TripMemoriesUpgrade
          groupId={groupId}
          currentAlbumUrl={photoAlbumUrl}
          isAdmin={isAdmin}
        />
      </div>
    );
  }

  return (
    <div className="mb-6">
      {/* Section header */}
      <div className="flex items-center gap-2.5 mb-4">
        <BadgePop className="w-6 h-6 rounded-md bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center shrink-0">
          <Camera className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
        </BadgePop>
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Memories {photos.length > 0 && <span className="text-slate-400 dark:text-slate-500 font-normal">({photos.length}/30)</span>}
        </span>
        <div className="flex-1 h-[1.5px] bg-gradient-to-r from-rose-200/70 to-transparent dark:from-rose-800/40 dark:to-transparent animate-rule-enter" />
      </div>

      {hasPhotos || canUpload ? (
        <TripMemoriesGrid
          initialPhotos={photos}
          groupId={groupId}
          currentMemberId={currentMemberId}
          isAdmin={isAdmin}
          canUpload={canUpload}
          memberNames={memberNames}
        />
      ) : null}
    </div>
  );
}

/** Skeleton shown while TripMemoriesSection is streaming */
export function TripMemoriesSkeleton() {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-6 h-6 rounded-md bg-rose-50 dark:bg-rose-900/30 animate-pulse" />
        <div className="h-3 w-20 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
        <div className="flex-1 h-[1.5px] bg-slate-200 dark:bg-slate-700" />
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="aspect-square rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
        ))}
      </div>
    </div>
  );
}
