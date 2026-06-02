"use client";

import { useState, useRef, useEffect } from "react";
import { updateDisplayName } from "@/app/actions/members";
import { saveUpiId, deleteUpiId, setDefaultUpiId } from "@/app/actions/upi-ids";
import { toast } from "sonner";
import { CheckCircle2, Star, Trash2, Plus, Smartphone } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { UserUpiId } from "@/lib/db/schema/upi-ids";

const MAX_UPI_IDS = 5;

// ─── UPI provider data ────────────────────────────────────────────────────────

const UPI_PROVIDERS = [
  {
    name: "G Pay",
    label: "G Pay",
    pill: "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-200/60 dark:border-blue-700/40",
    suffixes: ["@okaxis", "@okicici", "@oksbi", "@okhdfcbank"],
  },
  {
    name: "PhonePe",
    label: "PhonePe",
    pill: "bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 border-violet-200/60 dark:border-violet-700/40",
    suffixes: ["@ybl", "@ibl", "@axl"],
  },
  {
    name: "Paytm",
    label: "Paytm",
    pill: "bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 border-sky-200/60 dark:border-sky-700/40",
    suffixes: ["@paytm"],
  },
  {
    name: "Amazon Pay",
    label: "Amazon Pay",
    pill: "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-200/60 dark:border-amber-700/40",
    suffixes: ["@apl"],
  },
] as const;

const ALL_SUFFIXES = [
  "@okaxis", "@okicici", "@oksbi", "@okhdfcbank",
  "@ybl", "@ibl", "@axl",
  "@paytm",
  "@apl",
  "@upi", "@sbi", "@icici", "@hdfcbank", "@axisbank", "@kotak", "@indus",
];

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  currentDisplayName: string;
  userEmail: string;
  userAvatarUrl: string | null;
  upiIds: UserUpiId[];
}

