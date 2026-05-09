"use client";

import { useTripRealtime } from "@/hooks/use-trip-realtime";

/** Invisible component — mounts the realtime subscription for a trip. */
export function RealtimeRefresh({ tripId }: { tripId: string }) {
  useTripRealtime(tripId);
  return null;
}
