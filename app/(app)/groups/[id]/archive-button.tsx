"use client";

import { useState } from "react";
import { archiveGroup } from "@/app/actions/groups";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
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
  const label = groupLabel.toLowerCase();

  async function handleToggle() {
    const result = await archiveGroup(groupId, !isArchived);
    if (!result.ok) toast.error(result.error);
    else toast.success(isArchived ? `${groupLabel} restored.` : `${groupLabel} archived.`);
  }

  return (
    <ConfirmDialog
      title={isArchived ? `Restore ${label}` : `Archive ${label}`}
      description={
        isArchived
          ? `This ${label} will reappear in your active groups list.`
          : `This ${label} will be moved to your archived groups. You can restore it anytime.`
      }
      confirmLabel={isArchived ? "Restore" : "Archive"}
      onConfirm={handleToggle}
      trigger={
        <button
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className={`inline-flex items-center gap-1.5 text-xs transition-colors py-1 ${
            hovered ? "text-red-500 dark:text-red-400" : "text-slate-400 dark:text-slate-500"
          }`}
        >
          {isArchived
            ? <><ArchiveRestore className="w-3.5 h-3.5" /> Restore {label}</>
            : <><Archive className="w-3.5 h-3.5" /> Archive {label}</>}
        </button>
      }
    />
  );
}
