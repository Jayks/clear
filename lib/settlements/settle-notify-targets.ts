/**
 * Pure decision logic for *who* gets notified when a member self-reports a
 * group settlement (`selfReportSettlement` in `app/actions/settlements.ts`).
 *
 * The interesting case is a **ghost/guest creditor** (`userId === null`): a guest
 * has no Clear account, so they can never tap "Confirm receipt". The only party
 * who can confirm on their behalf is a group **admin** (`canConfirm = isCreditor ||
 * (isAdmin && !isPayer)`). The original code only pushed `toMember.userId`, so a
 * non-admin paying a ghost creditor notified *nobody* and the settlement sat
 * silently pending. This helper falls the notification back to the admin(s),
 * mirroring Circle's `selfReportContribution`.
 *
 * Kept pure (no DB / no `sendPush`) so the targeting rule is unit-tested in
 * isolation.
 */

export type SettleNotifyKind = "creditor" | "admin_fallback" | "none";

export interface SettleNotifyTargets {
  kind: SettleNotifyKind;
  /** Distinct `auth.users.id` values to push to. */
  targetUserIds: string[];
}

export interface ResolveSettleNotifyParams {
  /** The creditor's `auth.users.id`, or `null` when the creditor is a ghost/guest. */
  creditorUserId: string | null;
  /** `userId` of every admin member (may include `null` for ghost admins). */
  adminUserIds: (string | null)[];
  /** The reporter's `auth.users.id` — excluded from the admin fallback so we never self-notify. */
  reporterUserId: string;
}

/**
 * Decide the push target(s) for a self-reported settlement.
 *
 * - Creditor is a Clear user → notify the creditor directly so they can confirm receipt.
 * - Creditor is a ghost (no account) → notify the admin(s), who proxy-confirm.
 *   Deduped, `null` admins dropped, and the reporter is excluded (an admin can't
 *   usefully notify themselves; admin-owes-ghost auto-confirms anyway).
 * - No eligible target → `none` (e.g. ghost creditor in a group whose only admin is
 *   the reporter, or a group with no Clear-account admin).
 */
export function resolveSettleNotifyTargets(
  params: ResolveSettleNotifyParams,
): SettleNotifyTargets {
  const { creditorUserId, adminUserIds, reporterUserId } = params;

  if (creditorUserId) {
    return { kind: "creditor", targetUserIds: [creditorUserId] };
  }

  const targetUserIds = Array.from(
    new Set(
      adminUserIds.filter(
        (id): id is string => !!id && id !== reporterUserId,
      ),
    ),
  );

  return targetUserIds.length > 0
    ? { kind: "admin_fallback", targetUserIds }
    : { kind: "none", targetUserIds: [] };
}
