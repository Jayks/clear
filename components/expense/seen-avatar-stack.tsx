import type { GroupMember } from "@/lib/db/schema/group-members";
import { getMemberName } from "@/lib/utils";
import { MemberAvatar } from "@/components/shared/member-avatar";

interface SeenAvatarStackProps {
  /** Member IDs confirmed by the server as having a "seen" reaction. */
  seenMemberIds: string[];
  /** Current user's membership ID — added optimistically when seenByRsc is false. */
  currentMemberId: string;
  /** Whether the current user is already in seenMemberIds (RSC-confirmed). */
  seenByRsc: boolean;
  /** All group members — used to look up names for avatar initials. */
  members: GroupMember[];
}

const MAX_VISIBLE = 5;

export function SeenAvatarStack({
  seenMemberIds,
  currentMemberId,
  seenByRsc,
  members,
}: SeenAvatarStackProps) {
  // Build the display list. If the server hasn't confirmed the current user yet,
  // add them optimistically (they just opened the sheet and markSeenAction fired).
  const displayIds = seenByRsc
    ? seenMemberIds
    : [...seenMemberIds.filter((id) => id !== currentMemberId), currentMemberId];

  const count = displayIds.length;
  if (count === 0) return null;

  const visible = displayIds.slice(0, MAX_VISIBLE);
  const overflow = count - MAX_VISIBLE;

  return (
    <div className="flex items-center gap-1.5 mt-1.5">
      <span className="text-xs text-slate-400 dark:text-slate-500 leading-none">👁</span>

      {/* Overlapping avatar circles */}
      <div className="flex items-center">
        {visible.map((memberId, i) => {
          const member = members.find((m) => m.id === memberId);
          const name = member ? getMemberName(member) : "Member";
          return (
            <div
              key={memberId}
              className="ring-2 ring-white dark:ring-slate-900 rounded-full shrink-0"
              style={{ marginLeft: i === 0 ? 0 : -6, zIndex: visible.length - i }}
              title={name}
            >
              <MemberAvatar name={name} size="sm" />
            </div>
          );
        })}
        {overflow > 0 && (
          <div
            className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 ring-2 ring-white dark:ring-slate-900 flex items-center justify-center text-[10px] font-semibold text-slate-500 dark:text-slate-400 shrink-0"
            style={{ marginLeft: -6 }}
          >
            +{overflow}
          </div>
        )}
      </div>

      <span className="text-xs text-slate-400 dark:text-slate-500">
        Seen by {count}
      </span>
    </div>
  );
}
