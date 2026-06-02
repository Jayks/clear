"use client";

import { useState } from "react";
import { Share2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

interface Props {
  /** Name of the person paying */
  fromName:  string;
  /** Name of the person receiving */
  toName:    string;
  amount:    number;
  currency:  string;
  /** "owe" = current user is the payer · "owed" = current user is the recipient */
  direction: "owe" | "owed";
  groupName: string;
  settleUrl: string;
}

export function SettleShareButton({
  fromName,
  toName,
  amount,
  currency,
  direction,
  groupName,
  settleUrl,
}: Props) {
  const [loading, setLoading] = useState(false);

  const formattedAmount = formatCurrency(amount, currency);
  // URL is embedded in the text body so WhatsApp auto-links it (caption links aren't clickable in media shares)
  const shareText =
    direction === "owe"
      ? `I owe ${toName} ${formattedAmount} for ${groupName}. Tracked on Clear 💸\n${settleUrl}`
      : `${fromName} owes me ${formattedAmount} for ${groupName}. Tracked on Clear 💸\n${settleUrl}`;

  const imageUrl =
    `/api/settle-card?` +
    new URLSearchParams({
      amount:    String(amount),
      currency,
      direction,
      group:     groupName,
      from:      fromName,
      to:        toName,
    }).toString();

  async function handleShare() {
    setLoading(true);
    try {
      if (typeof navigator.share === "function") {
        // ── Try image share first (iOS Safari + Android Chrome) ────────────
        try {
          const res  = await fetch(imageUrl);
          const blob = await res.blob();
          const file = new File([blob], "clear-settle.png", { type: "image/png" });

          if (navigator.canShare?.({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: "Clear – Settle Up",
              text:  shareText,
              // url omitted — already embedded in shareText so WhatsApp renders it as a clickable link
            });
            return;
          }
        } catch {
          // Image fetch or files share unsupported — fall through
        }

        // ── Text + URL share (Android fallback) ─────────────────────────────
        try {
          await navigator.share({ title: "Clear – Settle Up", text: shareText });
          return;
        } catch (e: unknown) {
          if (e instanceof Error && e.name === "AbortError") return; // user dismissed
        }
      }

      // ── Desktop fallback: copy to clipboard ──────────────────────────────
      await navigator.clipboard.writeText(shareText);
      toast.success("Copied to clipboard!");
    } catch {
      toast.error("Couldn't share — try copying the link manually.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      disabled={loading}
      className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-cyan-600 dark:text-slate-400 dark:hover:text-cyan-400 bg-slate-50 hover:bg-cyan-50 dark:bg-slate-800 dark:hover:bg-cyan-900/20 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 shrink-0"
      aria-label="Share this payment"
    >
      {loading
        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
        : <Share2  className="w-3.5 h-3.5" />
      }
      Share
    </button>
  );
}
