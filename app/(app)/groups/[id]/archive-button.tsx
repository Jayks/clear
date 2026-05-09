"use client";

import { archiveGroup } from "@/app/actions/groups";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { toast } from "sonner";
import { Archive, ArchiveRestore } from "lucide-react";

export function ArchiveButton({ groupId, isArchived }: { groupId: string; isArchived: boolean }) {
  async function handleToggle() {
    const result = await archiveGroup(groupId, !isArchived);
    if (!result.ok) toast.error(result.error);
    else toast.success(isArchived ? "Trip restored." : "Trip archived.");
  }

  return (
    <ConfirmDialog
      title={isArchived ? "Restore trip" : "Archive trip"}
      description={
        isArchived
          ? "This trip will reappear in your active trips list."
          : "This trip will be moved to your archived trips. You can restore it anytime."
      }
      confirmLabel={isArchived ? "Restore" : "Archive"}
      onConfirm={handleToggle}
      trigger={
        <button className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 bg-white/60 hover:bg-white/80 border border-slate-200 px-3 py-1.5 rounded-lg transition-colors">
          {isArchived
            ? <><ArchiveRestore className="w-3.5 h-3.5" /> Restore</>
            : <><Archive className="w-3.5 h-3.5" /> Archive</>}
        </button>
      }
    />
  );
}
