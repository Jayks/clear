/**
 * Pure AND-gate for whether a group member should receive an email
 * notification. Two independent opt-outs stack: the new account-level
 * "Email notifications" switch (Settings → Notifications, default OFF —
 * `user_preferences.email_notifications_enabled`) and the existing
 * per-group `group_members.notifications_muted` unsubscribe-link flag
 * (default false = not muted). Both must clear for an email to go out.
 *
 * Extracted as its own pure, unit-tested function rather than left as an
 * inline `&&` at the one call site — the direction is easy to get backwards
 * (an accidental `||`, or forgetting the negation on `groupMuted`) and would
 * silently either spam everyone or email no one.
 */
export function isEmailEligible(params: {
  globalEnabled: boolean;
  groupMuted: boolean;
}): boolean {
  return params.globalEnabled && !params.groupMuted;
}
