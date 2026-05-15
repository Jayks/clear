"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { Users, Receipt, ArrowLeftRight, BarChart2, ChevronRight } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
}

const NAV_ITEMS = [
  { icon: Users,           label: "Members",   path: "members"  },
  { icon: Receipt,         label: "Expenses",  path: "expenses" },
  { icon: ArrowLeftRight,  label: "Settle Up", path: "settle"   },
  { icon: BarChart2,       label: "Insights",  path: "insights" },
];

export function TripCardNavSheet({ isOpen, onClose, groupId, groupName }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
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
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
            </div>

            <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400">Quick nav</p>
              <p
                className="text-base font-semibold text-slate-800 dark:text-slate-100 truncate mt-0.5"
                style={{ fontFamily: "var(--font-fraunces)" }}
              >
                {groupName}
              </p>
            </div>

            <div className="px-3 py-2">
              {NAV_ITEMS.map(({ icon: Icon, label, path }) => (
                <Link
                  key={path}
                  href={`/groups/${groupId}/${path}`}
                  onClick={onClose}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 active:bg-slate-100 dark:active:bg-slate-800 transition-colors"
                >
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <span className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-200">
                    {label}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </Link>
              ))}
            </div>

            <div className="px-3 pt-1 pb-8">
              <button
                onClick={onClose}
                className="w-full py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
