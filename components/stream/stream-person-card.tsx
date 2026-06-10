"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { SplitAmount } from "@/components/shared/split-amount";
import type { PersonSummary } from "@/lib/db/queries/stream";

interface Props {
  person:  PersonSummary;
  variant: "owed-to-me" | "i-owe";
}

const LAST_VISIT_KEY = (id: string) => `clear_stream_last_visit_${id}`;

export function StreamPersonCard({ person, variant }: Props) {
  const [dotType, setDotType] = useState<"none" | "disputed" | "new">("none");

  // Compare latestUpdatedAt against stored last-visit time after hydration
  useEffect(() => {
    const raw = localStorage.getItem(LAST_VISIT_KEY(person.personId));
    const lastVisit = raw ? Number(raw) : 0;
    const lastUpdate = new Date(person.latestUpdatedAt).getTime();

    if (lastUpdate > lastVisit) {
      setDotType(person.hasDisputed ? "disputed" : "new");
    }
  }, [person.personId, person.latestUpdatedAt, person.hasDisputed]);

  const amount    = Math.abs(person.net);
  const amountStr = formatCurrency(amount, person.currency);
  const isOwed    = variant === "owed-to-me";

  const today  = new Date();
  const latest = new Date(person.latestAt);
  const isToday =
    latest.getDate()     === today.getDate() &&
    latest.getMonth()    === today.getMonth() &&
    latest.getFullYear() === today.getFullYear();
  const dateStr  = isToday
    ? "Today"
    : latest.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
  const streamLabel = person.activeCount === 1 ? "entry" : "entries";

  return (
    <Link
      href={`/stream/${person.personId}`}
      className="glass rounded-xl px-4 py-3.5 flex items-center gap-3 hover:shadow-md transition-all group"
    >
      {/* Avatar with optional attention dot */}
      <div className="relative shrink-0">
        <MemberAvatar name={person.name} size="md" />
        {dotType !== "none" && (
          <span
            className={cn(
              "absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-white dark:ring-slate-900",
              dotType === "disputed"
                ? "bg-amber-500 dark:bg-amber-400"
                : "bg-emerald-500 dark:bg-emerald-400",
            )}
          />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
          {person.name}
        </p>
        <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">
          {person.activeCount} {streamLabel}
          {person.hasPending  && " · ⏳ pending"}
          {person.hasDisputed && " · ⚠ disputed"}
          {" · "}{dateStr}
        </p>
      </div>

      {person.hasMixedCurrencies ? (
        // Summing across currencies would be meaningless — flag it instead of
        // showing a bogus single-currency total (mirrors GroupBalanceBadge).
        <span className="text-xs font-medium text-slate-400 dark:text-slate-500 shrink-0 text-right leading-tight max-w-[84px]">
          Mixed currencies
        </span>
      ) : (
        <SplitAmount
          amount={amount}
          currency={person.currency}
          className={cn(
            "text-base font-bold tabular-nums shrink-0",
            isOwed
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-amber-600  dark:text-amber-400",
          )}
        />
      )}

      <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0 group-hover:text-slate-400 transition-colors" />
    </Link>
  );
}
