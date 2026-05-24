"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

export function NotifyButton() {
  const [notified, setNotified] = useState(false);

  function handleClick() {
    setNotified(true);
    toast.success("You're on the list!", {
      description: "We'll notify you as soon as Plus is available.",
      duration: 5000,
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={notified}
      className="w-full inline-flex items-center justify-center gap-2 py-2.5 bg-gradient-to-br from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 disabled:opacity-70 text-white font-medium rounded-xl shadow-md shadow-violet-500/20 transition-all text-sm"
    >
      <Sparkles className="w-4 h-4" />
      {notified ? "You're on the list ✓" : "Notify me when available"}
    </button>
  );
}
