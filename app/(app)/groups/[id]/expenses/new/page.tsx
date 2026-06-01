import { notFound, redirect } from "next/navigation";
import { getGroupWithMembers } from "@/lib/db/queries/groups";
import { canUseNonEqualSplit } from "@/lib/subscription/gates";
import { getGroupConfig } from "@/lib/group-config";
import { Receipt, Coins } from "lucide-react";
import { BackButton } from "@/components/shared/back-button";
import Link from "next/link";
import { AddExpenseForm } from "./add-expense-form";
import { AddCircleExpenseForm } from "@/components/circle/add-circle-expense-form";

export default async function NewExpensePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const [{ id }, { from }] = await Promise.all([params, searchParams]);
  const [data, nonEqualAllowed] = await Promise.all([
    getGroupWithMembers(id),
    canUseNonEqualSplit(id),
  ]);
  if (!data) notFound();

  const { group, members, currentMember } = data;
  const config   = getGroupConfig(group.groupType);
  const backHref = from === "groups" ? "/groups" : `/groups/${id}/expenses`;
  const backLabel = from === "groups" ? "Home" : "Back to expenses";

  // ── Circle: admin-only pool expense form ──────────────────────────────────
  if (config.isCircle) {
    // Non-admins cannot log pool expenses
    if (currentMember?.role !== "admin") {
      redirect(`/groups/${id}`);
    }

    return (
      <div>
        <div className="hidden md:flex items-center gap-2 mb-6">
          <BackButton
            href={backHref}
            label={backLabel}
            className="inline-flex items-center gap-1.5 min-h-[44px] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-sm font-medium transition-colors"
          />
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm shadow-violet-500/30 shrink-0">
              <Coins className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-2xl text-slate-800 dark:text-slate-100" style={{ fontFamily: "var(--font-fraunces)" }}>
              Log wallet expense
            </h1>
          </div>
        </div>

        <div className="glass rounded-2xl p-6">
          <AddCircleExpenseForm group={group} />
        </div>
      </div>
    );
  }

  // ── Trip / Nest: standard expense form ────────────────────────────────────
  return (
    <div>
      {/* Desktop header — mobile nav carries the icon + title */}
      <div className="hidden md:flex items-center gap-2 mb-6">
        <BackButton
          href={backHref}
          label={backLabel}
          className="inline-flex items-center gap-1.5 min-h-[44px] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-sm font-medium transition-colors"
        />
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center shadow-sm shadow-cyan-500/30 shrink-0">
            <Receipt className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-2xl text-slate-800 dark:text-slate-100" style={{ fontFamily: "var(--font-fraunces)" }}>
            Add expense
          </h1>
        </div>
      </div>

      <div className="glass rounded-2xl p-6">
        <AddExpenseForm group={group} members={members} canUseNonEqual={nonEqualAllowed} currentMemberId={currentMember?.id} />
      </div>
    </div>
  );
}
