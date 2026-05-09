"use client";

import { useState } from "react";
import { CalendarCheck, Loader2, CheckCircle2 } from "lucide-react";
import { logFromTemplate } from "@/app/actions/expenses";
import { toast } from "sonner";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

interface Props {
  templateId: string;
  description: string;
  loggedThisMonth: boolean;
  lastLoggedDate: string | null;
}

export function LogTemplateButton({ templateId, description, loggedThisMonth, lastLoggedDate }: Props) {
  const [loading, setLoading] = useState(false);
  const [justLogged, setJustLogged] = useState(false);
  const month = MONTHS[new Date().getMonth()];

  const isLogged = loggedThisMonth || justLogged;

  async function handleLog() {
    setLoading(true);
    const result = await logFromTemplate(templateId);
    setLoading(false);
    if (!result.ok) {
      toast.error(result.error);
    } else {
      setJustLogged(true);
      toast.success(`"${description}" logged for ${month}`);
    }
  }

  if (isLogged) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 shrink-0">
        <CheckCircle2 className="w-3.5 h-3.5" />
        {lastLoggedDate
          ? `Logged ${new Date(lastLoggedDate + "T00:00:00").getDate()} ${month}`
          : `Logged ${month}`}
      </span>
    );
  }

  return (
    <button
      onClick={handleLog}
      disabled={loading}
      className="inline-flex items-center gap-1.5 text-xs font-medium text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-900/20 hover:bg-cyan-100 dark:hover:bg-cyan-900/40 border border-cyan-200 dark:border-cyan-800/50 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 shrink-0"
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <CalendarCheck className="w-3.5 h-3.5" />
      )}
      Log for {month}
    </button>
  );
}
