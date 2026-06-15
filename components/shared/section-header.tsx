import type { LucideIcon } from "lucide-react";
import type { ContextTheme } from "@/lib/theme/context-theme";

interface Props {
  icon: LucideIcon;
  label: string;
  /** The context palette — colour identifies the group; the icon identifies the page. */
  theme: ContextTheme;
  subtitle?: string;
  /** Optional right-aligned control (a "+" button, link, etc.). */
  action?: React.ReactNode;
  className?: string;
}

/**
 * The one section-header used across a group's sub-pages. Icon badge + label +
 * gradient rule, all in the context colour. Differentiation between pages comes
 * from the icon + label, not the colour — which is what resolves the old
 * section-vs-context colour collision.
 */
export function SectionHeader({ icon: Icon, label, theme, subtitle, action, className }: Props) {
  return (
    <div className={className}>
      <div className="flex items-center gap-2.5">
        <div className={`w-6 h-6 rounded-md ${theme.headerBadgeBg} flex items-center justify-center shrink-0`}>
          <Icon className={`w-3.5 h-3.5 ${theme.headerIcon}`} />
        </div>
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</span>
        <div className={`animate-rule-enter flex-1 h-[1.5px] bg-gradient-to-r ${theme.rule}`} />
        {action}
      </div>
      {subtitle && (
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 pl-9">{subtitle}</p>
      )}
    </div>
  );
}
