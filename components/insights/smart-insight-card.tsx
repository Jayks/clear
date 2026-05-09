interface SmartInsightCardProps {
  emoji: string;
  title: string;
  sub: string;
}

export function SmartInsightCard({ emoji, title, sub }: SmartInsightCardProps) {
  return (
    <div className="glass rounded-xl px-4 py-4 flex gap-3">
      <span className="text-2xl shrink-0 leading-none mt-0.5">{emoji}</span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-snug">{title}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">{sub}</p>
      </div>
    </div>
  );
}
