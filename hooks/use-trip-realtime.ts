"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function useGroupRealtime(groupId: string) {
  const router = useRouter();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedRefresh = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => router.refresh(), 300);
  }, [router]);

  useEffect(() => {
    // Realtime is disabled in development to reduce Supabase free-tier load.
    // realtime.list_changes was consuming 85% of all DB CPU due to continuous
    // subscription polling — this starved application queries on the free tier.
    if (process.env.NODE_ENV !== "production") return;

    const supabase = createClient();

    const channel = supabase
      .channel(`group:${groupId}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "expenses",
        filter: `group_id=eq.${groupId}`,
      }, debouncedRefresh)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "settlements",
        filter: `group_id=eq.${groupId}`,
      }, debouncedRefresh)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "group_members",
        filter: `group_id=eq.${groupId}`,
      }, debouncedRefresh)
      // expense_splits has no group_id column — listen broadly, debounce absorbs noise
      .on("postgres_changes", {
        event: "*", schema: "public", table: "expense_splits",
      }, debouncedRefresh)
      .subscribe();

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      supabase.removeChannel(channel);
    };
  }, [groupId, debouncedRefresh]);
}
