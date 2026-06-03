"use client";

/**
 * UpiPayButton — Atom 1 (debtor side)
 *
 * Shows a 3-button app picker row (G Pay | PhonePe | Any UPI) plus a QR code
 * below as a universal fallback. Each button fires the appropriate deep link.
 *
 * iOS notes:
 *   - `upi://` is NOT registered on iOS → that button opens nothing on iOS.
 *   - `tez://` (G Pay) and `phonepe://` work on iOS if the app is installed.
 *   - QR scanning via camera always works on iOS → QR shown more prominently.
 *
 * onTapped signature change (Phase 8+):
 *   `onTapped(app: TappedApp)` — parent now knows which button was tapped so it
 *   can show app-specific UTR instructions in PaymentConfirmPrompt.
 *
 * Parent should use useUpiReturn(upiTapped) to detect return from the UPI app
 * and only start the PaymentConfirmPrompt countdown after the user returns.
 */

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { TappedApp } from "@/lib/payment/types";
import {
  buildGPayLink,
  buildPhonePeLink,
  buildUpiDeepLink,
  buildUpiQrContent,
  buildTransactionNote,
} from "@/lib/payment/utils";

const QRCodeSVG = dynamic(
  () => import("qrcode.react").then((m) => ({ default: m.QRCodeSVG })),
  { ssr: false },
);

interface Props {
  /** Payee's UPI Virtual Payment Address (e.g. "name@okaxis") */
  vpa: string;
  amount: number;
  currency: string;
  /** Context name appended to "Clear · " for the transaction note */
  contextName: string;
  /**
   * Called after any app-picker button is tapped.
   * Receives the tapped app so parent can show app-specific UTR instructions.
   */
  onTapped?: (app: TappedApp) => void;
  /** "md" (default) = full-size for sheets; "sm" = compact for inline card surfaces */
  size?: "sm" | "md";
}

const APP_LINKS: { label: string; app: TappedApp; buildLink: typeof buildGPayLink }[] = [
  { label: "G Pay",    app: "gpay",    buildLink: buildGPayLink    },
  { label: "PhonePe", app: "phonepe", buildLink: buildPhonePeLink  },
  { label: "Any UPI", app: "any_upi", buildLink: buildUpiDeepLink  },
];

export function UpiPayButton({
  vpa, amount, currency, contextName, onTapped, size = "md",
}: Props) {
  const [isIos, setIsIos] = useState(false);
  useEffect(() => {
    setIsIos(/iP(hone|ad|od)/.test(navigator.userAgent));
  }, []);

  const note     = buildTransactionNote(contextName);
  const qrValue  = buildUpiQrContent(vpa, amount, currency, note);
  const isSm     = size === "sm";
  const qrSize   = 160; // always 160px — smaller QRs become unscannable

  return (
    <div className="space-y-3">

      {/* ── App picker row ───────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-2">
        {APP_LINKS.map(({ label, app, buildLink }) => (
          <a
            key={app}
            href={buildLink(vpa, amount, currency, note)}
            onClick={() => onTapped?.(app)}
            className={`flex items-center justify-center rounded-xl
                        bg-gradient-to-br from-cyan-500 to-teal-500 text-white
                        hover:from-cyan-600 hover:to-teal-600 transition-all
                        shadow-sm shadow-cyan-500/20 font-semibold
                        ${isSm ? "py-2 text-[11px]" : "py-2.5 text-xs"}`}
          >
            {label} ↗
          </a>
        ))}
      </div>

      {/* ── QR code ──────────────────────────────────────────────────── */}
      {/* More prominent on iOS where deep links are less reliable       */}
      <div className={`flex flex-col items-center gap-2 ${isIos ? "" : "opacity-75"}`}>
        <div className="flex items-center gap-3 w-full">
          <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
          <span className="text-[11px] text-slate-400 dark:text-slate-500 whitespace-nowrap">
            or scan QR
          </span>
          <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
        </div>

        <div className="p-2 bg-white rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
          <QRCodeSVG
            value={qrValue}
            size={qrSize}
            fgColor="#0F172A"
            bgColor="#FFFFFF"
            level="M"
          />
        </div>

        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono text-center max-w-[220px] break-all">
          {vpa}
        </p>
      </div>

    </div>
  );
}
