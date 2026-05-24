"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";
import { toast } from "sonner";
import { InviteQRSheet } from "@/components/shared/invite-qr-sheet";

interface Props {
  url: string;
  groupName: string;
  /** Callback so TripCard can cancel its long-press timer when the QR sheet closes. */
  onShareOpenChange?: (open: boolean) => void;
}

const btnClass =
  "w-10 h-10 md:w-8 md:h-8 rounded-xl flex items-center justify-center text-white bg-black/30 hover:bg-black/50 backdrop-blur-md shadow-sm shadow-black/20 active:scale-95 transition-all";

function isIOSDevice() {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function TripCardShareDrawer({ url, groupName, onShareOpenChange }: Props) {
  const [qrOpen, setQrOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  function openQR() {
    setQrOpen(true);
    onShareOpenChange?.(true);
  }

  function closeQR() {
    setQrOpen(false);
    onShareOpenChange?.(false);
  }

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: groupName, text: `Join ${groupName} on Clear!`, url });
        return;
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          // iOS: native sheet has no QR → show ours
          // Other platforms: native sheet already had QR + copy → do nothing
          if (isIOSDevice()) openQR();
          return;
        }
        // Unexpected error — fall through to clipboard
      }
    }

    // No Web Share API: copy to clipboard, show ✓ on the icon
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Invite link copied!");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Couldn't copy link");
    }
  }

  return (
    <>
      <button onClick={handleClick} title="Share invite" className={btnClass}>
        {copied
          ? <Check className="w-5 h-5 md:w-4 md:h-4 text-teal-400" />
          : <Share2 className="w-5 h-5 md:w-4 md:h-4" />
        }
      </button>

      <InviteQRSheet
        url={url}
        groupName={groupName}
        isOpen={qrOpen}
        onClose={closeQR}
      />
    </>
  );
}
