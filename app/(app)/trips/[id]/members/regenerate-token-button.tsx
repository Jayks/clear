"use client";

import { regenerateShareToken } from "@/app/actions/trips";
import { toast } from "sonner";
import { RefreshCw, Copy } from "lucide-react";
import { useState } from "react";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

export function RegenerateTokenButton({ tripId, inviteUrl }: { tripId: string; inviteUrl: string }) {
  const [currentUrl, setCurrentUrl] = useState(inviteUrl);

  async function handleCopy() {
    navigator.clipboard.writeText(currentUrl);
    toast.success("Invite link copied!");
  }

  async function handleRegenerate() {
    const result = await regenerateShareToken(tripId);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    const base = currentUrl.split("/join/")[0];
    setCurrentUrl(`${base}/join/${result.shareToken}`);
    toast.success("Invite link regenerated.");
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={handleCopy}
        className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 text-sm font-medium text-cyan-600 bg-cyan-50 hover:bg-cyan-100 rounded-xl transition-colors"
      >
        <Copy className="w-3.5 h-3.5" />
        Copy link
      </button>

      <ConfirmDialog
        title="Reset invite link"
        description="The current link will stop working immediately. Anyone who hasn't joined yet will need the new link."
        confirmLabel="Reset"
        onConfirm={handleRegenerate}
        trigger={
          <button className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />
            Reset
          </button>
        }
      />
    </div>
  );
}
