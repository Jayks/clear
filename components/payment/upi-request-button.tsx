"use client";

/**
 * UpiRequestButton — Atom 2 (creditor side)
 *
 * Lets the person who is OWED money request payment from the debtor.
 *
 * Share priority (per plan):
 *   1. Web Share API  — `navigator.share()` → iOS/Android native share sheet
 *                        (user picks WhatsApp / Telegram / iMessage / etc.)
 *   2. Clipboard copy — fallback when Web Share API unavailable
 *   3. WhatsApp link  — explicit secondary option below the primary button
 */

import { useEffect, useState } from "react";
import { Share2, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import {
  buildPaymentPageUrl,
  buildWhatsAppRequestUrl,
} from "@/lib/payment/utils";

interface Props {
  /** The Clear user ID of the person who should receive payment */
  payeeUserId: string;
  /** Display name of the payee (used in share message copy) */
  payeeName: string;
  amount: number;
  currency: string;
  /** Context name shown in the share message (e.g. "Goa Trip") */
  contextName: string;
  /** Optional group ID — included as `ref` param on /pay page for back-link */
  groupId?: string;
  /** "md" (default) = full-size for sheets; "sm" = compact for inline card surfaces */
  size?: "sm" | "md";
}

export function UpiRequestButton({
  payeeUserId, payeeName, amount, currency, contextName, groupId, size = "md",
}: Props) {
  const [canShare, setCanShare] = useState(false);
  const [copied,   setCopied]   = useState(false);

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && !!navigator.share);
  }, []);

  const isSm    = size === "sm";
  const pageUrl = buildPaymentPageUrl(payeeUserId, amount, currency, contextName, groupId);
  const shareText =
    `Hey! Pay me ${formatCurrency(amount, currency)} for ${contextName}. Open Clear to pay:`;
  const firstName = payeeName.split(" ")[0];

  // WhatsApp message text — used for the secondary link
  const waMessage = `Hi! ${firstName} is requesting ${formatCurrency(amount, currency)} for ${contextName}. Pay instantly via Clear:\n${pageUrl}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(pageUrl);
      setCopied(true);
      toast.success("Payment link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy link");
    }
  }

  async function handleShare() {
    if (canShare) {
      try {
        await navigator.share({
          title: `${formatCurrency(amount, currency)} payment request`,
          text:  shareText,
          url:   pageUrl,
        });
      } catch (err: unknown) {
        // AbortError = user dismissed the native sheet — not an error
        if (err instanceof Error && err.name !== "AbortError") {
          await handleCopy();
        }
      }
    } else {
      await handleCopy();
    }
  }

  return (
    <div className="space-y-2">

      {/* ── Primary action ───────────────────────────────────────────── */}
      <button
        type="button"
        onClick={handleShare}
        className={`w-full flex items-center justify-center gap-2
                    rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500
                    hover:from-emerald-600 hover:to-teal-600
                    text-white font-semibold transition-all
                    shadow-sm shadow-emerald-500/20
                    ${isSm ? "py-2 text-xs" : "py-2.5 text-sm"}`}
      >
        {canShare ? (
          <><Share2 className={isSm ? "w-3.5 h-3.5" : "w-4 h-4"} /> Request payment ↗</>
        ) : copied ? (
          <><Check  className={isSm ? "w-3.5 h-3.5" : "w-4 h-4"} /> Link copied!</>
        ) : (
          <><Copy   className={isSm ? "w-3.5 h-3.5" : "w-4 h-4"} /> Copy payment link</>
        )}
      </button>

      {/* ── Secondary: WhatsApp ──────────────────────────────────────── */}
      <a
        href={buildWhatsAppRequestUrl(waMessage)}
        target="_blank"
        rel="noopener noreferrer"
        className={`block w-full text-center text-slate-400 dark:text-slate-500
                    hover:text-emerald-600 dark:hover:text-emerald-400
                    transition-colors
                    ${isSm ? "text-[10px]" : "text-[11px]"}`}
      >
        or share on WhatsApp →
      </a>

    </div>
  );
}
