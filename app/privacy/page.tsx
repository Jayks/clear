import type { Metadata } from "next";
import { LegalPageShell } from "@/components/marketing/legal-page-shell";

export const metadata: Metadata = { title: "Privacy Policy — Clear" };

export default function PrivacyPage() {
  return (
    <LegalPageShell title="Privacy Policy" updated="19 June 2026">
      <p>
        This Privacy Policy explains what Clear ("Clear", "we", "us"), operated by <strong>Jayakumar Sekar</strong>
        {" "}(Chennai, Tamil Nadu, India), collects, why, and who it&apos;s shared with. Using Clear means you&apos;ve
        read and accepted this policy.
      </p>

      <h2>1. Information we collect</h2>
      <ul>
        <li><strong>Account information</strong> — your name, email address, and profile photo from Google sign-in.</li>
        <li><strong>Financial data you enter</strong> — expense descriptions, amounts, categories, splits, settlements, and debt entries you and your group members log.</li>
        <li><strong>Receipt photos</strong> — if you scan or upload a receipt, including any GPS location embedded in the photo&apos;s metadata.</li>
        <li><strong>UPI IDs</strong> — if you save one in Settings, to speed up future payment requests.</li>
        <li><strong>Push notification data</strong> — your browser&apos;s push subscription endpoint, if you enable notifications.</li>
        <li><strong>Payment data</strong> — handled directly by Razorpay; we receive only the payment status and an order/payment reference, never your card or UPI credentials.</li>
        <li><strong>Usage data</strong> — basic, anonymized analytics on how the app is used (if Google Analytics is enabled).</li>
      </ul>

      <h2>2. How we use it</h2>
      <p>
        To run the Service: compute balances and settlements, show your groups and streams, send notifications
        about activity in your groups, process AI-assisted receipt scans and natural-language entry, process
        Clear Plus pass payments, and improve the product. We don&apos;t sell your data.
      </p>

      <h2>3. Who we share it with (sub-processors)</h2>
      <ul>
        <li><strong>Supabase</strong> — our database, authentication, and file storage provider. Your account and expense data lives here, access-controlled per group.</li>
        <li><strong>Anthropic</strong> — processes receipt photos, typed text, or pasted chat content you submit through the AI features, in order to extract expense details.</li>
        <li><strong>Razorpay</strong> — processes Clear Plus pass payments. PCI-DSS compliant; Clear never stores your card or UPI credentials.</li>
        <li><strong>Resend</strong> — sends transactional emails (notifications, receipts).</li>
        <li><strong>Mapbox</strong> — converts addresses to/from coordinates when you use location features on a receipt or trip.</li>
        <li><strong>Google</strong> — handles sign-in (OAuth); browser push notifications are delivered via your browser vendor&apos;s own push service (Google, Mozilla, or Apple).</li>
        <li><strong>Unsplash</strong> — optional stock photo source for group cover images; no personal data is sent.</li>
        <li><strong>Google Analytics</strong> — optional, anonymized product usage analytics.</li>
      </ul>
      <p>
        Some of these providers process data on servers outside India. By using Clear, you consent to this
        international transfer, which is necessary to provide the Service.
      </p>

      <h2>4. Sharing with other Clear users</h2>
      <p>
        Clear is a shared-expense app — anything you log inside a Trip, Nest, or Circle is visible to every other
        member of that group. Stream entries are visible to you and the other person in that bilateral
        relationship (or a guest holding a confirmation link). This is core to how the product works, not an
        accident of data sharing.
      </p>

      <h2>5. Data retention</h2>
      <p>
        We keep your account and expense data for as long as your account is active. Receipt photo files are
        retained for 60 days on the free plan (the line-item data extracted from them is kept regardless); Clear
        Plus removes that limit. You can request deletion of your account and associated data at any time — see
        §7.
      </p>

      <h2>6. Security</h2>
      <p>
        Data is encrypted in transit. Database access is governed by row-level security policies scoped to your
        group memberships, so other users can only read data for groups they actually belong to. We never store
        raw card numbers, CVVs, or UPI PINs — that&apos;s handled entirely by Razorpay.
      </p>

      <h2>7. Your rights</h2>
      <p>
        You can ask us to access, correct, or delete your personal data at any time by writing to{" "}
        <a href="mailto:saijayakumar@gmail.com">saijayakumar@gmail.com</a>. Note that deleting your account may
        affect shared groups other members rely on — we&apos;ll work with you on the best way to handle that.
      </p>

      <h2>8. Children&apos;s privacy</h2>
      <p>
        Clear is not directed at children under 18. If you believe a minor has provided us personal data without
        appropriate consent, contact us and we&apos;ll remove it.
      </p>

      <h2>9. Changes to this policy</h2>
      <p>
        We may update this policy from time to time; the "Last updated" date above will reflect any change.
      </p>

      <h2>10. Contact</h2>
      <p>
        Questions about this policy? Visit our <a href="/contact">Contact page</a> or email{" "}
        <a href="mailto:saijayakumar@gmail.com">saijayakumar@gmail.com</a>.
      </p>
    </LegalPageShell>
  );
}
