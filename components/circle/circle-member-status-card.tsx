"use client";

/**
 * CircleMemberStatusCard — interactive personal status card for non-admin
 * members on the Circle dashboard. Mirrors the home-page CircleCard member
 * view, but with the richer dashboard layout.
 *
 * States:
 *  - Paid             → ✓ confirmed with date
 *  - PendingConfirm   → 🟡 self-reported, awaiting admin
 *  - Unpaid + amount  → "Pay ↗" UPI link + "I've paid" button + return-from-UPI
 *  - Unpaid, no amount (goal only) → amount input + "Report payment" button
 */

import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { selfReportContribution } from "@/app/actions/circle";
import { hapticLight, hapticSuccess } from "@/lib/haptics";
import { formatCurrency } from "@/lib/utils";

interface Props {
  groupId:             string;
  groupName:           string;
  isPaid:              boolean;
  isPendingConfirm:    boolean;
  amount:              number | null;
  currency:            string;
  /** "YYYY-MM" for recurring; null for goal */
  period:              string | null;
  /** "June 2026" */
  periodLabel:         string | null;
  isRecurring:         boolean;
  upiId:               string | null;
  contributionDate?:   string | null;
  contributionAmount?: number | null;
}

export function CircleMemberStatusCard({
  groupId, groupName, isPaid, isPendingConfirm,
  amount, currency, period, periodLabel, isRecurring, upiId,
  contributionDate, contributionAmount,
}: Props) {
  const [localPaid,           setLocalPaid]           = useState(isPaid);
  const [localPendingConfirm, setLocalPendingConfirm] = useState(isPendingConfirm);
  const [selfReporting,       setSelfReporting]       = useState(false);
  const [showUpiPrompt,       setShowUpiPrompt]       = useState(false);
  const [reportingUpi,        setReportingUpi]        = useState(false);
  // For goal circles with no fixed amount — member enters their own amount
  const [customAmount,        setCustomAmount]        = useState("");
  // Goal mode — show additional contribution form after already paid
  const [showAdditional,      setShowAdditional]      = useState(false);

  const upiTappedRef   = useRef(false);
  const promptTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Return-from-UPI prompt — show when app regains focus after UPI tap
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

  // UPI deep link — only when both upiId and fixed amount are set
  const upiLink = upiId && amount
    ? `upi://pay?pa=${encodeURIComponent(upiId)}&am=${amount}&cu=${currency}&tn=${encodeURIComponent(`${groupName} ${periodLabel ?? monthShort}`)}`
    : null;

  /** Report a fixed amount (when circle has contributionAmount set) */
  async function handleSelfReport() {
    if (selfReporting || localPaid || !amount) return;
    hapticLight();
    setSelfReporting(true);
    const result = await selfReportContribution({ groupId, amount, period, currency });
    setSelfReporting(false);
    if (result.ok) {
      hapticSuccess();
      setLocalPendingConfirm(true);
      toast.success("Reported — pending admin confirmation");
    } else {
      toast.error(result.error ?? "Failed to report");
    }
  }

  /** Report a custom amount (when circle has no fixed contributionAmount) */
  async function handleCustomReport() {
    const parsed = parseFloat(customAmount);
    if (selfReporting || localPaid || !parsed || parsed <= 0) return;
    hapticLight();
    setSelfReporting(true);
    const result = await selfReportContribution({ groupId, amount: parsed, period, currency });
    setSelfReporting(false);
    if (result.ok) {
      hapticSuccess();
      setLocalPendingConfirm(true);
      toast.success("Reported — pending admin confirmation");
    } else {
      toast.error(result.error ?? "Failed to report");
    }
  }

  /** Report after coming back from UPI app */
  async function handleUpiReported() {
    if (!amount) return;
    setReportingUpi(true);
    const result = await selfReportContribution({ groupId, amount, period, currency });
    setReportingUpi(false);
    setShowUpiPrompt(false);
    if (promptTimerRef.current) clearTimeout(promptTimerRef.current);
    if (result.ok) {
      hapticSuccess();
      setLocalPendingConfirm(true);
      toast.success("Reported — pending admin confirmation");
    }
  }

  // ── Paid (confirmed) ──────────────────────────────────────────────────────────
  if (localPaid) {
    // Goal mode — show "Contribute more" inline form when toggled
    if (!isRecurring && showAdditional) {
      const parsed    = parseFloat(customAmount);
      const canSubmit = !selfReporting && !!parsed && parsed > 0;
      return (
        <div className="glass rounded-2xl px-4 py-4 mb-6 border-l-4 border-violet-400 dark:border-violet-600">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-violet-100 dark:bg-violet-900/30">
              <span className="text-base">+</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-violet-700 dark:text-violet-300">
                Additional contribution
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 mb-3">
                Enter the amount and report it to the admin
              </p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 dark:text-slate-500 pointer-events-none select-none">
                    {currency === "INR" ? "₹" : currency}
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    placeholder="Amount"
                    autoFocus
                    className="w-full pl-7 pr-3 py-2 text-sm rounded-xl border
                               border-slate-200 dark:border-slate-700
                               bg-white/60 dark:bg-slate-800/60
                               text-slate-800 dark:text-slate-100
                               placeholder:text-slate-400 dark:placeholder:text-slate-500
                               focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400
                               dark:focus:border-violet-600 transition-colors"
                  />
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    if (!parsed || parsed <= 0) return;
                    setSelfReporting(true);
                    const result = await selfReportContribution({ groupId, amount: parsed, period, currency });
                    setSelfReporting(false);
                    if (result.ok) {
                      hapticSuccess();
                      setShowAdditional(false);
                      setCustomAmount("");
                      toast.success("Reported — pending admin confirmation");
                    } else {
                      toast.error(result.error ?? "Failed to report");
                    }
                  }}
                  disabled={!canSubmit}
                  className="px-4 py-2 text-sm font-medium rounded-xl
                             bg-gradient-to-br from-violet-500 to-purple-600 text-white
                             hover:opacity-90 transition-opacity
                             disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {selfReporting ? "…" : "Report"}
                </button>
              </div>
              <button
                type="button"
                onClick={() => { setShowAdditional(false); setCustomAmount(""); }}
                className="mt-2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="glass rounded-2xl px-4 py-3 mb-6 flex items-center gap-3 border-l-4 border-emerald-400 dark:border-emerald-600">
        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-emerald-100 dark:bg-emerald-900/30">
          <span className="text-base">✓</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
            {isRecurring ? `You're clear for ${periodLabel ?? monthShort}` : "You've contributed"}
          </p>
          {contributionDate && (
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {formatCurrency(contributionAmount ?? 0, currency)} confirmed · {contributionDate}
            </p>
          )}
          {/* Goal mode — allow contributing more */}
          {!isRecurring && (
            <button
              type="button"
              onClick={() => setShowAdditional(true)}
              className="mt-1 text-xs text-violet-600 dark:text-violet-400 font-medium hover:underline"
            >
              + Contribute more
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Pending admin confirmation ────────────────────────────────────────────────
  if (localPendingConfirm) {
    return (
      <div className="glass rounded-2xl px-4 py-3 mb-6 flex items-center gap-3 border-l-4 border-amber-400 dark:border-amber-600">
        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-amber-100 dark:bg-amber-900/30">
          <span className="text-base">🟡</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
            Pending admin confirmation
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Admin will verify and confirm your payment
          </p>
        </div>
      </div>
    );
  }

  // ── Unpaid — shared accent tokens ─────────────────────────────────────────────
  const accentBorder = isRecurring
    ? "border-amber-400 dark:border-amber-600"
    : "border-rose-400 dark:border-rose-600";
  const headingColor = isRecurring
    ? "text-amber-700 dark:text-amber-300"
    : "text-rose-700 dark:text-rose-300";
  const iconBg = isRecurring
    ? "bg-amber-100 dark:bg-amber-900/30"
    : "bg-rose-100 dark:bg-rose-900/30";

  // ── Unpaid, no fixed amount (goal only) — custom amount input ─────────────────
  if (!amount) {
    const parsed = parseFloat(customAmount);
    const canSubmit = !selfReporting && !!parsed && parsed > 0;
    return (
      <div className={`glass rounded-2xl px-4 py-4 mb-6 border-l-4 ${accentBorder}`}>
        <div className="flex items-start gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${iconBg}`}>
            <span className="text-base">⏳</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold ${headingColor}`}>
              Your contribution is pending
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 mb-3">
              Enter the amount you paid and report it — the admin will confirm
            </p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 dark:text-slate-500 pointer-events-none select-none">
                  {currency === "INR" ? "₹" : currency}
                </span>
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder="Amount"
                  className="w-full pl-7 pr-3 py-2 text-sm rounded-xl border
                             border-slate-200 dark:border-slate-700
                             bg-white/60 dark:bg-slate-800/60
                             text-slate-800 dark:text-slate-100
                             placeholder:text-slate-400 dark:placeholder:text-slate-500
                             focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400
                             dark:focus:border-violet-600 transition-colors"
                />
              </div>
              <button
                type="button"
                onClick={handleCustomReport}
                disabled={!canSubmit}
                className="px-4 py-2 text-sm font-medium rounded-xl
                           bg-gradient-to-br from-violet-500 to-purple-600 text-white
                           shadow-sm shadow-violet-500/20 hover:opacity-90 transition-opacity
                           disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {selfReporting ? "…" : "I've paid"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Unpaid, fixed amount — Pay ↗ + I've paid ──────────────────────────────────
  return (
    <div className={`glass rounded-2xl px-4 py-4 mb-6 border-l-4 ${accentBorder}`}>
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${iconBg}`}>
          <span className="text-base">⏳</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${headingColor}`}>
            {isRecurring
              ? `Your ${periodLabel ?? monthShort} contribution is pending`
              : "Your contribution is pending"}
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            {formatCurrency(amount, currency)} {isRecurring ? "due" : "expected"}
          </p>

          <div className="flex gap-2 mt-3">
            {upiLink && (
              <a
                href={upiLink}
                onClick={() => { upiTappedRef.current = true; }}
                className="flex-1 py-2 text-center text-sm font-semibold rounded-xl
                           bg-gradient-to-br from-violet-500 to-purple-600 text-white
                           shadow-sm shadow-violet-500/20 hover:opacity-90 transition-opacity"
              >
                Pay ↗
              </a>
            )}
            <button
              type="button"
              onClick={handleSelfReport}
              disabled={selfReporting}
              className={`py-2 text-sm font-medium rounded-xl border transition-colors
                border-slate-200 dark:border-slate-700
                text-slate-600 dark:text-slate-300
                hover:bg-slate-50 dark:hover:bg-slate-800/60
                disabled:opacity-50 disabled:cursor-not-allowed
                ${upiLink ? "w-24" : "flex-1"}`}
            >
              {selfReporting ? "…" : "I've paid"}
            </button>
          </div>
        </div>
      </div>

      {/* Return-from-UPI prompt — appears when user returns from UPI app */}
      {showUpiPrompt && (
        <div className="mt-3 p-3 rounded-xl bg-violet-50 dark:bg-violet-900/20
                        border border-violet-200/60 dark:border-violet-700/40 space-y-2">
          <p className="text-xs font-semibold text-violet-700 dark:text-violet-300">
            💸 Payment sent?
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setShowUpiPrompt(false);
                if (promptTimerRef.current) clearTimeout(promptTimerRef.current);
              }}
              className="flex-1 py-1.5 text-xs font-medium rounded-lg border
                         border-slate-200 dark:border-slate-700
                         text-slate-500 dark:text-slate-400
                         hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
            >
              Not yet
            </button>
            <button
              type="button"
              onClick={handleUpiReported}
              disabled={reportingUpi}
              className="flex-1 py-1.5 text-xs font-semibold rounded-lg
                         bg-gradient-to-br from-violet-500 to-purple-600 text-white
                         hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {reportingUpi ? "…" : "Yes, report it ✓"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
