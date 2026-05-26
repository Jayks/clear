"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MessageCircle } from "lucide-react";
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
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
            <MessageCircle className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          </div>
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Discussion{comments.length > 0 ? ` (${comments.length})` : ""}
          </span>
          <div className="flex-1 h-px bg-slate-200/80 dark:bg-slate-700/50" />
        </div>

        {comments.length === 0 ? (
          <div className="glass rounded-2xl px-5 py-8 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center mb-3 shadow-sm shadow-cyan-500/25">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No comments yet</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Be the first to add context.</p>
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
