"use client";

import { useState } from "react";
import { Link2, QrCode, Check } from "lucide-react";
import { toast } from "sonner";
import dynamic from "next/dynamic";

const QRCodeSVG = dynamic(
  () => import("qrcode.react").then((m) => ({ default: m.QRCodeSVG })),
  { ssr: false, loading: () => <div className="w-[200px] h-[200px] rounded-xl bg-slate-100 animate-pulse" /> }
);
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface Props {
  url: string;
  tripName: string;
}

export function TripCardShareButtons({ url, tripName }: Props) {
  const [copied, setCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  async function handleShareLink(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: tripName, text: `Check out our trip — ${tripName}!`, url });
        return;
      } catch {
        // user cancelled or API unsupported — fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied!");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Couldn't copy link");
    }
  }

  function handleQr(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setQrOpen(true);
  }

  return (
    <>
      <button
        onClick={handleShareLink}
        title="Share trip summary"
        className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-500 hover:bg-cyan-50 transition-colors"
      >
        {copied
          ? <Check className="w-3.5 h-3.5 text-teal-500" />
          : <Link2 className="w-3.5 h-3.5" />
        }
      </button>

      <button
        onClick={handleQr}
        title="Show QR code"
        className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-500 hover:bg-cyan-50 transition-colors"
      >
        <QrCode className="w-3.5 h-3.5" />
      </button>

      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="glass border-white/70 max-w-xs p-6 flex flex-col items-center gap-4">
          <h3
            className="text-slate-800 font-semibold text-base text-center"
            style={{ fontFamily: "var(--font-fraunces)" }}
          >
            {tripName}
          </h3>
          <div className="bg-white p-4 rounded-2xl shadow-sm">
            <QRCodeSVG value={url} size={200} fgColor="#0F172A" bgColor="#FFFFFF" level="M" />
          </div>
          <p className="text-xs text-slate-500 text-center">Scan to open the trip summary</p>
          <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(url);
                toast.success("Link copied!");
              } catch {
                toast.error("Couldn't copy link");
              }
            }}
            className="w-full py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            Copy link
          </button>
        </DialogContent>
      </Dialog>
    </>
  );
}
