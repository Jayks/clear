"use client";

import { removeMember } from "@/app/actions/members";
import { toast } from "sonner";
import { X } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

export function RemoveMemberButton({ groupId, memberId }: { groupId: string; memberId: string }) {
  async function handleRemove() {
    const result = await removeMember(groupId, memberId);
    if (!result.ok) toast.error(result.error);
  }

  return (
    <ConfirmDialog
      title="Remove member"
      description="This person will be removed from the trip. Their past expense splits will remain."
      confirmLabel="Remove"
      destructive
      onConfirm={handleRemove}
      trigger={
        <button
          type="button"
          className="w-6 h-6 rounded-full bg-red-50 hover:bg-red-100 text-red-400 hover:text-red-500 flex items-center justify-center transition-colors"
          aria-label="Remove member"
        >
          <X className="w-3 h-3" />
        </button>
      }
    />
  );
}
