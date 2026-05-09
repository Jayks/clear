"use client";

import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  trigger: React.ReactNode;
  title: string;
  description: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => Promise<void> | void;
}

export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = "Confirm",
  destructive = false,
  onConfirm,
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    await onConfirm();
    setLoading(false);
    setOpen(false);
  }

  return (
    <>
      <span onClick={() => setOpen(true)} className="contents">{trigger}</span>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="glass border-white/70 max-w-sm p-6">
          <div className="flex gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              destructive ? "bg-red-50" : "bg-amber-50"
            }`}>
              <AlertTriangle className={`w-5 h-5 ${destructive ? "text-red-500" : "text-amber-500"}`} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-slate-800 mb-1">{title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
            </div>
          </div>

          <div className="flex gap-2 mt-5 justify-end">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={loading}
              className={`px-4 py-2 text-sm font-medium text-white rounded-xl transition-colors disabled:opacity-50 ${
                destructive
                  ? "bg-red-500 hover:bg-red-600"
                  : "bg-gradient-to-br from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600"
              }`}
            >
              {loading ? "…" : confirmLabel}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
