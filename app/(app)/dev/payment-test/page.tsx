"use client";

/**
 * DEV-ONLY: Phase 2 payment atom visual test page.
 * Visit: http://localhost:3000/dev/payment-test
 * DELETE THIS FILE before going to production (or add to .gitignore).
 */

import { useState } from "react";
import { UpiPayButton }          from "@/components/payment/upi-pay-button";
import { UpiRequestButton }      from "@/components/payment/upi-request-button";
import { PaymentConfirmPrompt }  from "@/components/payment/payment-confirm-prompt";
import { PaymentPendingBadge }   from "@/components/payment/payment-pending-badge";
import { toast }                 from "sonner";
import { useRef }                from "react";

const TEST_VPA     = "jayakumar@okaxis";
const TEST_AMOUNT  = 1200;
const TEST_CTX     = "Goa Trip";
const TEST_USER_ID = "user_test_abc123";

export default function PaymentTestPage() {
  const [showPrompt,    setShowPrompt]    = useState(false);
  const [confirming,    setConfirming]    = useState(false);
  const [badgeConfirm,  setBadgeConfirm] = useState(false);
  const [badgeDispute,  setBadgeDispute] = useState(false);
  const upiTappedRef                     = useRef(false);

  // Simulate return-from-UPI
  function simulateTapped() {
    upiTappedRef.current = true;
    toast.info("UPI button tapped — simulating app return in 2s…");
    setTimeout(() => {
      if (upiTappedRef.current) {
        upiTappedRef.current = false;
        setShowPrompt(true);
      }
    }, 2000);
  }

  async function handleConfirm(utr?: string) {
    setConfirming(true);
    await new Promise((r) => setTimeout(r, 1500));
    setConfirming(false);
    setShowPrompt(false);
    toast.success(`Confirmed! UTR: ${utr ?? "none provided"}`);
  }

  return (
    <div className="max-w-sm mx-auto py-10 px-4 space-y-10">
      <h1 className="text-xl font-bold" style={{ fontFamily: "var(--font-fraunces)" }}>
        Payment Atoms — Dev Test
      </h1>

      {/* ── Atom 1: UpiPayButton ─────────────────────────────────── */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
          Atom 1 — UpiPayButton
        </h2>
        <p className="text-xs text-slate-400">
          VPA: {TEST_VPA} · Amount: ₹{TEST_AMOUNT}
        </p>
        <UpiPayButton
          vpa={TEST_VPA}
          amount={TEST_AMOUNT}
          currency="INR"
          contextName={TEST_CTX}
          onTapped={simulateTapped}
        />
      </section>

      {/* ── Atom 3: PaymentConfirmPrompt (triggered by UpiPayButton above) */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
          Atom 3 — PaymentConfirmPrompt
        </h2>
        <p className="text-xs text-slate-400">
          Tap a UPI button above to auto-trigger after 2s, or use the button below.
        </p>
        <button
          type="button"
          onClick={() => setShowPrompt(true)}
          className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700
                     text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          Show prompt manually
        </button>
        <PaymentConfirmPrompt
          isVisible={showPrompt}
          onConfirm={handleConfirm}
          onDismiss={() => setShowPrompt(false)}
          confirming={confirming}
          amount={TEST_AMOUNT}
          currency="INR"
        />
      </section>

      {/* ── Atom 2: UpiRequestButton ─────────────────────────────── */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
          Atom 2 — UpiRequestButton
        </h2>
        <p className="text-xs text-slate-400">
          Creditor side — requests payment via share or copy
        </p>
        <UpiRequestButton
          payeeUserId={TEST_USER_ID}
          payeeName="Jayakumar Sekar"
          amount={TEST_AMOUNT}
          currency="INR"
          contextName={TEST_CTX}
          groupId="group_test_123"
        />
      </section>

      {/* ── Atom 4a: PaymentPendingBadge (canConfirm=true) ────────── */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
          Atom 4 — PaymentPendingBadge (canConfirm=true)
        </h2>
        <PaymentPendingBadge
          payerName="Priya Sharma"
          amount={TEST_AMOUNT}
          currency="INR"
          paymentMethod="upi"
          utrReference="123456789012"
          canConfirm={true}
          confirming={badgeConfirm}
          disputing={badgeDispute}
          onConfirm={async () => {
            setBadgeConfirm(true);
            await new Promise((r) => setTimeout(r, 1500));
            setBadgeConfirm(false);
            toast.success("Settlement confirmed!");
          }}
          onDispute={async () => {
            setBadgeDispute(true);
            await new Promise((r) => setTimeout(r, 1500));
            setBadgeDispute(false);
            toast.error("Settlement disputed and deleted");
          }}
        />
      </section>

      {/* ── Atom 4b: PaymentPendingBadge (canConfirm=false) ──────── */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
          Atom 4 — PaymentPendingBadge (canConfirm=false)
        </h2>
        <PaymentPendingBadge
          payerName="Priya Sharma"
          amount={TEST_AMOUNT}
          currency="INR"
          canConfirm={false}
        />
      </section>

    </div>
  );
}
