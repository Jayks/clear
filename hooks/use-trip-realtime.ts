"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function useTripRealtime(tripId: string) {
  const router = useRouter();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedRefresh = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => router.refresh(), 300);
  }, [router]);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`trip:${tripId}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "expenses",
        filter: `trip_id=eq.${tripId}`,
      }, debouncedRefresh)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "settlements",
        filter: `trip_id=eq.${tripId}`,
      }, debouncedRefresh)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "trip_members",
        filter: `trip_id=eq.${tripId}`,
      }, debouncedRefresh)
      // expense_splits has no trip_id column — listen broadly, debounce absorbs noise
      .on("postgres_changes", {
        event: "*", schema: "public", table: "expense_splits",
      }, debouncedRefresh)
      .subscribe();

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      supabase.removeChannel(channel);
    };
  }, [tripId, debouncedRefresh]);
}
