"use client";

import { regenerateShareToken } from "@/app/actions/groups";
import { toast } from "sonner";
import { RefreshCw, Copy } from "lucide-react";
import { useState } from "react";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

export function RegenerateTokenButton({ groupId, inviteUrl, actions }: { groupId: string; inviteUrl: string; actions?: React.ReactNode }) {
  const [currentUrl, setCurrentUrl] = useState(inviteUrl);

  async function handleCopy() {
    navigator.clipboard.writeText(currentUrl);
    toast.success("Invite link copied!");
  }

  async function handleRegenerate() {
    const result = await regenerateShareToken(groupId);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    const base = currentUrl.split("/join/")[0];
    setCurrentUrl(`${base}/join/${result.shareToken}`);
    toast.success("Invite link regenerated.");
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <button
          onClick={handleCopy}
          className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-white bg-gradient-to-br from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 rounded-xl transition-all shadow-sm shadow-cyan-500/20"
        >
          <Copy className="w-3.5 h-3.5" />
          Copy invite link
        </button>
        {actions}
      </div>

      <ConfirmDialog
        title="Reset invite link"
        description="The current link will stop working immediately. Anyone who hasn't joined yet will need the new link."
        confirmLabel="Reset"
        onConfirm={handleRegenerate}
        trigger={
          <button className="w-full inline-flex items-center justify-center gap-1.5 py-1 text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
            <RefreshCw className="w-3 h-3" />
            Reset invite link
          </button>
        }
      />
    </div>
  );
}
