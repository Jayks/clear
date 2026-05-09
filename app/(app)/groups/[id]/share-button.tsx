"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Share2, Check } from "lucide-react";

interface Props {
  url: string;
  tripName: string;
}

export function ShareButton({ url, tripName }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: tripName, text: `Join our trip — ${tripName}!`, url });
        return;
      } catch {
        // user cancelled or unsupported — fall through to clipboard
      }
    }
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
    <button
      onClick={handleShare}
      className="shrink-0 inline-flex items-center gap-1.5 text-xs font-medium text-cyan-600 hover:text-cyan-700 bg-cyan-50 hover:bg-cyan-100 px-3 py-1.5 rounded-lg transition-colors"
    >
      {copied
        ? <><Check className="w-3.5 h-3.5 text-teal-500" /> Copied!</>
        : <><Share2 className="w-3.5 h-3.5" /> Share</>
      }
    </button>
  );
}
