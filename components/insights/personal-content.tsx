"use client";

import { motion } from "framer-motion";
import {
  Users, TrendingUp, Wallet, ArrowUpRight, ArrowDownLeft,
  Sparkles, PieChart, BarChart2, Home, MapPin, User, ArrowLeftRight,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { CategoryDonut } from "@/components/insights/category-donut";
import { PaymentMethodCard } from "@/components/insights/payment-method-card";
import { FadeIn } from "@/components/shared/fade-in";
import { AnimatedList } from "@/components/shared/animated-list";
import type { PersonalInsights } from "@/lib/insights/personal-insights";
import type { StreamNetSummary } from "@/components/insights/insights-tabs";

// ── Section header (amber — matches insights colour identity) ─────────────

function SectionHeader({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <div className="w-6 h-6 rounded-md bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
        <Icon className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
      </div>
      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</span>
      <div className="flex-1 h-[1.5px] bg-gradient-to-r from-amber-200/70 to-transparent dark:from-amber-800/40 dark:to-transparent" />
    </div>
  );
}

// ── Group type icon ───────────────────────────────────────────────────────

const GROUP_GRADIENTS = [
  "from-cyan-500 to-teal-500",
  "from-violet-500 to-purple-600",
  "from-amber-500 to-orange-500",
  "from-emerald-500 to-green-500",
  "from-rose-500 to-pink-500",
  "from-blue-500 to-indigo-500",
  "from-fuchsia-500 to-violet-500",
  "from-teal-500 to-emerald-500",
];

function groupGradient(i: number) {
  return GROUP_GRADIENTS[i % GROUP_GRADIENTS.length];
}

// ── Formatter helper ──────────────────────────────────────────────────────

function useFmt(currency: string) {
  return (n: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(n);
}

// ── Plus gate card ────────────────────────────────────────────────────────

export function PersonalPlusGate() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="glass rounded-2xl p-8 flex flex-col items-center text-center gap-4 mt-4"
    >
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
        <Sparkles className="w-6 h-6 text-white" />
      </div>
      <div>
        <p
          className="text-xl text-slate-800 dark:text-slate-100 mb-1"
          style={{ fontFamily: "var(--font-fraunces)" }}
        >
          Personal insights — Plus feature
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs">
          See your actual spend across all groups, your top categories, who you share the most with, and your personal banker story.
        </p>
      </div>
      <Link
        href="/upgrade"
        className="inline-flex items-center gap-1.5 bg-gradient-to-br from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white text-sm font-medium rounded-xl px-5 py-2.5 shadow-md shadow-violet-500/25 transition-all"
      >
        <Sparkles className="w-3.5 h-3.5" />
        Upgrade to Clear Plus
      </Link>
    </motion.div>
  );
}

// ── Main PersonalContent ──────────────────────────────────────────────────

interface Props {
  data:            PersonalInsights;
  streamSummary?:  StreamNetSummary;
}

