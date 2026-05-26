"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function GlobalError({
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
    <html lang="en">
      <body className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 flex items-center justify-center p-6">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl shadow-slate-200/60 border border-white/80 px-8 py-10 text-center max-w-sm w-full">
          <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-5">
            <AlertTriangle className="w-7 h-7 text-red-500" />
          </div>
          <h1 className="text-xl font-semibold text-slate-800 mb-2">Something went wrong</h1>
          <p className="text-slate-500 text-sm mb-7">
            An unexpected error occurred. Try refreshing — if it keeps happening, the team has been notified.
          </p>
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 bg-gradient-to-br from-cyan-500 to-teal-500 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-md shadow-cyan-500/20 hover:from-cyan-600 hover:to-teal-600 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
