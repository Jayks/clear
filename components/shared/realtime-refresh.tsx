"use client";

import { useGroupRealtime } from "@/hooks/use-trip-realtime";

/** Invisible component — mounts the realtime subscription for a group. */
export function RealtimeRefresh({ groupId }: { groupId: string }) {
  useGroupRealtime(groupId);
  return null;
}
