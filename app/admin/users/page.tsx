import { getAdminUserList } from "@/lib/db/queries/admin";
import { formatDate } from "@/lib/utils";
import { Shield, Briefcase, UserCircle2, Users } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Users — Wayfare Admin" };

const ROLE_CONFIG = {
  platform_admin: {
    label: "Platform Admin",
    icon: Shield,
    badge: "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50",
    row: "bg-red-50/30 dark:bg-red-900/10",
  },
  trip_owner: {
    label: "Trip Owner",
    icon: Briefcase,
    badge: "bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800/50",
    row: "",
  },
  member: {
    label: "Member",
    icon: UserCircle2,
    badge: "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 border border-slate-200 dark:border-slate-600",
    row: "",
  },
} as const;

const AVATAR_COLORS = [
  "from-cyan-400 to-teal-400",
  "from-teal-400 to-emerald-400",
  "from-blue-400 to-cyan-400",
  "from-indigo-400 to-blue-400",
  "from-violet-400 to-indigo-400",
];

function avatarColor(id: string) {
  const n = id.charCodeAt(0) + id.charCodeAt(id.length - 1);
  return AVATAR_COLORS[n % AVATAR_COLORS.length];
}

export default async function AdminUsersPage() {
  const users = await getAdminUserList();

  const admins  = users.filter((u) => u.role === "platform_admin");
  const owners  = users.filter((u) => u.role === "trip_owner");
  const members = users.filter((u) => u.role === "member");

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl text-slate-800 dark:text-slate-100 mb-1" style={{ fontFamily: "var(--font-fraunces)" }}>
            Users
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{users.length} total accounts on the platform</p>
        </div>
        {/* Role summary chips */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {[
            { label: "Platform admins", count: admins.length, cfg: ROLE_CONFIG.platform_admin },
            { label: "Trip owners", count: owners.length, cfg: ROLE_CONFIG.trip_owner },
            { label: "Members", count: members.length, cfg: ROLE_CONFIG.member },
          ].map(({ label, count, cfg }) => (
            <div key={label} className="glass rounded-xl px-3 py-2 text-center min-w-[80px]">
              <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">{count}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* User table */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700 text-xs text-slate-400 dark:text-slate-500">
                <th className="text-left px-5 py-3.5 font-medium">User</th>
                <th className="text-left px-5 py-3.5 font-medium hidden sm:table-cell">Role</th>
                <th className="text-right px-5 py-3.5 font-medium hidden md:table-cell">Trips owned</th>
                <th className="text-right px-5 py-3.5 font-medium hidden lg:table-cell">Trips joined</th>
                <th className="text-right px-5 py-3.5 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/60 dark:divide-slate-700/40">
              {users.map((u) => {
                const cfg = ROLE_CONFIG[u.role];
                return (
                  <tr key={u.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors ${cfg.row}`}>
                    {/* User cell */}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full bg-gradient-to-br ${avatarColor(u.id)} flex items-center justify-center shrink-0 shadow-sm`}
                        >
                          <span className="text-white text-xs font-bold">
                            {u.displayName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-slate-800 dark:text-slate-100 truncate max-w-[180px]">
                            {u.displayName}
                          </p>
                          <p className="text-xs text-slate-400 dark:text-slate-500 truncate max-w-[180px]">{u.email}</p>
                        </div>
                        {/* Role badge on mobile */}
                        <span className={`sm:hidden ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.badge}`}>
                          {cfg.label}
                        </span>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-5 py-3 hidden sm:table-cell">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.badge}`}>
                        <cfg.icon className="w-3 h-3" />
                        {cfg.label}
                      </span>
                    </td>

                    {/* Trips owned */}
                    <td className="px-5 py-3 text-right tabular text-slate-700 dark:text-slate-200 font-medium hidden md:table-cell">
                      {u.tripsOwned > 0 ? (
                        <span className="inline-flex items-center gap-1 text-cyan-700 dark:text-cyan-400">
                          {u.tripsOwned}
                          <span className="text-xs font-normal text-slate-400 dark:text-slate-500">trips</span>
                        </span>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600">—</span>
                      )}
                    </td>

                    {/* Trips joined */}
                    <td className="px-5 py-3 text-right tabular text-slate-600 dark:text-slate-300 hidden lg:table-cell">
                      {u.tripsJoined}
                    </td>

                    {/* Joined date */}
                    <td className="px-5 py-3 text-right text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap">
                      {formatDate(u.joinedAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {users.length === 0 && (
          <div className="text-center py-16">
            <Users className="w-10 h-10 text-slate-200 dark:text-slate-700 mx-auto mb-3" />
            <p className="text-sm text-slate-400 dark:text-slate-500">No users yet</p>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="glass rounded-xl px-5 py-4">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">Role definitions</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(["platform_admin", "trip_owner", "member"] as const).map((role) => {
            const cfg = ROLE_CONFIG[role];
            return (
              <div key={role} className="flex items-start gap-2.5">
                <div className={`mt-0.5 inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.badge} shrink-0`}>
                  <cfg.icon className="w-3 h-3" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{cfg.label}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    {role === "platform_admin" && "Email listed in PLATFORM_ADMIN_EMAIL env var. Full platform access."}
                    {role === "trip_owner" && "Created at least one trip. Manages members and expenses for their trips."}
                    {role === "member" && "Joined trips created by others. Can add expenses and view balances."}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
