"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import { useSheetDismiss } from "@/hooks/use-sheet-dismiss";

const QRCodeSVG = dynamic(
  () => import("qrcode.react").then((m) => ({ default: m.QRCodeSVG })),
  { ssr: false, loading: () => <div className="w-[180px] h-[180px] rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" /> }
);

interface Props {
  url: string;
  groupName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function InviteQRSheet({ url, groupName, isOpen, onClose }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Escape key + Android back-button dismissal
  useSheetDismiss(isOpen, onClose);

  // Prevent iOS body scroll-through while sheet is open.
  useEffect(() => {
    if (!isOpen) return;
    const prevent = (e: TouchEvent) => e.preventDefault();
    document.addEventListener("touchmove", prevent, { passive: false });
    return () => document.removeEventListener("touchmove", prevent);
  }, [isOpen]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
            </div>

            {/* Header */}
            <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400">Scan to join</p>
              <p
                className="text-base font-semibold text-slate-800 dark:text-slate-100 truncate mt-0.5"
                style={{ fontFamily: "var(--font-fraunces)" }}
              >
                {groupName}
              </p>
            </div>

            {/* QR code */}
            <div className="flex justify-center px-5 py-6">
              <div className="bg-white p-4 rounded-2xl shadow-sm">
                <QRCodeSVG value={url} size={180} fgColor="#0F172A" bgColor="#FFFFFF" level="M" />
              </div>
            </div>

            {/* Close */}
            <div className="px-4 pb-8">
              <button
                onClick={onClose}
                className="w-full py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