export function PersonalContent({ data, streamSummary }: Props) {
  const fmt = useFmt(data.currency);
  const fmtS = useFmt(streamSummary?.currency ?? data.currency);
  const hasStreamBalance = streamSummary &&
    (streamSummary.owedToMe > 0.01 || streamSummary.iOwe > 0.01);
  const hasNet = data.totalOwedToMe > 0 || data.totalIOwe > 0;
  const hasBanker = data.bankerFloat > 0 && data.totalShare > 0 && data.bankerFloat / data.totalShare > 0.1;
  const hasCompanions = data.companions.length > 0;

  return (
    <div>
      {/* ── Opening sentence ─────────────────────────────────────────── */}
      <FadeIn>
        <div className="mb-6">
          <h1
            className="text-3xl text-slate-800 dark:text-slate-100"
            style={{ fontFamily: "var(--font-fraunces)" }}
          >
            Your financial picture
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 leading-relaxed max-w-xl">
            {data.openingSentence}
          </p>
          {data.openingSub && (
            <p className="text-slate-400 dark:text-slate-500 text-xs mt-0.5">
              {data.openingSub}
            </p>
          )}
        </div>
      </FadeIn>

      {/* ── KPI row: total share + monthly avg ───────────────────────── */}
      <AnimatedList className="grid grid-cols-2 gap-3 mb-6" staggerMs={80}>
        <motion.div
          className="glass rounded-2xl p-4 bg-gradient-to-br from-amber-500 to-orange-400 text-white shadow-md shadow-amber-500/25"
        >
          <p className="text-white/70 text-xs font-medium mb-1">Total your share</p>
          <p
            className="text-2xl font-semibold"
            style={{ fontFamily: "var(--font-fraunces)" }}
          >
            {fmt(data.totalShare)}
          </p>
          <p className="text-white/60 text-xs mt-0.5">{data.expenseCount} expenses</p>
        </motion.div>
        <div className="glass rounded-2xl p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Avg / month</p>
          <p
            className="text-2xl font-semibold text-slate-800 dark:text-slate-100"
            style={{ fontFamily: "var(--font-fraunces)" }}
          >
            {data.monthlyAverage > 0 ? fmt(data.monthlyAverage) : "—"}
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            {data.firstExpenseDate
              ? `since ${data.firstExpenseDate.slice(0, 4)}`
              : "across all time"}
          </p>
        </div>
      </AnimatedList>

      {/* ── Stream net position ─────────────────────────────────────── */}
      {hasStreamBalance && streamSummary && (
        <FadeIn className="mb-6">
          <SectionHeader icon={ArrowLeftRight} label="Streams" />
          <Link href="/stream"
            className="glass rounded-xl px-4 py-3.5 flex items-center gap-3 hover:shadow-md transition-all group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500
                            flex items-center justify-center shrink-0 shadow-sm shadow-indigo-500/25">
              <ArrowLeftRight className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Personal streams</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                {streamSummary.owedToMe > 0.01 && (
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                    {fmtS(streamSummary.owedToMe)} owed to you
                  </span>
                )}
                {streamSummary.owedToMe > 0.01 && streamSummary.iOwe > 0.01 && " · "}
                {streamSummary.iOwe > 0.01 && (
                  <span className="text-amber-600 dark:text-amber-400 font-medium">
                    {fmtS(streamSummary.iOwe)} you owe
                  </span>
                )}
              </p>
            </div>
            <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0
                             group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors">
              View →
            </span>
          </Link>
        </FadeIn>
      )}

      {/* ── Zone 1: Net position ─────────────────────────────────────── */}
      {hasNet && (
        <FadeIn className="mb-8">
          <SectionHeader icon={Wallet} label="Right now" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Owed to you */}
            {data.totalOwedToMe > 0 && (
              <div className="glass rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-md bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                    <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Owed to you
                  </span>
                  <span
                    className="ml-auto text-sm font-semibold text-emerald-600 dark:text-emerald-400"
                    style={{ fontFamily: "var(--font-fraunces)" }}
                  >
                    {fmt(data.totalOwedToMe)}
                  </span>
                </div>
                <AnimatedList className="space-y-1.5" staggerMs={60}>
                  {data.netByGroup
                    .filter((g) => g.net > 0)
                    .map((g) => (
                      <NetGroupRow key={g.groupId} group={g} fmt={fmt} />
                    ))}
                </AnimatedList>
              </div>
            )}

            {/* You owe */}
            {data.totalIOwe > 0 && (
              <div className="glass rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-md bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                    <ArrowUpRight className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    You owe
                  </span>
                  <span
                    className="ml-auto text-sm font-semibold text-amber-600 dark:text-amber-400"
                    style={{ fontFamily: "var(--font-fraunces)" }}
                  >
                    {fmt(data.totalIOwe)}
                  </span>
                </div>
                <AnimatedList className="space-y-1.5" staggerMs={60}>
                  {data.netByGroup
                    .filter((g) => g.net < 0)
                    .map((g) => (
                      <NetGroupRow key={g.groupId} group={g} fmt={fmt} />
                    ))}
                </AnimatedList>
              </div>
            )}
          </div>
        </FadeIn>
      )}

      {/* ── Zone 2: Financial circle ──────────────────────────────────── */}
      {hasCompanions && (
        <FadeIn className="mb-8">
          <SectionHeader icon={Users} label="Your financial circle" />
          <AnimatedList className="grid grid-cols-1 sm:grid-cols-2 gap-3" staggerMs={80}>
            {data.companions.map((c, i) => (
              <CompanionCard key={c.userId} companion={c} fmt={fmt} index={i} />
            ))}
          </AnimatedList>
        </FadeIn>
      )}

      {/* ── Zone 3: Triggered insight + Banker ───────────────────────── */}
      <FadeIn className="mb-8">
        {data.triggeredInsight && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="glass rounded-2xl p-4 mb-4 border border-amber-100 dark:border-amber-900/40"
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl leading-none mt-0.5">{data.triggeredInsight.icon}</span>
              <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                {data.triggeredInsight.text}
              </p>
            </div>
          </motion.div>
        )}

        {hasBanker && (
          <BankerCard data={data} fmt={fmt} />
        )}
      </FadeIn>

      {/* ── Zone 4: Category + per-group breakdown ────────────────────── */}
      <FadeIn className="mb-8">
        <SectionHeader icon={PieChart} label="Where your money went" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CategoryDonut data={data.byCategory} currency={data.currency} />
          <GroupShareBars data={data.byGroup} fmt={fmt} />
        </div>
      </FadeIn>

      {/* ── Zone 5: How you settle up (payment method breakdown) ───────── */}
      {data.paymentMethodStats.length > 0 && (
        <FadeIn className="mb-8">
          <SectionHeader icon={Wallet} label="How you settle up" />
          <PaymentMethodCard
            stats={data.paymentMethodStats}
            currency={data.currency}
          />
        </FadeIn>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────

function NetGroupRow({
  group,
  fmt,
}: {
  group: { groupId: string; groupName: string; groupType: string; net: number };
  fmt: (n: number) => string;
}) {
  const isOwed = group.net > 0;
  return (
    <Link
      href={`/groups/${group.groupId}/settle`}
      className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/40 dark:hover:bg-slate-700/30 transition-colors group"
    >
      <div className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
        {group.groupType === "nest"
          ? <Home className="w-3 h-3 text-slate-400" />
          : <MapPin className="w-3 h-3 text-slate-400" />}
      </div>
      <span className="text-xs text-slate-600 dark:text-slate-300 truncate flex-1">
        {group.groupName}
      </span>
      <span
        className={cn(
          "text-xs font-semibold tabular-nums shrink-0",
          isOwed
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-amber-600 dark:text-amber-400"
        )}
      >
        {isOwed ? "+" : "−"}{fmt(Math.abs(group.net))}
      </span>
      <ArrowUpRight className="w-3 h-3 text-slate-300 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-400 transition-colors shrink-0" />
    </Link>
  );
}

function CompanionCard({
  companion,
  fmt,
  index,
}: {
  companion: PersonalInsights["companions"][number];
  fmt: (n: number) => string;
  index: number;
}) {
  const isRecent =
    companion.lastActiveDate !== null &&
    new Date(companion.lastActiveDate) > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.07 }}
      className="glass rounded-2xl p-4 flex items-center gap-3"
    >
      <MemberAvatar name={companion.name} size="lg" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
            {companion.name}
          </p>
          {isRecent && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
          )}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {companion.groupCount} {companion.groupCount === 1 ? "group" : "groups"} together
        </p>
        <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-0.5">
          {companion.label}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p
          className="text-sm font-semibold text-slate-700 dark:text-slate-200"
          style={{ fontFamily: "var(--font-fraunces)" }}
        >
          {fmt(companion.totalShared)}
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500">shared</p>
      </div>
    </motion.div>
  );
}

