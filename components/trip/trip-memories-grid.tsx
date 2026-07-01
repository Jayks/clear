"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import type { TripPhoto } from "@/lib/db/schema/trip-photos";
import { AnimatedList } from "@/components/shared/animated-list";
import { TripMemoriesLightbox } from "./trip-memories-lightbox";
import { TripMemoriesUpload } from "./trip-memories-upload";
import { isAtPhotoCap } from "@/lib/trip-memories/host-label";

interface TripMemoriesGridProps {
  initialPhotos: TripPhoto[];
  groupId: string;
  currentMemberId: string;
  isAdmin: boolean;
  canUpload: boolean;
  memberNames: Record<string, string>;
}

/**
 * Client grid: photo thumbnails, lightbox trigger, optional upload button.
 * Owns optimistic "just uploaded" state so the new photo appears immediately.
 */
export function TripMemoriesGrid({
  initialPhotos,
  groupId,
  currentMemberId,
  isAdmin,
  canUpload,
  memberNames,
}: TripMemoriesGridProps) {
  // Optimistically append newly-uploaded photos (public URLs only — no DB row yet reflected)
  const [extraUrls, setExtraUrls]   = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Merge server photos + optimistic ones (optimistic shown at the end)
  const allPhotos = initialPhotos;
  const atCap     = isAtPhotoCap(allPhotos.length + extraUrls.length);

  const openLightbox = useCallback((i: number) => setLightboxIndex(i), []);

  function handleUploaded(publicUrl: string) {
    setExtraUrls((prev) => [...prev, publicUrl]);
  }

  return (
    <>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1">
        {allPhotos.map((photo, i) => (
          <button
            key={photo.id}
            type="button"
            onClick={() => openLightbox(i)}
            className="relative aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-90 active:opacity-75 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
            aria-label={photo.caption ?? `Photo ${i + 1}`}
          >
            <Image
              src={photo.publicUrl}
              alt={photo.caption ?? `Trip photo ${i + 1}`}
              fill
              sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, 20vw"
              className="object-cover"
            />
          </button>
        ))}

        {/* Optimistic thumbnails (just uploaded, not yet in initialPhotos from server) */}
        {extraUrls.map((url, i) => (
          <div
            key={`opt-${i}`}
            className="relative aspect-square rounded-lg overflow-hidden ring-2 ring-rose-400/40"
          >
            <Image
              src={url}
              alt={`New photo ${i + 1}`}
              fill
              sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, 20vw"
              className="object-cover"
            />
          </div>
        ))}

        {/* Upload button — only shown when Plus user and under cap */}
        {canUpload && !atCap && (
          <TripMemoriesUpload groupId={groupId} onUploaded={handleUploaded} />
        )}
      </div>

      {atCap && canUpload && (
        <p className="mt-2 text-xs text-slate-400 dark:text-slate-500 text-center">
          30 photos — remove one to add more.
        </p>
      )}

      {/* Lightbox */}
      <TripMemoriesLightbox
        photos={allPhotos}
        startIndex={lightboxIndex ?? 0}
        open={lightboxIndex !== null}
        onClose={() => setLightboxIndex(null)}
        currentMemberId={currentMemberId}
        isAdmin={isAdmin}
        groupId={groupId}
        memberNames={memberNames}
      />
    </>
  );
}
