"use client";

import { useState } from "react";
import { Share2, QrCode, Check } from "lucide-react";
import { toast } from "sonner";
import dynamic from "next/dynamic";

const QRCodeSVG = dynamic(
  () => import("qrcode.react").then((m) => ({ default: m.QRCodeSVG })),
  { ssr: false, loading: () => <div className="w-[200px] h-[200px] rounded-xl bg-slate-100 animate-pulse" /> }
);
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface Props {
  url: string;
  groupName: string;
  onQrOpenChange?: (open: boolean) => void;
}

const btnClass = "w-8 h-8 rounded-xl flex items-center justify-center text-white bg-black/30 hover:bg-black/50 backdrop-blur-md shadow-sm shadow-black/20 active:scale-95 transition-all";

export function TripCardShareButtons({ url, groupName, onQrOpenChange }: Props) {
  const [copied, setCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  function handleQrOpenChange(open: boolean) {
    setQrOpen(open);
    onQrOpenChange?.(open);
  }

  async function handleShare(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: groupName, text: `Join ${groupName} on Clear!`, url });
        return;
      } catch (err) {
        // User dismissed the native share sheet — don't fall through to clipboard
        if (err instanceof Error && err.name === "AbortError") return;
        // Other errors (unsupported data etc.) — fall through to clipboard copy
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

  function handleQr(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    handleQrOpenChange(true);
  }

  return (
    <>
      <button onClick={handleShare} title="Share invite link" className={btnClass}>
        {copied
          ? <Check className="w-4 h-4 text-teal-500" />
          : <Share2 className="w-4 h-4" />
        }
      </button>

      <button onClick={handleQr} title="Show QR invite code" className={btnClass}>
        <QrCode className="w-4 h-4" />
      </button>

      <Dialog open={qrOpen} onOpenChange={handleQrOpenChange}>
        <DialogContent className="glass border-white/70 dark:border-slate-700/60 max-w-xs p-6 flex flex-col items-center gap-4">
          <h3
            className="text-slate-800 dark:text-slate-100 font-semibold text-base text-center"
            style={{ fontFamily: "var(--font-fraunces)" }}
          >
            {groupName}
          </h3>
          <div className="bg-white p-4 rounded-2xl shadow-sm">
            <QRCodeSVG value={url} size={200} fgColor="#0F172A" bgColor="#FFFFFF" level="M" />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center">Scan to join this group</p>
          <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(url);
                toast.success("Invite link copied!");
              } catch {
                toast.error("Couldn't copy link");
              }
            }}
            className="w-full py-2 text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Copy invite link
          </button>
          <button
            onClick={() => handleQrOpenChange(false)}
            className="w-full py-2 text-sm font-medium text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            Close
          </button>
        </DialogContent>
      </Dialog>
    </>
  );
}
