import type React from "react";
import { getAdminStats, getAdminUserList, getAdminGroupList, getRecentAdminActivity } from "@/lib/db/queries/admin";
import { getVisitorNotificationsEnabled } from "@/lib/db/queries/settings";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Users, Map, Receipt, TrendingUp, Shield, Briefcase, UserCircle2, Bell, Activity, LogIn, UserPlus, IndianRupee, Undo2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { VisitorNotificationsToggle } from "./visitor-notifications-toggle";
import type { Metadata } from "next";
import type { AdminActivity } from "@/lib/db/schema/admin-activity";

export const metadata: Metadata = { title: "Admin Dashboard — ClearOff" };

const ROLE_CONFIG = {
  platform_admin: {
    label: "Platform Admin",
    icon: Shield,
    badge: "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/50",
  },
  group_owner: {
    label: "Group Owner",
    icon: Briefcase,
    badge: "bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800/50",
  },
  member: {
    label: "Member",
    icon: UserCircle2,
    badge: "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600",
  },
} as const;

const EMPTY_STATS = { totalUsers: 0, totalGroups: 0, totalExpenses: 0, totalSettled: 0 };

// Icon badge per admin_activity.type — the documented "Neutral (activity
// feed, generic)" slate entry in components/CLAUDE.md's section-header color
// table, except purchase/signup get their own accent (amber/emerald) since
// this feed mixes positive and neutral events in one list. Keyed by `string`
// (not AdminActivityType) since the DB column is text, not an enum — a
// fallback default keeps this safe against any unexpected value at runtime.
const ACTIVITY_BADGE: Record<string, { icon: React.ElementType; bg: string; border: string; iconColor: string }> = {
  login:    { icon: LogIn,       bg: "bg-slate-100 dark:bg-slate-800",       border: "border-slate-200 dark:border-slate-700",         iconColor: "text-slate-500 dark:text-slate-400"     },
  signup:   { icon: UserPlus,    bg: "bg-emerald-50 dark:bg-emerald-900/30", border: "border-emerald-200 dark:border-emerald-800/60",  iconColor: "text-emerald-600 dark:text-emerald-400" },
  purchase: { icon: IndianRupee, bg: "bg-amber-50 dark:bg-amber-900/30",     border: "border-amber-200 dark:border-amber-800/60",      iconColor: "text-amber-600 dark:text-amber-400"     },
  refund:   { icon: Undo2,       bg: "bg-slate-100 dark:bg-slate-800",       border: "border-slate-200 dark:border-slate-700",         iconColor: "text-slate-500 dark:text-slate-400"     },
};

function ActivityBadge({ type }: { type: string }) {
  const { icon: Icon, bg, border, iconColor } = ACTIVITY_BADGE[type] ?? ACTIVITY_BADGE.login;
  return (
    <div className={`w-8 h-8 rounded-full ${bg} border ${border} flex items-center justify-center shrink-0`}>
      <Icon className={`w-4 h-4 ${iconColor}`} />
    </div>
  );
}

