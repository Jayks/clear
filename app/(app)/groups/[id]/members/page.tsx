import { notFound } from "next/navigation";
import { getGroupWithMembers } from "@/lib/db/queries/groups";
import { getGroupName } from "@/lib/db/queries/meta";
import { ArrowLeft, Crown, UserPlus } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { getMemberName } from "@/lib/utils";
import { AddGuestForm } from "./add-guest-form";
import { QRInvite } from "@/components/trip/qr-invite";
import { ShareButton } from "../share-button";
import { RemoveMemberButton } from "./remove-member-button";
import { RegenerateTokenButton } from "./regenerate-token-button";
import { getGroupConfig } from "@/lib/group-config";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const name = await getGroupName(id);
  return { title: name ? `Members — ${name} | Clear` : "Clear" };
}

export default async function MembersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getGroupWithMembers(id);
  if (!data) notFound();

  const { group, members, currentMember, currentUser } = data;
  const isAdmin = currentMember?.role === "admin";
  const config = getGroupConfig(group.groupType);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const inviteUrl = `${appUrl}/join/${group.shareToken}`;

  return (
    <div className="max-w-xl mx-auto">
      <Link
        href={`/groups/${group.id}`}
        className="inline-flex items-center gap-1.5 min-h-[44px] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-sm font-medium mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to {config.labels.singular.toLowerCase()}
      </Link>

      <h1 className="text-2xl text-slate-800 dark:text-slate-100 mb-1" style={{ fontFamily: "var(--font-fraunces)" }}>
        {config.labels.members}
      </h1>
      <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">{group.name}</p>

      {/* Member list */}
      <div className="glass rounded-2xl divide-y divide-white/40 dark:divide-slate-700/40 mb-4">
        {members.map((member) => {
          const isSelf = member.userId === currentUser.id;
          const isAdminMember = member.role === "admin";

          return (
            <div key={member.id} className="flex items-center gap-3 px-4 py-3">
              <MemberAvatar name={getMemberName(member)} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                  {isSelf ? `${getMemberName(member)} (you)` : getMemberName(member)}
                  {member.guestName && (
                    <span className="ml-1.5 text-xs text-slate-400 dark:text-slate-500 font-normal">guest</span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isAdminMember && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">
                    <Crown className="w-3 h-3" />
                    Admin
                  </span>
                )}
                {isAdmin && !isSelf && !isAdminMember && (
                  <RemoveMemberButton groupId={group.id} memberId={member.id} />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add guest */}
      {isAdmin && (
        <div className="glass rounded-2xl p-5 mb-4">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-cyan-500" />
            Add a guest {group.groupType === "nest" ? "mate" : "member"}
          </h2>
          <AddGuestForm groupId={group.id} />
        </div>
      )}

      {/* Invite link */}
      {isAdmin && (
        <div className="glass rounded-2xl p-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Invite to {config.labels.singular.toLowerCase()}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Anyone with this link can join.</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <ShareButton url={inviteUrl} tripName={group.name} />
              <QRInvite url={inviteUrl} />
            </div>
          </div>
          <RegenerateTokenButton groupId={group.id} inviteUrl={inviteUrl} />
        </div>
      )}
    </div>
  );
}
