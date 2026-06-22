import type { Metadata } from "next";
import { Mail, MapPin, Clock } from "lucide-react";
import { LegalPageShell } from "@/components/marketing/legal-page-shell";

export const metadata: Metadata = { title: "Contact — ClearOff" };

const CONTACT_EMAIL = "support@clearoff.in";

export default function ContactPage() {
  return (
    <LegalPageShell title="Contact us" updated="19 June 2026">
      <p>
        ClearOff is based in Chennai, Tamil Nadu, India. For support, billing questions, refund requests,
        or anything else, reach out here:
      </p>

      <div className="grid gap-4 sm:grid-cols-3 my-8">
        <div className="glass rounded-2xl p-5 flex flex-col items-start gap-2">
          <div className="w-9 h-9 rounded-lg bg-cyan-50 dark:bg-cyan-900/30 flex items-center justify-center">
            <Mail className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          </div>
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Email</p>
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-sm text-cyan-600 dark:text-cyan-400 hover:underline break-all">
            {CONTACT_EMAIL}
          </a>
        </div>
        <div className="glass rounded-2xl p-5 flex flex-col items-start gap-2">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
            <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Based in</p>
          <p className="text-sm text-slate-600 dark:text-slate-300">Chennai, Tamil Nadu, India</p>
        </div>
        <div className="glass rounded-2xl p-5 flex flex-col items-start gap-2">
          <div className="w-9 h-9 rounded-lg bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center">
            <Clock className="w-4 h-4 text-violet-600 dark:text-violet-400" />
          </div>
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Response time</p>
          <p className="text-sm text-slate-600 dark:text-slate-300">Usually within 2 business days</p>
        </div>
      </div>

      <h2>What to include</h2>
      <ul>
        <li><strong>Billing or refund questions</strong> — include your account email and the payment/order ID from Settings → Billing. See our <a href="/refund">Refund Policy</a>.</li>
        <li><strong>Bug reports</strong> — what you were doing, what you expected, and what happened instead. A screenshot helps.</li>
        <li><strong>Account or data requests</strong> — see our <a href="/privacy">Privacy Policy</a> for what you&apos;re entitled to ask for.</li>
      </ul>
    </LegalPageShell>
  );
}