export default async function AdminDashboardPage() {
  // withAdminTimeout in each query sets SET LOCAL statement_timeout = 8s, so
  // slow queries are hard-cancelled by Postgres and release their connections.
  // The 12s page-level fallback is a last-resort safety net.
  const [stats, users, trips, visitorNotificationsEnabled, recentActivity] = await Promise.race([
    Promise.all([
      getAdminStats().catch(() => EMPTY_STATS),
      getAdminUserList().catch(() => [] as Awaited<ReturnType<typeof getAdminUserList>>),
      getAdminGroupList().catch(() => [] as Awaited<ReturnType<typeof getAdminGroupList>>),
      getVisitorNotificationsEnabled().catch(() => true),
      getRecentAdminActivity(20).catch(() => [] as AdminActivity[]),
    ]),
    new Promise<[typeof EMPTY_STATS, never[], never[], boolean, AdminActivity[]]>((resolve) =>
      setTimeout(() => resolve([EMPTY_STATS, [], [], true, []]), 12_000)
    ),
  ]);

  const statCards = [
    { label: "Total users", value: stats.totalUsers, icon: Users, color: "from-cyan-500 to-teal-500" },
    { label: "Total groups", value: stats.totalGroups, icon: Map, color: "from-teal-500 to-emerald-500" },
    { label: "Total expenses", value: stats.totalExpenses, icon: Receipt, color: "from-blue-500 to-cyan-500" },
    { label: "Total settled", value: formatCurrency(stats.totalSettled, "INR"), icon: TrendingUp, color: "from-emerald-500 to-teal-500", isAmount: true },
  ];

  // Group users by role for the hierarchy view
  const admins = users.filter((u) => u.role === "platform_admin");
  const owners = users.filter((u) => u.role === "group_owner");
  const members = users.filter((u) => u.role === "member");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl text-slate-800 dark:text-slate-100 mb-1" style={{ fontFamily: "var(--font-fraunces)" }}>
          Platform Dashboard
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Overview of all users, trips, and activity.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <div key={s.label} className="glass rounded-2xl p-4">
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center mb-3 shadow-sm`}>
              <s.icon className="w-4.5 h-4.5 text-white" />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">{s.label}</p>
            <p
              className="text-lg sm:text-2xl font-semibold text-slate-800 dark:text-slate-100 tabular truncate"
              style={s.isAmount ? { fontFamily: "var(--font-fraunces)" } : undefined}
            >
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Hierarchy */}
      <div>
        <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-4">
          User hierarchy
        </h2>
        <div className="space-y-3">
          {[
            { role: "platform_admin" as const, users: admins, description: "Full platform access" },
            { role: "group_owner" as const, users: owners, description: "Own at least one group" },
            { role: "member" as const, users: members, description: "Participate in trips as members" },
          ].map(({ role, users: roleUsers, description }) => {
            const cfg = ROLE_CONFIG[role];
            return (
              <div key={role} className="glass rounded-2xl overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-3 border-b border-white/50 dark:border-slate-700/40">
                  <cfg.icon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${cfg.badge}`}>
                    {cfg.label}
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">{description}</span>
                  <span className="ml-auto text-xs font-medium text-slate-600 dark:text-slate-300">{roleUsers.length} users</span>
                </div>
                {roleUsers.length === 0 ? (
                  <p className="px-5 py-4 text-xs text-slate-400 dark:text-slate-500 italic">No users in this tier</p>
                ) : (
                  <div className="divide-y divide-slate-100/60 dark:divide-slate-700/40">
                    {roleUsers.slice(0, 10).map((u) => (
                      <div key={u.id} className="flex items-center gap-3 px-5 py-2.5">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-400 to-teal-400 flex items-center justify-center shrink-0">
                          <span className="text-white text-xs font-bold">
                            {u.displayName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{u.displayName}</p>
                          <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{u.email}</p>
                        </div>
                        <div className="text-right shrink-0 hidden sm:block">
                          <p className="text-xs text-slate-500 dark:text-slate-400">{u.groupsOwned} groups owned</p>
                          <p className="text-xs text-slate-400 dark:text-slate-500">{u.groupsJoined} total groups</p>
                        </div>
                        <p className="text-xs text-slate-400 dark:text-slate-500 shrink-0">{formatDate(u.joinedAt)}</p>
                      </div>
                    ))}
                    {roleUsers.length > 10 && (
                      <p className="px-5 py-2 text-xs text-slate-400 dark:text-slate-500">
                        +{roleUsers.length - 10} more ·{" "}
                        <a href="/admin/users" className="text-cyan-600 dark:text-cyan-400 hover:underline">View all</a>
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Settings */}
      <div>
        <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-4">
          Settings
        </h2>
        <div className="glass rounded-2xl p-5 flex items-center gap-4">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center shrink-0 shadow-sm">
            <Bell className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Visitor notifications</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Send a push notification to your devices when an authenticated user opens the app (once per session).
            </p>
          </div>
          <VisitorNotificationsToggle initialEnabled={visitorNotificationsEnabled} />
        </div>
      </div>

      {/* Recent activity */}
      <div>
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
            <Activity className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          </div>
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Recent activity</span>
          <div className="animate-rule-enter flex-1 h-[1.5px] bg-gradient-to-r from-slate-300/60 to-transparent dark:from-slate-600/50 dark:to-transparent" />
        </div>
        {recentActivity.length === 0 ? (
          <div className="glass-sm rounded-xl px-4 py-5 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">No activity yet</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {recentActivity.map((event) => (
              <div key={event.id} className="glass-sm rounded-xl px-3 py-2.5 flex items-center gap-3">
                <ActivityBadge type={event.type} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700 dark:text-slate-200 leading-snug truncate">{event.body}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    {formatDistanceToNow(event.createdAt, { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent trips */}
      <div>
        <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-4">
          Recent trips
        </h2>
        <div className="glass rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-700">
                <th className="text-left px-5 py-3 font-medium">Trip</th>
                <th className="text-right px-5 py-3 font-medium hidden sm:table-cell">Members</th>
                <th className="text-right px-5 py-3 font-medium hidden md:table-cell">Expenses</th>
                <th className="text-right px-5 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/60 dark:divide-slate-700/40">
              {trips.slice(0, 15).map((t) => (
                <tr key={t.id}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-700 dark:text-slate-200 truncate max-w-[200px]">{t.name}</p>
                      {t.isArchived && (
                        <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-400 px-1.5 py-0.5 rounded">archived</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right tabular text-slate-600 dark:text-slate-300 hidden sm:table-cell">
                    {Number(t.memberCount)}
                  </td>
                  <td className="px-5 py-3 text-right tabular text-slate-600 dark:text-slate-300 hidden md:table-cell">
                    {Number(t.expenseCount)}
                  </td>
                  <td className="px-5 py-3 text-right text-slate-400 dark:text-slate-500 text-xs">
                    {formatDate(t.createdAt!)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {trips.length > 15 && (
            <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-700 text-xs text-slate-400 dark:text-slate-500">
              Showing 15 of {trips.length} trips ·{" "}
              <a href="/admin/trips" className="text-cyan-600 dark:text-cyan-400 hover:underline">View all</a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
