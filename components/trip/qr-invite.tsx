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
        title="Show QR code"
        className="inline-flex items-center justify-center w-8 h-8 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-white/60 dark:bg-slate-700/60 hover:bg-white dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors"
      >
        <QrCode className="w-4 h-4" />
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
            className="w-full py-2 text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
          >
            Copy invite link
          </button>
        </DialogContent>
      </Dialog>
    </>
  );
}
