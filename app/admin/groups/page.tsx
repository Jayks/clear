import { getAdminGroupList } from "@/lib/db/queries/admin";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Map, Archive, Users, Receipt, TrendingUp } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Trips — Clear Admin" };

export default async function AdminTripsPage() {
  const trips = await getAdminGroupList();

  const active   = trips.filter((t) => !t.isArchived);
  const archived = trips.filter((t) => t.isArchived);

  const totalMembers  = trips.reduce((s, t) => s + Number(t.memberCount), 0);
  const totalExpenses = trips.reduce((s, t) => s + Number(t.expenseCount), 0);
  const totalSpend    = trips.reduce((s, t) => s + Number(t.totalSpend ?? 0), 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl text-slate-800 dark:text-slate-100 mb-1" style={{ fontFamily: "var(--font-fraunces)" }}>
          Trips
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">{trips.length} trips created across the platform</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Active trips",      value: active.length,               icon: Map,        color: "from-cyan-500 to-teal-500" },
          { label: "Archived trips",    value: archived.length,             icon: Archive,    color: "from-slate-400 to-slate-500" },
          { label: "Total members",     value: totalMembers,                icon: Users,      color: "from-teal-500 to-emerald-500" },
          { label: "Total expenses",    value: totalExpenses,               icon: Receipt,    color: "from-blue-500 to-cyan-500" },
        ].map((s) => (
          <div key={s.label} className="glass rounded-2xl p-4">
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center mb-3 shadow-sm`}>
              <s.icon className="w-4 h-4 text-white" />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">{s.label}</p>
            <p className="text-2xl font-semibold text-slate-800 dark:text-slate-100 tabular">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Trips table */}
      {[
        { label: "Active trips", rows: active, emptyMsg: "No active trips" },
        { label: "Archived trips", rows: archived, emptyMsg: "No archived trips" },
      ].map(({ label, rows, emptyMsg }) => (
        rows.length > 0 && (
          <div key={label}>
            <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-2">
              {label === "Archived trips" && <Archive className="w-3.5 h-3.5" />}
              {label}
              <span className="text-slate-300 dark:text-slate-600 font-normal normal-case tracking-normal">· {rows.length}</span>
            </h2>

            <div className={`glass rounded-2xl overflow-hidden ${label === "Archived trips" ? "opacity-75" : ""}`}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-700 text-xs text-slate-400 dark:text-slate-500">
                      <th className="text-left px-5 py-3.5 font-medium">Trip</th>
                      <th className="text-left px-5 py-3.5 font-medium hidden md:table-cell">Owner</th>
                      <th className="text-right px-5 py-3.5 font-medium hidden sm:table-cell">Members</th>
                      <th className="text-right px-5 py-3.5 font-medium hidden md:table-cell">Expenses</th>
                      <th className="text-right px-5 py-3.5 font-medium hidden lg:table-cell">Total spend</th>
                      <th className="text-right px-5 py-3.5 font-medium">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/60 dark:divide-slate-700/40">
                    {rows.map((t) => {
                      const spend = Number(t.totalSpend ?? 0);
                      return (
                        <tr key={t.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/40 transition-colors">
                          {/* Trip name + dates */}
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              {/* Cover photo or placeholder */}
                              <div
                                className="w-9 h-9 rounded-xl shrink-0 overflow-hidden bg-gradient-to-br from-cyan-400 to-teal-400 shadow-sm"
                              >
                                {t.coverPhotoUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={`${t.coverPhotoUrl}&w=72&h=72&fit=crop&q=60`}
                                    alt=""
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Map className="w-4 h-4 text-white" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-slate-800 dark:text-slate-100 truncate max-w-[180px]">{t.name}</p>
                                {(t.startDate || t.endDate) && (
                                  <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                                    {t.startDate && formatDate(t.startDate)}
                                    {t.startDate && t.endDate && " – "}
                                    {t.endDate && formatDate(t.endDate)}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Owner */}
                          <td className="px-5 py-3 hidden md:table-cell">
                            <p className="text-slate-600 dark:text-slate-300 truncate max-w-[140px]">{t.creatorName ?? "—"}</p>
                          </td>

                          {/* Members */}
                          <td className="px-5 py-3 text-right tabular text-slate-600 dark:text-slate-300 hidden sm:table-cell">
                            <span className="inline-flex items-center gap-1">
                              <Users className="w-3 h-3 text-slate-300 dark:text-slate-600" />
                              {Number(t.memberCount)}
                            </span>
                          </td>

                          {/* Expenses */}
                          <td className="px-5 py-3 text-right tabular text-slate-600 dark:text-slate-300 hidden md:table-cell">
                            <span className="inline-flex items-center gap-1">
                              <Receipt className="w-3 h-3 text-slate-300 dark:text-slate-600" />
                              {Number(t.expenseCount)}
                            </span>
                          </td>

                          {/* Total spend */}
                          <td className="px-5 py-3 text-right tabular hidden lg:table-cell">
                            {spend > 0 ? (
                              <span className="font-medium text-slate-700 dark:text-slate-200" style={{ fontFamily: "var(--font-fraunces)" }}>
                                {formatCurrency(spend, t.defaultCurrency)}
                              </span>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-600">—</span>
                            )}
                          </td>

                          {/* Created */}
                          <td className="px-5 py-3 text-right text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap">
                            {formatDate(t.createdAt!)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )
      ))}

      {trips.length === 0 && (
        <div className="glass rounded-2xl text-center py-16">
          <Map className="w-10 h-10 text-slate-200 dark:text-slate-700 mx-auto mb-3" />
          <p className="text-sm text-slate-400 dark:text-slate-500">No trips yet</p>
        </div>
      )}

      {/* Platform totals footer */}
      <div className="glass rounded-xl px-5 py-4 flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <TrendingUp className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
          <span>Platform total spend:</span>
          <span className="font-semibold text-slate-800 dark:text-slate-100 tabular" style={{ fontFamily: "var(--font-fraunces)" }}>
            {formatCurrency(totalSpend, "INR")}
          </span>
          <span className="text-slate-400 dark:text-slate-500 text-xs">(all currencies summed as INR)</span>
        </div>
      </div>
    </div>
  );
}
