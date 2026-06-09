import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { getGroupWithMembers } from "@/lib/db/queries/groups";
import { getGroupName } from "@/lib/db/queries/meta";
import { getMemberDefaultUpiIds } from "@/lib/db/queries/upi";
import { getPendingSettlements } from "@/lib/db/queries/settlements";
import { getCurrentUser } from "@/lib/db/queries/auth";
import { Skeleton } from "@/components/shared/skeleton";
import { BalancesSection } from "./balances-section";
import { Wallet } from "lucide-react";
import Link from "next/link";
import { BackButton } from "@/components/shared/back-button";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const name = await getGroupName(id);
  return { title: name ? `Settle up — ${name} | Clear` : "Clear" };
}

export default async function SettlePage({
  params,
  searchParams,
}: {
  params:       Promise<{ id: string }>;
  searchParams: Promise<{ confirm?: string }>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const confirmId = sp.confirm;

  const data = await getGroupWithMembers(id);
  if (!data) notFound();

  const { group, members, currentMember } = data;

  // Collect Clear-account userIds so we can batch-fetch their default UPI IDs
  const memberUserIds = members.map((m) => m.userId).filter((uid): uid is string => !!uid);

  // Parallel: current user identity + UPI map + pending settlements
  const [user, rawUpiMap, pendingSettlements] = await Promise.all([
    getCurrentUser(),
    getMemberDefaultUpiIds(memberUserIds),
    getPendingSettlements(id),
  ]);

  if (!user) redirect("/login");

  // Flatten UserUpiId → VPA string so we don't pass non-serialisable objects to the client
  const upiIdMap: Record<string, string | null> = Object.fromEntries(
    Object.entries(rawUpiMap).map(([uid, row]) => [uid, row?.upiId ?? null])
  );

  const appUrl    = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const settleUrl = `${appUrl}/groups/${id}/settle`;
  const inviteUrl = `${appUrl}/join/${group.shareToken}`;

  return (
    <div>
      <div className="hidden md:flex items-center gap-3 mb-6">
        <BackButton
          href={`/groups/${id}`}
          label="Back"
          className="inline-flex items-center gap-1.5 min-h-[44px] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-sm font-medium transition-colors"
        />
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center shadow-sm shadow-emerald-500/30 shrink-0">
          <Wallet className="w-4 h-4 text-white" />
        </div>
        <h1 className="text-2xl text-slate-800 dark:text-slate-100" style={{ fontFamily: "var(--font-fraunces)" }}>
          Settle up
        </h1>
      </div>

      <Suspense fallback={
        <>
          {/* SettleHeroCard — personal position */}
          <div className="glass rounded-2xl p-5 mb-6 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-10 w-36 rounded-lg" />
            <Skeleton className="h-3 w-52" />
            <div className="flex gap-2 pt-1">
              <Skeleton className="h-7 w-24 rounded-full" />
              <Skeleton className="h-7 w-20 rounded-full" />
            </div>
          </div>

          {/* DebtFlowGraph area */}
          <div className="glass rounded-2xl mb-6">
            <Skeleton className="h-56 rounded-2xl" />
          </div>

          {/* Net balances section header */}
          <div className="flex items-center gap-2.5 mb-4">
            <Skeleton className="w-6 h-6 rounded-md shrink-0" />
            <Skeleton className="h-3.5 w-28" />
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700/50" />
          </div>

          {/* Member balance rows */}
          <div className="glass rounded-2xl px-4 py-3 mb-8 space-y-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-2">
                <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                <Skeleton className="h-3.5 flex-1 max-w-[120px]" />
                <Skeleton className="h-4 w-16 shrink-0" />
              </div>
            ))}
          </div>

          {/* Minimum payments section header */}
          <div className="flex items-center gap-2.5 mb-4">
            <Skeleton className="w-6 h-6 rounded-md shrink-0" />
            <Skeleton className="h-3.5 w-40" />
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700/50" />
          </div>

          {/* Payment action cards */}
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="glass rounded-xl px-4 py-4 flex items-center gap-3">
                <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-8 w-20 rounded-xl shrink-0" />
              </div>
            ))}
          </div>
        </>
      }>
        <BalancesSection
          groupId={id}
          members={members}
          currentMemberId={currentMember?.id}
          currentUserId={user?.id}
          isAdmin={currentMember?.role === "admin"}
          currency={group.defaultCurrency}
          groupName={group.name}
          settleUrl={settleUrl}
          inviteUrl={inviteUrl}
          isNest={group.groupType === "nest"}
          upiIdMap={upiIdMap}
          pendingSettlements={pendingSettlements}
          confirmId={confirmId}
        />
      </Suspense>
    </div>
  );
}
