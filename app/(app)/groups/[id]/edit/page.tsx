import { notFound } from "next/navigation";
import { getGroupWithMembers } from "@/lib/db/queries/groups";
import { Settings2 } from "lucide-react";
import Link from "next/link";
import { BackButton } from "@/components/shared/back-button";
import { EditTripForm } from "./edit-trip-form";
import { ArchiveButton } from "../archive-button";
import { ResetInviteButton } from "@/components/trip/reset-invite-button";
import { CircleWalletToggle } from "@/components/circle/circle-wallet-toggle";
import type { Metadata } from "next";
import { getGroupName } from "@/lib/db/queries/meta";
import { getGroupConfig } from "@/lib/group-config";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const name = await getGroupName(id);
  return { title: name ? `Edit — ${name} | Clear` : "Clear" };
}

export default async function EditGroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getGroupWithMembers(id, { full: true });
  if (!data) notFound();

  const { group, currentMember } = data;

  if (currentMember?.role !== "admin") notFound();

  const config = getGroupConfig(group.groupType);

  return (
    <div>
      <BackButton
        href={`/groups/${id}`}
        label={`Back to ${config.labels.singular.toLowerCase()}`}
        className="hidden md:inline-flex items-center gap-1.5 min-h-[44px] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-sm font-medium mb-6 transition-colors"
      />

      <h1 className="text-2xl text-slate-800 dark:text-slate-100 mb-1" style={{ fontFamily: "var(--font-fraunces)" }}>
        Edit {config.labels.singular.toLowerCase()}
      </h1>
      <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">{group.name}</p>

      <div className="glass rounded-2xl p-6 mb-4">
        <EditTripForm group={group} />
      </div>

      {/* Circle-specific settings */}
      {config.isCircle && (
        <div className="glass rounded-2xl p-5 mb-4">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-6 h-6 rounded-md bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
              <Settings2 className="w-3.5 h-3.5 text-violet-500 dark:text-violet-400" />
            </div>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Circle settings</span>
            <div className="animate-rule-enter flex-1 h-[1.5px] bg-gradient-to-r from-violet-200/70 to-transparent dark:from-violet-800/40 dark:to-transparent" />
          </div>
          <CircleWalletToggle
            groupId={group.id}
            walletExpensesEnabled={group.walletExpensesEnabled}
          />
        </div>
      )}

      {/* Admin actions */}
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
            <Settings2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          </div>
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Admin actions</span>
          <div className="flex-1 h-px bg-slate-200/80 dark:bg-slate-700/50" />
        </div>
        <div className="flex items-center gap-6">
          <ResetInviteButton groupId={group.id} />
          <ArchiveButton
            groupId={group.id}
            isArchived={group.isArchived}
            groupLabel={config.labels.singular}
          />
        </div>
      </div>
    </div>
  );
}
