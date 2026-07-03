"use client"

import { Switch as SwitchPrimitive } from "@base-ui/react/switch"

import { cn } from "@/lib/utils"

function Switch({ className, ...props }: SwitchPrimitive.Root.Props) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer inline-flex h-5 w-9 shrink-0 items-center rounded-full border shadow-xs transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
        // `--input` (#E2E8F0) is identical to `--border` in this app's light
        // theme (app/globals.css) — a plain bg-input fill with no visible
        // edge all but disappears against the light .glass card background.
        // Slate-300/600 + an explicit border gives the unchecked track a
        // visible edge in both themes instead of relying on fill alone.
        "data-[unchecked]:bg-slate-300 data-[unchecked]:border-slate-300 dark:data-[unchecked]:bg-slate-600 dark:data-[unchecked]:border-slate-600",
        "data-[checked]:bg-primary data-[checked]:border-primary",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block size-4 rounded-full bg-background shadow-sm ring-0 transition-transform",
          "data-[unchecked]:translate-x-0 data-[checked]:translate-x-4"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
