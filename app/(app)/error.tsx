"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, ArrowLeft } from "lucide-react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center px-6">
      <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mb-5">
        <AlertTriangle className="w-7 h-7 text-red-400" />
      </div>
      <h2 className="text-xl font-semibold text-slate-800 mb-2">Something went wrong</h2>
      <p className="text-slate-500 text-sm max-w-xs mb-6">
        This page ran into an unexpected error. You can try again or go back to your trips.
      </p>
      <div className="flex items-center gap-3">
        <Link
          href="/groups"
          className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-700 text-sm font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to groups
        </Link>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 bg-gradient-to-br from-cyan-500 to-teal-500 text-white text-sm font-medium px-4 py-2 rounded-xl shadow-sm shadow-cyan-500/20 hover:from-cyan-600 hover:to-teal-600 transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Try again
        </button>
      </div>
    </div>
  );
}
