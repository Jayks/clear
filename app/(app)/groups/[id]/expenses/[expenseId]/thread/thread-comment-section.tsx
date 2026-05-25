"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { GroupMember } from "@/lib/db/schema/group-members";
import type { CommentRow } from "@/lib/db/queries/interactions";
import {
  addComment,
  deleteComment,
  fetchExpenseCommentsAction,
} from "@/app/actions/interactions";
import {
  ThreadDiscussion,
  type OptimisticComment,
} from "@/components/expense/thread-discussion";
import { ThreadCommentInput } from "@/components/expense/thread-comment-input";

interface Props {
  initialComments: CommentRow[];
  expenseId: string;
  groupId: string;
  members: GroupMember[];
  currentMemberId: string;
  isAdmin: boolean;
}

export function ThreadCommentSection({
  initialComments,
  expenseId,
  groupId,
  members,
  currentMemberId,
  isAdmin,
}: Props) {
  const router = useRouter();
  const [comments, setComments] = useState<OptimisticComment[]>(initialComments);
  const [isPosting, setIsPosting] = useState(false);

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
    // Scroll to bottom so the new bubble is visible
    requestAnimationFrame(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    });

    setIsPosting(true);
    const result = await addComment(expenseId, groupId, content, mentionedIds);

    if (!result.ok) {
      setComments((prev) => prev.filter((c) => c.id !== tempId));
      toast.error(result.error ?? "Failed to post comment.");
      setIsPosting(false);
      return;
    }

    // 2. Replace optimistic entries with real data
    const fresh = await fetchExpenseCommentsAction(expenseId, groupId);
    setComments(fresh ?? []);
    setIsPosting(false);
    router.refresh(); // update card-level pills in background
  }

  async function handleDelete(commentId: string) {
    const prev = comments;
    setComments((c) => c.filter((x) => x.id !== commentId));
    const result = await deleteComment(commentId, groupId);
    if (!result.ok) {
      setComments(prev);
      toast.error("Failed to delete comment.");
    } else {
      router.refresh();
    }
  }

  return (
    <>
      {/* Discussion section */}
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-3">
          Discussion{comments.length > 0 ? ` (${comments.length})` : ""}
        </p>

        {comments.length === 0 ? (
          <div className="glass rounded-2xl px-5 py-8 text-center">
            <p className="text-slate-400 dark:text-slate-500 text-sm">
              No comments yet.
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Be the first to add context.
            </p>
          </div>
        ) : (
          <div className="glass rounded-2xl px-4 py-3">
            <ThreadDiscussion
              comments={comments}
              currentMemberId={currentMemberId}
              isAdmin={isAdmin}
              onDelete={handleDelete}
            />
          </div>
        )}
      </div>

      {/* Sticky comment input at the bottom of the thread page */}
      <div className="fixed bottom-nav-safe left-0 right-0 px-4 pb-2 pt-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t border-slate-100 dark:border-slate-800 z-40">
        <div className="max-w-2xl mx-auto">
          <ThreadCommentInput
            members={members}
            currentMemberId={currentMemberId}
            onPost={handlePost}
            isSubmitting={isPosting}
          />
        </div>
      </div>
    </>
  );
}
