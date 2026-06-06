"use client";

import { useState, useEffect, useRef } from "react";
import { MapPin, X, Loader2 } from "lucide-react";
import { forwardGeocode } from "@/lib/geocoding";
import type { ExpenseLocation } from "@/lib/db/schema/expenses";

interface LocationInputProps {
  value:       ExpenseLocation | null | undefined;
  onChange:    (loc: ExpenseLocation | null) => void;
  isAiFilled?: boolean;
  /** true (trips) — searchable input with geocode dropdown.
   *  false (nests EXIF display-only) — read-only pill + clear. */
  showSearch?: boolean;
}

export function LocationInput({
  value,
  onChange,
  isAiFilled = false,
  showSearch = true,
}: LocationInputProps) {
  const [query, setQuery] = useState(value?.name ?? "");
  const [results, setResults] = useState<ExpenseLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const abortRef   = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync local query when parent fills value (e.g. AI scan)
  useEffect(() => {
    setQuery(value?.name ?? "");
    setResults([]);
    setOpen(false);
  }, [value]);

  // ── Display-only pill (nests with EXIF) ─────────────────────────────────
  if (!showSearch) {
    if (!value) return null;
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl
                      bg-cyan-50 dark:bg-cyan-950/30
                      border border-cyan-200/60 dark:border-cyan-800/50">
        <MapPin className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
        <span className="text-sm text-cyan-700 dark:text-cyan-300 flex-1 min-w-0 truncate">
          {value.name}
        </span>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-cyan-400 hover:text-cyan-600 dark:hover:text-cyan-200 transition-colors"
          aria-label="Remove location"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  // ── Searchable input (trips) ──────────────────────────────────────────────
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setQuery(q);
    onChange(null); // clear committed value when user types

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) { setResults([]); setOpen(false); return; }

    debounceRef.current = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();
      setLoading(true);
      const found = await forwardGeocode(q, abortRef.current.signal);
      setLoading(false);
      setResults(found);
      setOpen(found.length > 0);
    }, 400);
  }

  function handleSelect(loc: ExpenseLocation) {
    setQuery(loc.name);
    setResults([]);
    setOpen(false);
    onChange(loc);
  }

  function handleClear() {
    setQuery("");
    setResults([]);
    setOpen(false);
    onChange(null);
  }

  return (
    <div className="relative">
      {/* Input row */}
      <div
        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border
                    bg-white/60 dark:bg-slate-800/60
                    text-slate-800 dark:text-slate-100
                    focus-within:ring-2 focus-within:ring-cyan-400
                    transition-all
                    ${isAiFilled
                      ? "ring-1 ring-emerald-400/50 border-emerald-300/60 dark:border-emerald-600/40"
                      : "border-slate-200 dark:border-slate-700"
                    }`}
      >
        <MapPin className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => { if (results.length > 0) setOpen(true); }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search for a place…"
          autoComplete="off"
          className="flex-1 text-sm bg-transparent outline-none
                     placeholder:text-slate-400 dark:placeholder:text-slate-500
                     text-slate-800 dark:text-slate-100"
        />
        {loading && <Loader2 className="w-3.5 h-3.5 text-slate-400 animate-spin shrink-0" />}
        {value && !loading && (
          <button
            type="button"
            onClick={handleClear}
            className="text-slate-300 hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-400 transition-colors"
            aria-label="Remove location"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && results.length > 0 && (
        <div
          className="absolute z-50 top-full left-0 right-0 mt-1 rounded-xl
                     border border-slate-200 dark:border-slate-700
                     bg-white dark:bg-slate-800 shadow-lg overflow-hidden"
        >
          {results.map((r, i) => (
            <button
              key={i}
              type="button"
              onMouseDown={() => handleSelect(r)}
              className="w-full px-3 py-2 text-left flex items-start gap-2
                         hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors
                         border-b border-slate-100 dark:border-slate-700/50 last:border-0"
            >
              <MapPin className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                  {r.name}
                </p>
                {r.address && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                    {r.address}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
