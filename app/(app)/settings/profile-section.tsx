"use client";

import { useState } from "react";
import { updateDisplayName } from "@/app/actions/members";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Props {
  currentDisplayName: string;
  userEmail: string;
  userAvatarUrl: string | null;
}

export function ProfileSection({ currentDisplayName, userEmail, userAvatarUrl }: Props) {
  const [name, setName] = useState(currentDisplayName);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const isDirty = name.trim() !== currentDisplayName.trim();

  const initials = name
    ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : userEmail[0]?.toUpperCase() ?? "?";

  async function handleSave() {
    if (!isDirty || saving) return;
    const trimmed = name.trim();
    if (!trimmed) { toast.error("Display name cannot be empty"); return; }
    if (trimmed.length > 50) { toast.error("Name too long (max 50 characters)"); return; }

    setSaving(true);
    const result = await updateDisplayName(trimmed);
    setSaving(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="space-y-5">
      {/* Avatar + email — read-only identity */}
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
          onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
          placeholder="How you appear to group members"
          maxLength={50}
          className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent placeholder:text-slate-400 dark:placeholder:text-slate-500"
        />
        <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
          How your name appears to others across all your groups.
        </p>
      </div>

      {/* Save button */}
      <button
        type="button"
        onClick={handleSave}
        disabled={!isDirty || saving}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white shadow-sm shadow-cyan-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {saved ? (
          <>
            <CheckCircle2 className="w-4 h-4" />
            Saved
          </>
        ) : saving ? (
          "Saving…"
        ) : (
          "Save changes"
        )}
      </button>
    </div>
  );
}
