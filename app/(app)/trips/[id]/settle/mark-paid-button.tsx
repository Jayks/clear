"use client";

import { recordSettlement } from "@/app/actions/settlements";
import { toast } from "sonner";
import { useState } from "react";
import { Check } from "lucide-react";

interface Props {
  tripId: string;
  fromMemberId: string;
  toMemberId: string;
  amount: number;
  currency: string;
}

export function MarkPaidButton({ tripId, fromMemberId, toMemberId, amount, currency }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleMark() {
    setLoading(true);
    const result = await recordSettlement({ tripId, fromMemberId, toMemberId, amount, currency });
    setLoading(false);
    if (!result.ok) toast.error(result.error);
    else toast.success("Payment recorded!");
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
