"use client";

import { useState } from "react";
import { Crown } from "lucide-react";
import type { GroupMember } from "@/lib/db/schema/group-members";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { MemberProfileSheet } from "@/components/shared/member-profile-sheet";
import { getMemberName } from "@/lib/utils";
import { RemoveMemberButton } from "./remove-member-button";

interface Props {
  members: GroupMember[];
  currentUserId: string;
  currentMemberId: string;
  isAdmin: boolean;
  groupId: string;
  currency: string;
}

export function MemberListClient({ members, currentUserId, currentMemberId, isAdmin, groupId, currency }: Props) {
  const [selectedMember, setSelectedMember] = useState<GroupMember | null>(null);

  return (
    <>
      <div className="glass rounded-2xl divide-y divide-white/40 dark:divide-slate-700/40 mb-4">
        {members.map((member) => {
          const isSelf = member.userId === currentUserId;
          const isAdminMember = member.role === "admin";

          return (
            <div
              key={member.id}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedMember(member)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedMember(member); } }}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/40 dark:hover:bg-slate-800/40 transition-colors first:rounded-t-2xl last:rounded-b-2xl cursor-pointer"
            >
              <MemberAvatar name={getMemberName(member)} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                  {isSelf ? `${getMemberName(member)} (you)` : getMemberName(member)}
                  {member.guestName && (
                    <span className="ml-1.5 text-xs text-slate-400 dark:text-slate-500 font-normal">guest</span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                {isAdminMember && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">
                    <Crown className="w-3 h-3" />
                    Admin
                  </span>
                )}
                {isAdmin && !isSelf && !isAdminMember && (
                  <RemoveMemberButton groupId={groupId} memberId={member.id} />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selectedMember && (
        <MemberProfileSheet
          member={selectedMember}
          groupId={groupId}
          currency={currency}
          currentMemberId={currentMemberId}
          isOpen={selectedMember !== null}
          onClose={() => setSelectedMember(null)}
        />
      )}
    </>
  );
}
