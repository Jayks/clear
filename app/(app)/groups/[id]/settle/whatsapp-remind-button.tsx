"use client";

import { MessageCircle } from "lucide-react";

interface Props {
  fromName: string;   // the person who owes
  amount: string;     // pre-formatted e.g. "₹2,400"
  tripName: string;
  settleUrl: string;  // full URL to the settle page
}

export function WhatsAppRemindButton({ fromName, amount, tripName, settleUrl }: Props) {
  function handleRemind() {
    const firstName = fromName.split(" ")[0];
    const message =
      `Hey ${firstName}! 👋 Just a friendly reminder — you owe ${amount} from our "${tripName}" trip.\n\n` +
      `You can mark it as paid on Clear:\n${settleUrl}`;

    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
  }

  return (
    <button
      onClick={handleRemind}
      title={`Remind ${fromName} on WhatsApp`}
      className="shrink-0 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors"
    >
      <MessageCircle className="w-3.5 h-3.5" />
      Remind
    </button>
  );
}
