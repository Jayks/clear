/**
 * Context colour system — the single source of truth for "which financial
 * context am I in." Colour identifies the context; the section icon + title
 * differentiate the sub-page. Resolves the long-standing collision where section
 * colours (Settle=emerald, Insights=amber…) clashed with context colours.
 *
 * Five identities: trip · nest · stream · circle-recurring · circle-one-time.
 * Change a colour here and it updates everywhere that reads getContextTheme().
 *
 * All values are literal Tailwind classes so the JIT keeps them.
 */

export type ContextKey = "trip" | "nest" | "stream" | "circle_recurring" | "circle_onetime";

export interface ContextTheme {
  key: ContextKey;
  /** Icon badges, primary buttons, hero — `bg-gradient-to-br ${gradient}`. */
  gradient: string;
  /** Section-header icon badge background (light + dark). */
  headerBadgeBg: string;
  /** Section-header icon colour (light + dark). */
  headerIcon: string;
  /** Section-header gradient rule line (light + dark). */
  rule: string;
  /** Soft tint for ambient surfaces / hover (light + dark). */
  tint: string;
  /** Solid accent text (links, "settle →" etc.). */
  accentText: string;
  /** Coloured drop-shadow for cards / icon badges — `shadow-sm ${glow}`. */
  glow: string;
  /** Focus ring for inputs — used with `focus:ring-2 ${ring}`. */
  ring: string;
  /** Border for selected / hovered interactive surfaces (light + dark). */
  softBorder: string;
  /** Native control accent (checkbox / radio). */
  accent: string;
  /** Active sliding-pill background for the contextual in-group bottom nav. */
  navPill: string;
}

export const CONTEXT_THEME: Record<ContextKey, ContextTheme> = {
  trip: {
    key: "trip",
    gradient: "from-cyan-500 to-teal-500",
    headerBadgeBg: "bg-cyan-50 dark:bg-cyan-900/30",
    headerIcon: "text-cyan-600 dark:text-cyan-400",
    rule: "from-cyan-300/80 to-transparent dark:from-cyan-400/50 dark:to-transparent",
    tint: "bg-cyan-50/50 dark:bg-cyan-900/10",
    accentText: "text-cyan-600 dark:text-cyan-400",
    glow: "shadow-cyan-500/20",
    ring: "focus:ring-cyan-400",
    softBorder: "border-cyan-300 dark:border-cyan-700",
    accent: "accent-cyan-500",
    navPill: "bg-cyan-100 dark:bg-cyan-950/70",
  },
  nest: {
    key: "nest",
    gradient: "from-emerald-500 to-teal-500",
    headerBadgeBg: "bg-emerald-50 dark:bg-emerald-900/30",
    headerIcon: "text-emerald-600 dark:text-emerald-400",
    rule: "from-emerald-300/80 to-transparent dark:from-emerald-400/50 dark:to-transparent",
    tint: "bg-emerald-50/50 dark:bg-emerald-900/10",
    accentText: "text-emerald-600 dark:text-emerald-400",
    glow: "shadow-emerald-500/20",
    ring: "focus:ring-emerald-400",
    softBorder: "border-emerald-300 dark:border-emerald-700",
    accent: "accent-emerald-500",
    navPill: "bg-emerald-100 dark:bg-emerald-950/70",
  },
  stream: {
    key: "stream",
    gradient: "from-blue-500 to-indigo-500",
    headerBadgeBg: "bg-blue-50 dark:bg-blue-900/30",
    headerIcon: "text-blue-600 dark:text-blue-400",
    rule: "from-blue-300/80 to-transparent dark:from-blue-400/50 dark:to-transparent",
    tint: "bg-blue-50/50 dark:bg-blue-900/10",
    accentText: "text-blue-600 dark:text-blue-400",
    glow: "shadow-blue-500/20",
    ring: "focus:ring-blue-400",
    softBorder: "border-blue-300 dark:border-blue-700",
    accent: "accent-blue-500",
    navPill: "bg-blue-100 dark:bg-blue-950/70",
  },
  circle_recurring: {
    key: "circle_recurring",
    gradient: "from-violet-500 to-purple-600",
    headerBadgeBg: "bg-violet-50 dark:bg-violet-900/30",
    headerIcon: "text-violet-600 dark:text-violet-400",
    rule: "from-violet-300/80 to-transparent dark:from-violet-400/50 dark:to-transparent",
    tint: "bg-violet-50/50 dark:bg-violet-900/10",
    accentText: "text-violet-600 dark:text-violet-400",
    glow: "shadow-violet-500/20",
    ring: "focus:ring-violet-400",
    softBorder: "border-violet-300 dark:border-violet-700",
    accent: "accent-violet-500",
    navPill: "bg-violet-100 dark:bg-violet-950/70",
  },
  circle_onetime: {
    key: "circle_onetime",
    gradient: "from-amber-500 to-orange-500",
    headerBadgeBg: "bg-amber-50 dark:bg-amber-900/30",
    headerIcon: "text-amber-600 dark:text-amber-400",
    rule: "from-amber-300/80 to-transparent dark:from-amber-400/50 dark:to-transparent",
    tint: "bg-amber-50/50 dark:bg-amber-900/10",
    accentText: "text-amber-600 dark:text-amber-400",
    glow: "shadow-amber-500/20",
    ring: "focus:ring-amber-400",
    softBorder: "border-amber-300 dark:border-amber-700",
    accent: "accent-amber-500",
    navPill: "bg-amber-100 dark:bg-amber-950/70",
  },
};

/**
 * Resolve a context's theme. Circles split by mode (recurring → violet,
 * one_time → amber). `"stream"` is accepted as a pseudo-type for Stream pages.
 */
export function getContextTheme(groupType: string, circleMode?: string | null): ContextTheme {
  if (groupType === "circle") {
    return circleMode === "one_time" ? CONTEXT_THEME.circle_onetime : CONTEXT_THEME.circle_recurring;
  }
  if (groupType === "nest") return CONTEXT_THEME.nest;
  if (groupType === "stream") return CONTEXT_THEME.stream;
  return CONTEXT_THEME.trip;
}
