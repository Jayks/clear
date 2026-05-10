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
      title="Share invite link"
      className="inline-flex items-center justify-center w-8 h-8 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-white/60 dark:bg-slate-700/60 hover:bg-white dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors"
    >
      {copied ? <Check className="w-4 h-4 text-teal-500" /> : <Share2 className="w-4 h-4" />}
    </button>
  );
}
