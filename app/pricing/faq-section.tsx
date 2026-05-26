"use client";

import { useState, useMemo } from "react";
import { ChevronDown } from "lucide-react";

const FAQ_SECTIONS: { section: string; items: { q: string; a: string }[] }[] = [
  {
    section: "Free plan & trial",
    items: [
      {
        q: "What's included in the free plan?",
        a: "The free plan gives you up to 4 active groups, 8 members per group, and 50 expenses per group — all with equal-split mode. Group insights, activity feed, UPI pay links, email and push notifications, guest member support, and full settlement tracking are included at no cost. No subscription needed for the basics.",
      },
      {
        q: "Is the 30-day trial really free? Do I need a credit card?",
        a: "Completely free. Sign up with Google — no payment details required at any point during the trial. You get the full Plus experience for 30 days automatically. We won't ask for a card until billing goes live.",
      },
      {
        q: "What happens when my trial ends?",
        a: "You drop to the free plan automatically — no charge, no action needed on your part. All your data stays exactly as-is: every group, expense, member, and settlement remains intact. You'll be capped at 4 active groups going forward, but you can upgrade to Plus at any time to restore full access.",
      },
      {
        q: "Can I get more than one trial, or extend it?",
        a: "Each account gets one 30-day trial. There's no restart or extension. If you're on the fence, use the trial to run a real trip or a full month of household expenses — that's the best way to see whether Plus is worth it for you.",
      },
    ],
  },
  {
    section: "Clear Plus features",
    items: [
      {
        q: "What exactly does Clear Plus unlock?",
        a: "Plus removes all free-plan limits and adds power features: unlimited active groups (vs 4 on free), up to 50 members per group (vs 8), up to 500 expenses per group (vs 50), all split modes — exact amounts, percentages, and weighted shares, not just equal — AI expense parsing from plain-text descriptions, recurring expense templates for households, and CSV export for your own records.",
      },
      {
        q: "Are insights and settlements also gated behind Plus?",
        a: "No. Group insights, balance summaries, settlement suggestions, activity feed, and UPI pay links are available on the free plan too. Plus lifts the limits so your groups can grow beyond the free caps — but core functionality is never locked away.",
      },
      {
        q: "What is AI expense parsing?",
        a: "You describe an expense in natural language — \"Paid ₹1,200 for dinner at Thalappakatti, split between Ravi, Priya, and me\" — and Clear structures it into the correct amount, category, members, and split automatically. It's powered by Claude (Anthropic) and is available exclusively on Plus.",
      },
    ],
  },
  {
    section: "Group admin & members",
    items: [
      {
        q: "Does the group admin's Plus subscription cover all members?",
        a: "Yes. If the person who created the group has Clear Plus, every member in that group — including guests — gets Plus features automatically: all split modes, AI parsing, templates, higher expense and member limits. Members don't need their own subscription for groups they're part of.",
      },
      {
        q: "I'm a member, not the group creator — do I need Plus?",
        a: "Only if you want to create your own groups. For groups where someone else is the creator, you get Plus features as long as that creator has a Plus subscription. You'd need your own Plus subscription only to unlock features for groups you personally start.",
      },
      {
        q: "What if the group has multiple admins — whose plan applies?",
        a: "The plan check uses the original group creator's subscription. Co-admins added later don't affect group plan status. If the creator has Plus, everyone benefits. If the creator is on free, the group is on free regardless of what other admins hold.",
      },
      {
        q: "What if the group admin cancels their Plus subscription?",
        a: "The whole group reverts to free plan limits. Existing data is unaffected — all expenses, splits, and settlements remain visible. Going forward, new expenses will be limited to equal splits, and new members can't be added if the group is already at 8. The admin can re-subscribe at any time to restore Plus for everyone.",
      },
    ],
  },
  {
    section: "Founder pricing",
    items: [
      {
        q: "What is Founder Pricing, and who is it for?",
        a: "Founder Pricing is a permanently discounted rate reserved for the first 500 subscribers who activate Clear Plus. Monthly: ₹79 instead of ₹99. Annual: ₹699 instead of ₹799 — that's ₹58/month, saving ₹489 compared to paying the regular monthly rate. It's our way of rewarding the people who back Clear early.",
      },
      {
        q: "Is the Founder Price really locked in forever?",
        a: "Yes. If you subscribe during the Founder window, your rate is locked in for the life of your subscription. We will never increase it. The only scenario where this changes is if you voluntarily cancel and resubscribe later — in that case, you'd pay the rate in effect at the time of resubscription.",
      },
      {
        q: "How long is Founder Pricing available?",
        a: "Until 500 subscribers have claimed it, or until we decide to close the window — whichever comes first. The counter on this page shows live availability. Once the slots are gone, new subscribers pay the regular rate of ₹99/month or ₹799/year.",
      },
    ],
  },
  {
    section: "Billing & payment",
    items: [
      {
        q: "Monthly vs annual — which should I choose?",
        a: "Monthly gives you flexibility: cancel anytime, no upfront commitment. Annual is billed once for the full year and saves you significantly more — Founder annual at ₹699/year works out to ₹58/month (saving ₹489 vs regular monthly). Regular annual at ₹799/year is ₹66/month (saving ₹389). The features are identical on both cycles. If you plan to use Clear for more than a few months, annual is the better deal.",
      },
      {
        q: "When does billing actually start?",
        a: "Billing is not live yet — Clear is in beta. When you activate Plus today, you get full access for free. Before the first charge ever happens, we'll email you well in advance with the exact date, the amount, and a clear link to cancel or change your plan. There will be no surprise charges.",
      },
      {
        q: "Can I switch between monthly and annual billing?",
        a: "Yes. Go to Settings → Billing to change your billing cycle. Switching to annual takes effect at your next renewal date, and you'll only pay the annual rate from that point forward. Switching back to monthly also takes effect at renewal — you won't lose prepaid time.",
      },
      {
        q: "What payment methods will you accept?",
        a: "When billing goes live, we'll support UPI, debit cards, credit cards, and net banking through Razorpay — all major Indian payment methods. At checkout you'll see the full list of options before entering any details.",
      },
    ],
  },
  {
    section: "Cancellation & your data",
    items: [
      {
        q: "Can I cancel or downgrade anytime?",
        a: "Yes, anytime. Go to Settings → Billing → Downgrade to Free. It takes effect immediately — no waiting for a renewal date, no forms, no dark patterns. If you've already paid for a period, you keep Plus access until that period ends, then drop to free. You won't be charged again.",
      },
      {
        q: "What happens to my data when I cancel?",
        a: "Nothing is ever deleted. Every group, expense, member, settlement, and comment stays in your account forever. You just lose the ability to add new groups beyond 4, or use Plus-only features like non-equal splits on new expenses. Your history is always yours.",
      },
      {
        q: "What happens to groups that are over free-plan limits after I downgrade?",
        a: "You keep access to all of them — nothing is hidden or locked. If you had 8 groups on Plus and drop to free, you can still view and use all 8; you just can't create new groups until you're under 4 active ones. Expenses above 50 in a group stay visible and fully searchable; you can't add new ones until that group is under 50. No data is touched.",
      },
      {
        q: "Is there a refund policy?",
        a: "Since billing isn't live yet, there's nothing to refund today. When billing launches, we'll publish a clear refund policy before the first charge goes out. Our intent is to be fair: if something goes wrong on our end, we'll make it right.",
      },
      {
        q: "I still have questions — how do I reach you?",
        a: "Email us at support@useclear.in. We read and respond to every message.",
      },
    ],
  },
];

