"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

const QRCodeSVG = dynamic(
  () => import("qrcode.react").then((m) => ({ default: m.QRCodeSVG })),
  { ssr: false, loading: () => <div className="w-[200px] h-[200px] rounded-xl bg-slate-100 animate-pulse" /> }
);
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { QrCode } from "lucide-react";
import { toast } from "sonner";

export function QRInvite({ url }: { url: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="shrink-0 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
        title="Show QR code"
      >
        <QrCode className="w-3.5 h-3.5" />
        QR
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="glass border-white/70 max-w-xs p-6 flex flex-col items-center gap-4">
          <h3
            className="text-slate-800 font-semibold text-sm"
            style={{ fontFamily: "var(--font-fraunces)" }}
          >
            Scan to join
          </h3>
          <div className="bg-white p-4 rounded-2xl shadow-sm">
            <QRCodeSVG
              value={url}
              size={200}
              fgColor="#0F172A"
              bgColor="#FFFFFF"
              level="M"
            />
          </div>
          <p className="text-xs text-slate-500 text-center leading-relaxed">
            Scan this QR code to join the trip, or copy the invite link below.
          </p>
          <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(url);
                toast.success("Invite link copied!");
              } catch {
                toast.error("Couldn't copy link");
              }
            }}
            className="w-full py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            Copy invite link
          </button>
        </DialogContent>
      </Dialog>
    </>
  );
}
