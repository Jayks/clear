/**
 * Central registry for all localStorage keys used by the onboarding workstream.
 * Prevents typos and makes it easy to audit what this workstream writes to localStorage.
 */
export const ONBOARDING_KEYS = {
  SETTLE_HINT:          "clear_settle_hint_done",
  CIRCLE_ORIENT_ADMIN:  (groupId: string) => `clear_circle_orient_admin_${groupId}`,
  CIRCLE_ORIENT_MEMBER: (groupId: string) => `clear_circle_orient_member_${groupId}`,
  CIRCLE_FIRST_RUN:     (groupId: string) => `clear_circle_first_run_dismissed_${groupId}`,
  SCAN_GLOW_DISMISSED:  "clear_scan_glow_done",
  WHATS_NEW_SEEN:       (version: string) => `clear_whats_new_seen_${version}`,
  NOTIFY_PROMPTED:      "clear_notification_prompted",
  POST_JOIN_SEEN:       (groupId: string) => `clear_post_join_seen_${groupId}`,
  /** Written once on first session load; used by WhatsNewBanner to detect returning users. */
  FIRST_SEEN:           "clear_first_seen",
} as const;
