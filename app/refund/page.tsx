import type { Metadata } from "next";
import { LegalPageShell } from "@/components/marketing/legal-page-shell";

export const metadata: Metadata = { title: "Refund & Cancellation Policy — Clear" };

export default function RefundPage() {
  return (
    <LegalPageShell title="Refund & Cancellation Policy" updated="19 June 2026">
      <p>
        This policy covers <strong>Clear Plus</strong> pass purchases — the only payments Clear processes
        directly. It does not cover money exchanged between users for expense settlements; Clear has no part in
        that (see our <a href="/terms">Terms</a>, §1).
      </p>

      <h2>1. Nothing to cancel — passes aren&apos;t subscriptions</h2>
      <p>
        Clear Plus is sold as a one-time <strong>30-day pass</strong> or <strong>annual pass</strong>. No card is
        kept on file, and nothing renews or charges automatically. Your pass simply expires at the end of its
        term — there&apos;s no subscription to cancel.
      </p>

      <h2>2. General policy: non-refundable</h2>
      <p>
        Because a pass grants instant digital access to Plus features the moment it&apos;s purchased, purchases are{" "}
        <strong>non-refundable</strong> once completed. This keeps pricing low (₹49–₹699) and avoids us needing to
        track partial usage. Buying a second pass while one is already active simply extends your Plus time
        rather than wasting the earlier purchase.
      </p>

      <h2>3. Exceptions — when we will refund</h2>
      <p>We&apos;ll review and refund on a case-by-case basis if:</p>
      <ul>
        <li>You were charged more than once for the same purchase (a duplicate or accidental double-charge).</li>
        <li>Payment was deducted from your account, but Clear Plus was never activated due to a technical error on our side.</li>
        <li>The charge was unauthorized or fraudulent on your account.</li>
      </ul>
      <p>
        Contact us within 7 days of the charge at{" "}
        <a href="mailto:saijayakumar@gmail.com">saijayakumar@gmail.com</a> with your payment ID or order ID
        (shown in Settings → Billing, or in your payment confirmation) and a short description of the issue.
        Approved refunds are issued to your original payment method via Razorpay and typically reflect within
        5–7 business days, per Razorpay&apos;s standard refund timelines.
      </p>

      <h2>4. How to request a refund</h2>
      <p>
        Email <a href="mailto:saijayakumar@gmail.com">saijayakumar@gmail.com</a> with the subject "Refund
        request", your account email, and the payment/order ID. We aim to respond within 2 business days.
      </p>

      <h2>5. Contact</h2>
      <p>
        See our <a href="/contact">Contact page</a> for other ways to reach us.
      </p>
    </LegalPageShell>
  );
}
