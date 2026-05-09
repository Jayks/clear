import type { GroupRolesResult } from "@/lib/insights/group-roles";
import { ROLE_INFO } from "@/lib/insights/group-roles";
import { MemberAvatar } from "@/components/shared/member-avatar";

interface Props {
  data: GroupRolesResult;
}

export function GroupRolesCard({ data }: Props) {
  const { memberRoles, fairnessScore, fairnessLabel, fairnessEmoji, hasData } = data;

  const barColor =
    fairnessScore >= 85 ? "from-emerald-400 to-green-500" :
    fairnessScore >= 65 ? "from-cyan-500 to-teal-500" :
    fairnessScore >= 45 ? "from-amber-400 to-orange-500" :
                          "from-red-400 to-rose-500";

  return (
    <div className="glass rounded-2xl p-5">
      <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">Group dynamics</h2>

      {/* Fairness score */}
      {data.memberRoles.length >= 2 && (
        <div className="mb-5 p-3.5 bg-white/40 dark:bg-slate-800/40 rounded-xl border border-white/60 dark:border-slate-700/40">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Payment fairness</span>
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              {fairnessEmoji} {hasData ? `${fairnessScore}/100` : ""} {fairnessLabel}
            </span>
          </div>
          {hasData && (
            <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-700`}
                style={{ width: `${fairnessScore}%` }}
              />
            </div>
          )}
          {hasData && (
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5">
              How evenly the payment burden was shared across the group
            </p>
          )}
        </div>
      )}

      {/* Member roles */}
      <div className="space-y-2">
        {memberRoles.map(({ memberId, name, role }) => {
          const info = ROLE_INFO[role];
          return (
            <div key={memberId} className="flex items-center gap-2.5 py-0.5">
              <MemberAvatar name={name} size="sm" />
              <span className="text-sm text-slate-700 dark:text-slate-200 flex-1 truncate">{name}</span>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium shrink-0 ${info.bgColor} ${info.textColor}`}
              >
                {info.emoji} {info.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
