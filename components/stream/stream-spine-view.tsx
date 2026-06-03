"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, animate, AnimatePresence } from "framer-motion";
import type { PanInfo } from "framer-motion";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { hapticSuccess, hapticLight } from "@/lib/haptics";
import { forgiveStream, settleStream } from "@/app/actions/stream";
import { PaymentPendingBadge } from "@/components/payment/payment-pending-badge";
import type { EnrichedStreamRecord } from "@/lib/db/queries/stream";
import type { PaymentMethod } from "@/lib/payment/types";
import { PAYMENT_METHOD_ICONS, PAYMENT_METHOD_LABELS } from "@/lib/payment/types";

// ── Emoji inference ───────────────────────────────────────────────────────────

function getEmoji(note: string | null): string {
  if (!note) return "💸";
  const n = note.toLowerCase();
  if (/food|dinner|lunch|breakfast|restaurant|biryani|pizza|eat/.test(n)) return "🍽️";
  if (/uber|ola|cab|auto|taxi|rickshaw|transport|ride/.test(n))            return "🚗";
  if (/coffee|chai|tea|café|cafe/.test(n))                                 return "☕";
  if (/grocer|kirana|vegetable|sabzi|market/.test(n))                      return "🛒";
  if (/movie|film|cinema|show|ticket/.test(n))                             return "🎬";
  if (/petrol|fuel|gas/.test(n))                                           return "⛽";
  if (/medicine|medical|doctor|hospital|pharmacy/.test(n))                 return "💊";
  if (/rent|flat|room|pg|hostel|house/.test(n))                            return "🏠";
  if (/recharge|phone|mobile|internet|wifi/.test(n))                       return "📱";
  if (/spotify|netflix|prime|subscription/.test(n))                        return "🎵";
  if (/electricity|electric|bill|water/.test(n))                           return "💡";
  if (/train|flight|bus|travel/.test(n))                                   return "✈️";
  return "💸";
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  if (status === "confirmed") return (
    <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">✓ Confirmed</span>
  );
  if (status === "disputed") return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold
                     bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400
                     px-1.5 py-0.5 rounded-full">
      ⚠ Disputed
    </span>
  );
  if (status === "settled")  return <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">✓ Settled</span>;
  if (status === "forgiven") return <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">💚 Forgiven</span>;
  return <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">⏳ Pending</span>;
}

// ── Payment method badge ──────────────────────────────────────────────────────

function PaymentMethodBadge({ method }: { method: PaymentMethod }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-medium
                     text-slate-500 dark:text-slate-400">
      {PAYMENT_METHOD_ICONS[method]}{" "}
      {PAYMENT_METHOD_LABELS[method]}
    </span>
  );
}

// ── Net formatter ─────────────────────────────────────────────────────────────

function fmtNet(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_00_000) return `₹${(abs / 1_00_000).toFixed(1)}L`;
  if (abs >= 1000)     return `₹${(abs / 1000).toFixed(1)}k`;
  return `₹${Math.round(abs)}`;
}

// ── Share URL ─────────────────────────────────────────────────────────────────

function buildShareUrl(token: string | null): string | null {
  if (!token) return null;
  return `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/stream/confirm/${token}`;
}

// ── Swipe constants ───────────────────────────────────────────────────────────

const SNAP_THRESHOLD = 44;
const FAST_VELOCITY  = 300;

// ── Action button (overlay) ───────────────────────────────────────────────────

function ActionBtn({
  emoji, label, onClick, loading = false, variant = "default",
}: {
  emoji:    string;
  label:    string;
  onClick:  () => void;
  loading?: boolean;
  variant?: "default" | "emerald" | "amber";
}) {
  const bg = {
    default: "bg-white/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200",
    emerald: "bg-emerald-500 text-white",
    amber:   "bg-amber-500 text-white",
  }[variant];

  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); if (!loading) onClick(); }}
      disabled={loading}
      className={cn(
        "w-14 h-14 rounded-2xl flex flex-col items-center justify-center gap-1",
        "shadow-sm active:scale-95 transition-transform",
        bg, loading && "opacity-60",
      )}
    >
      <span className="text-lg leading-none">{loading ? "…" : emoji}</span>
      <span className="text-[10px] font-medium leading-tight">{label}</span>
    </button>
  );
}

