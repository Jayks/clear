"use client";

import { useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Link2 } from "lucide-react";
import { toast } from "sonner";
import { updatePhotoAlbumUrl } from "@/app/actions/groups";
import { useSheetDismiss } from "@/hooks/use-sheet-dismiss";
import { useFocusTrap } from "@/hooks/use-focus-trap";

interface TripMemoriesLinkActionProps {
  groupId: string;
  currentUrl: string | null;
  open: boolean;
  onClose: () => void;
}

/**
 * A minimal bottom sheet for saving / removing the trip's photo album link.
 * Reachable from the TripMemoriesUpgrade state and from the PhotoAlbumCard
 * "Edit link" action on the group overview page.
 */
export function TripMemoriesLinkAction({
  groupId,
  currentUrl,
  open,
  onClose,
}: TripMemoriesLinkActionProps) {
  const [url, setUrl]       = useState(currentUrl ?? "");
  const [saving, setSaving] = useState(false);
  const panelRef            = useRef<HTMLDivElement>(null);
  useSheetDismiss(open, onClose);
  useFocusTrap(open, panelRef);

  async function handleSave() {
    const trimmed = url.trim();
    if (trimmed && !/^https?:\/\//i.test(trimmed)) {
      toast.error("Please enter a valid URL starting with https://");
      return;
    }

    setSaving(true);
    const result = await updatePhotoAlbumUrl(groupId, trimmed);
    setSaving(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(trimmed ? "Photo album link saved!" : "Photo album link removed");
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Link photo album"
            tabIndex={-1}
            className="fixed bottom-0 left-0 right-0 z-[60] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-t-2xl p-6"
            style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))", outline: "none" }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center shrink-0">
                <Link2 className="w-4 h-4 text-white" />
              </div>
              <h2
                className="text-base font-semibold text-slate-800 dark:text-slate-100"
                style={{ fontFamily: "var(--font-fraunces)" }}
              >
                Photo album link
              </h2>
            </div>

            <div className="space-y-1.5">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://photos.google.com/share/…"
                autoFocus
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-400/50 focus:border-transparent placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Google Photos, iCloud, Flickr — any shared album link. Leave blank to remove.
              </p>
            </div>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="mt-5 w-full py-3 bg-gradient-to-br from-rose-400 to-pink-500 hover:from-rose-500 hover:to-pink-600 text-white text-sm font-semibold rounded-xl shadow-md shadow-rose-500/20 transition-all disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save link"}
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
