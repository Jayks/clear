"use client";

/**
 * CircleContributeAction — single source of truth for the member's
 * contribution action surface. Used bare (no card chrome) in two places:
 *
 *   - `circle-dashboard.tsx` hero action zone  (size="dashboard")
 *   - `circle-card.tsx` home-page card         (size="card")
 *
 * UX decisions locked in the Circle simplification plan:
 *  - ONE primary pay button: "Pay ₹X ↗" (UPI) when upiId set; "I've paid"
 *    when no UPI. Secondary "Already paid elsewhere?" appears as a small
 *    text link below — not a co-equal button.
 *  - Three member states: paid ✓ | pending-confirm 🟡 | unpaid ⏳
 *  - Goal mode: "Contribute more" after paid; open amount when no fixed amount.
 */

import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { selfReportContribution } from "@/app/actions/circle";
import { hapticLight, hapticSuccess } from "@/lib/haptics";
import { formatCurrency } from "@/lib/utils";

interface Props {
  groupId:             string;
  groupName:           string;
  isPaid:              boolean;
  isPendingConfirm:    boolean;
  /** Fixed per-person amount; null = open amount (goal only) */
  amount:              number | null;
  currency:            string;
  /** "YYYY-MM" for recurring; null for goal */
  period:              string | null;
  /** "June 2026" */
  periodLabel:         string | null;
  isRecurring:         boolean;
  upiId:               string | null;
  /** "dashboard" = full-size; "card" = compact home-card */
  size:                "dashboard" | "card";
  /** Controls button/accent colour — indigo for recurring, amber for one_time */
  circleMode?:         "recurring" | "one_time";
  contributionDate?:   string | null;
  contributionAmount?: number | null;
}