// ── SpineCard — mobile swipe + desktop hover-reveal ───────────────────────────

interface SpineCardProps {
  record:                    EnrichedStreamRecord;
  currentUserName?:          string;
  side?:                     "left" | "right";
  onConfirmSettlement?:      (id: string) => Promise<void>;
  onDisputeSettlement?:      (id: string) => Promise<void>;
}

function SpineCard({
  record, currentUserName, side,
  onConfirmSettlement, onDisputeSettlement,
}: SpineCardProps) {
  const router     = useRouter();
  const cardRef    = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const [isTouchDevice,   setIsTouchDevice]   = useState(false);
  const [actionsOpen,     setActionsOpen]     = useState(false);
  const [forgiveLoading,  setForgiveLoading]  = useState(false);
  const [settleLoading,   setSettleLoading]   = useState(false);
  const [confirming,      setConfirming]      = useState(false);
  const [disputing,       setDisputing]       = useState(false);
  const [copied,          setCopied]          = useState(false);

  const x = useMotionValue(0);

  useEffect(() => {
    setIsTouchDevice(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  // Close overlay when user taps outside
  useEffect(() => {
    if (!actionsOpen) return;
    const handler = (e: PointerEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setActionsOpen(false);
      }
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [actionsOpen]);

  // ── Pending settlement (unconfirmed self-report) ─────────────────────────
  const pendingSettlement = record.settlements.find((s) => !s.isConfirmed);
  // Creditor can confirm: if viewer is owed (netAmount > 0)
  const canConfirm        = record.netAmount > 0 && !!pendingSettlement;

  // Latest CONFIRMED settlement's payment method (for the badge)
  const confirmedMethod = record.settlements
    .filter((s) => s.isConfirmed && s.paymentMethod)
    .sort((a, b) => new Date(b.settledAt).getTime() - new Date(a.settledAt).getTime())[0]
    ?.paymentMethod as PaymentMethod | undefined;

  // ── Status flags ────────────────────────────────────────────────────────────
  const isMuted     = record.status === "settled" || record.status === "forgiven";
  const isDisputed  = record.status === "disputed";
  const isOwed      = record.netAmount > 0;
  const isActive    = !isMuted;
  const isPending   = record.status === "pending";
  const isGuest     = record.counterpartType === "guest";
  const shareUrl    = buildShareUrl(record.confirmToken ?? null);

  const showShare    = isPending && isGuest && !!shareUrl;
  const showForgive  = isActive && isOwed;              // creditor only
  const showMarkPaid = isActive;                         // either party

  // ── Card colours ────────────────────────────────────────────────────────────
  const cardBg = isMuted
    ? "bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700/40"
    : isDisputed
      // Amber tint with stronger border — needs attention, NOT muted
      ? "bg-amber-50/90 dark:bg-amber-950/50 border-amber-300/80 dark:border-amber-600/60"
      : isOwed
        ? "bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200/70 dark:border-emerald-800/60"
        : "bg-amber-50/70  dark:bg-amber-950/40  border-amber-200/70  dark:border-amber-800/60";

  const amountColor = isMuted
    ? "text-slate-400 dark:text-slate-500"
    : isOwed
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-amber-600  dark:text-amber-400";

  // ── Actions ─────────────────────────────────────────────────────────────────
  async function handleForgive() {
    setForgiveLoading(true);
    try {
      const r = await forgiveStream(record.id);
      if (!r.ok) { toast.error("error" in r ? r.error : "Failed"); return; }
      hapticLight();
      toast.success("Entry forgiven 💚");
      router.refresh();
      setActionsOpen(false);
    } finally { setForgiveLoading(false); }
  }

  async function handleMarkPaid() {
    setSettleLoading(true);
    try {
      const r = await settleStream({ streamId: record.id, amount: Math.abs(record.netAmount) });
      if (!r.ok) { toast.error("error" in r ? r.error : "Failed"); return; }
      hapticSuccess();
      toast.success("Marked as paid ✓");
      router.refresh();
      setActionsOpen(false);
    } finally { setSettleLoading(false); }
  }

  function handleShare() {
    if (!shareUrl) return;
    const first    = currentUserName?.split(" ")[0] ?? "Someone";
    const amt      = formatCurrency(Math.abs(record.netAmount), record.currency);
    const noteText = record.note ? ` for ${record.note}` : "";
    const msg      = `Hi! ${first} logged a payment on Clear.\nYou owe ${amt}${noteText}.\nConfirm here → ${shareUrl}`;
    window.open(`https://wa.me?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
  }

  function handleCopyLink() {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      toast.success("Link copied!");
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function handleConfirm() {
    if (!pendingSettlement || !onConfirmSettlement) return;
    setConfirming(true);
    try {
      await onConfirmSettlement(pendingSettlement.id);
    } finally { setConfirming(false); }
  }

  async function handleDispute() {
    if (!pendingSettlement || !onDisputeSettlement) return;
    setDisputing(true);
    try {
      await onDisputeSettlement(pendingSettlement.id);
    } finally { setDisputing(false); }
  }

  // ── Swipe handlers (mobile only) ─────────────────────────────────────────────
  function onDragStart() { isDragging.current = true; }

  function onDragEnd(_: unknown, info: PanInfo) {
    setTimeout(() => { isDragging.current = false; }, 50);
    const offset   = x.get();
    const velocity = info.velocity.x;

    if (actionsOpen) {
      if (velocity > FAST_VELOCITY || offset > SNAP_THRESHOLD) setActionsOpen(false);
      animate(x, 0, { type: "spring", stiffness: 500, damping: 40 });
      return;
    }
    if (velocity < -FAST_VELOCITY || offset < -SNAP_THRESHOLD) {
      animate(x, 0, { type: "spring", stiffness: 500, damping: 40 });
      if (isActive) setActionsOpen(true);
    } else {
      animate(x, 0, { type: "spring", stiffness: 500, damping: 40 });
    }
  }

  // ── Card content ─────────────────────────────────────────────────────────────
  const content = (
    <div
      className={cn(
        "rounded-xl border px-3 py-2.5 w-full min-w-0 overflow-hidden",
        cardBg,
        isMuted && "opacity-50",
      )}
    >
      {/* Row 1: emoji + description + amount */}
      <div className={cn("flex items-center gap-2 min-w-0", side === "left" && "flex-row-reverse")}>
        <span className="text-base shrink-0 leading-none">{getEmoji(record.note)}</span>
        <p className={cn(
          "text-sm font-medium flex-1 min-w-0 truncate",
          isMuted
            ? "text-slate-400 dark:text-slate-500 line-through"
            : "text-slate-700 dark:text-slate-200",
          side === "left" && "text-right",
        )}>
          {record.note || "No description"}
        </p>
        <p className={cn("text-sm font-bold tabular-nums shrink-0 whitespace-nowrap", amountColor)}>
          {isOwed ? "+" : "−"}{formatCurrency(Math.abs(record.netAmount), record.currency)}
        </p>
      </div>

      {/* Row 2: status + payment method + share pills */}
      <div className={cn("flex items-center gap-2 mt-1.5 min-w-0 flex-wrap", side === "left" ? "flex-row-reverse" : "")}>
        <StatusBadge status={record.status} />
        {/* Payment method badge (settled entries with a known method) */}
        {confirmedMethod && (
          <PaymentMethodBadge method={confirmedMethod} />
        )}
        {showShare && (
          <div className={cn("flex items-center gap-1.5", side === "left" ? "mr-auto" : "ml-auto")}>
            <button type="button" onClick={handleShare}
              className="inline-flex items-center gap-1 text-[10px] font-semibold
                         text-indigo-600 dark:text-indigo-400
                         bg-indigo-50 dark:bg-indigo-950/40
                         border border-indigo-200 dark:border-indigo-800/60
                         px-2 py-0.5 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-900/40
                         transition-colors whitespace-nowrap">
              📱 Share ↗
            </button>
            <button type="button" onClick={handleCopyLink}
              className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300
                         transition-colors whitespace-nowrap">
              {copied ? "✓ Copied" : "Copy"}
            </button>
          </div>
        )}
      </div>

      {/* Row 3: Payment pending badge (unconfirmed self-report) */}
      {pendingSettlement && (
        <div className="mt-2.5">
          <PaymentPendingBadge
            payerName={record.counterpartName}
            amount={Number(pendingSettlement.amount)}
            currency={pendingSettlement.currency}
            paymentMethod={pendingSettlement.paymentMethod as PaymentMethod | undefined}
            utrReference={pendingSettlement.utrReference ?? undefined}
            canConfirm={canConfirm}
            onConfirm={canConfirm ? handleConfirm : undefined}
            onDispute={canConfirm ? handleDispute : undefined}
            confirming={confirming}
            disputing={disputing}
          />
        </div>
      )}
    </div>
  );

  // ── Desktop: hover-reveal action row ─────────────────────────────────────────
  if (!isTouchDevice) {
    return (
      <div ref={cardRef} className="relative group">
        {content}
        {isActive && (showForgive || showMarkPaid || showShare) && (
          <div className={cn(
            "absolute top-2 flex items-center gap-1.5",
            "opacity-0 group-hover:opacity-100 transition-opacity duration-150",
            side === "left" ? "left-2" : "right-2",
          )}>
            {showShare && (
              <button type="button" onClick={handleShare}
                className="text-[10px] font-semibold px-2 py-1 rounded-lg
                           bg-indigo-500 text-white hover:bg-indigo-600 transition-colors">
                Share ↗
              </button>
            )}
            {showMarkPaid && (
              <button type="button" onClick={handleMarkPaid} disabled={settleLoading}
                className="text-[10px] font-semibold px-2 py-1 rounded-lg
                           bg-emerald-500 text-white hover:bg-emerald-600 transition-colors
                           disabled:opacity-50">
                {settleLoading ? "…" : "Paid ✓"}
              </button>
            )}
            {showForgive && (
              <button type="button" onClick={handleForgive} disabled={forgiveLoading}
                className="text-[10px] font-semibold px-2 py-1 rounded-lg
                           bg-white/90 dark:bg-slate-800 border border-slate-200 dark:border-slate-700
                           text-slate-600 dark:text-slate-300 hover:border-emerald-400
                           hover:text-emerald-600 dark:hover:text-emerald-400
                           transition-colors disabled:opacity-50">
                {forgiveLoading ? "…" : "Forgive 💚"}
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Mobile: swipe-to-reveal overlay ──────────────────────────────────────────
  return (
    <div ref={cardRef} className="relative rounded-xl overflow-hidden">
      <motion.div
        drag={isActive ? "x" : false}
        dragConstraints={{ left: -90, right: actionsOpen ? 90 : 0 }}
        dragElastic={{ left: 0.1, right: 0.05 }}
        dragMomentum={false}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        style={{ x, touchAction: "pan-y" }}
        onClick={() => {
          if (isDragging.current) return;
          if (actionsOpen) setActionsOpen(false);
        }}
      >
        {content}
      </motion.div>

      <AnimatePresence>
        {actionsOpen && isActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14 }}
            className="absolute inset-0 rounded-xl backdrop-blur-md
                       bg-white/80 dark:bg-slate-900/85
                       flex items-center justify-center gap-4"
            onClick={() => setActionsOpen(false)}
          >
            {showShare    && <ActionBtn emoji="📱" label="Share"     onClick={handleShare}    />}
            {showMarkPaid && <ActionBtn emoji="✓"  label="Mark Paid" onClick={handleMarkPaid} variant="emerald" loading={settleLoading}  />}
            {showForgive  && <ActionBtn emoji="💚" label="Forgive"   onClick={handleForgive}  variant="amber"   loading={forgiveLoading} />}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Spine dot ─────────────────────────────────────────────────────────────────

function SpineDot({ record }: { record: EnrichedStreamRecord }) {
  const isMuted    = record.status === "settled" || record.status === "forgiven";
  const isDisputed = record.status === "disputed";
  const isOwed     = record.netAmount > 0;
  return (
    <div className={cn(
      "w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-slate-900 shrink-0 z-10",
      isMuted
        ? "bg-slate-300 dark:bg-slate-600"
        : isDisputed
          ? "bg-amber-500 dark:bg-amber-400 ring-amber-200 dark:ring-amber-900"
          : isOwed
            ? "bg-emerald-500 dark:bg-emerald-400"
            : "bg-amber-500 dark:bg-amber-400",
    )} />
  );
}

// ── Row animation ─────────────────────────────────────────────────────────────

function AnimatedRow({ children, index, className, style }: {
  children:   React.ReactNode;
  index:      number;
  className?: string;
  style?:     React.CSSProperties;
}) {
  return (
    <motion.div
      className={className}
      style={style}
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-24px" }}
      transition={{
        duration: 0.28,
        delay:    Math.min(index, 8) * 0.055,
        ease:     [0.25, 0.1, 0.25, 1],
      }}
    >
      {children}
    </motion.div>
  );
}

// ── Mobile spine ──────────────────────────────────────────────────────────────

function MobileSpine({ records, runningNets, currentUserName, onConfirmSettlement, onDisputeSettlement }: {
  records:                EnrichedStreamRecord[];
  runningNets:            number[];
  currentUserName?:       string;
  onConfirmSettlement?:   (id: string) => Promise<void>;
  onDisputeSettlement?:   (id: string) => Promise<void>;
}) {
  return (
    <div className="relative w-full overflow-hidden">
      <div
        className="absolute top-0 bottom-0 w-0.5 pointer-events-none
                   bg-gradient-to-b from-transparent via-indigo-300/50 to-transparent
                   dark:via-indigo-600/40"
        style={{ left: 54 }}
      />
      {records.map((record, i) => {
        const rn         = runningNets[i];
        const isIOweThem = record.netAmount <= 0;
        const date       = new Date(record.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" });
        const netColor   = rn > 0 ? "text-emerald-500 dark:text-emerald-400"
                         : rn < 0 ? "text-amber-500 dark:text-amber-400"
                         : "text-slate-400 dark:text-slate-500";

        return (
          <AnimatedRow key={record.id} index={i} className="grid mb-3"
            style={{ gridTemplateColumns: "48px 12px 1fr" } as React.CSSProperties}>
            {/* Col 1 */}
            <div className="flex flex-col items-end justify-start pr-2 pt-3 gap-px shrink-0">
              <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 leading-tight whitespace-nowrap">
                {date}
              </span>
              {rn !== 0 && (
                <span className={cn("text-[9px] font-bold leading-tight whitespace-nowrap", netColor)}>
                  {rn > 0 ? "↑" : "↓"}{fmtNet(rn)}
                </span>
              )}
            </div>
            {/* Col 2 */}
            <div className="flex justify-center pt-3.5 shrink-0">
              <SpineDot record={record} />
            </div>
            {/* Col 3 */}
            <div className={cn("pb-1 min-w-0", isIOweThem ? "pl-5 pr-0" : "pl-2.5 pr-0")}>
              <SpineCard
                record={record}
                currentUserName={currentUserName}
                onConfirmSettlement={onConfirmSettlement}
                onDisputeSettlement={onDisputeSettlement}
              />
            </div>
          </AnimatedRow>
        );
      })}
    </div>
  );
}

// ── Desktop spine ─────────────────────────────────────────────────────────────

function DesktopSpine({ records, runningNets, currentUserName, onConfirmSettlement, onDisputeSettlement }: {
  records:              EnrichedStreamRecord[];
  runningNets:          number[];
  currentUserName?:     string;
  onConfirmSettlement?: (id: string) => Promise<void>;
  onDisputeSettlement?: (id: string) => Promise<void>;
}) {
  return (
    <div className="relative w-full">
      <div
        className="absolute top-0 bottom-0 w-0.5 -translate-x-px pointer-events-none
                   bg-gradient-to-b from-transparent via-indigo-300/50 to-transparent
                   dark:via-indigo-600/40"
        style={{ left: "50%" }}
      />
      {records.map((record, i) => {
        const rn     = runningNets[i];
        const isOwed = record.netAmount > 0;
        const date   = new Date(record.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" });
        const netColor = rn > 0 ? "text-emerald-500 dark:text-emerald-400"
                       : rn < 0 ? "text-amber-500 dark:text-amber-400"
                       : "text-slate-400 dark:text-slate-500";

        return (
          <AnimatedRow key={record.id} index={i} className="flex items-start mb-2 min-h-[72px]">
            {/* Left */}
            <div className="w-[45%] min-w-0 pr-5 flex justify-end">
              {isOwed && (
                <div className="w-full max-w-[280px] min-w-0">
                  <SpineCard
                    record={record}
                    currentUserName={currentUserName}
                    side="left"
                    onConfirmSettlement={onConfirmSettlement}
                    onDisputeSettlement={onDisputeSettlement}
                  />
                </div>
              )}
            </div>
            {/* Centre */}
            <div className="w-[10%] flex flex-col items-center pt-2.5 shrink-0 z-10">
              <SpineDot record={record} />
              <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 mt-1 leading-tight text-center whitespace-nowrap">
                {date}
              </span>
              {rn !== 0 && (
                <span className={cn("text-[9px] font-bold leading-tight text-center whitespace-nowrap", netColor)}>
                  {rn > 0 ? "↑" : "↓"}{fmtNet(rn)}
                </span>
              )}
            </div>
            {/* Right */}
            <div className="w-[45%] min-w-0 pl-5">
              {!isOwed && (
                <div className="w-full max-w-[280px] min-w-0">
                  <SpineCard
                    record={record}
                    currentUserName={currentUserName}
                    side="right"
                    onConfirmSettlement={onConfirmSettlement}
                    onDisputeSettlement={onDisputeSettlement}
                  />
                </div>
              )}
            </div>
          </AnimatedRow>
        );
      })}
    </div>
  );
}

// ── Public export ─────────────────────────────────────────────────────────────

export function StreamSpineView({
  records,
  currentUserName,
  onConfirmSettlement,
  onDisputeSettlement,
}: {
  records:              EnrichedStreamRecord[];
  currentUserName?:     string;
  onConfirmSettlement?: (id: string) => Promise<void>;
  onDisputeSettlement?: (id: string) => Promise<void>;
}) {
  if (records.length === 0) return null;

  const chronological = [...records].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  let running = 0;
  const nets  = chronological.map((r) => { running += r.netAmount; return running; });
  const displayRecords = [...chronological].reverse();
  const displayNets    = [...nets].reverse();

  return (
    <>
      <div className="md:hidden">
        <MobileSpine
          records={displayRecords}
          runningNets={displayNets}
          currentUserName={currentUserName}
          onConfirmSettlement={onConfirmSettlement}
          onDisputeSettlement={onDisputeSettlement}
        />
      </div>
      <div className="hidden md:block">
        <div className="flex mb-3 text-xs font-semibold text-slate-400 dark:text-slate-500">
          <div className="w-[45%] text-right pr-5 flex items-center justify-end gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 dark:bg-emerald-500 inline-block" />
            They owe me
          </div>
          <div className="w-[10%]" />
          <div className="w-[45%] pl-5 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 dark:bg-amber-500 inline-block" />
            I owe them
          </div>
        </div>
        <DesktopSpine
          records={displayRecords}
          runningNets={displayNets}
          currentUserName={currentUserName}
          onConfirmSettlement={onConfirmSettlement}
          onDisputeSettlement={onDisputeSettlement}
        />
      </div>
    </>
  );
}
