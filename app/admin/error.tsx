"use client";

import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { ErrorCard } from "@/components/shared/error-card";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // `requirePlatformAdmin()` throws "Forbidden" — surface that distinctly in dev.
  // (In production the message is stripped to a digest; this branch is best-effort.)
  if (error.message === "Forbidden") {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
          <ShieldAlert className="w-7 h-7 text-red-500" />
        </div>
        <div>
          <p className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-1">
            Access denied
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Your account doesn&apos;t have platform admin access.
          </p>
        </div>
        <Link
          href="/groups"
          className="text-sm text-cyan-600 dark:text-cyan-400 hover:underline"
        >
          Back to groups
        </Link>
      </div>
    );
  }

  return (
    <ErrorCard error={error} reset={reset} backHref="/groups" backLabel="Back to groups" />
  );
}
