"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { AnimatedList } from "./animated-list";

/**
 * CollapsibleGroupGrid — wraps a Home-page group-type section's card grid so
 * it doesn't grow unbounded for users with many groups of one type (theme D).
 * Shows the first `visibleCount` cards + a "Show N more" button; expanding
 * reveals the rest in place (no navigation, no pagination state to lose).
 *
 * Cards are passed in already-rendered (the parent .map()s them with their
 * own stable `key`s) — this component only slices the array and forwards the
 * stagger animation, same composition pattern as SettleActionsClient passing
 * RSC children into a client wrapper.
 */

const DEFAULT_VISIBLE_COUNT = 8;

interface Props {
  items: React.ReactNode[];
  visibleCount?: number;
  className: string;
  initialDelayMs?: number;
}

export function CollapsibleGroupGrid({
  items,
  visibleCount = DEFAULT_VISIBLE_COUNT,
  className,
  initialDelayMs,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const hiddenCount = items.length - visibleCount;
  const shown = expanded || hiddenCount <= 0 ? items : items.slice(0, visibleCount);

  return (
    <>
      <AnimatedList className={className} initialDelayMs={initialDelayMs}>
        {shown}
      </AnimatedList>
      {hiddenCount > 0 && !expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="w-full flex items-center justify-center gap-1.5 mt-3 py-2.5 rounded-xl
                     text-sm font-medium text-slate-500 dark:text-slate-400
                     hover:text-slate-700 dark:hover:text-slate-200
                     hover:bg-slate-100/60 dark:hover:bg-slate-800/40 transition-colors"
        >
          Show {hiddenCount} more
          <ChevronDown className="w-4 h-4" />
        </button>
      )}
    </>
  );
}
