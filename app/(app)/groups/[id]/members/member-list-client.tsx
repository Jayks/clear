"use client";

import { useState } from "react";
import { Crown, Clock, Share2 } from "lucide-react";
import type { GroupMember } from "@/lib/db/schema/group-members";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { MemberProfileSheet } from "@/components/shared/member-profile-sheet";
import { getMemberName } from "@/lib/utils";
import { RemoveMemberButton } from "./remove-member-button";
import { toast } from "sonner";

interface Props {
  members: GroupMember[];
  currentUserId: string;
  currentMemberId: string;
  isAdmin: boolean;
  groupId: string;
  currency: string;
  // Passed so ghost-member rows can share a personalised invite link
  inviteUrl: string;
  groupName: string;
}

export function MemberListClient({
  members,
  currentUserId,
  currentMemberId,
  isAdmin,
  groupId,
  currency,
  inviteUrl,
  groupName,
}: Props) {
  const [selectedMember, setSelectedMember] = useState<GroupMember | null>(null);

  async function shareInviteFor(name: string) {
    const text = `Hey ${name}! You've been added to "${groupName}" on Clear.`;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: `Join ${groupName} on Clear`, text, url: inviteUrl });
        return;
      } catch (err) {
        // AbortError = user dismissed — that's fine. Other errors fall through.
        if (err instanceof Error && err.name === "AbortError") return;
      }
    }
    // Fallback: open WhatsApp with pre-filled message
    const wa = `https://wa.me/?text=${encodeURIComponent(`${text} Join here: ${inviteUrl}`)}`;
    window.open(wa, "_blank");
  }

  async function shareInviteGeneric() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast.success("Invite link copied!");
    } catch {
      const wa = `https://wa.me/?text=${encodeURIComponent(`Join "${groupName}" on Clear: ${inviteUrl}`)}`;
      window.open(wa, "_blank");
    }
  }

  return (
    <>
      <div className="glass rounded-2xl divide-y divide-white/40 dark:divide-slate-700/40 mb-4">
        {members.map((member) => {
          const isSelf        = member.userId === currentUserId;
          const isAdminMember = member.role === "admin";
          // Ghost = has guestName and no userId — not yet joined via invite link
          const isGhost       = !!member.guestName && !member.userId;

          return (
            <div
              key={member.id}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedMember(member)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSelectedMember(member);
                }
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/40 dark:hover:bg-slate-800/40 transition-colors first:rounded-t-2xl last:rounded-b-2xl cursor-pointer"
            >
              <MemberAvatar name={getMemberName(member)} size="sm" />

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                  {isSelf ? `${getMemberName(member)} (you)` : getMemberName(member)}
                </p>
                {/* "Not joined" chip — shown only for ghost members who haven't claimed yet */}
                {isGhost && (
                  <span className="inline-flex items-center gap-1 mt-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                    <Clock className="w-3 h-3" />
                    Not joined yet
                  </span>
                )}
              </div>

              {/* Right-hand actions — stop propagation so row click doesn't open profile sheet */}
              <div
                className="flex items-center gap-1.5"
                onClick={(e) => e.stopPropagation()}
              >
                {isAdminMember && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">
                    <Crown className="w-3 h-3" />
                    Admin
                  </span>
                )}

                {/* Per-ghost share button — admin only */}
                {isGhost && isAdmin && (
                  <button
                    type="button"
                    onClick={() => shareInviteFor(member.guestName!)}
                    title="Share invite link"
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-violet-500 dark:hover:text-violet-400 transition-colors"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
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
