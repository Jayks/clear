"use client";

import { useState } from "react";
import { Wallet, ExternalLink, X } from "lucide-react";

interface Props {
  amount: number;
  currency: string;
  toName: string;
}

export function UpiPayButton({ amount, currency, toName }: Props) {
  const [open, setOpen] = useState(false);
  const [upiId, setUpiId] = useState("");

  function handleOpen() {
    if (!upiId.trim()) return;

    const params = new URLSearchParams({
      pa: upiId.trim(),
      pn: toName,
      am: amount.toFixed(2),
      cu: currency,
      tn: `Clear settlement`,
    });

    window.location.href = `upi://pay?${params.toString()}`;
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="shrink-0 inline-flex items-center gap-1.5 text-xs font-medium text-cyan-600 hover:text-cyan-700 bg-cyan-50 hover:bg-cyan-100 px-3 py-1.5 rounded-lg transition-colors"
        title="Pay via UPI"
      >
        <Wallet className="w-3.5 h-3.5" />
        Pay UPI
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5 w-full sm:w-auto">
      <input
        autoFocus
        value={upiId}
        onChange={(e) => setUpiId(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") handleOpen(); if (e.key === "Escape") setOpen(false); }}
        placeholder={`${toName.split(" ")[0].toLowerCase()}@gpay`}
        className="flex-1 sm:w-36 px-2 py-1.5 text-xs rounded-lg border border-cyan-200 bg-white/80 dark:bg-slate-800/80 dark:border-cyan-900 focus:outline-none focus:ring-2 focus:ring-cyan-400 placeholder:text-slate-400"
      />
      <button
        onClick={handleOpen}
        disabled={!upiId.trim()}
        className="inline-flex items-center gap-1 text-xs font-medium text-white bg-gradient-to-br from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 px-2.5 py-1.5 rounded-lg transition-all disabled:opacity-50"
      >
        <ExternalLink className="w-3 h-3" />
        Open
      </button>
      <button
        onClick={() => setOpen(false)}
        className="text-slate-400 hover:text-slate-600 transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
