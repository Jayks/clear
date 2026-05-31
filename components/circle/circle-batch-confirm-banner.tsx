"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { confirmContributions } from "@/app/actions/circle";
import { toast } from "sonner";
import { hapticSuccess } from "@/lib/haptics";
import { Bell } from "lucide-react";

interface PendingMember {
  memberId:       string;
  name:           string;
  contributionId: string;
  amount:         number;
}

interface Props {
  groupId:        string;
  pendingMembers: PendingMember[];
  periodLabel:    string | null;
}

export function CircleBatchConfirmBanner({ groupId, pendingMembers, periodLabel }: Props) {
  const router   = useRouter();
  const [busy,   setBusy]    = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || pendingMembers.length === 0) return null;

  const names = pendingMembers.slice(0, 3).map((m) => m.name).join(" · ");
  const extra = pendingMembers.length > 3 ? ` +${pendingMembers.length - 3} more` : "";

  async function handleConfirmAll() {
    setBusy(true);
    const result = await confirmContributions({
      groupId,
      contributionIds: pendingMembers.map((m) => m.contributionId),
    });
    setBusy(false);
    if (result.ok) {
      hapticSuccess();
      toast.success(`Confirmed ${pendingMembers.length} ${pendingMembers.length === 1 ? "payment" : "payments"} 🎉`);
      router.refresh();
    } else {
      toast.error(result.error ?? "Failed to confirm");
    }
  }

  return (
    <div className="glass rounded-2xl p-4 mb-6
                    border border-amber-200/60 dark:border-amber-700/40
                    bg-amber-50/60 dark:bg-amber-900/10">
      {/* Header row */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/40
                        flex items-center justify-center shrink-0 mt-0.5">
          <Bell className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
            {pendingMembers.length} {pendingMembers.length === 1 ? "member says they've" : "members say they've"} paid
            {periodLabel ? ` for ${periodLabel}` : ""}
          </p>
          <p className="text-xs text-amber-600/80 dark:text-amber-400/70 mt-0.5 truncate">
            {names}{extra}
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="flex-1 py-2 text-xs font-medium rounded-xl border transition-colors
                     border-amber-200 dark:border-amber-700/50
                     text-amber-700 dark:text-amber-300
                     hover:bg-amber-100/60 dark:hover:bg-amber-900/30"
        >
          Review one by one
        </button>
        <button
          type="button"
          onClick={handleConfirmAll}
          disabled={busy}
          className="flex-1 py-2 text-xs font-medium rounded-xl transition-all
                     bg-gradient-to-br from-emerald-500 to-green-500
                     hover:from-emerald-600 hover:to-green-600
                     text-white shadow-sm shadow-emerald-500/20
                     disabled:opacity-60"
        >
          {busy ? "Confirming…" : `Confirm all ✓`}
        </button>
      </div>
    </div>
  );
}
