"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { CountUp } from "@/components/shared/count-up";
import { MemberProfileSheet } from "@/components/shared/member-profile-sheet";
import { AnimatedList } from "@/components/shared/animated-list";
import type { GroupMember } from "@/lib/db/schema/group-members";
import { getMemberName } from "@/lib/utils";

interface Balance {
  memberId: string;
  displayName: string;
  net: number;
}

interface Props {
  balances: Balance[];
  members: GroupMember[];
  currentMemberId: string | undefined;
  currency: string;
  groupId: string;
}

export function BalanceCardsClient({ balances, members, currentMemberId, currency, groupId }: Props) {
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  const selectedMember = selectedMemberId
    ? members.find((m) => m.id === selectedMemberId) ?? null
    : null;

  const selectedBalance = selectedMemberId
    ? balances.find((b) => b.memberId === selectedMemberId)?.net
    : undefined;

  return (
    <>
      <AnimatedList className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-8" staggerMs={60}>
        {balances.map((b) => {
          const isPositive = b.net > 0;
          const isZero = b.net === 0;
          return (
            <button
              key={b.memberId}
              type="button"
              onClick={() => setSelectedMemberId(b.memberId)}
              className="glass rounded-xl px-4 py-3 flex items-center gap-3 text-left hover:shadow-md transition-shadow w-full"
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                isZero
                  ? "bg-slate-100 dark:bg-slate-800"
                  : isPositive
                  ? "bg-emerald-100 dark:bg-emerald-900/30"
                  : "bg-red-100 dark:bg-red-900/30"
              }`}>
                {isZero
                  ? <Minus className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                  : isPositive
                  ? <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  : <TrendingDown className="w-4 h-4 text-red-500 dark:text-red-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{b.displayName}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isZero ? "Settled" : isPositive ? "is owed" : "owes"}
                </p>
              </div>
              {isZero ? (
                <span className="text-base font-semibold text-slate-400 dark:text-slate-500 shrink-0" style={{ fontFamily: "var(--font-fraunces)" }}>—</span>
              ) : (
                <CountUp
                  value={Math.abs(b.net)}
                  currency={currency}
                  className={`text-base font-semibold tabular shrink-0 ${isPositive ? "text-emerald-600" : "text-red-500"}`}
                />
              )}
            </button>
          );
        })}
      </AnimatedList>

      {selectedMember && (
        <MemberProfileSheet
          member={selectedMember}
          groupId={groupId}
          currency={currency}
          currentMemberId={currentMemberId ?? ""}
          netBalance={selectedBalance}
          isOpen={selectedMember !== null}
          onClose={() => setSelectedMemberId(null)}
        />
      )}
    </>
  );
}
