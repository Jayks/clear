/**
 * Pure guards for member-management server actions.
 *
 * Kept DB-free so they can be unit-tested in isolation and reused across actions.
 */

export interface MemberRoleRow {
  id: string;
  role: "admin" | "member";
}

/**
 * Invariant: a group must always retain at least one admin.
 *
 * Returns `{ ok: false }` when removing `targetMemberId` would leave the group
 * with zero admins (i.e. the target is the only admin). Removing a non-admin, or
 * an admin while at least one other admin remains, is always allowed.
 */
export function canRemoveMember(
  members: MemberRoleRow[],
  targetMemberId: string,
): { ok: true } | { ok: false; error: string } {
  const target = members.find((m) => m.id === targetMemberId);
  if (!target) return { ok: false, error: "Member not found" };

  if (target.role === "admin") {
    const otherAdmins = members.filter(
      (m) => m.role === "admin" && m.id !== targetMemberId,
    ).length;
    if (otherAdmins === 0) {
      return {
        ok: false,
        error: "Can't remove the last admin — make someone else an admin first.",
      };
    }
  }

  return { ok: true };
}
