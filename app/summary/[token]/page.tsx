import { notFound } from "next/navigation";
import { db } from "@/lib/db/client";
import { groups } from "@/lib/db/schema/groups";
import { groupMembers } from "@/lib/db/schema/group-members";
import { expenses } from "@/lib/db/schema/expenses";
import { eq, sql, desc, asc } from "drizzle-orm";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { differenceInDays, parseISO } from "date-fns";
import { formatDate } from "@/lib/utils";
import { getCategory, CATEGORY_HEX } from "@/lib/categories";
import { SummaryShareButton } from "@/components/trip/summary-share-button";
import { NarrativeSection } from "@/components/trip/narrative-section";
import Link from "next/link";
import Image from "next/image";
import { Compass } from "lucide-react";
import type { Metadata } from "next";

const getSummaryData = cache(async function getSummaryData(token: string) {
  const [trip] = await db.select().from(groups).where(eq(groups.shareToken, token));
  if (!trip || trip.groupType === "nest") return null;

  const [memberRows, categoryRows, [expCount], allExpenseRows] = await Promise.all([
    db.select({ id: groupMembers.id }).from(groupMembers).where(eq(groupMembers.groupId, trip.id)),
    db
      .select({
        category: expenses.category,
        total: sql<number>`sum(amount)::float8`,
      })
      .from(expenses)
      .where(eq(expenses.groupId, trip.id))
      .groupBy(expenses.category),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(expenses)
      .where(eq(expenses.groupId, trip.id)),
    db
      .select({
        description: expenses.description,
        category: expenses.category,
        expenseDate: expenses.expenseDate,
      })
      .from(expenses)
      .where(eq(expenses.groupId, trip.id))
      .orderBy(asc(expenses.expenseDate)),
  ]);

  const memberCount = memberRows.length;
  const expenseCount = expCount?.n ?? 0;
  const sorted = [...categoryRows].sort((a, b) => b.total - a.total);
  const totalSpend = sorted.reduce((s, c) => s + c.total, 0);
  const perPerson = memberCount > 0 ? totalSpend / memberCount : 0;

  // Group expenses chronologically by date for the narrative timeline
  const timelineMap = new Map<string, { description: string; category: string }[]>();
  for (const e of allExpenseRows) {
    const day = e.expenseDate ?? "unknown";
    const arr = timelineMap.get(day) ?? [];
    arr.push({ description: e.description, category: e.category });
    timelineMap.set(day, arr);
  }
  const dailyTimeline = Array.from(timelineMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, entries]) => ({ date, entries }));

  let tripDays = 0;
  if (trip.startDate && trip.endDate) {
    tripDays = Math.max(1, differenceInDays(parseISO(trip.endDate), parseISO(trip.startDate)) + 1);
  }

  return { trip, memberCount, expenseCount, categoryTotals: sorted, totalSpend, perPerson, tripDays, dailyTimeline };
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const data = await getSummaryData(token);
  if (!data) return { title: "Clear" };

  const { trip, totalSpend, memberCount } = data;
  const currency = trip.defaultCurrency;
  const total = new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(totalSpend);

  return {
    title: `${trip.name} | Clear`,
    description: `${memberCount} people · ${total} total · Split it. Clear it.`,
  };
}