export function ProfileSection({ currentDisplayName, userEmail, userAvatarUrl, upiIds: initialUpiIds }: Props) {
  // ── Display name state ────────────────────────────────────────────────────
  const [name, setName] = useState(currentDisplayName);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // ── UPI IDs state ─────────────────────────────────────────────────────────
  const [upiIds, setUpiIds] = useState<UserUpiId[]>(initialUpiIds);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUpiId, setNewUpiId] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [addingUpi, setAddingUpi] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Close suggestions on outside click
  useEffect(() => {
    if (!suggestions.length) return;
    function onClickOutside(e: MouseEvent) {
      if (
        inputRef.current && !inputRef.current.contains(e.target as Node) &&
        suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)
      ) {
        setSuggestions([]);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [suggestions.length]);

  // ── Display name helpers ──────────────────────────────────────────────────
  const isDirty = name.trim() !== currentDisplayName.trim();

  const initials = name
    ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : userEmail[0]?.toUpperCase() ?? "?";

  async function handleSaveName() {
    if (!isDirty || saving) return;
    const trimmed = name.trim();
    if (!trimmed) { toast.error("Display name cannot be empty"); return; }
    if (trimmed.length > 50) { toast.error("Name too long (max 50 characters)"); return; }

    setSaving(true);
    const result = await updateDisplayName(trimmed);
    setSaving(false);

    if (!result.ok) { toast.error(result.error); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  // ── UPI input helpers ─────────────────────────────────────────────────────
  function handleUpiInputChange(val: string) {
    setNewUpiId(val);
    const atIdx = val.indexOf("@");
    if (atIdx !== -1) {
      const typed = val.slice(atIdx).toLowerCase();
      const activeProvider = UPI_PROVIDERS.find((p) => p.name === selectedProvider);

      let pool: string[];
      if (typed === "@" && activeProvider) {
        // Just typed "@" with a provider selected — show that provider's suffixes first, then rest
        pool = [
          ...activeProvider.suffixes,
          ...ALL_SUFFIXES.filter((s) => !activeProvider.suffixes.includes(s as never)),
        ];
      } else {
        pool = ALL_SUFFIXES;
      }

      const matches = pool.filter(
        (s) => s.startsWith(typed) && s.toLowerCase() !== typed
      );
      setSuggestions(matches.slice(0, 6));
    } else {
      setSuggestions([]);
    }
  }

  function applySuggestion(suffix: string) {
    const atIdx = newUpiId.indexOf("@");
    const localPart = atIdx !== -1 ? newUpiId.slice(0, atIdx) : newUpiId;
    setNewUpiId(localPart + suffix);
    setSuggestions([]);
    inputRef.current?.focus();
  }

  function applyProvider(provider: typeof UPI_PROVIDERS[number]) {
    // Just highlight the pill and auto-fill the label — don't touch the input.
    // The provider's suffixes will surface when the user types "@".
    if (!newLabel.trim()) setNewLabel(provider.label);
    setSelectedProvider(provider.name);
    inputRef.current?.focus();
  }

  // ── UPI CRUD helpers ──────────────────────────────────────────────────────
  async function handleAddUpi() {
    const trimmed = newUpiId.trim();
    if (!trimmed) { toast.error("Enter a UPI ID"); return; }

    setAddingUpi(true);
    const result = await saveUpiId({
      upiId: trimmed,
      label: newLabel.trim() || undefined,
      setAsDefault: upiIds.length === 0,
    });
    setAddingUpi(false);

    if (!result.ok) { toast.error(result.error); return; }

    // Use real DB record so subsequent delete/star use the true id.
    // If the id already exists (update case), replace in-place; otherwise append.
    setUpiIds((prev) => {
      const alreadyInList = prev.some((u) => u.id === result.record.id);
      if (alreadyInList) {
        return prev.map((u) => {
          if (u.id === result.record.id) return result.record;
          return result.record.isDefault ? { ...u, isDefault: false } : u;
        });
      }
      const base = result.record.isDefault
        ? prev.map((u) => ({ ...u, isDefault: false }))
        : prev;
      return [...base, result.record];
    });
    setNewUpiId("");
    setNewLabel("");
    setSuggestions([]);
    setSelectedProvider(null);
    setShowAddForm(false);
    toast.success("UPI ID saved");
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    const result = await deleteUpiId(id);
    setDeletingId(null);

    if (!result.ok) { toast.error(result.error); return; }

    setUpiIds((prev) => {
      const remaining = prev.filter((u) => u.id !== id);
      const wasDefault = prev.find((u) => u.id === id)?.isDefault;
      if (wasDefault && remaining.length > 0) {
        remaining[remaining.length - 1] = { ...remaining[remaining.length - 1], isDefault: true };
      }
      return remaining;
    });
    toast.success("UPI ID removed");
  }

  async function handleSetDefault(id: string) {
    setSettingDefaultId(id);
    const result = await setDefaultUpiId(id);
    setSettingDefaultId(null);

    if (!result.ok) { toast.error(result.error); return; }

    setUpiIds((prev) => prev.map((u) => ({ ...u, isDefault: u.id === id })));
    toast.success("Default UPI ID updated");
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Avatar + email */}
      <div className="flex items-center gap-3">
        <Avatar className="w-12 h-12 ring-2 ring-white dark:ring-slate-800 shadow-sm shrink-0">
          <AvatarImage src={userAvatarUrl ?? undefined} alt={name} />
          <AvatarFallback className="bg-gradient-to-br from-cyan-400 to-teal-500 text-white text-sm font-medium">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{name || "—"}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{userEmail}</p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Signed in with Google</p>
        </div>
      </div>

      {/* Display name input */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
          Display name
        </label>
        <input
          value={name}
          onChange={(e) => { setName(e.target.value); setSaved(false); }}
          onKeyDown={(e) => { if (e.key === "Enter") handleSaveName(); }}
          placeholder="How you appear to group members"
          maxLength={50}
          className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent placeholder:text-slate-400 dark:placeholder:text-slate-500"
        />
        <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
          How your name appears to others across all your groups.
        </p>
      </div>

      {/* Save name button */}
      <button
        type="button"
        onClick={handleSaveName}
        disabled={!isDirty || saving}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white shadow-sm shadow-cyan-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {saved ? (
          <><CheckCircle2 className="w-4 h-4" />Saved</>
        ) : saving ? "Saving…" : "Save changes"}
      </button>

      {/* ── UPI IDs ─────────────────────────────────────────────────────── */}
      <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/40">
        {/* Section header */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-5 h-5 rounded-md bg-cyan-50 dark:bg-cyan-900/30 flex items-center justify-center shrink-0">
            <Smartphone className="w-3 h-3 text-cyan-500 dark:text-cyan-400" />
          </div>
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">UPI IDs</span>
          <div className="flex-1 h-[1.5px] bg-gradient-to-r from-cyan-200/70 to-transparent dark:from-cyan-800/40 dark:to-transparent" />
        </div>

        <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">
          Friends use this when paying you via GPay, PhonePe, or any UPI app.
        </p>

        {/* Saved UPI IDs list */}
        {upiIds.length === 0 ? (
          <p className="text-xs text-slate-400 dark:text-slate-500 italic mb-3">
            No UPI IDs saved yet — add one so friends can pay you instantly.
          </p>
        ) : (
          <ul className="space-y-2 mb-3">
            {upiIds.map((u) => (
              <li
                key={u.id}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/60 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/50"
              >
                <button
                  type="button"
                  title={u.isDefault ? "Default UPI ID" : "Set as default"}
                  onClick={() => !u.isDefault && handleSetDefault(u.id)}
                  disabled={settingDefaultId === u.id}
                  className={`shrink-0 transition-colors ${
                    u.isDefault
                      ? "text-amber-400 cursor-default"
                      : "text-slate-300 dark:text-slate-600 hover:text-amber-400 dark:hover:text-amber-400"
                  } disabled:opacity-50`}
                >
                  <Star className="w-3.5 h-3.5" fill={u.isDefault ? "currentColor" : "none"} />
                </button>

                <span className="flex-1 min-w-0 text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                  {u.upiId}
                </span>

                {u.label && (
                  <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                    {u.label}
                  </span>
                )}

                {u.isDefault && (
                  <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-md bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 font-medium">
                    default
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => handleDelete(u.id)}
                  disabled={deletingId === u.id}
                  className="shrink-0 text-slate-300 dark:text-slate-600 hover:text-rose-400 dark:hover:text-rose-400 transition-colors disabled:opacity-40"
                  title="Remove UPI ID"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Add form */}
        {showAddForm ? (
          <div className="space-y-2.5">

            {/* App pills */}
            <div className="flex flex-wrap gap-1.5">
              {UPI_PROVIDERS.map((p) => {
                const isSelected = selectedProvider === p.name;
                return (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => applyProvider(p)}
                    className={`px-2.5 py-1 text-[11px] font-medium rounded-lg border transition-all ${
                      isSelected
                        ? p.pill                                          // highlighted colour
                        : "bg-transparent text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 hover:text-slate-600 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600"
                    }`}
                  >
                    {p.name}
                  </button>
                );
              })}
            </div>

            {/* UPI ID input with autocomplete */}
            <div className="relative">
              <input
                ref={inputRef}
                value={newUpiId}
                onChange={(e) => handleUpiInputChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddUpi();
                  if (e.key === "Escape") setSuggestions([]);
                }}
                placeholder="yourname@okaxis"
                autoFocus
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />

              {/* Autocomplete dropdown */}
              {suggestions.length > 0 && (
                <div
                  ref={suggestionsRef}
                  className="absolute z-20 top-full mt-1 left-0 right-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden"
                >
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); applySuggestion(s); }}
                      className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors"
                    >
                      <span className="text-slate-400 dark:text-slate-500 font-mono text-xs">{s}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Label input */}
            <input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Label (optional) — e.g. G Pay, PhonePe"
              maxLength={30}
              className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />

            {/* Actions */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleAddUpi}
                disabled={addingUpi}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white shadow-sm shadow-cyan-500/20 transition-all disabled:opacity-40"
              >
                {addingUpi ? "Saving…" : "Save UPI ID"}
              </button>
              <button
                type="button"
                onClick={() => { setShowAddForm(false); setNewUpiId(""); setNewLabel(""); setSuggestions([]); setSelectedProvider(null); }}
                className="px-4 py-2 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-800/60 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : upiIds.length < MAX_UPI_IDS ? (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl border border-dashed border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-cyan-400 hover:text-cyan-600 dark:hover:border-cyan-600 dark:hover:text-cyan-400 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add UPI ID
          </button>
        ) : (
          <p className="text-xs text-slate-400 dark:text-slate-500 italic">
            Maximum of {MAX_UPI_IDS} UPI IDs saved.
          </p>
        )}
      </div>
    </div>
  );
}
