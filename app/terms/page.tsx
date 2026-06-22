import type { Metadata } from "next";
import { LegalPageShell } from "@/components/marketing/legal-page-shell";

export const metadata: Metadata = { title: "Terms & Conditions — ClearOff" };

export default function TermsPage() {
  return (
    <LegalPageShell title="Terms & Conditions" updated="19 June 2026">
      <p>
        These Terms & Conditions ("Terms") govern your use of ClearOff ("ClearOff", "the Service", "we", "us"),
        a shared expense and personal debt tracking application based in Chennai, Tamil Nadu, India
        ("the Operator"). By creating an account or using ClearOff, you agree to these Terms. If you don&apos;t
        agree, please don&apos;t use the Service.
      </p>

      <h2>1. What ClearOff is</h2>
      <p>
        ClearOff lets you log shared expenses and personal debts across four contexts — Trips, Nests, Streams,
        and Circles — and computes who owes whom, with optional AI-assisted receipt scanning and natural-language
        logging. <strong>ClearOff is a record-keeping and calculation tool. ClearOff does not hold, transmit, or
        guarantee any money exchanged between users for expense settlements.</strong> When ClearOff shows a UPI
        payment link or QR code for settling a debt between users, that payment happens directly between the
        users&apos; own UPI apps and banks — ClearOff has no part in that money movement and cannot reverse, insure,
        or guarantee it. The only payment ClearOff itself processes is the purchase of a ClearOff Plus pass, handled by
        Razorpay (see §5 and our <a href="/refund">Refund Policy</a>).
      </p>

      <h2>2. Eligibility and accounts</h2>
      <p>
        You must be capable of entering into a binding contract under Indian law to use ClearOff. Accounts are
        created via Google sign-in. You&apos;re responsible for keeping your account secure and for all activity
        under it. You may add people to a group as "guests" by name before they have a ClearOff account — by doing
        so you confirm you have the right to share their name and the expense data you enter on their behalf.
      </p>

      <h2>3. Shared data within groups</h2>
      <p>
        Trips, Nests, and Circles are inherently shared spaces. Any expense, contribution, comment, or reaction
        you log inside a group is visible to every other member of that group. Streams are bilateral — visible
        only to the two people in that relationship plus, for guest counterparts, whoever holds the confirmation
        link. Don&apos;t log anything in a shared group you wouldn&apos;t want other members to see.
      </p>

      <h2>4. Acceptable use</h2>
      <ul>
        <li>Enter accurate expense and debt information to the best of your knowledge — ClearOff doesn&apos;t verify amounts, receipts, or who actually paid.</li>
        <li>Don&apos;t use ClearOff for any unlawful purpose, to harass other users, or to misrepresent debts that don&apos;t exist.</li>
        <li>Don&apos;t attempt to circumvent rate limits, abuse the AI features, or access another user&apos;s account or data without authorization.</li>
      </ul>

      <h2>5. ClearOff Plus — passes, not subscriptions</h2>
      <p>
        ClearOff Plus is purchased as a one-time <strong>30-day pass</strong> or <strong>annual pass</strong>, not a
        recurring subscription — no card is kept on file and nothing renews automatically. Prices are listed in
        INR and are inclusive of applicable taxes. Payments are processed by Razorpay; ClearOff never sees or stores
        your full card number, CVV, or UPI PIN. Purchasing a pass extends your Plus entitlement; see our{" "}
        <a href="/refund">Refund &amp; Cancellation Policy</a> for what happens if something goes wrong with a
        payment.
      </p>

      <h2>6. AI features</h2>
      <p>
        Receipt scanning, natural-language expense entry, and chat import send the content you submit (receipt
        photos, typed text, or pasted chat logs) to a third-party AI provider (Anthropic) for processing. Don&apos;t
        submit receipts or text containing information you don&apos;t want processed this way.
      </p>

      <h2>7. Disclaimers</h2>
      <p>
        ClearOff is provided "as is" and "as available", without warranties of any kind, express or implied. We
        don&apos;t guarantee the Service will be uninterrupted, error-free, or that calculations will always be
        free of bugs — though we work hard to make sure they are. ClearOff is not a substitute for professional
        financial or legal advice.
      </p>

      <h2>8. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, the Operator is not liable for any indirect, incidental, or
        consequential damages arising from your use of ClearOff, including disputes between users over money owed.
        Our total liability to you for any claim relating to the Service is limited to the amount you paid us,
        if any, in the 12 months before the claim arose.
      </p>

      <h2>9. Termination</h2>
      <p>
        You may stop using ClearOff at any time. We may suspend or terminate accounts that violate these Terms,
        including abusive use of AI features or attempts to defraud other users.
      </p>

      <h2>10. Governing law</h2>
      <p>
        These Terms are governed by the laws of India. Any dispute will be subject to the exclusive jurisdiction
        of the courts in Chennai, Tamil Nadu.
      </p>

      <h2>11. Changes to these Terms</h2>
      <p>
        We may update these Terms from time to time. Material changes will be reflected by updating the "Last
        updated" date above. Continued use of ClearOff after a change means you accept the updated Terms.
      </p>

      <h2>12. Contact</h2>
      <p>
        Questions about these Terms? Reach us via the <a href="/contact">Contact page</a> or at{" "}
        <a href="mailto:support@clearoff.in">support@clearoff.in</a>.
      </p>
    </LegalPageShell>
  );
}
