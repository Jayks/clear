"use client";

import { recordSettlement, deleteSettlement } from "@/app/actions/settlements";
import { trackEvent } from "@/lib/analytics";
import { toast } from "sonner";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { hapticSuccess } from "@/lib/haptics";

interface Props {
  groupId: string;
  fromMemberId: string;
  toMemberId: string;
  amount: number;
  currency: string;
}

export function MarkPaidButton({ groupId, fromMemberId, toMemberId, amount, currency }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleMark() {
    setLoading(true);
    const result = await recordSettlement({ groupId, fromMemberId, toMemberId, amount, currency });
    setLoading(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    hapticSuccess();
    trackEvent("settlement_recorded", { currency });
    const { settlementId } = result;

    toast.success("Payment recorded!", {
      duration: 5000,
      action: {
        label: "Undo",
        onClick: async () => {
          const undoResult = await deleteSettlement(settlementId, groupId);
          if (undoResult.ok) {
            toast.success("Settlement undone.");
            router.refresh();
          } else {
            toast.error(undoResult.error ?? "Could not undo settlement.");
          }
        },
      },
    });
  }

  return (
    <button
      onClick={handleMark}
      disabled={loading}
      className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 shrink-0"
    >
      <Check className="w-3.5 h-3.5" />
      {loading ? "Saving…" : "Mark paid"}
    </button>
  );
}
