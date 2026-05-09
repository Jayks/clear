"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Share2, Check } from "lucide-react";

interface Props {
  url: string;
  tripName: string;
}

export function SummaryShareButton({ url, tripName }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: tripName, text: `Check out our trip — ${tripName}!`, url });
        return;
      } catch {
        // cancelled or unsupported — fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Couldn't copy link");
    }
  }

  return (
    <button
      onClick={handleShare}
      className="inline-flex items-center gap-2 bg-gradient-to-br from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white font-medium px-6 py-2.5 rounded-xl transition-all shadow-md shadow-cyan-500/25 hover:shadow-lg hover:shadow-cyan-500/30 active:scale-95"
    >
      {copied ? (
        <>
          <Check className="w-4 h-4" />
          Copied!
        </>
      ) : (
        <>
          <Share2 className="w-4 h-4" />
          Share trip summary
        </>
      )}
    </button>
  );
}
