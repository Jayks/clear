"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Script from "next/script";
import { toast } from "sonner";
import { createPassOrder, confirmPassPurchase } from "@/app/actions/subscription";
import { REGULAR_PRICE } from "@/lib/subscription/prices";
import type { PassType } from "@/lib/subscription/entitlement";
import { Loader2, Lock } from "lucide-react";

// Razorpay's checkout.js attaches a global constructor — no @types package for it
// (D8: no SDK at all, just this one client-side script).
interface RazorpayCheckoutResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}
interface RazorpayCheckoutOptions {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description?: string;
  theme?: { color?: string };
  prefill?: { name?: string; email?: string };
  handler: (response: RazorpayCheckoutResponse) => void;
  modal?: { ondismiss?: () => void };
}
interface RazorpayCheckoutInstance {
  open: () => void;
}
declare global {
  interface Window {
    Razorpay: new (options: RazorpayCheckoutOptions) => RazorpayCheckoutInstance;
  }
}

interface CheckoutFormProps {
  initialPassType: PassType;
  earlyBird: boolean;
  price: { monthly: number; annual: number }; // monthly = the 30-day pass price
  annualMonthlyEquiv: number;
  annualSavings: number;
  slotsRemaining: number;
  slotsTotal: number;
  userEmail?: string;
  userName?: string;
}

