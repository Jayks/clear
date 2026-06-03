import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { expenses } from "@/lib/db/schema/expenses";
import { eq, and } from "drizzle-orm";
import { getGroupWithMembers } from "@/lib/db/queries/groups";
import { getExpenseReactions, getExpenseDisputes } from "@/lib/db/queries/interactions";
import { getCurrentUser, getMembership } from "@/lib/db/queries/auth";
import { acceptDispute, declineDispute } from "@/app/actions/interactions";
import { CheckCircle2, XCircle, Smile } from "lucide-react";
import Link from "next/link";
import { BackButton } from "@/components/shared/back-button";
import { formatDistanceToNow } from "date-fns";
import type { Metadata } from "next";
import { formatCurrency, getMemberName } from "@/lib/utils";
import { getCategory } from "@/lib/categories";
import { REACTION_META } from "@/lib/db/schema/expense-reactions";
import { DISPUTE_TYPE_META, ACTIONABLE_DISPUTE_TYPES } from "@/lib/db/schema/expense-disputes";
import { ThreadCommentSection } from "./thread-comment-section";
import { fetchExpenseCommentsAction } from "@/app/actions/interactions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; expenseId: string }>;
}): Promise<Metadata> {
  const { expenseId } = await params;
  const [expense] = await db
    .select({ description: expenses.description })
    .from(expenses)
    .where(eq(expenses.id, expenseId));
  return { title: expense ? `${expense.description} · Thread | Clear` : "Clear" };
}

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ id: string; expenseId: string }>;
}) {
  const { id: groupId, expenseId } = await params;

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const membership = await getMembership(groupId, user.id);
  if (!membership) notFound();

  const [groupData, expenseRows, comments, reactions, disputes] = await Promise.all([
    getGroupWithMembers(groupId),
    db
      .select()
      .from(expenses)
      .where(and(eq(expenses.id, expenseId), eq(expenses.groupId, groupId))),
    fetchExpenseCommentsAction(expenseId, groupId),
    getExpenseReactions(expenseId, groupId),
    getExpenseDisputes(expenseId, groupId),
  ]);

  if (!groupData || expenseRows.length === 0) notFound();

  const expense = expenseRows[0];
  const { members } = groupData;
  const currentMemberId = membership.id;
  const isAdmin = membership.role === "admin";

  const payer = members.find((m) => m.id === expense.paidByMemberId);
  const isPayer = payer?.userId === user.id;
  const canResolveDispute = isPayer || isAdmin;

  const catMeta = getCategory(expense.category);

  // Group reactions by emoji for display
  const reactionGroups: Record<string, string[]> = {};
  for (const r of reactions) {
    if (!reactionGroups[r.emoji]) reactionGroups[r.emoji] = [];
    reactionGroups[r.emoji].push(r.memberName);
  }

  // Pending dispute (first one)
  const pendingDispute = disputes.find((d) => d.status === "pending") ?? null;

  return (
    <div className="pb-36 md:pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <BackButton
          href={`/groups/${groupId}/expenses`}
          label="Back"
          className="hidden md:inline-flex items-center gap-1.5 min-h-[44px] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-sm font-medium transition-colors"
        />
      </div>

      {/* Expense summary card */}
      <div className="glass rounded-2xl px-5 py-4 mb-5">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${catMeta.gradient} flex items-center justify-center shrink-0`}>
            <catMeta.icon className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1
              className="text-base font-semibold text-slate-800 dark:text-slate-100 truncate"
              style={{ fontFamily: "var(--font-fraunces)" }}
            >
              {expense.description}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Paid by {payer ? getMemberName(payer) : "Member"}
            </p>
          </div>
          <p
            className="text-xl font-semibold text-slate-800 dark:text-slate-100 shrink-0"
            style={{ fontFamily: "var(--font-fraunces)" }}
          >
            {formatCurrency(Number(expense.amount), expense.currency)}
          </p>
        </div>
      </div>

      {/* Reactions summary */}
      {Object.keys(reactionGroups).length > 0 && (
        <div className="mb-5">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
              <Smile className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            </div>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Reactions</span>
            <div className="flex-1 h-px bg-slate-200/80 dark:bg-slate-700/50" />
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(reactionGroups).map(([emoji, names]) => {
              const meta = REACTION_META[emoji as keyof typeof REACTION_META];
              if (!meta) return null;
              return (
                <div
                  key={emoji}
                  title={names.join(", ")}
                  className="flex items-center gap-1.5 px-3 py-1.5 glass rounded-xl text-sm"
                >
                  <span>{meta.emoji}</span>
                  <span className="text-slate-600 dark:text-slate-300 text-xs font-medium">
                    {names.length}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {meta.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pending dispute card */}
      {pendingDispute && (
        <div
          className={`rounded-2xl border px-5 py-4 mb-5 space-y-3 ${
            pendingDispute.type === "question"
              ? "border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20"
              : "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20"
          }`}
        >
          <div className="flex items-start gap-3">
            <span className="text-xl mt-0.5">
              {pendingDispute.type === "question" ? "❓" : "⚠️"}
            </span>
            <div className="flex-1">
              <p
                className={`text-sm font-semibold ${
                  pendingDispute.type === "question"
                    ? "text-amber-800 dark:text-amber-200"
                    : "text-red-800 dark:text-red-200"
                }`}
              >
                {DISPUTE_TYPE_META[pendingDispute.type as keyof typeof DISPUTE_TYPE_META]
                  ?.label ?? "Dispute"}{" "}
                · {pendingDispute.requesterName}
              </p>
              {pendingDispute.message && (
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                  {pendingDispute.message}
                </p>
              )}
              {pendingDispute.type === "change_share" &&
                pendingDispute.suggestedAmount !== null && (
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                    Suggested share:{" "}
                    {formatCurrency(pendingDispute.suggestedAmount, expense.currency)}
                  </p>
                )}
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                {formatDistanceToNow(pendingDispute.createdAt, { addSuffix: true })}
              </p>
            </div>
          </div>

          {/* Accept / Decline — payer or admin only, not the requester */}
          {canResolveDispute &&
            pendingDispute.requesterMemberId !== currentMemberId &&
            ACTIONABLE_DISPUTE_TYPES.includes(
              pendingDispute.type as (typeof ACTIONABLE_DISPUTE_TYPES)[number]
            ) && (
              <div className="flex gap-2">
                <form
                  action={async () => {
                    "use server";
                    await acceptDispute(pendingDispute.id);
                  }}
                >
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white text-sm font-semibold transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Accept &amp; update split
                  </button>
                </form>
                <form
                  action={async () => {
                    "use server";
                    await declineDispute(pendingDispute.id);
                  }}
                >
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-sm font-semibold transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                    Decline
                  </button>
                </form>
              </div>
            )}
        </div>
      )}

      {/* Discussion — client component handles optimistic updates */}
      <ThreadCommentSection
        initialComments={comments ?? []}
        expenseId={expenseId}
        groupId={groupId}
        members={members}
        currentMemberId={currentMemberId}
        isAdmin={isAdmin}
      />

      {/* Resolved / historical disputes */}
      {disputes.filter((d) => d.status !== "pending").length > 0 && (
        <div className="mb-5 mt-5">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            </div>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Resolved disputes</span>
            <div className="flex-1 h-px bg-slate-200/80 dark:bg-slate-700/50" />
          </div>
          <div className="space-y-2">
            {disputes
              .filter((d) => d.status !== "pending")
              .map((dispute) => (
                <div
                  key={dispute.id}
                  className="glass rounded-xl px-4 py-3 flex items-center gap-3"
                >
                  <span className="text-base">
                    {dispute.status === "accepted"
                      ? "✅"
                      : dispute.status === "declined"
                      ? "❌"
                      : "🔕"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      {DISPUTE_TYPE_META[
                        dispute.type as keyof typeof DISPUTE_TYPE_META
                      ]?.label ?? "Dispute"}{" "}
                      · {dispute.requesterName}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                      {dispute.status.charAt(0).toUpperCase() +
                        dispute.status.slice(1)}
                      {dispute.resolvedAt &&
                        ` · ${formatDistanceToNow(dispute.resolvedAt, {
                          addSuffix: true,
                        })}`}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
