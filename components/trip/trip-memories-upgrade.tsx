"use client";

import { useState } from "react";
import { Camera, Link2 } from "lucide-react";
import { UpgradeSheet } from "@/components/subscription/upgrade-sheet";
import { TripMemoriesLinkAction } from "./trip-memories-link-action";

interface TripMemoriesUpgradeProps {
  groupId: string;
  currentAlbumUrl: string | null;
  isAdmin: boolean;
}

/**
 * Gate UI shown to free-plan users when there are no memories yet.
 * Offers two escape hatches:
 *   1. Upgrade to Plus (to upload photos directly).
 *   2. Link a photo album (free, admin-only).
 */
export function TripMemoriesUpgrade({
  groupId,
  currentAlbumUrl,
  isAdmin,
}: TripMemoriesUpgradeProps) {
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [linkOpen, setLinkOpen]       = useState(false);

  return (
    <div className="glass rounded-2xl p-6 text-center space-y-4">
      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center mx-auto shadow-md shadow-rose-400/20">
        <Camera className="w-6 h-6 text-white" />
      </div>

      <div className="space-y-1.5">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100" style={{ fontFamily: "var(--font-fraunces)" }}>
          Trip Memories
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
          Upload highlight photos from this trip. Visible to every member.
        </p>
      </div>

      <button
        type="button"
        onClick={() => setUpgradeOpen(true)}
        className="w-full py-2.5 bg-gradient-to-br from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white text-sm font-semibold rounded-xl shadow-md shadow-violet-500/20 transition-all"
      >
        ✦ Unlock with Plus
      </button>

      {isAdmin && (
        <button
          type="button"
          onClick={() => setLinkOpen(true)}
          className="flex items-center justify-center gap-1.5 w-full text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors py-1"
        >
          <Link2 className="w-3.5 h-3.5" />
          {currentAlbumUrl ? "Edit photo album link" : "Link a photo album →"}
        </button>
      )}

      <UpgradeSheet
        open={upgradeOpen}
        reason="memories"
        onDismiss={() => setUpgradeOpen(false)}
      />

      {isAdmin && (
        <TripMemoriesLinkAction
          groupId={groupId}
          currentUrl={currentAlbumUrl}
          open={linkOpen}
          onClose={() => setLinkOpen(false)}
        />
      )}
    </div>
  );
}