export function CircleContributeAction({
  groupId, groupName, isPaid, isPendingConfirm,
  amount, currency, period, periodLabel, isRecurring, upiId,
  size, circleMode = "recurring", contributionDate, contributionAmount,
}: Props) {
  const isDash = size === "dashboard";

  // ── Mode-aware colour tokens ──────────────────────────────────────────────
  // Recurring = indigo/violet; One-time = amber/orange
  const isOneTimeMode   = circleMode === "one_time";
  const btnGradient     = isOneTimeMode ? "from-amber-500 to-orange-500"    : "from-indigo-500 to-violet-600";
  const btnShadowCls    = isOneTimeMode ? "shadow-amber-500/20"              : "shadow-indigo-500/20";
  const inputFocusCls   = isOneTimeMode ? "focus:ring-amber-500/20 focus:border-amber-400"
                                        : "focus:ring-indigo-500/20 focus:border-indigo-400";
  const promptBgCls     = isOneTimeMode
    ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200/60 dark:border-amber-700/40"
    : "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200/60 dark:border-indigo-700/40";
  const promptTextCls   = isOneTimeMode ? "text-amber-700 dark:text-amber-300" : "text-indigo-700 dark:text-indigo-300";
  const moreTextCls     = isOneTimeMode ? "text-amber-600 dark:text-amber-400" : "text-indigo-600 dark:text-indigo-400";
  const hoverTextCls    = isOneTimeMode
    ? "hover:text-amber-600 dark:hover:text-amber-400"
    : "hover:text-indigo-600 dark:hover:text-indigo-400";

  // ── Optimistic state ──────────────────────────────────────────────────────
  const [localPaid,           setLocalPaid]           = useState(isPaid);
  const [localPendingConfirm, setLocalPendingConfirm] = useState(isPendingConfirm);
  const [selfReporting,       setSelfReporting]       = useState(false);
  // Return-from-UPI prompt
  const [showUpiPrompt,       setShowUpiPrompt]       = useState(false);
  const [reportingUpi,        setReportingUpi]        = useState(false);
  // Goal: open amount input
  const [customAmount,        setCustomAmount]        = useState("");
  // Goal: contribute more after already paid
  const [showAdditional,      setShowAdditional]      = useState(false);

  const upiTappedRef   = useRef(false);
  const promptTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Return-from-UPI: show prompt when app regains focus after UPI deep link
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === "visible" && upiTappedRef.current) {
        upiTappedRef.current = false;
        setShowUpiPrompt(true);
        promptTimerRef.current = setTimeout(() => setShowUpiPrompt(false), 8000);
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleVisibility);
      if (promptTimerRef.current) clearTimeout(promptTimerRef.current);
    };
  }, []);

  const monthShort = new Date().toLocaleString("en-IN", { month: "short" });

  const upiLink = upiId && amount
    ? `upi://pay?pa=${encodeURIComponent(upiId)}&am=${amount}&cu=${currency}&tn=${encodeURIComponent(`${groupName} ${periodLabel ?? monthShort}`)}`
    : null;

  // ── Actions ───────────────────────────────────────────────────────────────

  async function handleSelfReport(reportAmount = amount) {
    if (selfReporting || localPaid || !reportAmount) return;
    hapticLight();
    setSelfReporting(true);
    const result = await selfReportContribution({ groupId, amount: reportAmount, period, currency });
    setSelfReporting(false);
    if (result.ok) {
      hapticSuccess();
      setLocalPendingConfirm(true);
      toast.success("Reported — pending admin confirmation");
    } else {
      toast.error(result.error ?? "Failed to report");
    }
  }

  async function handleCustomReport() {
    const parsed = parseFloat(customAmount);
    if (!parsed || parsed <= 0 || selfReporting) return;
    hapticLight();
    setSelfReporting(true);
    const result = await selfReportContribution({ groupId, amount: parsed, period, currency });
    setSelfReporting(false);
    if (result.ok) {
      hapticSuccess();
      setLocalPendingConfirm(true);
      setCustomAmount("");
      setShowAdditional(false);
      toast.success("Reported — pending admin confirmation");
    } else {
      toast.error(result.error ?? "Failed to report");
    }
  }

  async function handleUpiReported() {
    // Fixed: use the set amount; Flexi: use whatever the user typed before tapping UPI
    const reportAmount = amount ?? parseFloat(customAmount);
    if (!reportAmount || reportAmount <= 0) return;
    setReportingUpi(true);
    const result = await selfReportContribution({ groupId, amount: reportAmount, period, currency });
    setReportingUpi(false);
    setShowUpiPrompt(false);
    if (promptTimerRef.current) clearTimeout(promptTimerRef.current);
    if (result.ok) {
      hapticSuccess();
      setLocalPendingConfirm(true);
      toast.success("Reported — pending admin confirmation");
    }
  }

  // ── Size tokens ───────────────────────────────────────────────────────────
  const label    = isDash ? "text-sm"     : "text-[11px]";
  const sub      = isDash ? "text-xs"     : "text-[10px]";
  const btnPy    = isDash ? "py-2"        : "py-1.5";
  const inputPy  = isDash ? "py-2"        : "py-1.5";
  const iconSize = isDash ? "w-3.5 h-3.5" : "w-3 h-3";

  // ── Paid ──────────────────────────────────────────────────────────────────
  if (localPaid) {
    // Goal: "contribute more" additional form
    if (!isRecurring && showAdditional) {
      const parsed    = parseFloat(customAmount);
      const canSubmit = !selfReporting && !!parsed && parsed > 0;
      return (
        <div className="space-y-2">
          <p className={`${label} font-semibold ${promptTextCls}`}>
            Additional contribution
          </p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className={`absolute left-3 top-1/2 -translate-y-1/2 ${sub} text-slate-400 pointer-events-none select-none`}>
                {currency === "INR" ? "₹" : currency}
              </span>
              <input
                type="number" min="1" step="any"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder="Amount"
                autoFocus
                className={`w-full pl-7 pr-3 ${inputPy} ${sub} rounded-xl border
                  border-slate-200 dark:border-slate-700
                  bg-white/60 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100
                  placeholder:text-slate-400 focus:outline-none focus:ring-2 ${inputFocusCls}`}
              />
            </div>
            <button
              type="button" onClick={handleCustomReport} disabled={!canSubmit}
              className={`px-3 ${btnPy} ${sub} font-medium rounded-xl
                bg-gradient-to-br ${btnGradient} text-white
                hover:opacity-90 transition-opacity disabled:opacity-40 whitespace-nowrap`}
            >
              {selfReporting ? "…" : "Report"}
            </button>
          </div>
          <button
            type="button"
            onClick={() => { setShowAdditional(false); setCustomAmount(""); }}
            className={`${sub} text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors`}
          >
            Cancel
          </button>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
          <Check className={iconSize} />
          <div>
            <p className={`${label} font-semibold`}>
              {isRecurring
                ? `You're clear for ${periodLabel ?? monthShort}`
                : "You've contributed"}
            </p>
            {contributionDate && (
              <p className={`${sub} text-slate-400 dark:text-slate-500`}>
                {formatCurrency(contributionAmount ?? 0, currency)} confirmed · {contributionDate}
              </p>
            )}
          </div>
        </div>
        {/* Goal: contribute more */}
        {!isRecurring && (
          <button
            type="button"
            onClick={() => setShowAdditional(true)}
            className={`${sub} ${moreTextCls} font-medium hover:underline whitespace-nowrap`}
          >
            + More
          </button>
        )}
      </div>
    );
  }

  // ── Pending admin confirmation ─────────────────────────────────────────────
  if (localPendingConfirm) {
    return (
      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
        <span className="text-base">🟡</span>
        <div>
          <p className={`${label} font-semibold`}>Pending admin confirmation</p>
          <p className={`${sub} text-slate-400 dark:text-slate-500`}>
            Admin will verify and confirm your payment
          </p>
        </div>
      </div>
    );
  }

  // ── Unpaid, Flexi (no fixed amount) ───────────────────────────────────────
  if (!amount) {
    const parsed       = parseFloat(customAmount);
    const canSubmit    = !selfReporting && !!parsed && parsed > 0;
    // Dynamic UPI link — only active once an amount is entered
    const flexiUpiLink = upiId && parsed > 0
      ? `upi://pay?pa=${encodeURIComponent(upiId)}&am=${parsed}&cu=${currency}&tn=${encodeURIComponent(groupName)}`
      : null;

    return (
      <div className="space-y-2">
        <p className={`${sub} text-slate-500 dark:text-slate-400`}>
          Enter your contribution amount — admin will confirm
        </p>

        {/* Amount input row — inline button only when no UPI */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className={`absolute left-3 top-1/2 -translate-y-1/2 ${sub} text-slate-400 pointer-events-none select-none`}>
              {currency === "INR" ? "₹" : currency}
            </span>
            <input
              type="number" min="1" step="any"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              placeholder="Amount"
              className={`w-full pl-7 pr-3 ${inputPy} ${sub} rounded-xl border
                border-slate-200 dark:border-slate-700
                bg-white/60 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100
                placeholder:text-slate-400 focus:outline-none
                focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400`}
            />
          </div>
          {/* No UPI — show "I've contributed" inline */}
          {!upiId && (
            <button
              type="button" onClick={handleCustomReport} disabled={!canSubmit}
              className={`px-3 ${btnPy} ${sub} font-medium rounded-xl
                bg-gradient-to-br ${btnGradient} text-white
                shadow-sm ${btnShadowCls} hover:opacity-90
                disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap`}
            >
              {selfReporting ? "…" : "I've contributed"}
            </button>
          )}
        </div>

        {/* UPI available — dynamic Pay button + secondary report link */}
        {upiId && (
          <div className="space-y-1.5">
            <a
              href={flexiUpiLink ?? "#"}
              onClick={(e) => {
                if (!flexiUpiLink) { e.preventDefault(); return; }
                upiTappedRef.current = true;
              }}
              className={`block w-full text-center ${btnPy} ${label} font-semibold rounded-xl
                bg-gradient-to-br ${btnGradient} text-white
                shadow-sm ${btnShadowCls} transition-opacity
                ${flexiUpiLink ? "hover:opacity-90" : "opacity-40 cursor-not-allowed pointer-events-none"}`}
            >
              Pay via UPI ↗
            </a>
            <button
              type="button"
              onClick={handleCustomReport}
              disabled={!canSubmit}
              className={`block w-full text-center ${sub} text-slate-400 dark:text-slate-500
                ${hoverTextCls} transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {selfReporting ? "Reporting…" : "Already contributed elsewhere? Report it →"}
            </button>
          </div>
        )}

        {/* Return-from-UPI prompt (uses customAmount for Flexi) */}
        {showUpiPrompt && (
          <div className={`p-2.5 rounded-xl ${promptBgCls} space-y-2`}>
            <p className={`${sub} font-semibold ${promptTextCls}`}>
              💸 Payment sent?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowUpiPrompt(false);
                  if (promptTimerRef.current) clearTimeout(promptTimerRef.current);
                }}
                className={`flex-1 py-1 ${sub} font-medium rounded-lg border
                  border-slate-200 dark:border-slate-700
                  text-slate-500 dark:text-slate-400
                  hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors`}
              >
                Not yet
              </button>
              <button
                type="button"
                onClick={handleUpiReported}
                disabled={reportingUpi}
                className={`flex-1 py-1 ${sub} font-semibold rounded-lg
                  bg-gradient-to-br ${btnGradient} text-white
                  hover:opacity-90 transition-opacity disabled:opacity-60`}
              >
                {reportingUpi ? "…" : "Yes, report it ✓"}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Unpaid, fixed amount ───────────────────────────────────────────────────
  return (
    <div className="space-y-2">
      {/* Status line */}
      <p className={`${sub} text-slate-500 dark:text-slate-400`}>
        {isRecurring
          ? `Your ${periodLabel ?? monthShort} contribution: ${formatCurrency(amount, currency)} pending`
          : `Your contribution: ${formatCurrency(amount, currency)} pending`}
      </p>

      {/* Primary action */}
      {upiLink ? (
        <div className="space-y-1.5">
          <a
            href={upiLink}
            onClick={() => { upiTappedRef.current = true; }}
            className={`block w-full text-center ${btnPy} ${label} font-semibold rounded-xl
              bg-gradient-to-br ${btnGradient} text-white
              shadow-sm ${btnShadowCls} hover:opacity-90 transition-opacity`}
          >
            Pay {formatCurrency(amount, currency)} ↗
          </a>
          {/* Secondary: already paid off-channel */}
          <button
            type="button"
            onClick={() => handleSelfReport()}
            disabled={selfReporting}
            className={`block w-full text-center ${sub} text-slate-400 dark:text-slate-500
              ${hoverTextCls} transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {selfReporting ? "Reporting…" : "Already paid elsewhere? Report it →"}
          </button>
        </div>
      ) : (
        /* No UPI — single I've paid button */
        <button
          type="button"
          onClick={() => handleSelfReport()}
          disabled={selfReporting}
          className={`w-full ${btnPy} ${label} font-semibold rounded-xl
            bg-gradient-to-br ${btnGradient} text-white
            shadow-sm ${btnShadowCls} hover:opacity-90 transition-opacity
            disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {selfReporting ? "…" : "I've paid"}
        </button>
      )}

      {/* Return-from-UPI prompt */}
      {showUpiPrompt && (
        <div className={`p-2.5 rounded-xl ${promptBgCls} space-y-2`}>
          <p className={`${sub} font-semibold ${promptTextCls}`}>
            💸 Payment sent?
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setShowUpiPrompt(false);
                if (promptTimerRef.current) clearTimeout(promptTimerRef.current);
              }}
              className={`flex-1 py-1 ${sub} font-medium rounded-lg border
                border-slate-200 dark:border-slate-700
                text-slate-500 dark:text-slate-400
                hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors`}
            >
              Not yet
            </button>
            <button
              type="button"
              onClick={handleUpiReported}
              disabled={reportingUpi}
              className={`flex-1 py-1 ${sub} font-semibold rounded-lg
                bg-gradient-to-br ${btnGradient} text-white
                hover:opacity-90 transition-opacity disabled:opacity-60`}
            >
              {reportingUpi ? "…" : "Yes, report it ✓"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
