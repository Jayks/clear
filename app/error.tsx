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
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-7 h-7 text-red-500" />
          </div>
          <h1 className="text-xl font-semibold text-slate-800 mb-2">Something went wrong</h1>
          <p className="text-slate-500 text-sm mb-6">
            An unexpected error occurred. Try refreshing — if it persists, the team has been notified.
          </p>
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 bg-gradient-to-br from-cyan-500 to-teal-500 text-white text-sm font-medium px-5 py-2.5 rounded-xl shadow-md shadow-cyan-500/20 hover:from-cyan-600 hover:to-teal-600 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
