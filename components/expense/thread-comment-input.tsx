"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, AtSign } from "lucide-react";
import type { GroupMember } from "@/lib/db/schema/group-members";
import { getMemberName } from "@/lib/utils";

interface Props {
  members: GroupMember[];
  currentMemberId: string;
  /** Called by parent to handle optimistic state + server action */
  onPost: (content: string, mentionedIds: string[]) => Promise<void>;
  /** Compact single-line style for the detail sheet footer */
  compact?: boolean;
  /** Disable send while parent is processing */
  isSubmitting?: boolean;
}

const MAX_LENGTH = 500;

export function ThreadCommentInput({
  members,
  currentMemberId,
  onPost,
  compact,
  isSubmitting,
}: Props) {
  const [content, setContent] = useState("");
  const [mentionedMemberIds, setMentionedMemberIds] = useState<string[]>([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionStart, setMentionStart] = useState(-1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Members excluding self
  const mentionableMembers = members.filter((m) => m.id !== currentMemberId);

  // Auto-resize textarea in compact mode
  useEffect(() => {
    if (!compact || !textareaRef.current) return;
    const ta = textareaRef.current;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
  }, [content, compact]);

  // Detect @mention trigger while typing
  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    if (val.length > MAX_LENGTH) return;
    setContent(val);

    const cursorPos = e.target.selectionStart ?? val.length;
    const beforeCursor = val.slice(0, cursorPos);
    const atIdx = beforeCursor.lastIndexOf("@");

    if (atIdx !== -1) {
      const queryStr = beforeCursor.slice(atIdx + 1);
      if (!queryStr.includes(" ") || queryStr === "") {
        setMentionQuery(queryStr.toLowerCase());
        setMentionStart(atIdx);
        return;
      }
    }

    setMentionQuery(null);
    setMentionStart(-1);
  }

  const mentionMatches =
    mentionQuery !== null
      ? mentionableMembers.filter((m) =>
          getMemberName(m).toLowerCase().startsWith(mentionQuery)
        )
      : [];

  function insertMention(member: GroupMember) {
    const name = getMemberName(member);
    const before = content.slice(0, mentionStart);
    const afterCursor = content.slice(
      textareaRef.current?.selectionStart ?? content.length
    );
    const newContent = `${before}@${name} ${afterCursor}`;
    setContent(newContent);

    if (!mentionedMemberIds.includes(member.id)) {
      setMentionedMemberIds((prev) => [...prev, member.id]);
    }

    setMentionQuery(null);
    setMentionStart(-1);

    setTimeout(() => {
      textareaRef.current?.focus();
      const pos = before.length + name.length + 2;
      textareaRef.current?.setSelectionRange(pos, pos);
    }, 0);
  }

  // Close dropdown on outside click
  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setMentionQuery(null);
      }
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // ⌘↵ / Ctrl+↵ always submits
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
      return;
    }
    // In compact mode plain Enter submits (Shift+Enter for newline)
    if (compact && e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
      return;
    }
    if (e.key === "Escape" && mentionQuery !== null) {
      e.preventDefault();
      setMentionQuery(null);
    }
  }

  function insertAtSign() {
    const pos = textareaRef.current?.selectionStart ?? content.length;
    const newContent = content.slice(0, pos) + "@" + content.slice(pos);
    setContent(newContent);
    setMentionQuery("");
    setMentionStart(pos);
    setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(pos + 1, pos + 1);
    }, 0);
  }

  async function handleSubmit() {
    const trimmed = content.trim();
    if (!trimmed || isSubmitting) return;

    const finalMentioned = mentionedMemberIds.filter((id) => {
      const member = members.find((m) => m.id === id);
      if (!member) return false;
      return trimmed.includes(`@${getMemberName(member)}`);
    });

    // Clear immediately for snappy UX; parent shows optimistic bubble
    setContent("");
    setMentionedMemberIds([]);
    setMentionQuery(null);

    await onPost(trimmed, finalMentioned);

    setTimeout(() => textareaRef.current?.focus(), 50);
  }

  const charCount = content.length;
  const isNearLimit = charCount > MAX_LENGTH * 0.85;

  // ─────────────── Compact mode (sheet footer) ─────────────────────────────
  if (compact) {
    return (
      <div className="relative">
        {/* @mention dropdown */}
        {mentionQuery !== null && mentionMatches.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute bottom-full left-0 right-0 mb-1 z-10 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden"
          >
            {mentionMatches.slice(0, 5).map((member) => (
              <button
                key={member.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  insertMention(member);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-400 to-teal-400 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-white">
                    {getMemberName(member).charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-sm text-slate-700 dark:text-slate-200 font-medium">
                  {getMemberName(member)}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Compact row: @ | textarea | send */}
        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={insertAtSign}
            className="p-2 shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            title="Mention someone"
          >
            <AtSign className="w-4 h-4" />
          </button>

          <div className="flex-1 glass rounded-2xl border border-slate-200 dark:border-slate-700 focus-within:border-cyan-400 dark:focus-within:border-cyan-500 transition-colors overflow-hidden">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder="Add a comment…"
              rows={1}
              style={{ height: "auto", minHeight: "38px" }}
              className="w-full px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-transparent focus:outline-none resize-none leading-snug"
            />
            {isNearLimit && (
              <div className="px-4 pb-2 text-right">
                <span
                  className={`text-[10px] tabular-nums ${
                    charCount >= MAX_LENGTH ? "text-red-500" : "text-slate-400"
                  }`}
                >
                  {MAX_LENGTH - charCount}
                </span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!content.trim() || !!isSubmitting}
            className="p-2.5 shrink-0 rounded-full bg-gradient-to-br from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white transition-all disabled:opacity-50 disabled:pointer-events-none shadow-sm shadow-cyan-500/25"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    );
  }

  // ─────────────── Full mode (thread page) ─────────────────────────────────
  return (
    <div className="relative">
      {/* @mention dropdown */}
      {mentionQuery !== null && mentionMatches.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute bottom-full left-0 right-0 mb-1 z-10 glass rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden"
        >
          {mentionMatches.slice(0, 5).map((member) => (
            <button
              key={member.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                insertMention(member);
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-400 to-teal-400 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-white">
                  {getMemberName(member).charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-sm text-slate-700 dark:text-slate-200 font-medium">
                {getMemberName(member)}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Full textarea */}
      <div className="glass rounded-2xl border border-slate-200 dark:border-slate-700 focus-within:border-cyan-400 dark:focus-within:border-cyan-500 transition-colors">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Write a comment… (use @ to mention someone)"
          rows={2}
          className="w-full px-4 pt-3 pb-2 text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-transparent focus:outline-none resize-none"
        />
        <div className="flex items-center justify-between px-4 pb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={insertAtSign}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Mention someone"
            >
              <AtSign className="w-4 h-4" />
            </button>
            {isNearLimit && (
              <span
                className={`text-[10px] tabular-nums ${
                  charCount >= MAX_LENGTH ? "text-red-500" : "text-slate-400"
                }`}
              >
                {MAX_LENGTH - charCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 hidden sm:block">⌘↵ to send</span>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!content.trim() || !!isSubmitting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white text-xs font-semibold transition-all disabled:opacity-50 disabled:pointer-events-none shadow-sm shadow-cyan-500/25"
            >
              {isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
