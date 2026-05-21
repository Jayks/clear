"use client";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { adminDeleteUser } from "@/app/actions/admin";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

interface Props {
  userId: string;
  displayName: string;
}

export function DeleteUserButton({ userId, displayName }: Props) {
  const router = useRouter();

  async function handleDelete() {
    const result = await adminDeleteUser(userId);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`${displayName} deleted`);
    router.refresh();
  }

  return (
    <ConfirmDialog
      trigger={
        <button className="p-1.5 text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
          <Trash2 className="w-4 h-4" />
        </button>
      }
      title={`Delete ${displayName}?`}
      description="This removes the user from all groups and permanently deletes their account. This cannot be undone."
      confirmLabel="Delete user"
      destructive
      onConfirm={handleDelete}
    />
  );
}
