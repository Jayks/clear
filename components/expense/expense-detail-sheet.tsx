"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Pencil, Loader2, CheckCircle2, XCircle, Clock, Users, Smile, MessageCircle, Paperclip } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import type { Expense } from "@/lib/db/schema/expenses";
import type { GroupMember } from "@/lib/db/schema/group-members";
import type { ExpenseSplit } from "@/lib/db/schema/expense-splits";
import type { ExpenseInteractionCount } from "@/lib/db/queries/interactions";
import { getCategory, CATEGORY_HEX } from "@/lib/categories";
import { formatCurrency, formatDate, getMemberName } from "@/lib/utils";
import { fetchExpenseSplitsAction } from "@/app/actions/expenses";
import {
  addReaction,
  markSeenAction,
  acceptDispute,
  declineDispute,
  addComment,
  deleteComment,
  fetchExpenseCommentsAction,
  fetchExpenseDisputesAction,
} from "@/app/actions/interactions";
import { REACTION_META, type ReactionEmoji } from "@/lib/db/schema/expense-reactions";
import { DISPUTE_TYPE_META } from "@/lib/db/schema/expense-disputes";
import { QuestionForm } from "./question-form";
import { DisputeForm } from "./dispute-form";
import { ThreadDiscussion, type OptimisticComment } from "./thread-discussion";
import { ThreadCommentInput } from "./thread-comment-input";
import { SeenAvatarStack } from "./seen-avatar-stack";
import { useSheetDismiss } from "@/hooks/use-sheet-dismiss";

// ── Comment loading skeleton ─────────────────────────────────────────────────
function CommentSkeleton() {
  return (
    <div className="space-y-3">
      {/* Other user bubble (left) — top-aligned to match new layout */}
      <div className="flex items-start gap-1.5">
        <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse shrink-0 mt-0.5" />
        <div className="w-5 shrink-0" />
        <div className="h-12 w-44 rounded-2xl rounded-tl-sm bg-slate-100 dark:bg-slate-800 animate-pulse" />
      </div>
      {/* Own bubble (right) */}
      <div className="flex items-start gap-1.5 flex-row-reverse">
        <div className="w-5 shrink-0" />
        <div
          className="h-10 w-36 rounded-2xl rounded-tr-sm animate-pulse"
          style={{ background: "rgba(6,182,212,0.15)" }}
        />
      </div>
    </div>
  );
}

interface Props {
  expense: Expense;
  members: GroupMember[];
  currentUserId: string;
  currentMemberId: string;
  isAdmin: boolean;
  isOpen: boolean;
  onClose: () => void;
  interactionCount?: ExpenseInteractionCount;
}