export function CheckoutForm({
  initialPassType,
  earlyBird,
  price,
  annualMonthlyEquiv,
  annualSavings,
  slotsRemaining,
  slotsTotal,
  userEmail,
  userName,
}: CheckoutFormProps) {
  const [passType, setPassType] = useState<PassType>(initialPassType);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const selectedPrice = passType === "pass_30d" ? price.monthly : price.annual;
  // Early Bird's hook = the discount vs the regular price (locked forever).
  const annualOffRegular = REGULAR_PRICE.annual - price.annual; // ₹200 for Early Bird, 0 for regular
  const annualSavingsPct = earlyBird
    ? Math.round((annualOffRegular / REGULAR_PRICE.annual) * 100)   // % off regular annual
    : Math.round((annualSavings / (price.monthly * 12)) * 100);     // % annual vs 12× the 30-day pass

  async function handlePurchase() {
    // window.Razorpay is the authoritative check — checkout.js persists across
    // client-side navigations within the SPA, so a fresh mount of this component
    // (e.g. revisiting checkout via Settings → Billing → "Renew or extend") may
    // never re-fire next/script's onLoad even though the script is already loaded.
    // A scriptReady *state* gate would incorrectly block that case — see RAZORPAY_PLAN.md.
    if (typeof window === "undefined" || !window.Razorpay) {
      toast.error("Payment is still loading — please try again in a moment.");
      return;
    }
    setLoading(true);

    const order = await createPassOrder(passType);
    if (!order.ok) {
      toast.error(order.error);
      setLoading(false);
      return;
    }

    const rzp = new window.Razorpay({
      key: order.keyId,
      amount: order.amount,
      currency: "INR",
      order_id: order.orderId,
      name: "Clear Plus",
      description: passType === "pass_30d" ? "Plus — 30-day pass" : "Plus — Annual pass",
      theme: { color: "#7c3aed" },
      prefill: { name: userName, email: userEmail },
      handler: async (response) => {
        const result = await confirmPassPurchase(
          response.razorpay_order_id,
          response.razorpay_payment_id,
          response.razorpay_signature,
        );
        if (result.ok) {
          toast.success("Welcome to Plus! ✦", {
            description: "All features are now unlocked.",
            duration: 5000,
          });
          router.push("/groups");
        } else {
          // Payment itself succeeded (we're past Razorpay's handler) — a confirm
          // failure here doesn't mean the money is lost. The webhook backstop
          // applies the same entitlement extension idempotently in the background.
          toast.error("Payment received — finishing setup. Refresh in a moment; contact support if Plus doesn't appear.", {
            duration: 8000,
          });
          setLoading(false);
        }
      },
      modal: {
        ondismiss: () => setLoading(false),
      },
    });
    rzp.open();
  }

  return (
    <div className="space-y-3">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />

      {/* ── Early Bird notice ───────────────────────────────────────────── */}
      {earlyBird && (
        <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-700/40 px-4 py-3 flex items-start gap-2.5">
          <span className="text-amber-500 text-sm mt-0.5 shrink-0">🔒</span>
          <div>
            <p className="text-xs font-bold text-amber-800 dark:text-amber-300">
              Early-bird pricing — {slotsRemaining} of {slotsTotal} slots remaining
            </p>
            <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80 mt-0.5">
              This rate is locked in forever and will never increase for you.
            </p>
          </div>
        </div>
      )}

      {/* ── Pass type radio options ─────────────────────────────────────── */}
      {([
        { type: "pass_30d", label: "30-day pass", sub: "Plus for one trip or month" },
        { type: "annual", label: "Annual pass", sub: "Plus for a full year" },
      ] as const).map(({ type, label, sub }) => (
        <button
          key={type}
          type="button"
          onClick={() => setPassType(type)}
          className={`w-full text-left rounded-2xl p-4 border-2 transition-all ${
            passType === type
              ? "border-violet-400 dark:border-violet-500 bg-violet-50/60 dark:bg-violet-950/30"
              : "border-slate-200 dark:border-slate-700 glass hover:border-violet-200 dark:hover:border-violet-800"
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {/* Radio dot */}
              <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${
                passType === type ? "border-violet-500 bg-violet-500" : "border-slate-300 dark:border-slate-600"
              }`}>
                {passType === type && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>

              {/* Label + sub-info */}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2 flex-wrap">
                  {label}
                  {type === "annual" && (
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded-full">
                      Best value — save {annualSavingsPct}%
                    </span>
                  )}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  {type === "annual"
                    ? `₹${annualMonthlyEquiv}/month equivalent · ${earlyBird ? `saves ₹${annualOffRegular} vs regular` : `saves ₹${annualSavings} vs 12 monthly passes`}`
                    : sub}
                </p>
                {type === "pass_30d" && earlyBird && (
                  <p className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-0.5">
                    Early-bird rate · locked in forever
                  </p>
                )}
              </div>
            </div>

            {/* Price (right-aligned) */}
            <div className="text-right shrink-0">
              {earlyBird ? (
                <>
                  <p className="text-xs text-slate-400 dark:text-slate-500 line-through tabular-nums">
                    ₹{type === "pass_30d" ? REGULAR_PRICE.monthly : REGULAR_PRICE.annual}
                  </p>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100 tabular-nums">
                    ₹{type === "pass_30d" ? price.monthly : price.annual}
                  </p>
                </>
              ) : (
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100 tabular-nums">
                  ₹{type === "pass_30d" ? price.monthly : price.annual}
                </p>
              )}
              <p className="text-xs text-slate-400 dark:text-slate-500">one-time</p>
            </div>
          </div>
        </button>
      ))}

      {/* ── Order summary ───────────────────────────────────────────────── */}
      <div className="glass rounded-2xl p-5 mt-2">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-4">
          Order summary
        </p>

        <div className="space-y-2.5 mb-4">
          {/* Plan line */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-300">
              Clear Plus · {passType === "pass_30d" ? "30-day pass" : "Annual pass"}
              {earlyBird && <span className="ml-1.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded-full align-middle">Early Bird</span>}
            </span>
            <span className="tabular-nums text-slate-700 dark:text-slate-200 font-medium">
              ₹{selectedPrice}
            </span>
          </div>
        </div>

        {/* Total */}
        <div className="border-t border-slate-200 dark:border-slate-700 pt-3.5 mb-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Total due today</span>
            <span className="text-2xl font-bold text-slate-800 dark:text-slate-100 tabular-nums" style={{ fontFamily: "var(--font-fraunces)" }}>
              ₹{selectedPrice}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5 leading-relaxed">
            One-time payment — no auto-renewal. Your Plus access runs for{" "}
            <span className="font-medium text-slate-500 dark:text-slate-400">
              {passType === "pass_30d" ? "30 days" : "1 year"}
            </span>{" "}
            from today and simply expires — no card kept on file.
          </p>
        </div>

        {/* CTA */}
        <button
          type="button"
          onClick={handlePurchase}
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-2 py-3 mt-3 bg-gradient-to-br from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 disabled:opacity-70 text-white font-semibold rounded-xl shadow-md shadow-violet-500/20 transition-all text-sm"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>✦</span>}
          {loading ? "Opening payment…" : `Pay ₹${selectedPrice} →`}
        </button>

        <div className="flex items-center justify-center gap-1.5 mt-3 text-xs text-slate-400 dark:text-slate-500">
          <Lock className="w-3 h-3" />
          Secured by Razorpay · UPI, cards, net banking
        </div>
        <p className="text-center text-[11px] text-slate-400 dark:text-slate-500 mt-2">
          By purchasing, you agree to our{" "}
          <Link href="/terms" className="underline hover:text-slate-600 dark:hover:text-slate-300">Terms</Link>{" "}
          and <Link href="/refund" className="underline hover:text-slate-600 dark:hover:text-slate-300">Refund Policy</Link>.
        </p>
      </div>
    </div>
  );
}
