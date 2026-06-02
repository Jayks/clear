import { notFound } from "next/navigation";
import { getGroupWithMembers, getGroupsForImport, getNetworkMembers } from "@/lib/db/queries/groups";
import { getGroupName } from "@/lib/db/queries/meta";
import { Users } from "lucide-react";
import { BackButton } from "@/components/shared/back-button";
import type { Metadata } from "next";
import { MemberListClient } from "./member-list-client";
import { AddMembersSheet } from "./add-members-sheet";
import { getGroupConfig } from "@/lib/group-config";
import { getMemberNudge, getGroupPlan } from "@/lib/subscription/gates";
import { PlanNudgeBanner } from "@/components/shared/plan-nudge-banner";
import { InviteSection } from "@/components/trip/invite-section";
import { Link2 } from "lucide-react";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const name = await getGroupName(id);
  return { title: name ? `Members — ${name} | Clear` : "Clear" };
}

export default async function MembersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [data, memberNudge, sourceGroups, networkMembers, plan] = await Promise.all([
    getGroupWithMembers(id),
    getMemberNudge(id),
    getGroupsForImport(id),
    getNetworkMembers(id),
    getGroupPlan(id),
  ]);
  const isPlusUser = plan === "plus";
  if (!data) notFound();

  const { group, members, currentMember, currentUser } = data;
  const isAdmin = currentMember?.role === "admin";
  const config  = getGroupConfig(group.groupType);

  // Lowercased names already in this group — used by AddMembersSheet for dupe detection
  const existingMemberNames = new Set(
    members.map((m) => (m.displayName ?? m.guestName ?? "").toLowerCase()).filter(Boolean),
  );

  const appUrl    = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const inviteUrl = `${appUrl}/join/${group.shareToken}`;

  const currentMemberId = currentMember?.id ?? "";

  return (
    <div>
      <BackButton
        href={`/groups/${group.id}`}
        label={`Back to ${config.labels.singular.toLowerCase()}`}
        className="hidden md:inline-flex items-center gap-1.5 min-h-[44px] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-sm font-medium mb-6 transition-colors"
      />

      {memberNudge && <PlanNudgeBanner nudge={memberNudge} resource="members" />}

      {/* Spacer — replaces the title block's mb-6 on mobile */}
      <div className="mb-4 md:hidden" />

      {/* Page title — desktop only */}
      <div className="hidden md:flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center shadow-sm shadow-violet-500/30 shrink-0">
          <Users className="w-4 h-4 text-white" />
        </div>
        <h1
          className="text-2xl text-slate-800 dark:text-slate-100"
          style={{ fontFamily: "var(--font-fraunces)" }}
        >
          {config.labels.members}
        </h1>
      </div>

      {/* ── Member list ───────────────────────────────────────────────────────── */}
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
        inviteUrl={inviteUrl}
        groupName={group.name}
      />

      {/* ── Add members ───────────────────────────────────────────────────────── */}
      {isAdmin && (
        <div className="mb-4">
          <AddMembersSheet
            groupId={group.id}
            groupName={group.name}
            inviteUrl={inviteUrl}
            networkMembers={networkMembers}
            sourceGroups={sourceGroups}
            existingNames={existingMemberNames}
            isPlusUser={isPlusUser}
          />
          {/* Small secondary link to share the invite link broadly */}
          <p className="text-xs text-slate-400 dark:text-slate-500 text-center mt-2.5">
            Or{" "}
            <button
              // This button is inside an RSC so we delegate to InviteSection below
              // Using the anchor pattern keeps it accessible without client JS here
              onClick={undefined}
              type="button"
              className="text-violet-500 dark:text-violet-400 underline underline-offset-2 hover:text-violet-600 dark:hover:text-violet-300 transition-colors"
              id="scroll-to-invite"
            >
              share the invite link
            </button>{" "}
            for anyone to join.
          </p>
        </div>
      )}

      {/* ── Invite link ───────────────────────────────────────────────────────── */}
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
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
            Anyone with this link can join.
          </p>
          <InviteSection url={inviteUrl} groupName={group.name} groupId={group.id} />
        </div>
      )}
    </div>
  );
}
