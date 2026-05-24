"use client";

import { useState } from "react";
import { ArrowLeft, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { TripCardNavSheet } from "@/components/trip/trip-card-nav-sheet";

interface Props {
  groupId: string;
  groupName: string;
}

export function GroupMobileNav({ groupId, groupName }: Props) {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <>
      <div className="h-12 px-4 flex items-center justify-between gap-3 glass-nav">
        <Link
          href="/groups"
          className="flex items-center gap-1.5 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors py-3 shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </Link>

        <p
          className="flex-1 text-center text-sm font-semibold text-slate-800 dark:text-slate-100 truncate"
          style={{ fontFamily: "var(--font-fraunces)" }}
        >
          {groupName}
        </p>

        <button
          type="button"
          onClick={() => setNavOpen(true)}
          className="flex items-center justify-center w-9 h-9 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-colors shrink-0"
          aria-label="Quick navigation"
        >
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      <TripCardNavSheet
        isOpen={navOpen}
        onClose={() => setNavOpen(false)}
        groupId={groupId}
        groupName={groupName}
      />
    </>
  );
}
