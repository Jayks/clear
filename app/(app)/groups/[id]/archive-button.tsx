"use client";

import { useState } from "react";
import { archiveGroup } from "@/app/actions/groups";
import { toast } from "sonner";
import { Archive, ArchiveRestore } from "lucide-react";

export function ArchiveButton({
  groupId,
  isArchived,
  groupLabel = "group",
}: {
  groupId: string;
  isArchived: boolean;
  groupLabel?: string;
}) {
  const [hovered, setHovered] = useState(false);
  const [pending, setPending] = useState(false);
  const label = groupLabel.toLowerCase();

  // Archive is fully reversible (it has a true inverse), so we follow the
  // app-wide undo-first rule rather than gating behind a confirm dialog: apply
  // immediately, offer Undo (= the inverse) for 5s.
  async function runArchive(target: boolean) {
    if (pending) return;
    setPending(true);
    const result = await archiveGroup(groupId, target);
    setPending(false);
    if (!result.ok) { toast.error(result.error); return; }
    toast.success(target ? `${groupLabel} archived.` : `${groupLabel} restored.`, {
      duration: 5000,
      action: {
        label: "Undo",
        onClick: async () => {
          const undo = await archiveGroup(groupId, !target);
          if (!undo.ok) toast.error(undo.error);
        },
      },
    });
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => runArchive(!isArchived)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`inline-flex items-center gap-1.5 text-xs transition-colors py-1 disabled:opacity-50 ${
        hovered ? "text-red-500 dark:text-red-400" : "text-slate-400 dark:text-slate-500"
      }`}
    >
      {isArchived
        ? <><ArchiveRestore className="w-3.5 h-3.5" /> Restore {label}</>
        : <><Archive className="w-3.5 h-3.5" /> Archive {label}</>}
    </button>
  );
}