export function ExpenseDetailSheet({
  expense,
  members,
  currentUserId,
  currentMemberId,
  isAdmin,
  isOpen,
  onClose,
  interactionCount,
}: Props) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  // ── Data ─────────────────────────────────────────────────────────────────
  const [splits, setSplits] = useState<ExpenseSplit[] | null>(null);
  const [comments, setComments] = useState<OptimisticComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [allDisputes, setAllDisputes] = useState<NonNullable<Awaited<ReturnType<typeof fetchExpenseDisputesAction>>>>([]);
  const commentsFetchedRef = useRef<string | null>(null);
  const disputesFetchedRef = useRef<string | null>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const scrollBodyRef = useRef<HTMLDivElement>(null);

  const [, startFetch] = useTransition();
  const [, startAction] = useTransition();

  // ── Reaction state ───────────────────────────────────────────────────────
  const [myReaction, setMyReaction] = useState<ReactionEmoji | null>(
    interactionCount?.myReaction ?? null
  );
  const [isReacting, setIsReacting] = useState(false);

  // ── Forms ────────────────────────────────────────────────────────────────
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);

  // Escape key + Android back-button dismissal
  useSheetDismiss(isOpen, onClose);

  // ── Mount ────────────────────────────────────────────────────────────────
  useEffect(() => { setMounted(true); }, []);

  // Sync reaction when RSC data updates
  useEffect(() => {
    setMyReaction(interactionCount?.myReaction ?? null);
  }, [interactionCount?.myReaction]);

  // ── Fetch splits on open ─────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen || splits !== null) return;
    startFetch(async () => {
      try {
        const result = await fetchExpenseSplitsAction(expense.id);
        setSplits(result ?? []);
      } catch {
        // Silently clears the spinner; user can retry by closing and reopening
        setSplits([]);
      }
    });
  }, [isOpen, expense.id, splits]);

  // ── Fetch comments on open ───────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    if (commentsFetchedRef.current === expense.id) return;
    commentsFetchedRef.current = expense.id;
    setCommentsLoading(true);
    fetchExpenseCommentsAction(expense.id, expense.groupId)
      .then((fresh) => {
        if (fresh !== null) {
          setComments(fresh);
          if (fresh.length > 0) scrollToLatest();
        }
        setCommentsLoading(false);
      })
      .catch(() => {
        // Silently hide skeleton on transient errors; user can retry by closing and reopening
        setCommentsLoading(false);
      });
  }, [isOpen, expense.id, expense.groupId]);

  // ── Fetch resolved disputes on open ─────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    if (disputesFetchedRef.current === expense.id) return;
    disputesFetchedRef.current = expense.id;
    fetchExpenseDisputesAction(expense.id, expense.groupId)
      .then((rows) => { if (rows) setAllDisputes(rows); })
      .catch(() => {});
  }, [isOpen, expense.id, expense.groupId]);

  // Reset all local state when the expense changes
  useEffect(() => {
    setSplits(null);
    setComments([]);
    setCommentsLoading(false);
    setAllDisputes([]);
    commentsFetchedRef.current = null;
    disputesFetchedRef.current = null;
  }, [expense.id]);

  // Auto-mark as seen when the sheet opens.
  // Also refreshes the router so the unread dot on the expense card clears.
  useEffect(() => {
    if (!isOpen) return;
    markSeenAction(expense.id, expense.groupId)
      .then(() => router.refresh())
      .catch(() => {});
  }, [isOpen, expense.id, expense.groupId]);

  // Scroll to latest when sheet opens with already-cached comments.
  // The fetch callback handles the scroll on the first open;
  // this covers every subsequent open of the same expense.
  useEffect(() => {
    if (!isOpen) return;
    if (comments.length > 0 && !commentsLoading) {
      scrollToLatest();
    }
    // Only react to isOpen — comments/commentsLoading are read as current values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Note: Escape key + Android back handled by useSheetDismiss above — no inline listener needed.

  if (!mounted) return null;

  // ── Derived ──────────────────────────────────────────────────────────────
  const payer = members.find((m) => m.id === expense.paidByMemberId);
  const creator = members.find((m) => m.userId === expense.createdByUserId);
  const editor = expense.updatedByUserId
    ? members.find((m) => m.userId === expense.updatedByUserId)
    : null;
  const catMeta = getCategory(expense.category);
  const canEdit = expense.createdByUserId === currentUserId || isAdmin;
  const dateDisplay =
    expense.category === "accommodation" && expense.endDate
      ? `${formatDate(expense.expenseDate)} – ${formatDate(expense.endDate)}`
      : formatDate(expense.expenseDate);

  const isPayer = payer?.userId === currentUserId;
  const canResolveDispute = isPayer || isAdmin;
  const pendingDispute = interactionCount?.pendingDispute ?? null;
  const resolvedDisputes = allDisputes.filter((d) => d.status !== "pending");
  const disputeTypeMeta = pendingDispute
    ? DISPUTE_TYPE_META[pendingDispute.type as keyof typeof DISPUTE_TYPE_META]
    : null;

  // ── Helpers ──────────────────────────────────────────────────────────────

  /** Optimistic reaction count.
   *  RSC count already reflects the server-confirmed reaction, so we apply
   *  a ±1 delta whenever the local optimistic state differs from the RSC value. */
  function getDisplayCount(emoji: "thumbs_up" | "seen"): number {
    const base = interactionCount?.reactions[emoji] ?? 0;
    const rscReaction = interactionCount?.myReaction ?? null;
    if (myReaction === rscReaction) return base; // in sync — no delta needed
    let delta = 0;
    if (rscReaction === emoji) delta -= 1; // I un-reacted from this emoji
    if (myReaction === emoji) delta += 1;  // I newly reacted with this emoji
    return Math.max(0, base + delta);
  }

  /** Scroll the sheet body to the very bottom after two paint frames.
   *  Two rAFs ensure the browser has finished layout after React's render,
   *  even while the sheet spring-animation is still settling. */
  function scrollToLatest() {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = scrollBodyRef.current;
        if (el) el.scrollTop = el.scrollHeight;
      });
    });
  }

  // ── Handlers ─────────────────────────────────────────────────────────────

  async function handleReaction(emoji: "thumbs_up" | "seen") {
    if (isReacting) return;
    setIsReacting(true);
    const prev = myReaction;
    setMyReaction(myReaction === emoji ? null : emoji);
    startAction(async () => {
      const result = await addReaction(expense.id, expense.groupId, emoji);
      if (!result.ok) {
        setMyReaction(prev);
        toast.error("Failed to save reaction.");
      } else {
        router.refresh();
      }
      setIsReacting(false);
    });
  }

  async function handleAcceptDispute(disputeId: string) {
    startAction(async () => {
      setIsAccepting(true);
      const result = await acceptDispute(disputeId);
      setIsAccepting(false);
      if (result.ok) {
        toast.success("Dispute accepted — split updated.");
        disputesFetchedRef.current = null; // re-fetch on next open to show resolved history
        onClose();
        router.refresh();
      } else {
        toast.error(result.error ?? "Failed to accept dispute.");
      }
    });
  }

  async function handleDeclineDispute(disputeId: string) {
    startAction(async () => {
      setIsDeclining(true);
      const result = await declineDispute(disputeId);
      setIsDeclining(false);
      if (result.ok) {
        toast("Dispute declined. The requester has been notified.");
        disputesFetchedRef.current = null; // re-fetch on next open to show resolved history
        onClose();
        router.refresh();
      } else {
        toast.error(result.error ?? "Failed to decline dispute.");
      }
    });
  }

  async function handlePost(content: string, mentionedIds: string[]) {
    // 1. Optimistic bubble
    const tempId = `opt-${Date.now()}`;
    setComments((prev) => [
      ...prev,
      {
        id: tempId,
        content,
        createdAt: new Date(),
        memberId: currentMemberId,
        memberName: "",
        isOptimistic: true,
      },
    ]);
    scrollToLatest();

    setIsPosting(true);
    const result = await addComment(expense.id, expense.groupId, content, mentionedIds);

    if (!result.ok) {
      setComments((prev) => prev.filter((c) => c.id !== tempId));
      toast.error(result.error ?? "Failed to post comment.");
      setIsPosting(false);
      return;
    }

    // 2. Replace optimistic entry with confirmed server data
    try {
      const fresh = await fetchExpenseCommentsAction(expense.id, expense.groupId);
      setComments(fresh ?? []);
    } catch {
      // On transient error keep the optimistic bubble; it's already persisted server-side
      setComments((prev) => prev.map((c) => c.id === tempId ? { ...c, isOptimistic: false } : c));
    }
    setIsPosting(false);
    router.refresh(); // update card-level comment count pill
  }

  async function handleDeleteComment(commentId: string) {
    const prev = comments;
    setComments((c) => c.filter((x) => x.id !== commentId));
    const result = await deleteComment(commentId, expense.groupId);
    if (!result.ok) {
      setComments(prev);
      toast.error("Failed to delete comment.");
    } else {
      router.refresh();
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return createPortal(
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
              onClick={onClose}
            />

            {/* Sheet */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl max-h-[90vh] flex flex-col"
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1 shrink-0">
                <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
              </div>

              {/* ── Header ─────────────────────────────────────────────── */}
              <div className="flex items-start gap-3 px-5 py-3 shrink-0 border-b border-slate-100 dark:border-slate-800">
                <div
                  className={`w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0 shadow-sm ${catMeta.gradient}`}
                >
                  <catMeta.icon className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-base font-semibold text-slate-800 dark:text-slate-100 truncate"
                    style={{ fontFamily: "var(--font-fraunces)" }}
                  >
                    {expense.description}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    paid by {payer ? getMemberName(payer) : "Someone"} · {dateDisplay}
                  </p>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  {canEdit && (
                    <Link
                      href={`/groups/${expense.groupId}/expenses/${expense.id}/edit`}
                      onClick={onClose}
                      className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Edit expense"
                    >
                      <Pencil className="w-4 h-4" />
                    </Link>
                  )}
                  <button
                    onClick={onClose}
                    className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* ── Scrollable body ─────────────────────────────────────── */}
              <div ref={scrollBodyRef} className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
                {/* Amount — centred, payer already shown in header */}
                <div className="text-center py-1">
                  <p
                    className="text-3xl font-bold tabular-nums"
                    style={{ fontFamily: "var(--font-fraunces)", color: CATEGORY_HEX[expense.category] ?? undefined }}
                  >
                    {formatCurrency(Number(expense.amount), expense.currency)}
                  </p>
                  {/* Full description — shown below amount when title is truncated in header */}
                  {expense.description.length > 40 && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 px-2">
                      {expense.description}
                    </p>
                  )}
                </div>

                {/* Notes */}
                {expense.notes && (
                  <div className="glass rounded-xl px-4 py-3">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                      Notes
                    </p>
                    <p className="text-sm text-slate-700 dark:text-slate-200">
                      {expense.notes}
                    </p>
                  </div>
                )}

                {/* Receipt proof photo */}
                {expense.receiptUrl && (
                  <div>
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="w-6 h-6 rounded-md bg-cyan-50 dark:bg-cyan-900/30 flex items-center justify-center shrink-0">
                        <Paperclip className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                      </div>
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Receipt</span>
                      <div className="flex-1 h-[1.5px] bg-gradient-to-r from-cyan-200/70 to-transparent dark:from-cyan-800/40 dark:to-transparent" />
                    </div>
                    <a
                      href={expense.receiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={expense.receiptUrl}
                        alt="Receipt proof"
                        className="w-full max-h-52 object-contain"
                      />
                      <p className="text-[10px] text-center text-slate-400 dark:text-slate-500 py-1">
                        Tap to open full size
                      </p>
                    </a>
                  </div>
                )}

                {/* Split breakdown */}
                <div>
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                      <Users className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                    </div>
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Split</span>
                    <div className="flex-1 h-[1.5px] bg-gradient-to-r from-slate-300/60 to-transparent dark:from-slate-600/50 dark:to-transparent" />
                  </div>
                  {splits === null ? (
                    <div className="flex items-center gap-2 text-sm text-slate-400 py-2">
                      <div className="w-3.5 h-3.5 border-2 border-slate-300 border-t-cyan-500 rounded-full animate-spin" />
                      Loading split…
                    </div>
                  ) : splits.length === 0 ? (
                    <p className="text-sm text-slate-400">No split data available.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {splits.map((split) => {
                        const member = members.find((m) => m.id === split.memberId);
                        const isMe = split.memberId === currentMemberId;
                        return (
                          <div
                            key={split.id}
                            className={`flex items-center justify-between py-1 rounded-lg ${isMe ? "px-2 -mx-2 bg-cyan-50 dark:bg-cyan-900/20" : ""}`}
                          >
                            <p className={`text-sm ${isMe ? "font-medium text-cyan-700 dark:text-cyan-300" : "text-slate-700 dark:text-slate-200"}`}>
                              {member ? getMemberName(member) : "Member"}
                              {isMe && <span className="ml-1.5 text-[10px] font-normal opacity-60">you</span>}
                            </p>
                            <p className={`text-sm font-medium tabular-nums ${isMe ? "text-cyan-700 dark:text-cyan-300" : "text-slate-700 dark:text-slate-200"}`}>
                              {formatCurrency(
                                Number(split.shareAmount),
                                expense.currency
                              )}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* ── Pending dispute card ─────────────────────────────── */}
                {pendingDispute && (
                  <div
                    className={`rounded-xl border px-4 py-3 space-y-2 ${
                      pendingDispute.type === "question"
                        ? "border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20"
                        : "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-base mt-0.5">
                        {pendingDispute.type === "question" ? "❓" : "⚠️"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-semibold ${
                            pendingDispute.type === "question"
                              ? "text-amber-800 dark:text-amber-200"
                              : "text-red-800 dark:text-red-200"
                          }`}
                        >
                          {disputeTypeMeta?.label ?? "Dispute"} requested
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {pendingDispute.requestedByMe
                            ? "You raised this — awaiting payer response"
                            : "Raised by a group member"}
                        </p>
                      </div>
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-1" />
                    </div>

                    {canResolveDispute && !pendingDispute.requestedByMe && (
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => handleAcceptDispute(pendingDispute.id)}
                          disabled={isAccepting || isDeclining}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-gradient-to-br from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white text-xs font-semibold transition-all disabled:opacity-50"
                        >
                          {isAccepting ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                          Accept & update split
                        </button>
                        <button
                          onClick={() => handleDeclineDispute(pendingDispute.id)}
                          disabled={isAccepting || isDeclining}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors disabled:opacity-50"
                        >
                          {isDeclining ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5" />
                          )}
                          Decline
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Discussion — moved above Respond so chat is reachable without scrolling past actions ── */}
                <div>
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                      <MessageCircle className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                    </div>
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      Discussion{!commentsLoading && comments.length > 0 ? ` (${comments.length})` : ""}
                    </span>
                    <div className="flex-1 h-px bg-slate-200/80 dark:bg-slate-700/50" />
                  </div>
                  {commentsLoading ? (
                    <CommentSkeleton />
                  ) : (
                    <ThreadDiscussion
                      comments={comments}
                      currentMemberId={currentMemberId}
                      isAdmin={isAdmin}
                      onDelete={handleDeleteComment}
                    />
                  )}
                  {/* Scroll anchor */}
                  <div ref={commentsEndRef} />
                </div>

                {/* ── Respond — reactions + question + dispute ──────────── */}
                <div>
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                      <Smile className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                    </div>
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Respond</span>
                    <div className="flex-1 h-[1.5px] bg-gradient-to-r from-slate-300/60 to-transparent dark:from-slate-600/50 dark:to-transparent" />
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {(["thumbs_up"] as const).map((emoji) => {
                      const meta = REACTION_META[emoji];
                      const count = getDisplayCount(emoji);
                      const isActive = myReaction === emoji;
                      return (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => handleReaction(emoji)}
                          disabled={isReacting}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all disabled:opacity-60 ${
                            isActive
                              ? "border-cyan-400 dark:border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300"
                              : "border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600"
                          }`}
                        >
                          <span>{meta.emoji}</span>
                          {count > 0 && (
                            <span className="tabular-nums">{count}</span>
                          )}
                          <span>{meta.label}</span>
                        </button>
                      );
                    })}

                    {/* ❓ Question */}
                    <button
                      type="button"
                      onClick={() => setShowQuestionForm(true)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                        pendingDispute?.type === "question" &&
                        pendingDispute.requestedByMe
                          ? "border-amber-400 dark:border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300"
                          : "border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300 hover:border-amber-300 dark:hover:border-amber-700"
                      }`}
                    >
                      <span>❓</span>
                      <span>Question</span>
                    </button>

                    {/* ⚠️ Dispute — not for the payer */}
                    {(!isPayer || isAdmin) && (
                      <button
                        type="button"
                        onClick={() => setShowDisputeForm(true)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                          pendingDispute &&
                          pendingDispute.type !== "question" &&
                          pendingDispute.requestedByMe
                            ? "border-red-400 dark:border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300"
                            : "border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300 hover:border-red-300 dark:hover:border-red-700"
                        }`}
                      >
                        <span>⚠️</span>
                        <span>Dispute</span>
                      </button>
                    )}
                  </div>
                  {isPayer && !isAdmin && (
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5">
                      You paid — you can&apos;t dispute your own expense
                    </p>
                  )}
                </div>

                {/* ── Resolved dispute history ─────────────────────── */}
                {resolvedDisputes.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                      </div>
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Resolved disputes</span>
                      <div className="flex-1 h-px bg-slate-200/80 dark:bg-slate-700/50" />
                    </div>
                    <div className="space-y-2">
                      {resolvedDisputes.map((dispute) => (
                        <div key={dispute.id} className="glass rounded-xl px-4 py-3 flex items-center gap-3">
                          <span className="text-base">
                            {dispute.status === "accepted" ? "✅" : dispute.status === "declined" ? "❌" : "🔕"}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-slate-600 dark:text-slate-300">
                              {DISPUTE_TYPE_META[dispute.type as keyof typeof DISPUTE_TYPE_META]?.label ?? "Dispute"} · {dispute.requesterName}
                            </p>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                              {dispute.status.charAt(0).toUpperCase() + dispute.status.slice(1)}
                              {dispute.resolvedAt && ` · ${formatDistanceToNow(dispute.resolvedAt, { addSuffix: true })}`}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Audit trail */}
                <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    Added by {creator ? getMemberName(creator) : "Member"} ·{" "}
                    {formatDistanceToNow(expense.createdAt, { addSuffix: true })}
                  </p>
                  {editor &&
                    expense.updatedByUserId !== expense.createdByUserId && (
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                        Edited by {getMemberName(editor)} ·{" "}
                        {formatDistanceToNow(expense.updatedAt, {
                          addSuffix: true,
                        })}
                      </p>
                    )}
                  {/* Seen avatars — optimistic: current user added if RSC not yet confirmed */}
                  {interactionCount && (
                    <SeenAvatarStack
                      seenMemberIds={interactionCount.seenMemberIds}
                      currentMemberId={currentMemberId}
                      seenByRsc={interactionCount.myReaction === "seen"}
                      members={members}
                    />
                  )}
                </div>
              </div>

              {/* ── Footer — compact comment input ──────────────────────── */}
              <div className="px-4 py-3 shrink-0 border-t border-slate-100 dark:border-slate-800">
                <ThreadCommentInput
                  members={members}
                  currentMemberId={currentMemberId}
                  onPost={handlePost}
                  isSubmitting={isPosting}
                  compact
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Question & Dispute forms — z-[60] so they appear above the sheet */}
      <QuestionForm
        expenseId={expense.id}
        groupId={expense.groupId}
        expenseDescription={expense.description}
        existingDisputeId={
          pendingDispute?.requestedByMe && pendingDispute.type === "question"
            ? pendingDispute.id
            : null
        }
        isOpen={showQuestionForm}
        onClose={() => setShowQuestionForm(false)}
        onSuccess={() => {
          onClose();
          router.refresh();
        }}
      />
      <DisputeForm
        expenseId={expense.id}
        groupId={expense.groupId}
        expenseDescription={expense.description}
        expenseAmount={Number(expense.amount)}
        currency={expense.currency}
        existingDisputeId={
          pendingDispute?.requestedByMe && pendingDispute.type !== "question"
            ? pendingDispute.id
            : null
        }
        isOpen={showDisputeForm}
        onClose={() => setShowDisputeForm(false)}
        onSuccess={() => {
          onClose();
          router.refresh();
        }}
      />
    </>,
    document.body
  );
}
