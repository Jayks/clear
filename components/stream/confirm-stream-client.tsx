"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { confirmStream, disputeStream } from "@/app/actions/stream";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

type PageState =
  | "idle"
  | "submitting_confirm"
  | "confirmed"
  | "show_dispute"
  | "submitting_dispute"
  | "disputed"
  | "error";

const DISPUTE_REASONS = [
  { value: "wrong_amount",    label: "Wrong amount" },
  { value: "already_paid",    label: "I already paid this" },
  { value: "dont_recognize",  label: "I don't recognise this" },
  { value: "other",           label: "Something else" },
] as const;

type DisputeReason = typeof DISPUTE_REASONS[number]["value"];

interface Props {
  token:       string;
  amount:      number;
  currency:    string;
  note:        string | null;
  creatorName: string;
  createdAt:   Date | string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ConfirmStreamClient({
  token,
  amount,
  currency,
  note,
  creatorName,
  createdAt,
}: Props) {
  const [state, setState] = useState<PageState>("idle");
  const [disputeReason, setDisputeReason] = useState<DisputeReason>("wrong_amount");
  const [disputeNote, setDisputeNote] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const amountStr = formatCurrency(amount, currency);
  const dateStr   = new Date(createdAt).toLocaleDateString("en-IN", {
    month: "short",
    day:   "numeric",
  });
  const firstName = creatorName.split(" ")[0];

  // ── Confirm ────────────────────────────────────────────────────────────────

  async function handleConfirm() {
    setState("submitting_confirm");
    const result = await confirmStream(token);
    if (result.ok) {
      setState("confirmed");
    } else {
      if (result.error === "already_resolved") {
        setState("confirmed"); // treat as success — idempotent UX
      } else {
        setErrorMsg("Something went wrong. Please try again.");
        setState("error");
      }
    }
  }

  // ── Dispute ────────────────────────────────────────────────────────────────

  async function handleDispute() {
    setState("submitting_dispute");
    const result = await disputeStream({
      token,
      reason: disputeReason,
      note:   disputeNote.trim() || undefined,
    });
    if (result.ok) {
      setState("disputed");
    } else {
      if (result.error === "already_resolved") {
        setState("disputed"); // idempotent
      } else {
        setErrorMsg("Something went wrong. Please try again.");
        setState("error");
      }
    }
  }

  // ── Confirmed state ────────────────────────────────────────────────────────

  if (state === "confirmed") {
    return (
      <div className="text-center py-4">
        <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30
                        flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h2
          className="text-xl text-slate-800 dark:text-slate-100 mb-1"
          style={{ fontFamily: "var(--font-fraunces)" }}
        >
          All confirmed!
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {firstName} has been notified.
        </p>
      </div>
    );
  }

  // ── Disputed state ─────────────────────────────────────────────────────────

  if (state === "disputed") {
    return (
      <div className="text-center py-4">
        <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/30
                        flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-7 h-7 text-amber-600 dark:text-amber-400" />
        </div>
        <h2
          className="text-xl text-slate-800 dark:text-slate-100 mb-1"
          style={{ fontFamily: "var(--font-fraunces)" }}
        >
          Dispute sent
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          We&apos;ve let {firstName} know.
        </p>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────

  if (state === "error") {
    return (
      <div className="text-center py-4">
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">{errorMsg}</p>
        <button
          onClick={() => { setState("idle"); setErrorMsg(""); }}
          className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  // ── Dispute form ───────────────────────────────────────────────────────────

  if (state === "show_dispute" || state === "submitting_dispute") {
    return (
      <div className="space-y-4">
        <h3
          className="text-base font-semibold text-slate-800 dark:text-slate-100"
          style={{ fontFamily: "var(--font-fraunces)" }}
        >
          What&apos;s the issue?
        </h3>

        {/* Radio options */}
        <div className="space-y-2">
          {DISPUTE_REASONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setDisputeReason(value)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all",
                disputeReason === value
                  ? "border-indigo-400 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40"
                  : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600",
              )}
            >
              <div
                className={cn(
                  "w-4 h-4 rounded-full border-2 shrink-0 transition-colors",
                  disputeReason === value
                    ? "border-indigo-500 bg-indigo-500"
                    : "border-slate-300 dark:border-slate-600",
                )}
              />
              <span className="text-sm text-slate-700 dark:text-slate-200">
                {label}
              </span>
            </button>
          ))}
        </div>

        {/* Optional note */}
        <textarea
          placeholder="Add a note (optional)"
          value={disputeNote}
          onChange={(e) => setDisputeNote(e.target.value)}
          maxLength={300}
          rows={2}
          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700
                     bg-white/60 dark:bg-slate-800/60 text-sm text-slate-800 dark:text-slate-100
                     placeholder:text-slate-400 focus:outline-none focus:ring-2
                     focus:ring-indigo-400/50 resize-none transition"
        />

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => setState("idle")}
            disabled={state === "submitting_dispute"}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700
                       text-sm font-medium text-slate-600 dark:text-slate-300
                       hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors
                       disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleDispute}
            disabled={state === "submitting_dispute"}
            className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600
                       text-white text-sm font-semibold transition-colors
                       disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {state === "submitting_dispute" ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
            ) : (
              "Send Dispute"
            )}
          </button>
        </div>
      </div>
    );
  }

  // ── Idle state — main confirm card ────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Who says this */}
      <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
        {creatorName} says you owe
      </p>

      {/* Amount — hero */}
      <div className="text-center">
        <p
          className="text-6xl font-bold tabular-nums text-slate-800 dark:text-slate-100"
          style={{ fontFamily: "var(--font-fraunces)" }}
        >
          {amountStr}
        </p>
        {(note || dateStr) && (
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-2">
            {note && <span className="font-medium text-slate-600 dark:text-slate-300">"{note}"</span>}
            {note && " · "}
            {dateStr}
          </p>
        )}
      </div>

      {/* Confirm button */}
      <button
        onClick={handleConfirm}
        disabled={state === "submitting_confirm"}
        className="w-full py-3.5 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500
                   hover:from-indigo-600 hover:to-violet-600
                   text-white font-semibold transition-all
                   disabled:opacity-50 flex items-center justify-center gap-2
                   shadow-md shadow-indigo-500/20"
      >
        {state === "submitting_confirm" ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Confirming…</>
        ) : (
          "✓  Yes, that's right"
        )}
      </button>

      {/* Dispute link */}
      <div className="text-center">
        <button
          onClick={() => setState("show_dispute")}
          disabled={state === "submitting_confirm"}
          className="text-sm text-slate-400 dark:text-slate-500 hover:text-slate-600
                     dark:hover:text-slate-300 transition-colors disabled:opacity-40"
        >
          ✗  That&apos;s not right
        </button>
      </div>
    </div>
  );
}
