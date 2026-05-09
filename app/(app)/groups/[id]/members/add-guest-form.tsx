"use client";

import { useState } from "react";
import { addGuestMember } from "@/app/actions/members";
import { toast } from "sonner";

export function AddGuestForm({ groupId }: { groupId: string }) {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    const result = await addGuestMember({ groupId, guestName: name.trim() });
    setSubmitting(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`${name} added!`);
    setName("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Guest name"
        className="flex-1 px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white/60 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent placeholder:text-slate-400"
      />
      <button
        type="submit"
        disabled={submitting || !name.trim()}
        className="px-4 py-2 bg-gradient-to-br from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white text-sm font-medium rounded-xl shadow-sm shadow-cyan-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Add
      </button>
    </form>
  );
}
