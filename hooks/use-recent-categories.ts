"use client";

import { useState, useCallback, useEffect } from "react";

const STORAGE_KEY: Record<string, string> = {
  trip: "clear_recent_categories_trip",
  nest: "clear_recent_categories_nest",
};

const MAX_RECENTS = 3;

export function useRecentCategories(groupType: string) {
  const key = STORAGE_KEY[groupType] ?? "clear_recent_categories_trip";

  // Start with [] on both server and client to avoid hydration mismatch.
  // Populate from localStorage in useEffect (after hydration) — same pattern as
  // RepeatTripPrompt and SettledCelebration per CLAUDE.md.
  const [recents, setRecents] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = (JSON.parse(localStorage.getItem(key) ?? "[]") as string[]).slice(0, MAX_RECENTS);
      setRecents(stored);
    } catch {
      // noop — malformed localStorage value; stay with []
    }
  }, [key]);

  const addRecent = useCallback(
    (category: string) => {
      // "other" is too generic to be a useful recent
      if (category === "other") return;
      setRecents((prev) => {
        const next = [category, ...prev.filter((c) => c !== category)].slice(0, MAX_RECENTS);
        try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* noop */ }
        return next;
      });
    },
    [key],
  );

  return [recents, addRecent] as const;
}