function BankerCard({
  data,
  fmt,
}: {
  data: PersonalInsights;
  fmt: (n: number) => string;
}) {
  const trendUp =
    data.bankerFloatPrevYear !== null && data.bankerFloat > data.bankerFloatPrevYear * 1.1;
  const trendDown =
    data.bankerFloatPrevYear !== null && data.bankerFloat < data.bankerFloatPrevYear * 0.9;

  const floatPct = data.totalPaidUpfront > 0
    ? Math.round((data.bankerFloat / data.totalPaidUpfront) * 100)
    : 0;

  return (
    <div className="glass rounded-2xl p-5 border border-cyan-100 dark:border-cyan-900/40">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-0.5">
            You paid upfront
          </p>
          <p
            className="text-2xl font-semibold text-slate-800 dark:text-slate-100"
            style={{ fontFamily: "var(--font-fraunces)" }}
          >
            {fmt(data.totalPaidUpfront)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-0.5">
            Your actual share
          </p>
          <p
            className="text-2xl font-semibold text-slate-800 dark:text-slate-100"
            style={{ fontFamily: "var(--font-fraunces)" }}
          >
            {fmt(data.totalShare)}
          </p>
        </div>
      </div>

      {/* Float bar */}
      <div className="relative h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-3">
        <motion.div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500 to-teal-500 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(floatPct, 100)}%` }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
        />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-cyan-600 dark:text-cyan-400">
            You float {fmt(data.bankerFloat)} for your groups
          </p>
          {data.bankerFloatPrevYear !== null && (
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 flex items-center gap-1">
              {trendUp && <TrendingUp className="w-3 h-3 text-amber-500" />}
              {trendDown && <TrendingUp className="w-3 h-3 text-emerald-500 rotate-180" />}
              {trendUp
                ? `Up from ${fmt(data.bankerFloatPrevYear)} last year`
                : trendDown
                ? `Down from ${fmt(data.bankerFloatPrevYear)} last year`
                : `${fmt(data.bankerFloatPrevYear)} last year`}
            </p>
          )}
        </div>
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center shadow-sm shadow-cyan-500/25 shrink-0">
          <Wallet className="w-4 h-4 text-white" />
        </div>
      </div>
    </div>
  );
}

function GroupShareBars({
  data,
  fmt,
}: {
  data: PersonalInsights["byGroup"];
  fmt: (n: number) => string;
}) {
  if (data.length === 0) return null;
  const maxShare = data[0]?.myShare ?? 1;

  return (
    <div className="glass rounded-2xl p-4">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-4">
        Your share per group
      </p>
      <div className="space-y-3">
        {data.slice(0, 6).map((g, i) => (
          <Link
            key={g.groupId}
            href={`/groups/${g.groupId}/insights`}
            className="block group"
          >
            <div className="flex items-center gap-2 mb-1">
              <div
                className={cn(
                  "w-5 h-5 rounded-md bg-gradient-to-br flex items-center justify-center shrink-0",
                  groupGradient(i)
                )}
              >
                {g.groupType === "nest"
                  ? <Home className="w-3 h-3 text-white" />
                  : <MapPin className="w-3 h-3 text-white" />}
              </div>
              <span className="text-xs text-slate-700 dark:text-slate-200 truncate flex-1 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                {g.groupName}
              </span>
              <span
                className="text-xs font-semibold text-slate-700 dark:text-slate-200 tabular-nums shrink-0"
                style={{ fontFamily: "var(--font-fraunces)" }}
              >
                {fmt(g.myShare)}
              </span>
            </div>
            <div className="relative h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <motion.div
                className={cn("absolute inset-y-0 left-0 rounded-full bg-gradient-to-r", groupGradient(i))}
                initial={{ width: 0 }}
                animate={{ width: `${(g.myShare / maxShare) * 100}%` }}
                transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 + i * 0.05 }}
              />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