export function FaqSection() {
  const allQuestions = useMemo(
    () => FAQ_SECTIONS.flatMap((s) => s.items.map((i) => i.q)),
    [],
  );

  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  const allExpanded = openItems.size === allQuestions.length;

  const toggleItem = (q: string) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(q)) next.delete(q);
      else next.add(q);
      return next;
    });
  };

  const toggleAll = () => {
    setOpenItems(allExpanded ? new Set() : new Set(allQuestions));
  };

  return (
    <section className="max-w-5xl mx-auto px-6 pb-20">
      {/* Header */}
      <div className="text-center mb-10">
        <h2
          className="text-3xl text-slate-800 dark:text-slate-100 mb-2"
          style={{ fontFamily: "var(--font-fraunces)" }}
        >
          Common questions
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
          Everything you need to know before signing up.
        </p>
        {/* Expand / Collapse all */}
        <button
          type="button"
          onClick={toggleAll}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-violet-300 dark:hover:border-violet-700 bg-white/50 dark:bg-slate-800/40"
        >
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-200 ${allExpanded ? "rotate-180" : ""}`}
          />
          {allExpanded ? "Collapse all" : "Expand all"}
        </button>
      </div>

      {/* Two-column grid at lg+, single column below */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-10">
        {FAQ_SECTIONS.map(({ section, items }) => (
          <div key={section}>
            {/* Section label */}
            <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 px-1">
              {section}
            </p>
            <div className="space-y-2">
              {items.map(({ q, a }) => {
                const isOpen = openItems.has(q);
                return (
                  <div key={q} className="glass rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleItem(q)}
                      aria-expanded={isOpen}
                      className="flex items-center justify-between gap-4 px-5 py-4 w-full text-left cursor-pointer"
                    >
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        {q}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                    {/* Animated expand using CSS grid trick */}
                    <div
                      className={`grid transition-all duration-200 ease-in-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
                    >
                      <div className="overflow-hidden">
                        <p className="px-5 pb-4 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                          {a}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
