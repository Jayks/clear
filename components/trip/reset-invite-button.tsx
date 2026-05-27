"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { regenerateShareToken } from "@/app/actions/groups";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

export function ResetInviteButton({ groupId }: { groupId: string }) {
  const [hovered, setHovered] = useState(false);

  async function handleRegenerate() {
    const result = await regenerateShareToken(groupId);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Invite link reset. Share the new link with your group.");
  }

  return (
    <ConfirmDialog
      title="Reset invite link"
      description="The current link will stop working immediately. Anyone who hasn't joined yet will need the new link."
      confirmLabel="Reset"
      onConfirm={handleRegenerate}
      trigger={
        <button
          type="button"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className={`inline-flex items-center gap-1.5 text-xs transition-colors py-1 ${
            hovered ? "text-red-500 dark:text-red-400" : "text-slate-400 dark:text-slate-500"
          }`}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Reset invite link
        </button>
      }
    />
  );
}