export default async function SummaryPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const [data, supabase] = await Promise.all([
    getSummaryData(token),
    createClient(),
  ]);
  if (!data) notFound();

  const { data: { user } } = await supabase.auth.getUser();
  const isLoggedIn = !!user;

  const { trip, memberCount, expenseCount, categoryTotals, totalSpend, perPerson, tripDays, dailyTimeline } = data;
  const currency = trip.defaultCurrency;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const shareUrl = `${appUrl}/summary/${token}`;

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);

  const hasSpend = totalSpend > 0;

  return (
    <div className="min-h-screen pb-16">
      {/* Minimal nav */}
      <div className="glass-nav sticky top-0 z-10 px-5 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center">
            <Compass className="w-4 h-4 text-white" />
          </div>
          <span
            className="font-semibold text-slate-700 dark:text-slate-200 group-hover:text-cyan-600 transition-colors"
            style={{ fontFamily: "var(--font-fraunces)" }}
          >
            Clear
          </span>
        </Link>
        {isLoggedIn ? (
          <Link
            href="/groups"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 transition-colors"
          >
            ← My groups
          </Link>
        ) : (
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-white bg-gradient-to-br from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 px-4 py-1.5 rounded-xl transition-all shadow-sm shadow-cyan-500/20"
          >
            Get started →
          </Link>
        )}
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Hero */}
        <div className="glass rounded-3xl overflow-hidden mb-6 shadow-xl shadow-slate-200/60 dark:shadow-black/40">
          <div className="h-64 relative">
            {trip.coverPhotoUrl ? (
              <Image
                src={trip.coverPhotoUrl}
                alt={trip.name}
                fill
                sizes="(max-width: 896px) 100vw, 896px"
                className="object-cover"
                priority
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-cyan-500 to-teal-500" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent" />
            <div className="absolute bottom-5 left-6 right-6">
              <h1
                className="text-white text-2xl sm:text-3xl lg:text-4xl leading-tight"
                style={{ fontFamily: "var(--font-fraunces)" }}
              >
                {trip.name}
              </h1>
              {(trip.startDate || trip.endDate) && (
                <p className="text-white/70 text-sm mt-1">
                  {trip.startDate ? formatDate(trip.startDate) : ""}
                  {trip.startDate && trip.endDate ? " → " : ""}
                  {trip.endDate ? formatDate(trip.endDate) : ""}
                  {tripDays > 0 ? ` · ${tripDays} ${tripDays === 1 ? "day" : "days"}` : ""}
                </p>
              )}
            </div>
          </div>
          {trip.description && (
            <div className="px-6 py-3 border-t border-white/20 dark:border-slate-700/40">
              <p className="text-sm text-slate-600 dark:text-slate-300">{trip.description}</p>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Total Spent", value: fmt(totalSpend), accent: hasSpend },
            { label: "Per Person",  value: hasSpend ? fmt(perPerson) : "—" },
            { label: "Members",     value: String(memberCount) },
            { label: "Expenses",    value: String(expenseCount) },
          ].map(({ label, value, accent }) => (
            <div
              key={label}
              className={`glass rounded-2xl p-4 ${accent ? "ring-1 ring-cyan-500/30 bg-cyan-50/40 dark:bg-cyan-950/30" : ""}`}
            >
              <p className={`text-xl font-bold tabular-nums leading-tight ${accent ? "text-cyan-600 dark:text-cyan-400" : "text-slate-800 dark:text-slate-100"}`}>
                {value}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Categories */}
        {categoryTotals.length > 0 && (
          <div className="glass rounded-2xl p-5 mb-6">
            <h2
              className="text-base font-semibold text-slate-700 dark:text-slate-200 mb-4"
              style={{ fontFamily: "var(--font-fraunces)" }}
            >
              Where the money went
            </h2>
            <div className="space-y-3.5">
              {categoryTotals.map(({ category, total }) => {
                const cat = getCategory(category);
                const hex = CATEGORY_HEX[category] ?? "#64748B";
                const pct = totalSpend > 0 ? Math.round((total / totalSpend) * 100) : 0;
                const fmtTotal = fmt(total);
                return (
                  <div key={category}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: hex }} />
                        <span className="text-sm text-slate-700 dark:text-slate-200">{cat.label}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs text-slate-400 dark:text-slate-500 w-8 text-right">{pct}%</span>
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 tabular-nums w-24 text-right">
                          {fmtTotal}
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: hex }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* AI narrative */}
        {hasSpend && (
          <NarrativeSection
            tripName={trip.name}
            description={trip.description ?? null}
            itinerary={trip.itinerary ?? null}
            startDate={trip.startDate ?? null}
            endDate={trip.endDate ?? null}
            tripDays={tripDays}
            memberCount={memberCount}
            totalSpend={totalSpend}
            currency={currency}
            categoryBreakdown={categoryTotals.map((c) => ({
              category: c.category,
              total: c.total,
              pct: totalSpend > 0 ? Math.round((c.total / totalSpend) * 100) : 0,
            }))}
            dailyTimeline={dailyTimeline}
          />
        )}

        {/* Share */}
        <div className="glass rounded-2xl p-6 flex flex-col items-center text-center mb-6">
          <p
            className="text-xl font-semibold text-slate-700 dark:text-slate-200 mb-1"
            style={{ fontFamily: "var(--font-fraunces)" }}
          >
            Share this trip
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">Let the group relive the adventure</p>
          <SummaryShareButton url={shareUrl} tripName={trip.name} />
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 dark:text-slate-500">
          Made with{" "}
          <Link href="/" className="text-cyan-500 hover:text-cyan-600 font-medium transition-colors">
            Clear
          </Link>
          {" "}· Split it. Clear it.
        </p>
      </div>
    </div>
  );
}
