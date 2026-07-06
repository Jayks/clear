import type { Notification } from "@/lib/db/schema/notifications";

export type BellPanelState = "loading" | "failed" | "empty" | "list";

/**
 * Shared pure classifier for the desktop/mobile bell panel's 4-way render
 * branch (loading spinner / failed-retry copy / empty state / the actual
 * list) — extracted so the branching logic lives in exactly one tested
 * place instead of being duplicated inline in two components' JSX (Round 16
 * fixes #5/#16).
 */
export function resolveBellPanelState(
  notifications: Notification[] | null,
  loadFailed: boolean,
): BellPanelState {
  if (notifications === null) return loadFailed ? "failed" : "loading";
  if (notifications.length === 0) return "empty";
  return "list";
}
