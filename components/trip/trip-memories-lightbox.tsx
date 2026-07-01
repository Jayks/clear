"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Pencil, Trash2, Check } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import type { TripPhoto } from "@/lib/db/schema/trip-photos";
import { deleteTripPhoto, updatePhotoCaption } from "@/app/actions/trip-photos";
import { hapticDelete } from "@/lib/haptics";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { formatRelative } from "date-fns";

interface TripMemoriesLightboxProps {
  photos: TripPhoto[];
  startIndex: number;
  open: boolean;
  onClose: () => void;
  /** The current user's memberId — used to check uploader ownership. */
  currentMemberId: string;
  isAdmin: boolean;
  groupId: string;
  /** Map of memberId → display name for uploader attribution. */
  memberNames: Record<string, string>;
}

export function TripMemoriesLightbox({
  photos,
  startIndex,
  open,
  onClose,
  currentMemberId,
  isAdmin,
  groupId,
  memberNames,
}: TripMemoriesLightboxProps) {
  const router = useRouter();
  const [index, setIndex]           = useState(startIndex);
  const [deleting, setDeleting]     = useState(false);
  const [editingCaption, setEditingCaption] = useState(false);
  const [captionDraft, setCaptionDraft]     = useState("");
  const [savingCaption, setSavingCaption]   = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(open, panelRef);

  // Sync index when startIndex changes (e.g. opening different photo while lightbox is open)
  useEffect(() => {
    if (open) setIndex(startIndex);
  }, [startIndex, open]);

  // Escape and back-button dismiss
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowLeft")  prev();
      if (e.key === "ArrowRight") next();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, index, photos.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Popstate (Android back button) — close lightbox
  useEffect(() => {
    if (!open) return;
    window.history.pushState({ lightbox: true }, "");
    const onPop = () => onClose();
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      if (window.history.state?.lightbox) window.history.go(-1);
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Touch swipe
  const touchStartX = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < 40) return;
    if (delta < 0) next(); else prev();
  };

  const prev = useCallback(() => setIndex((i) => (i - 1 + photos.length) % photos.length), [photos.length]);
  const next = useCallback(() => setIndex((i) => (i + 1) % photos.length), [photos.length]);

  if (!photos.length) return null;
  const photo = photos[index];
  if (!photo) return null;

  const isUploader   = photo.memberId === currentMemberId;
  const canDelete    = isUploader || isAdmin;
  const canEditCaption = isUploader;
  const uploaderName = (photo.memberId ? memberNames[photo.memberId] : null) ?? "A member";
  const uploadedAt   = photo.createdAt
    ? formatRelative(new Date(photo.createdAt), new Date())
    : null;

  async function handleDelete() {
    if (!confirm("Remove this photo?")) return;
    hapticDelete();
    setDeleting(true);
    const result = await deleteTripPhoto(photo.id, groupId);
    setDeleting(false);
    if (!result.ok) { toast.error(result.error); return; }
    toast.success("Photo removed");
    // FIX #6: Refresh RSC data so initialPhotos reflects the deletion.
    // Close first (if last photo), then refresh so the grid updates too.
    if (photos.length === 1) { onClose(); router.refresh(); return; }
    setIndex((i) => Math.min(i, photos.length - 2));
    router.refresh();
  }

  function startEditCaption() {
    setCaptionDraft(photo.caption ?? "");
    setEditingCaption(true);
  }

  async function saveCaption() {
    setSavingCaption(true);
    const result = await updatePhotoCaption(photo.id, groupId, captionDraft);
    setSavingCaption(false);
    if (!result.ok) { toast.error(result.error); return; }
    setEditingCaption(false);
    toast.success("Caption updated");
    // FIX #7: Refresh RSC data so the lightbox re-renders with the saved caption
    // instead of reverting to the stale prop value from initialPhotos.
    router.refresh();
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Photo viewer"
          tabIndex={-1}
          className="fixed inset-0 z-[100] bg-black/90 flex flex-col"
          style={{ outline: "none" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          onClick={onClose}
        >
          {/* Header — stopPropagation so button clicks don't also fire the backdrop close */}
          <div className="flex items-center justify-between px-4 pt-safe py-3 shrink-0" onClick={(e) => e.stopPropagation()}>
            <button onClick={onClose} aria-label="Close" className="p-2 text-white/70 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
            <span className="text-white/60 text-sm tabular-nums">
              {index + 1} / {photos.length}
            </span>
            <div className="flex items-center gap-1">
              {canEditCaption && (
                <button onClick={startEditCaption} aria-label="Edit caption" className="p-2 text-white/70 hover:text-white transition-colors">
                  <Pencil className="w-4 h-4" />
                </button>
              )}
              {canDelete && (
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  aria-label="Delete photo"
                  className="p-2 text-white/70 hover:text-rose-400 transition-colors disabled:opacity-40"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Image area */}
          <div className="flex-1 relative flex items-center justify-center overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={photo.id}
                className="absolute inset-0 flex items-center justify-center"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.18 }}
              >
                <Image
                  src={photo.publicUrl}
                  alt={photo.caption ?? "Trip photo"}
                  fill
                  sizes="100vw"
                  className="object-contain"
                  priority
                />
              </motion.div>
            </AnimatePresence>

            {/* Prev / next arrows — desktop */}
            {photos.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); prev(); }}
                  disabled={deleting}
                  aria-label="Previous photo"
                  className="hidden sm:flex absolute left-3 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors z-10 disabled:opacity-30"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); next(); }}
                  disabled={deleting}
                  aria-label="Next photo"
                  className="hidden sm:flex absolute right-3 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors z-10 disabled:opacity-30"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
          </div>

          {/* Footer — caption + uploader; stopPropagation so typing/clicking here doesn't close */}
          <div
            className="shrink-0 px-5 py-4 space-y-2"
            style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
            onClick={(e) => e.stopPropagation()}
          >
            {editingCaption ? (
              <div className="flex gap-2">
                <input
                  autoFocus
                  value={captionDraft}
                  onChange={(e) => setCaptionDraft(e.target.value)}
                  maxLength={200}
                  placeholder="Add a caption…"
                  className="flex-1 px-3 py-2 text-sm rounded-xl bg-white/10 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-rose-400/50 border border-white/20"
                  onKeyDown={(e) => { if (e.key === "Enter") saveCaption(); if (e.key === "Escape") setEditingCaption(false); }}
                />
                <button
                  onClick={saveCaption}
                  disabled={savingCaption}
                  className="p-2 rounded-xl bg-rose-500 text-white hover:bg-rose-600 transition-colors disabled:opacity-60"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setEditingCaption(false)}
                  className="p-2 rounded-xl bg-white/10 text-white/70 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              photo.caption && (
                <p className="text-white text-sm leading-relaxed">{photo.caption}</p>
              )
            )}

            <div className="flex items-center gap-1.5 text-xs text-white/40">
              <span>{uploaderName}</span>
              {uploadedAt && <><span>·</span><span>{uploadedAt}</span></>}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
