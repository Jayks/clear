"use client";

import { useState, useEffect } from "react";
import type { SplitMode, SplitInput } from "@/lib/splits/compute";
import { computeSplits } from "@/lib/splits/compute";
import type { TripMember } from "@/lib/db/schema/trip-members";
import { formatCurrency } from "@/lib/utils";

interface SplitEditorProps {
  members: TripMember[];
  amount: number;
  currency: string;
  mode: SplitMode;
  onModeChange: (mode: SplitMode) => void;
  onSplitsChange: (splits: SplitInput[]) => void;
  error?: string;
  initialValues?: Record<string, number>;      // memberId → raw splitValue
  initialSelectedIds?: Set<string>;
}

const MODES: { value: SplitMode; label: string }[] = [
  { value: "equal", label: "Equal" },
  { value: "exact", label: "Exact" },
  { value: "percentage", label: "%" },
  { value: "shares", label: "Shares" },
];

function memberLabel(m: TripMember): string {
  return m.guestName ?? "Member";
}

export function SplitEditor({ members, amount, currency, mode, onModeChange, onSplitsChange, error, initialValues, initialSelectedIds }: SplitEditorProps) {
  const [values, setValues] = useState<Record<string, number>>(initialValues ?? {});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    initialSelectedIds ?? new Set(members.map((m) => m.id))
  );

  // Recompute splits whenever inputs change
  useEffect(() => {
    const inputs: SplitInput[] = Array.from(selectedIds).map((id) => ({
      memberId: id,
      value: values[id],
    }));
    onSplitsChange(inputs);
  }, [mode, values, selectedIds]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleMember(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function setValue(id: string, val: string) {
    const n = parseFloat(val);
    setValues((prev) => ({ ...prev, [id]: isNaN(n) ? 0 : n }));
  }

  // Preview computed amounts
  const inputs: SplitInput[] = Array.from(selectedIds).map((id) => ({ memberId: id, value: values[id] }));
  const computed = amount > 0 ? computeSplits(mode, amount, inputs) : null;
  const previewMap: Record<string, number> = {};
  if (computed?.ok) computed.splits.forEach((s) => (previewMap[s.memberId] = s.shareAmount));

  return (
    <div>
      {/* Mode tabs */}
      <div className="flex rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden mb-3">
        {MODES.map((m) => (
          <button
            key={m.value}
            type="button"
            onClick={() => onModeChange(m.value)}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              mode === m.value
                ? "bg-gradient-to-br from-cyan-500 to-teal-500 text-white"
                : "bg-white/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Member rows */}
      <div className="space-y-2">
        {members.map((member) => {
          const selected = selectedIds.has(member.id);
          const preview = previewMap[member.id];
          return (
            <div key={member.id} className={`flex items-center gap-3 px-3 py-2 rounded-xl border transition-colors ${selected ? "border-cyan-200 dark:border-cyan-800/50 bg-cyan-50/50 dark:bg-cyan-950/30" : "border-slate-100 dark:border-slate-700/50 bg-white/40 dark:bg-slate-800/30 opacity-50"}`}>
              {/* Checkbox */}
              <input
                type="checkbox"
                checked={selected}
                onChange={() => toggleMember(member.id)}
                className="w-4 h-4 accent-cyan-500 shrink-0"
              />

              {/* Name */}
              <span className="text-sm text-slate-700 dark:text-slate-200 flex-1 truncate">{memberLabel(member)}</span>

              {/* Input (for non-equal modes) */}
              {mode !== "equal" && selected && (
                <input
                  type="number"
                  min="0"
                  step={mode === "shares" ? "1" : "0.01"}
                  placeholder={mode === "percentage" ? "%" : mode === "shares" ? "shares" : "0.00"}
                  value={values[member.id] ?? ""}
                  onChange={(e) => setValue(member.id, e.target.value)}
                  className="w-20 sm:w-24 text-right text-sm px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                />
              )}

              {/* Preview amount */}
              {selected && preview != null && (
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300 tabular w-16 sm:w-20 text-right shrink-0">
                  {formatCurrency(preview, currency)}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Validation feedback */}
      {computed && !computed.ok && (
        <p className="mt-2 text-xs text-red-500">{computed.error}</p>
      )}
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
    </div>
  );
}
