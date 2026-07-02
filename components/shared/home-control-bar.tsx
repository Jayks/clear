"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Search, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { resolveHomeTab, type HomeView } from "@/lib/home/initial-view";

const TAB_KEY = "clear_home_tab";

interface Props {
  activeCount:     number;
  archivedCount:   number;
  sampleCount:     number;
  /** true when active groups > 5 — controls whether search icon appears */
  showSearch:      boolean;
  activeContent:   React.ReactNode;
  archivedContent: React.ReactNode;
  sampleContent:   React.ReactNode;
}

/**
 * Unified home page control bar — underline tabs + inline search.
 *
 * Search states:
 *   idle    — [Active ━━] [Archived · N]              [🔍]
 *   open    — [🔍 Search groups…                       ✕]
 *   chipped — [Active ━━] [Archived · N]  [🔍 goa  ×]   ← filter active, search collapsed
 *
 * Blur behaviour:
 *   • Empty query  → close search, no chip (accidental open)
 *   • Has query    → collapse to filter chip (filter stays active, tabs return)
 *
 * Switching tabs clears any active filter automatically.
 */
export function HomeControlBar({
  activeCount,
  archivedCount,
  sampleCount,
  showSearch,
  activeContent,
  archivedContent,
  sampleContent,
}: Props) {
  const [view, setView]         = useState<HomeView>("active");
  const [searching, setSearching] = useState(false);
  const [query, setQuery]       = useState("");
  const inputRef                = useRef<HTMLInputElement>(null);

  // Restore the last tab on mount (so create→back returns you where you were).
  // The loader writes "sample" here after seeding so you land on your samples.
  // Read in an effect (not during render) to stay SSR-safe.
  useEffect(() => {
    let storedTab: string | null = null;
    try {
      storedTab = sessionStorage.getItem(TAB_KEY);
    } catch {
      /* private mode */
    }
    setView(resolveHomeTab({ storedTab, hasArchived: archivedCount > 0, hasSample: sampleCount > 0 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Guard a now-empty tab (e.g. samples removed while viewing them).
  const validView: HomeView =
    view === "sample" && sampleCount === 0 ? "active"
    : view === "archived" && archivedCount === 0 ? "active"
    : view;

  // Tabs present beyond Active. Order: Active · Archived · Sample.
  const tabs: { key: HomeView; label: string; count: number }[] = [
    { key: "active", label: "Active", count: activeCount },
    ...(archivedCount > 0 ? [{ key: "archived" as const, label: "Archived", count: archivedCount }] : []),
    ...(sampleCount   > 0 ? [{ key: "sample"   as const, label: "Sample",   count: sampleCount   }] : []),
  ];

  const showTabs = tabs.length > 1;
  const showBar  = showTabs || showSearch;

  // ── Filter logic ──────────────────────────────────────────────────────────

  const applyFilter = useCallback((q: string) => {
    const lower = q.toLowerCase().trim();
    document.querySelectorAll<HTMLElement>("[data-group-card]").forEach((card) => {
      const name = card.dataset.groupName ?? "";
      card.style.display = !lower || name.includes(lower) ? "" : "none";
    });
    document.querySelectorAll<HTMLElement>("[data-group-section]").forEach((section) => {
      const anyVisible = [...section.querySelectorAll<HTMLElement>("[data-group-card]")]
        .some((c) => c.style.display !== "none");
      section.style.display = lower && !anyVisible ? "none" : "";
    });
  }, []);

  function clearFilter() {
    setQuery("");
    setSearching(false);
    applyFilter("");
  }

  // ── View switch ───────────────────────────────────────────────────────────

  function switchView(next: HomeView) {
    if (validView === next) return;
    // Clear any active search/filter when switching tabs
    if (searching) setSearching(false);
    if (query) { setQuery(""); applyFilter(""); }
    setView(next);
    try { sessionStorage.setItem(TAB_KEY, next); } catch { /* private mode */ }
    document.documentElement.scrollTop = 0;
  }

  // ── Search open / close ───────────────────────────────────────────────────

  function openSearch() {
    setSearching(true);
    // autoFocus on the input handles focus after AnimatePresence mounts it
  }

  function closeSearch() {
    // Explicit ✕ tap — always clears
    clearFilter();
  }

  function handleBlur() {
    // Short delay so that a click on ✕ fires before we act on the blur
    setTimeout(() => {
      if (!inputRef.current) return;
      const currentQuery = inputRef.current.value;
      setSearching(false); // always collapse on blur
      if (!currentQuery.trim()) {
        // Nothing typed — just close, no chip
        setQuery("");
        applyFilter("");
      }
      // If there IS a query, leave it in state → chip appears in tab row
    }, 180);
  }

  function handleQueryChange(q: string) {
    setQuery(q);
    applyFilter(q);
  }

  // ── No bar needed ─────────────────────────────────────────────────────────

  if (!showBar) return <>{activeContent}</>;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Control bar ──────────────────────────────────────────────────── */}
      <div className="relative h-9 mb-5">
        <AnimatePresence mode="wait" initial={false}>

          {/* ── Search open ──────────────────────────────────────────────── */}
          {searching && (
            <motion.div
              key="search"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.14, ease: "easeOut" }}
              className="absolute inset-0 flex items-center gap-2
                         bg-slate-100 dark:bg-slate-800/70 rounded-xl px-3"
            >
              <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
              <input
                ref={inputRef}
                // eslint-disable-next-line jsx-a11y/no-autofocus
                autoFocus
                type="text"
                value={query}
                placeholder="Search groups…"
                onChange={(e) => handleQueryChange(e.target.value)}
                onBlur={handleBlur}
                onFocus={(e) => {
                  // Cursor to end when reopening a pre-filled chip query
                  const len = e.target.value.length;
                  e.target.setSelectionRange(len, len);
                }}
                className="flex-1 bg-transparent text-sm text-slate-800 dark:text-slate-100
                           placeholder:text-slate-400 dark:placeholder:text-slate-500
                           outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50 rounded-md"
              />
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()} // prevent blur before click
                onClick={closeSearch}
                aria-label="Close search"
                className="shrink-0 p-0.5 rounded-md text-slate-400
                           hover:text-slate-600 dark:hover:text-slate-300
                           hover:bg-slate-200/60 dark:hover:bg-slate-700/60
                           transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}

          {/* ── Tab row (idle or filter-chipped) ─────────────────────────── */}
          {!searching && (
            <motion.div
              key="tabs"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.14, ease: "easeOut" }}
              className="absolute inset-0 flex items-center"
            >
              {/* Underline tabs */}
              {showTabs && (
                <div className="flex items-center gap-6">
                  {tabs.map(({ key, label, count }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => switchView(key)}
                      className="relative flex flex-col pb-1 min-h-[36px] justify-center"
                    >
                      <span className={`text-sm leading-none transition-colors ${
                        validView === key
                          ? "font-semibold text-slate-800 dark:text-slate-100"
                          : "font-medium text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                      }`}>
                        {label}
                        <span className="ml-1.5 text-[11px] tabular-nums opacity-50">{count}</span>
                      </span>
                      {validView === key && (
                        <motion.div
                          layoutId="tab-underline"
                          className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full
                                     bg-slate-700 dark:bg-slate-200"
                          transition={{ type: "spring", stiffness: 500, damping: 35 }}
                        />
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Right side — search icon or active filter chip */}
              {validView === "active" && showSearch && (
                <div className="ml-auto">
                  {query ? (
                    /* Filter chip — tap left side to refine, tap × to clear */
                    <div className="flex items-center rounded-full overflow-hidden
                                    border border-cyan-200 dark:border-cyan-700/50
                                    bg-cyan-50 dark:bg-cyan-900/30">
                      <button
                        type="button"
                        onClick={openSearch}
                        className="flex items-center gap-1.5 pl-2.5 pr-1.5 py-1
                                   text-xs font-medium text-cyan-700 dark:text-cyan-300
                                   hover:bg-cyan-100 dark:hover:bg-cyan-800/40 transition-colors"
                      >
                        <Search className="w-3 h-3 shrink-0" />
                        <span className="max-w-[80px] truncate">{query}</span>
                      </button>
                      <button
                        type="button"
                        onClick={clearFilter}
                        aria-label="Clear search"
                        className="px-2 py-1 text-cyan-500 dark:text-cyan-400
                                   hover:bg-cyan-100 dark:hover:bg-cyan-800/40 transition-colors
                                   border-l border-cyan-200 dark:border-cyan-700/50"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    /* Plain search icon */
                    <button
                      type="button"
                      onClick={openSearch}
                      aria-label="Search groups"
                      className="p-1.5 -mr-1.5 rounded-lg text-slate-400
                                 hover:text-slate-600 dark:hover:text-slate-300
                                 hover:bg-slate-100 dark:hover:bg-slate-800/60
                                 transition-colors"
                    >
                      <Search className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      {validView === "active" ? activeContent : validView === "archived" ? archivedContent : sampleContent}
    </>
  );
}
