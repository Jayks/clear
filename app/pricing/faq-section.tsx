"use client";

import { useState, useMemo } from "react";
import { ChevronDown } from "lucide-react";

const FAQ_SECTIONS: { section: string; items: { q: string; a: string }[] }[] = [
  {
    section: "Free plan & trial",
    items: [
      {
        q: "What's included in the free plan?",
        a: "The free plan gives you up to 5 active groups, each with unlimited members and unlimited expenses — and every split mode (equal, exact, percentage, and weighted shares) is free. Group insights, activity feed, UPI pay links, email and push notifications, guest members, full settlement tracking, and AI expense logging (receipt scan, natural-language add, and chat import, within a generous monthly allowance) are all included at no cost. No subscription needed for the everyday job of splitting expenses.",
      },
      {
        q: "Is the 30-day trial really free? Do I need a credit card?",
        a: "Completely free. Sign up with Google — no payment details required at any point during the trial. You get the full Plus experience for 30 days automatically. We won't ask for a card until billing goes live.",
      },
      {
        q: "What happens when my trial ends?",
        a: "You drop to the free plan automatically — no charge, no action needed on your part. Nothing is ever deleted: every group, expense, member, and settlement stays intact. If you have more than 5 active groups, the 5 you've used most recently stay fully editable — the rest switch to read-only (you can still see everything, just can't add new expenses or members) until you buy a pass or archive down to 5.",
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
        a: "Plus is about power features and scale, not unlocking the basics. It gives you unlimited active groups (the free plan caps you at 5), recurring expense templates for households, budget tracking, CSV export of any group, personal cross-group \"You\" insights, and AI trip narratives with Plan-vs-Reality analysis. Members, expenses, all split modes, and AI expense logging are free for everyone — Plus never paywalls the core bill-splitting job.",
      },
      {
        q: "Are insights and settlements also gated behind Plus?",
        a: "No. Group insights, balance summaries, settlement suggestions, activity feed, and UPI pay links are all free. Plus adds personal cross-group \"You\" insights and AI trip narratives on top — but the core analytics for any single group are never locked away.",
      },
      {
        q: "What is AI expense parsing?",
        a: "You describe an expense in natural language — \"Paid ₹1,200 for dinner at Thalappakatti, split between Ravi, Priya, and me\" — and Clear structures it into the correct amount, category, members, and split automatically. You can also scan a receipt photo or import a chat. It's powered by Claude (Anthropic) and is free for everyone within a generous monthly allowance. The Plus-only AI is the analytical kind — trip narratives and Plan-vs-Reality.",
      },
    ],
  },
  {
    section: "Group admin & members",
    items: [
      {
        q: "Does the group admin's Plus subscription cover all members?",
        a: "Yes. If the person who created the group has Clear Plus, every member in that group — including guests — gets the group's Plus features automatically: recurring templates, budget tracking, AI trip narratives, and CSV export. Members never need their own subscription for groups they're part of. The everyday basics — all split modes, members, expenses, and AI logging — are free for everyone regardless.",
      },
      {
        q: "I'm a member, not the group creator — do I need Plus?",
        a: "Only if you want more than 5 active groups of your own, or the Plus extras (templates, budget tracking, CSV export, personal insights, AI narratives) on groups you create. For groups where someone else is the creator, you get that group's Plus features as long as that creator is on Plus — no subscription of your own needed.",
      },
      {
        q: "What if the group has multiple admins — whose plan applies?",
        a: "The plan check uses the original group creator's subscription. Co-admins added later don't affect group plan status. If the creator has Plus, everyone benefits. If the creator is on free, the group is on free regardless of what other admins hold.",
      },
      {
        q: "What if the group admin's pass expires?",
        a: "The group reverts to free-plan limits. Existing data is untouched — all expenses, splits, and settlements stay visible and usable. Plus-only extras like recurring templates and budget tracking pause, and if the admin has more than 5 active groups, the rest switch to read-only. Splitting, members, and expenses keep working normally. The admin can buy another pass any time to restore Plus for everyone.",
      },
    ],
  },
  {
    section: "Early Bird pricing",
    items: [
      {
        q: "What is Early Bird Pricing, and who is it for?",
        a: "Early Bird Pricing is a permanently discounted rate reserved for the first 300 people who buy a Clear Plus pass. 30-day pass: ₹49 instead of ₹79. Annual pass: ₹499 instead of ₹699 (just ₹41/month equivalent) — and it's locked in forever, so every pass you buy afterward keeps the same discount. It's our way of rewarding the people who back Clear early.",
      },
      {
        q: "Is the Early Bird price really locked in forever?",
        a: "Yes. Once you've bought a pass during the Early Bird window, every future pass you buy — 30-day or annual, this year or five years from now — is priced at your locked-in Early Bird rate. It never increases for you.",
      },
      {
        q: "How long is Early Bird Pricing available?",
        a: "Until 300 people have bought a pass at Early Bird pricing, or until we decide to close the window — whichever comes first. The counter on this page shows live availability. Once the slots are gone, new buyers pay the regular rate of ₹79 (30-day) or ₹699 (annual).",
      },
    ],
  },
  {
    section: "Billing & payment",
    items: [
      {
        q: "30-day pass vs annual pass — which should I choose?",
        a: "Clear Plus is sold as one-time passes, not a recurring subscription. The 30-day pass suits a single trip or a month of heavy use; the annual pass covers a full year and works out cheaper per month — Early Bird annual at ₹499 is ₹41/month equivalent (saving ₹89 vs buying the 30-day pass twelve times over). Regular annual at ₹699 is ₹58/month equivalent (saving ₹249). Features are identical either way. If you'll use Clear for more than a few months a year, the annual pass is the better deal.",
      },
      {
        q: "When does billing actually start?",
        a: "Billing is live. There's no recurring charge to schedule — you pay once via Razorpay (UPI, cards, or net banking) for a 30-day or annual pass, and your Plus access runs for that long. We never store your card and never auto-renew; when the pass's time is up, you simply drop back to Free until you buy another.",
      },
      {
        q: "Can I switch from a 30-day pass to an annual pass?",
        a: "There's no billing cycle to switch — each pass is a separate one-time purchase. If you buy an annual pass while a 30-day pass still has time left, the remaining days stack on top rather than being lost, so you never lose prepaid time.",
      },
      {
        q: "What payment methods do you accept?",
        a: "UPI, debit cards, credit cards, and net banking — all through Razorpay, all major Indian payment methods. You'll see the full list of options at checkout before entering any details.",
      },
    ],
  },
  {
    section: "Pass expiry & your data",
    items: [
      {
        q: "Can I cancel or downgrade anytime?",
        a: "There's nothing to cancel — passes are one-time purchases with no auto-renewal. You keep Plus until your pass's time runs out, then you automatically drop to Free. No forms, no dark patterns, and you're never charged again without buying another pass yourself.",
      },
      {
        q: "What happens to my data when my pass expires?",
        a: "Nothing is ever deleted. Every group, expense, member, settlement, and comment stays in your account forever. If you have more than 5 active groups, the extras switch to read-only until you buy another pass or archive down to 5. Plus-only extras (templates, budget tracking, CSV export, personal insights, AI narratives) pause until then. Your history is always yours.",
      },
      {
        q: "What happens to groups that are over free-plan limits after I downgrade?",
        a: "Nothing is deleted or hidden. If you created 8 groups on Plus and drop to free, your 5 most-recently-active groups stay fully editable; the other 3 switch to read-only — you can still view every expense, settlement, and member, just can't log new expenses or add members in them until you reactivate Plus or archive/delete down to 5. There are no member or expense caps — only the active-group count matters.",
      },
      {
        q: "Is there a refund policy?",
        a: "Email support@useclear.in if something's wrong — a failed activation, a duplicate charge, anything. We review refund requests case by case and process approved ones through Razorpay; your Plus access is cleared as soon as the refund goes through.",
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
