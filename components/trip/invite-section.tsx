"use client";

import { useState } from "react";
import { Share2, Check, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { regenerateShareToken } from "@/app/actions/groups";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { InviteQRSheet } from "@/components/shared/invite-qr-sheet";

interface Props {
  url: string;
  groupName: string;
  groupId: string;
}

function isIOSDevice() {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    // iPads on iOS 13+ report MacIntel but have touch points
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function InviteSection({ url: initialUrl, groupName, groupId }: Props) {
  const [url, setUrl] = useState(initialUrl);
  const [copied, setCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  async function handleShare() {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: groupName, text: `Join ${groupName} on Clear!`, url });
        return;
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          // iOS: native sheet has no QR → show ours
          // Other platforms: native sheet already had QR + copy → do nothing
          if (isIOSDevice()) setQrOpen(true);
          return;
        }
        // Unexpected error — fall through to clipboard
      }
    }
    // No Web Share API (some desktop browsers): copy to clipboard
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Invite link copied!");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Couldn't copy link");
    }
  }

  async function handleRegenerate() {
    const result = await regenerateShareToken(groupId);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    const base = url.split("/join/")[0];
    setUrl(`${base}/join/${result.shareToken}`);
    toast.success("Invite link regenerated.");
  }

  return (
    <>
      <div className="space-y-2">
        <button
          type="button"
          onClick={handleShare}
          className={`w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-sm shadow-md transition-all active:scale-[0.98] ${
            copied
              ? "bg-emerald-500 shadow-emerald-500/25 text-white"
              : "bg-gradient-to-br from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 shadow-cyan-500/25 text-white"
          }`}
        >
          {copied
            ? <><Check className="w-4 h-4" />Copied!</>
            : <><Share2 className="w-4 h-4" />Share invite link</>
          }
        </button>

        <ConfirmDialog
          title="Reset invite link"
          description="The current link will stop working immediately. Anyone who hasn't joined yet will need the new link."
          confirmLabel="Reset"
          onConfirm={handleRegenerate}
          trigger={
            <button className="w-full inline-flex items-center justify-center gap-1.5 py-1 text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
              <RefreshCw className="w-3 h-3" />
              Reset invite link
            </button>
          }
        />
      </div>

      <InviteQRSheet
        url={url}
        groupName={groupName}
        isOpen={qrOpen}
        onClose={() => setQrOpen(false)}
      />
    </>
  );
}
