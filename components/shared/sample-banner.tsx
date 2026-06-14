"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Compass, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { removeSampleData } from "@/app/actions/demo";

/**
 * Banner shown atop the Sample tab. Explains the demo data and offers to remove
 * it. (The "Take a tour" entry point is added in Phase C alongside the tour
 * repair.) Removing the sample also retires the tour, which has nothing left to
 * anchor on.
 */
export function SampleBanner() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  async function handleRemove() {
    const r = await removeSampleData();
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    // No samples → the tour has no anchor; retire it.
    try {
      localStorage.setItem("clear_tour_done", "1");
      sessionStorage.removeItem("clear_sample_just_seeded");
    } catch {
      /* private mode — non-fatal */
    }
    toast.success("Sample removed");
    startTransition(() => router.refresh());
  }

  return (
    <div className="glass rounded-2xl p-4 mb-6 flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-400
                      flex items-center justify-center shrink-0 shadow-sm">
        <Compass className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          These are samples to explore
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Poke around freely — remove them whenever you&apos;re ready for the real thing.
        </p>
      </div>
      <ConfirmDialog
        title="Remove sample data?"
        description="This deletes the sample trip, nest and circle. You can load them again anytime from the empty home."
        confirmLabel="Remove"
        destructive
        onConfirm={handleRemove}
        trigger={
          <button
            type="button"
            disabled={pending}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium
                       text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700
                       hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Remove
          </button>
        }
      />
    </div>
  );
}
