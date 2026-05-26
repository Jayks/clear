"use client";

import { Trash2, MessageCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { CommentRow } from "@/lib/db/queries/interactions";

export type OptimisticComment = CommentRow & { isOptimistic?: boolean };

/** Highlights @mention tokens within comment text */
export function CommentContent({ content }: { content: string }) {
  const parts = content.split(/(@\w[\w\s]*?)(?=\s|$|[,.!?])/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("@") ? (
          <span key={i} className="font-semibold opacity-90">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

interface Props {
  comments: OptimisticComment[];
  currentMemberId: string;
  isAdmin: boolean;
  onDelete: (commentId: string) => void;
}

export function ThreadDiscussion({ comments, currentMemberId, isAdmin, onDelete }: Props) {
  if (comments.length === 0) {
    return (
      <div className="py-8 flex flex-col items-center text-center">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center mb-3 shadow-sm shadow-cyan-500/25">
          <MessageCircle className="w-6 h-6 text-white" />
        </div>
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No comments yet</p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Be the first to add context.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {comments.map((comment) => {
        const isOwn = comment.memberId === currentMemberId;
        const canDelete = isOwn || isAdmin;

        return (
          <div
            key={comment.id}
            className={`group flex items-start gap-1.5 ${isOwn ? "flex-row-reverse" : ""}`}
          >
            {/* Avatar — other user only, top-aligned */}
            {!isOwn && (
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-400 to-teal-400 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-bold text-white">
                  {comment.memberName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}

            {/* Delete icon — faintly visible, fully visible on hover */}
            {canDelete && !comment.isOptimistic ? (
              <button
                type="button"
                onClick={() => onDelete(comment.id)}
                className="p-1 shrink-0 text-slate-300 dark:text-slate-600 hover:text-red-400 dark:hover:text-red-400 transition-all mt-1 opacity-25 group-hover:opacity-100 focus-visible:opacity-100"
                title="Delete comment"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            ) : (
              /* Spacer so bubble alignment stays consistent */
              <div className="w-5 shrink-0" />
            )}

            {/* Bubble */}
            <div
              className={`flex flex-col gap-0.5 max-w-[78%] ${
                isOwn ? "items-end" : "items-start"
              }`}
            >
              <div
                className={`px-3.5 py-2 text-sm leading-relaxed break-words rounded-2xl ${
                  isOwn
                    ? "bg-gradient-to-br from-cyan-500 to-teal-500 text-white rounded-tr-sm"
                    : "glass-sm text-slate-700 dark:text-slate-200 rounded-tl-sm"
                } ${comment.isOptimistic ? "opacity-60" : ""}`}
              >
                {comment.isOptimistic ? (
                  comment.content
                ) : (
                  <CommentContent content={comment.content} />
                )}
                {/* Name + timestamp inside the bubble */}
                <p className={`text-[9px] mt-1.5 leading-none ${
                  isOwn
                    ? "text-cyan-100/70 text-right"
                    : "text-slate-400 dark:text-slate-500"
                }`}>
                  {isOwn ? "You" : comment.memberName}
                  {" · "}
                  {comment.isOptimistic
                    ? "Sending…"
                    : formatDistanceToNow(comment.createdAt, { addSuffix: true })}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
