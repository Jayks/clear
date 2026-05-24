"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function ExportCsvButton({ groupId }: { groupId: string }) {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/export`);
      if (res.status === 402) {
        const text = await res.text();
        toast.error(text || "CSV export requires Clear Plus.");
        return;
      }
      if (!res.ok) {
        toast.error("Failed to export CSV.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const disposition = res.headers.get("content-disposition") ?? "";
      const match = disposition.match(/filename="?([^"]+)"?/);
      a.download = match?.[1] ?? "expenses.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to export CSV.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      title="Export CSV"
      className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 bg-white/60 hover:bg-white/80 dark:bg-slate-800/60 dark:hover:bg-slate-700/60 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-xl transition-colors disabled:opacity-50"
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
      <span className="hidden sm:inline">Export</span>
    </button>
  );
}
