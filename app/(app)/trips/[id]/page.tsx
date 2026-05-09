import { notFound } from "next/navigation";
import { getTripWithMembers } from "@/lib/db/queries/trips";
import { getTripName } from "@/lib/db/queries/meta";
import { getExpenses } from "@/lib/db/queries/expenses";
import { ArrowLeft, Users, Receipt, Wallet, BarChart2, Pencil, Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { formatDate } from "@/lib/utils";
import { BudgetBar } from "@/components/trip/budget-bar";
import { ArchiveButton } from "./archive-button";
import { QRInvite } from "@/components/trip/qr-invite";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const name = await getTripName(id);
  return { title: name ? `${name} | Wayfare` : "Wayfare" };
}
import { ShareButton } from "./share-button";
import { RegenerateTokenButton } from "./members/regenerate-token-button";

export default async function TripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [data, expenses] = await Promise.all([
    getTripWithMembers(id),
    getExpenses(id),
  ]);
  if (!data) notFound();

  const { trip, members, currentMember } = data;
  const isAdmin = currentMember?.role === "admin";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const inviteUrl = `${appUrl}/join/${trip.shareToken}`;
  const totalSpent = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <div>
      {/* Back + Edit */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/trips"
          className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-sm font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          All trips
        </Link>
        {isAdmin && (
          <Link
            href={`/trips/${trip.id}/edit`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 bg-white/60 hover:bg-white/80 dark:bg-slate-800/60 dark:hover:bg-slate-700/60 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit trip
          </Link>
        )}
      </div>

      {/* Hero */}
      <div className="glass rounded-2xl overflow-hidden mb-6">
        <div className="h-52 relative">
          {trip.coverPhotoUrl ? (
            <Image
              src={trip.coverPhotoUrl}
              alt={trip.name}
              fill
              sizes="(max-width: 1280px) 100vw, 1280px"
              className="object-cover"
              priority
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-cyan-500 to-teal-500" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-slate-900/20 to-transparent" />
          <div className="absolute bottom-4 left-5 right-5">
            <h1 className="text-white text-2xl sm:text-3xl" style={{ fontFamily: "var(--font-fraunces)" }}>
              {trip.name}
            </h1>
            {(trip.startDate || trip.endDate) && (
              <p className="text-white/75 text-sm mt-1">
                {trip.startDate ? formatDate(trip.startDate) : ""}
                {trip.startDate && trip.endDate ? " → " : ""}
                {trip.endDate ? formatDate(trip.endDate) : ""}
              </p>
            )}
          </div>
        </div>
        {trip.description && (
          <div className="px-5 py-3 border-t border-white/30 dark:border-slate-700/40">
            <p className="text-slate-600 dark:text-slate-300 text-sm">{trip.description}</p>
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6" data-tour="trip-quick-actions">
        <Link
          href={`/trips/${trip.id}/members`}
          className="glass rounded-xl p-4 flex items-center gap-3 hover:shadow-lg hover:shadow-cyan-500/10 transition-all"
        >
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center shadow-sm">
            <Users className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Members</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{members.length} {members.length === 1 ? "person" : "people"}</p>
          </div>
        </Link>

        <Link
          href={`/trips/${trip.id}/expenses`}
          className="glass rounded-xl p-4 flex items-center gap-3 hover:shadow-lg hover:shadow-cyan-500/10 transition-all"
        >
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center shadow-sm">
            <Receipt className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Expenses</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Log what was spent</p>
          </div>
        </Link>

        <Link
          href={`/trips/${trip.id}/settle`}
          className="glass rounded-xl p-4 flex items-center gap-3 hover:shadow-lg hover:shadow-cyan-500/10 transition-all"
        >
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center shadow-sm">
            <Wallet className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Settle up</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Who owes whom</p>
          </div>
        </Link>

        <Link
          href={`/trips/${trip.id}/insights`}
          className="glass rounded-xl p-4 flex items-center gap-3 hover:shadow-lg hover:shadow-cyan-500/10 transition-all"
        >
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center shadow-sm">
            <BarChart2 className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Insights</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Spend analytics</p>
          </div>
        </Link>
      </div>

      {/* Trip summary */}
      <Link
        href={`/summary/${trip.shareToken}`}
        className="glass rounded-xl p-4 flex items-center gap-3 mb-6 hover:shadow-lg hover:shadow-cyan-500/10 transition-all group"
      >
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center shadow-sm shrink-0">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Trip Summary</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">View and share your trip story</p>
        </div>
        <ArrowRight className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-cyan-500 transition-colors shrink-0" />
      </Link>

      {/* Budget bar */}
      {trip.budget && (
        <div className="mb-4">
          <BudgetBar
            spent={totalSpent}
            budget={Number(trip.budget)}
            currency={trip.defaultCurrency}
          />
        </div>
      )}

      {/* Invite link */}
      {isAdmin && (
        <div className="glass rounded-xl p-4 mb-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Invite to trip</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Share with your group</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <ShareButton url={inviteUrl} tripName={trip.name} />
              <QRInvite url={inviteUrl} />
            </div>
          </div>
          <RegenerateTokenButton tripId={trip.id} inviteUrl={inviteUrl} />
        </div>
      )}

      {/* Archive */}
      {isAdmin && (
        <div className="flex justify-end">
          <ArchiveButton tripId={trip.id} isArchived={trip.isArchived} />
        </div>
      )}
    </div>
  );
}
