"use client";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { adminDeleteGroup } from "@/app/actions/admin";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

interface Props {
  groupId: string;
  groupName: string;
}

export function DeleteGroupButton({ groupId, groupName }: Props) {
  const router = useRouter();

  async function handleDelete() {
    const result = await adminDeleteGroup(groupId);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`"${groupName}" deleted`);
    router.refresh();
  }

  return (
    <ConfirmDialog
      trigger={
        <button className="p-1.5 text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
          <Trash2 className="w-4 h-4" />
        </button>
      }
      title={`Delete "${groupName}"?`}
      description="This permanently deletes the group along with all its expenses, splits, and settlements. This cannot be undone."
      confirmLabel="Delete group"
      destructive
      onConfirm={handleDelete}
    />
  );
}
