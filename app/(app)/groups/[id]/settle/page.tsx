import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getGroupWithMembers } from "@/lib/db/queries/groups";
import { getGroupName } from "@/lib/db/queries/meta";
import { Skeleton } from "@/components/shared/skeleton";
import { BalancesSection } from "./balances-section";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const name = await getGroupName(id);
  return { title: name ? `Settle up — ${name} | Clear` : "Clear" };
}

export default async function SettlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getGroupWithMembers(id);
  if (!data) notFound();

  const { group, members, currentMember } = data;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const settleUrl = `${appUrl}/groups/${id}/settle`;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={`/groups/${id}`}
          className="inline-flex items-center gap-1.5 min-h-[44px] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-sm font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
        <h1 className="text-2xl text-slate-800 dark:text-slate-100" style={{ fontFamily: "var(--font-fraunces)" }}>
          Settle up
        </h1>
      </div>

      <Suspense fallback={
        <>
          <Skeleton className="h-4 w-20 mb-3" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="glass rounded-xl px-4 py-3 flex items-center gap-3">
                <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-5 w-16 shrink-0" />
              </div>
            ))}
          </div>
          <Skeleton className="h-4 w-36 mb-3" />
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-xl" />
            ))}
          </div>
        </>
      }>
        <BalancesSection
          groupId={id}
          members={members}
          currentMemberId={currentMember?.id}
          currency={group.defaultCurrency}
          groupName={group.name}
          settleUrl={settleUrl}
          isNest={group.groupType === "nest"}
        />
      </Suspense>
    </div>
  );
}
