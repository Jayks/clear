import { notFound } from "next/navigation";
import { getGroupWithMembers } from "@/lib/db/queries/groups";
import { getGroupName } from "@/lib/db/queries/meta";
import { ArrowLeft, UserPlus, Users, Link2 } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { AddGuestForm } from "./add-guest-form";
import { MemberListClient } from "./member-list-client";
import { InviteSection } from "@/components/trip/invite-section";
import { getGroupConfig } from "@/lib/group-config";
import { getMemberNudge } from "@/lib/subscription/gates";
import { PlanNudgeBanner } from "@/components/shared/plan-nudge-banner";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const name = await getGroupName(id);
  return { title: name ? `Members — ${name} | Clear` : "Clear" };
}

export default async function MembersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [data, memberNudge] = await Promise.all([
    getGroupWithMembers(id),
    getMemberNudge(id),
  ]);
  if (!data) notFound();

  const { group, members, currentMember, currentUser } = data;
  const isAdmin = currentMember?.role === "admin";
  const config = getGroupConfig(group.groupType);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const inviteUrl = `${appUrl}/join/${group.shareToken}`;
  const currentMemberId = currentMember?.id ?? "";

  return (
    <div>
      <Link
        href={`/groups/${group.id}`}
        className="hidden md:inline-flex items-center gap-1.5 min-h-[44px] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-sm font-medium mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to {config.labels.singular.toLowerCase()}
      </Link>
      {memberNudge && <PlanNudgeBanner nudge={memberNudge} resource="members" />}

      {/* Spacer — replaces the title block's mb-6 on mobile */}
      <div className="mb-4 md:hidden" />
      {/* Page title — desktop only; mobile nav carries the icon + label */}
      <div className="hidden md:flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center shadow-sm shadow-violet-500/30 shrink-0">
          <Users className="w-4 h-4 text-white" />
        </div>
        <h1 className="text-2xl text-slate-800 dark:text-slate-100" style={{ fontFamily: "var(--font-fraunces)" }}>
          {config.labels.members}
        </h1>
      </div>

      {/* Member list section */}
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-6 h-6 rounded-md bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
          <Users className="w-3.5 h-3.5 text-violet-500 dark:text-violet-400" />
        </div>
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          {members.length} {members.length === 1 ? "person" : "people"}
        </span>
        <div className="flex-1 h-[1.5px] bg-gradient-to-r from-violet-200/70 to-transparent dark:from-violet-800/40 dark:to-transparent" />
      </div>
      <MemberListClient
        members={members}
        currentUserId={currentUser.id}
        currentMemberId={currentMemberId}
        isAdmin={isAdmin}
        groupId={group.id}
        currency={group.defaultCurrency}
      />

      {/* Add guest */}
      {isAdmin && (
        <div className="glass rounded-2xl p-5 mb-4">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
              <UserPlus className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            </div>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Add a guest {group.groupType === "nest" ? "mate" : "member"}
            </span>
            <div className="flex-1 h-px bg-slate-200/80 dark:bg-slate-700/50" />
          </div>
          <AddGuestForm groupId={group.id} />
        </div>
      )}

      {/* Invite link */}
      {isAdmin && (
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
              <Link2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            </div>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Invite to {config.labels.singular.toLowerCase()}
            </span>
            <div className="flex-1 h-px bg-slate-200/80 dark:bg-slate-700/50" />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Anyone with this link can join.</p>
          <InviteSection url={inviteUrl} groupName={group.name} groupId={group.id} />
        </div>
      )}
    </div>
  );
}
