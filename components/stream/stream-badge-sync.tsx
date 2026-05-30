"use client";

/**
 * Invisible client component — runs on the Home page to set/clear the
 * Streams nav badge in localStorage based on fresh stream data.
 *
 * Badge key: `clear_stream_has_badge`  →  "disputed" | "new" | absent
 * Cleared by: StreamDashboardClient on mount (visiting /stream)
 * Last-viewed key: `clear_stream_last_viewed`  →  timestamp (ms)
 */

import { useEffect } from "react";

interface Props {
  /** ISO string of the most recently updated stream record, or null if none. */
  latestUpdatedAt: string | null;
  /** True if any active stream is in 'disputed' status. */
  hasDisputed: boolean;
}

export function StreamBadgeSync({ latestUpdatedAt, hasDisputed }: Props) {
  useEffect(() => {
    if (!latestUpdatedAt) {
      localStorage.removeItem("clear_stream_has_badge");
      window.dispatchEvent(new Event("stream-badge-update"));
      return;
    }

    const lastViewed = Number(localStorage.getItem("clear_stream_last_viewed") || 0);
    const latestMs   = new Date(latestUpdatedAt).getTime();

    if (latestMs > lastViewed) {
      localStorage.setItem("clear_stream_has_badge", hasDisputed ? "disputed" : "new");
    } else {
      localStorage.removeItem("clear_stream_has_badge");
    }

    window.dispatchEvent(new Event("stream-badge-update"));
  }, [latestUpdatedAt, hasDisputed]);

  return null;
}
