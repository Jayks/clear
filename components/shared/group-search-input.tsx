"use client";

/**
 * GroupSearchInput — filters group cards on the Home page by name.
 * Uses data-group-name attributes injected on each TripCard wrapper.
 * Only renders when total group count exceeds GROUP_SEARCH_THRESHOLD.
 */

import { useState, useEffect } from "react";
import { Search, X } from "lucide-react";

const GROUP_SEARCH_THRESHOLD = 5;

export function GroupSearchInput({ totalCount }: { totalCount: number }) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    const q = query.toLowerCase().trim();

    document.querySelectorAll<HTMLElement>("[data-group-card]").forEach((el) => {
      const name = el.dataset.groupName?.toLowerCase() ?? "";
      el.style.display = !q || name.includes(q) ? "" : "none";
    });

    // Hide/show section wrappers when all their cards are hidden
    document.querySelectorAll<HTMLElement>("[data-group-section]").forEach((section) => {
      const cards   = section.querySelectorAll<HTMLElement>("[data-group-card]");
      const visible = Array.from(cards).some((c) => c.style.display !== "none");
      section.style.display = visible ? "" : "none";
    });
  }, [query]);

  if (totalCount <= GROUP_SEARCH_THRESHOLD) return null;

  return (
    <div className="relative mb-5">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
      <input
        type="text"
        placeholder="Search groups…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full pl-9 pr-8 py-2.5 rounded-xl
                   border border-slate-200 dark:border-slate-700
                   bg-white/60 dark:bg-slate-800/60
                   text-sm text-slate-800 dark:text-slate-100
                   placeholder:text-slate-400 focus:outline-none
                   focus:ring-2 focus:ring-cyan-400/50 dark:focus:ring-cyan-600/50
                   transition"
      />
      {query && (
        <button
          type="button"
          onClick={() => setQuery("")}
          className="absolute right-3 top-1/2 -translate-y-1/2
                     text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
