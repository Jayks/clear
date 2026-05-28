export type ChangelogFeature = {
  icon: string;
  title: string;
  description: string;
};

export type TagVariant = "cyan" | "violet" | "emerald" | "amber" | "slate";

export type ChangelogRelease = {
  id: string;
  version: string;
  name: string;
  date: string;
  tag: string;
  tagVariant: TagVariant;
  headline: string;
  description: string;
  features: ChangelogFeature[];
};

export const changelog: ChangelogRelease[] = [
  {
    id: "v1-5-trip-timeline",
    version: "v1.5",
    name: "Trip Timeline",
    date: "May 28, 2026",
    tag: "Features",
    tagVariant: "cyan",
    headline: "See your trip day by day — every expense in its moment.",
    description:
      "A new day-by-day timeline lays out every expense in chronological order: category colour bars, payer chips, and a 🔥 busiest-day highlight. Plus: import your crew from a past trip, a one-tap repeat prompt when a trip ends, and confetti when the last debt is cleared.",
    features: [
      {
        icon: "📅",
        title: "Trip timeline",
        description:
          "Expenses grouped by day with a stacked category bar, payer chips sized by share, and automatic 🔥 busiest-day / 'light day' labels. Visible on the public share page and the group overview.",
      },
      {
        icon: "👥",
        title: "Import members",
        description:
          "Taking the same crew on a new trip? Open Members → Import from group, pick the source, choose who to bring — done in seconds.",
      },
      {
        icon: "🔁",
        title: "Repeat trip prompt",
        description:
          "When a trip ends or is archived, admins see a dismissable prompt to spin up a new trip with the same members pre-loaded.",
      },
      {
        icon: "🎉",
        title: "Settled confetti",
        description:
          "The settle page fires a 30-piece confetti burst the first time a group reaches zero debt. One celebration per session — no repeat fireworks on every refresh.",
      },
      {
        icon: "🌐",
        title: "Rich summary page",
        description:
          "The public /summary share page now renders the full trip timeline — category bars, payer chips, and day totals — so non-members can see exactly how the trip played out.",
      },
    ],
  },
  {
    id: "v1-4-ux-polish",
    version: "v1.4",
    name: "UX Polish",
    date: "May 27–28, 2026",
    tag: "Polish",
    tagVariant: "slate",
    headline: "Smarter defaults, live feedback, and a safety net on every tap.",
    description:
      "A focused quality-of-life pass: see your split update as you type the amount, undo a settlement within 5 seconds, feel haptic feedback on every save, and switch the expense list between compact and full card views.",
    features: [
      {
        icon: "💡",
        title: "Live split preview",
        description:
          "A pill below the amount field updates in real time as you type — 'Your share: ₹1,500' — so you know the split before you hit save.",
      },
      {
        icon: "↩️",
        title: "Undo settlement",
        description:
          "Mark a payment as paid and a 5-second toast lets you undo it immediately — no need to hunt for a delete button.",
      },
      {
        icon: "📳",
        title: "Haptic feedback",
        description:
          "Short vibration pulses on expense save, settlement paid, and expense delete give mobile interactions a satisfying physical response.",
      },
      {
        icon: "⊞",
        title: "Compact / full toggle",
        description:
          "A toggle on the expenses page switches between a dense compact list and full card view — useful on long expense lists.",
      },
      {
        icon: "🏷️",
        title: "Payer pills & smarter defaults",
        description:
          "Expense cards now show a payer pill at a glance. The paid-by field defaults to yourself so the most common case needs zero taps.",
      },
    ],
  },
  {
    id: "v1-3-social-extensions",
    version: "v1.3",
    name: "Social Extensions",
    date: "May 25, 2026",
    tag: "New",
    tagVariant: "cyan",
    headline: "Know who's seen it, know when something's new.",
    description:
      "Three quality-of-life upgrades to the social layer: a live unread indicator on every expense card, a seen-by avatar stack in the detail sheet, and push notifications that reach the right people when a new comment lands.",
    features: [
      {
        icon: "💬",
        title: "Unread indicator",
        description:
          "The comment pill on an expense card turns cyan when there are new comments you haven't seen. Opens the sheet → instantly clears.",
      },
      {
        icon: "👁",
        title: "Seen avatar stack",
        description:
          "The detail sheet now shows overlapping initials circles — up to 5 visible plus a +N overflow — instead of a plain 'Seen by N members' label.",
      },
      {
        icon: "🔔",
        title: "Push for every comment",
        description:
          "Two tiers: @mentioned members get an '@mention' push; the expense payer and anyone who commented before get a 'New comment' push. No one gets spammed with their own posts.",
      },
    ],
  },
  {
    id: "v1-2-activity-profiles",
    version: "v1.2",
    name: "Activity & Profiles",
    date: "May 24–25, 2026",
    tag: "Features",
    tagVariant: "violet",
    headline: "See the group's pulse and each member at a glance.",
    description:
      "An activity feed on every group overview shows exactly what's been happening — expenses logged, settlements recorded, members joining. Tap any member to pull up their profile sheet with live balances.",
    features: [
      {
        icon: "📋",
        title: "Activity feed",
        description:
          "The last 5 events per group — expenses, settlements, and joins — with actor avatars, relative timestamps, and direct links to disputes.",
      },
      {
        icon: "👤",
        title: "Member profile sheets",
        description:
          "Tap any member on the Members or Settle pages. See their net balance (emerald/red banner), total paid, total share, and last 3 expenses.",
      },
      {
        icon: "🕐",
        title: "Category recents",
        description:
          "The expense form now shows your recently used categories as quick-tap pills — no more scrolling past the same categories every time.",
      },
      {
        icon: "👆",
        title: "Swipe hint",
        description:
          "First-time touch users see a one-time swipe hint on the expenses list so they discover the left-swipe actions immediately.",
      },
      {
        icon: "📍",
        title: "Contextual group nav",
        description:
          "Inside a group on mobile, the top nav becomes a slim contextual header showing the group name and a ⋯ menu — saving space for content.",
      },
    ],
  },
  {
    id: "v1-1-social-layer",
    version: "v1.1",
    name: "Social Layer",
    date: "May 24–25, 2026",
    tag: "Features",
    tagVariant: "violet",
    headline: "Resolve expense disagreements without leaving the app.",
    description:
      "Every expense now has a full discussion thread. React, question, or formally dispute — the payer accepts, and the split updates automatically. No more sorting it out on WhatsApp.",
    features: [
      {
        icon: "💬",
        title: "Inline comments",
        description:
          "WhatsApp-style chat bubbles on every expense. @mention members with autocomplete. Optimistic posting so your message appears instantly.",
      },
      {
        icon: "👍",
        title: "Reactions",
        description:
          "Thumbs up to approve, ❓ to ask a question, ⚠️ to formally dispute — one tap, right on the expense card.",
      },
      {
        icon: "⚠️",
        title: "Dispute resolution",
        description:
          "Four dispute types: remove me, change my share, split equally, or just ask. Actionable types auto-update the split the moment the payer accepts.",
      },
      {
        icon: "🧵",
        title: "Thread deep-link",
        description:
          "Every expense has a shareable /thread URL — used in push notifications so tapping the alert drops you directly into the conversation.",
      },
      {
        icon: "✓",
        title: "Auto read receipts",
        description:
          "Opening the expense detail sheet automatically marks it as seen. A 'Seen by N' count in the audit trail closes the loop.",
      },
    ],
  },
  {
    id: "v1-0-plus",
    version: "v1.0",
    name: "Clear Plus",
    date: "May 24, 2026",
    tag: "Features",
    tagVariant: "amber",
    headline: "Unlimited everything — 30-day free trial, no credit card.",
    description:
      "Clear Plus unlocks unlimited groups, members, and expenses, plus AI parsing, CSV export, all split modes, and recurring templates. The free plan stays free forever with generous limits.",
    features: [
      {
        icon: "✦",
        title: "Plus subscription",
        description:
          "₹79/mo or ₹699/yr (₹58/mo). 30-day free trial auto-starts on first sign-in — no credit card required to try every feature.",
      },
      {
        icon: "🔓",
        title: "Free plan limits",
        description:
          "Free: 4 groups, 8 members per group, 50 expenses per group. Plus removes all limits.",
      },
      {
        icon: "💳",
        title: "Billing & settings",
        description:
          "A new Settings page with Appearance, Billing, and Notifications tabs. Manage your plan, cycle, and renewal date in one place.",
      },
      {
        icon: "🏷️",
        title: "Pricing page",
        description:
          "Public /pricing page with a free vs Plus comparison, feature table, FAQ, and a monthly/annual toggle.",
      },
      {
        icon: "⏳",
        title: "Trial countdown",
        description:
          "A banner on group pages shows days remaining in your trial. Soft nudge toasts appear when you approach free plan limits.",
      },
    ],
  },
  {
    id: "v0-11-insights",
    version: "v0.11",
    name: "Insights & Analytics",
    date: "May 23–24, 2026",
    tag: "Features",
    tagVariant: "emerald",
    headline: "See exactly where the money went — per trip and across all groups.",
    description:
      "Every group now has a live analytics dashboard. Trips get a daily spend timeline and AI-written narrative. Nests get monthly stacked bars. Both roll up into an all-groups insights tab.",
    features: [
      {
        icon: "🍩",
        title: "Category breakdown",
        description:
          "Donut chart showing spending by category — accommodation, food, transport, and more — with exact amounts and percentages.",
      },
      {
        icon: "📈",
        title: "Daily spend chart",
        description:
          "Bar chart of spending day-by-day across the trip. Spot the big days at a glance.",
      },
      {
        icon: "👥",
        title: "Member contributions",
        description:
          "Stacked bar showing how much each member paid and was owed — useful for seeing who fronted the most.",
      },
      {
        icon: "✨",
        title: "AI trip narrative",
        description:
          "Clear writes a short story of your trip from the expense history — the Haiku model summarises where you went and what you spent.",
      },
      {
        icon: "📊",
        title: "All-groups rollup",
        description:
          "A separate Insights tab shows spending aggregated across all your trips and nests, with per-category and per-trip breakdowns.",
      },
      {
        icon: "📏",
        title: "GA4 analytics",
        description:
          "Lightweight page-view tracking via Google Analytics 4. Fully opt-out — omit the env var to disable.",
      },
    ],
  },
  {
    id: "v0-10-notifications",
    version: "v0.10",
    name: "Email & Push Notifications",
    date: "May 22–23, 2026",
    tag: "Features",
    tagVariant: "emerald",
    headline: "Know the moment any money moves — email and push, instantly.",
    description:
      "Every expense logged notifies group members by email (via Resend) and as a push alert on their phone. Mute any group you want peace from.",
    features: [
      {
        icon: "📧",
        title: "Email alerts",
        description:
          "A nicely formatted email lands in every member's inbox when an expense is logged — with the amount, payer, and a direct link back to the group.",
      },
      {
        icon: "🔔",
        title: "Web push notifications",
        description:
          "Instant push alerts on Android and on iOS when the app is installed as a PWA — even when the browser is closed.",
      },
      {
        icon: "🔕",
        title: "Per-group mute",
        description:
          "Silence email and push for any individual group from the group menu. Unmute any time.",
      },
      {
        icon: "🚫",
        title: "Email unsubscribe",
        description:
          "Every notification email includes a one-click unsubscribe link — HMAC-signed so it can't be forged.",
      },
    ],
  },
  {
    id: "v0-9-audit-search",
    version: "v0.9",
    name: "Audit Trail & Search",
    date: "May 21–22, 2026",
    tag: "Features",
    tagVariant: "emerald",
    headline: "Full history of every expense — who added it, who changed it.",
    description:
      "Every expense now tracks who created it and who last edited it, with timestamps. A search bar on the expenses page lets you find any expense instantly.",
    features: [
      {
        icon: "🕵️",
        title: "Audit trail",
        description:
          "The expense detail sheet shows 'Added by X · 3h ago' and 'Edited by Y · 1h ago' — nothing happens silently.",
      },
      {
        icon: "🔍",
        title: "Expense search",
        description:
          "Full-text search across expense descriptions within a group. Results appear instantly as you type.",
      },
      {
        icon: "📋",
        title: "Expense detail sheet",
        description:
          "Tap any expense card to open a bottom sheet with the full split breakdown, notes, payer, and edit/duplicate/delete actions.",
      },
      {
        icon: "📦",
        title: "Progress nudges",
        description:
          "Contextual hints on empty states guide new users from their first group to their first expense and first settlement.",
      },
    ],
  },
  {
    id: "v0-8-guests-invites",
    version: "v0.8",
    name: "Guest Members & Invites",
    date: "May 21, 2026",
    tag: "Features",
    tagVariant: "emerald",
    headline: "Join a group without creating an account. Claim your spot later.",
    description:
      "Add people to a group by name even if they don't have a Clear account yet. Share an invite link or QR code — they join instantly and can claim their expenses later with Google sign-in.",
    features: [
      {
        icon: "🔗",
        title: "Invite link",
        description:
          "Every group has a shareable join link. Paste it in your group chat — members click, sign in with Google, and they're in.",
      },
      {
        icon: "📷",
        title: "QR code invite",
        description:
          "On iOS, tapping the share button opens a QR sheet for in-person invites where copy-paste is awkward.",
      },
      {
        icon: "👤",
        title: "Guest members",
        description:
          "Add someone by name before they join. Their expenses are tracked immediately — they claim the balance with Google later.",
      },
      {
        icon: "↩️",
        title: "Existing member redirect",
        description:
          "If you're already in the group and tap an invite link, you're redirected straight into the group — no duplicate join.",
      },
    ],
  },
  {
    id: "v0-7-ai-parsing",
    version: "v0.7",
    name: "AI Expense Parsing",
    date: "May 17–21, 2026",
    tag: "Features",
    tagVariant: "cyan",
    headline: "Type it the way you'd say it. AI fills in the rest.",
    description:
      "Describe an expense in plain English — or paste your whole group chat — and Clear extracts the amount, payer, and split automatically. Powered by Claude Haiku.",
    features: [
      {
        icon: "✨",
        title: "Natural language entry",
        description:
          '"Priya paid 4500 for dinner split with Raj and Kiran" — Clear extracts description, amount, payer, and split in under a second.',
      },
      {
        icon: "💬",
        title: "Chat import",
        description:
          "Paste a WhatsApp or iMessage thread. AI finds every expense mentioned and imports them all at once.",
      },
      {
        icon: "🎤",
        title: "Voice input",
        description:
          "Tap the mic in the quick-add sheet and speak the expense. Web Speech API transcribes it, AI parses it.",
      },
      {
        icon: "🛡️",
        title: "Rate limiting",
        description:
          "20 AI calls per hour per user across all AI features — prevents runaway usage on the free Anthropic tier.",
      },
    ],
  },
  {
    id: "v0-6-performance",
    version: "v0.6",
    name: "Performance",
    date: "May 14–17, 2026",
    tag: "Infra",
    tagVariant: "slate",
    headline: "Faster page loads, smarter queries, no more connection exhaustion.",
    description:
      "A focused performance pass across the data layer: proper indexes, query caching, Prev/Next pagination on expense lists, and streaming on the settle page so the balance numbers appear the moment they're ready.",
    features: [
      {
        icon: "⚡",
        title: "DB indexes",
        description:
          "Added covering indexes for every hot query path — expenses by group+date, splits by expense, settlements by group, reactions by expense.",
      },
      {
        icon: "⏱️",
        title: "Query caching",
        description:
          "Group data, balances, and interaction counts are wrapped in React cache and unstable_cache — deduplicated across the RSC tree.",
      },
      {
        icon: "📄",
        title: "Prev/Next pagination",
        description:
          "Expense lists are paginated 10 at a time with Prev/Next controls instead of a Load More button — consistent and predictable.",
      },
      {
        icon: "🌊",
        title: "Streaming settle page",
        description:
          "The settle page streams balance cards and settlement suggestions via Suspense — shell renders instantly, numbers stream in.",
      },
      {
        icon: "🔌",
        title: "Connection pool",
        description:
          "DB connection pool tightened to max 3 with idle timeout — prevents connection exhaustion under Vercel's serverless concurrency.",
      },
    ],
  },
  {
    id: "v0-5-cover-photos",
    version: "v0.5",
    name: "Cover Photos",
    date: "May 12–14, 2026",
    tag: "Features",
    tagVariant: "cyan",
    headline: "Give every group a face — search Unsplash or upload your own.",
    description:
      "Group cards now show a cover photo. Search millions of Unsplash images or upload directly from your device. Photos are stored in Supabase Storage — never through Vercel.",
    features: [
      {
        icon: "🔍",
        title: "Unsplash search",
        description:
          "Search Unsplash inline while creating or editing a group. Pick a photo and it's set instantly — no leaving the form.",
      },
      {
        icon: "📤",
        title: "Device upload",
        description:
          "Upload any photo from your phone or computer. Files go directly to Supabase Storage via presigned URL — bypasses Vercel's 4.5 MB body limit.",
      },
      {
        icon: "🖼️",
        title: "Group cards",
        description:
          "Every group card on the dashboard shows the cover photo as a full-bleed background with a gradient overlay for readability.",
      },
    ],
  },
  {
    id: "v0-4-mobile-ux",
    version: "v0.4",
    name: "Mobile UX",
    date: "May 11–12, 2026",
    tag: "Polish",
    tagVariant: "slate",
    headline: "Native-feel interactions on every iOS and Android device.",
    description:
      "A focused pass on mobile interaction quality: proper tap targets, safe-area spacing, iOS long-press, scroll lock on overlays, and a satisfying post-save flow.",
    features: [
      {
        icon: "👆",
        title: "44px tap targets",
        description:
          "All action buttons (edit, delete, duplicate, back links) meet Apple's 44×44pt minimum — no more mis-taps on small screens.",
      },
      {
        icon: "📱",
        title: "Safe-area spacing",
        description:
          "Bottom nav, FAB, and sticky headers all account for iPhone notch and home indicator safe areas.",
      },
      {
        icon: "⏱️",
        title: "Long-press on group cards",
        description:
          "Hold a group card for 500ms to open the nav sheet directly — a faster path to Members, Expenses, or Settle on mobile.",
      },
      {
        icon: "🔒",
        title: "Scroll lock on sheets",
        description:
          "Bottom sheets (quick-add, QR invite) use non-passive touchmove listeners to prevent the background from scrolling on iOS Safari.",
      },
      {
        icon: "✓",
        title: "Post-save 'Add another'",
        description:
          "After saving an expense the button shows a green ✓, then fades into an 'Add another →' link that auto-closes after 2 seconds.",
      },
    ],
  },
  {
    id: "v0-3-quick-add",
    version: "v0.3",
    name: "Quick Add",
    date: "May 10–11, 2026",
    tag: "Features",
    tagVariant: "cyan",
    headline: "Log an expense in seconds — without leaving the groups screen.",
    description:
      "A floating action button on every group card opens a bottom sheet with the full expense form. No navigation required — add, save, done.",
    features: [
      {
        icon: "➕",
        title: "Floating action button",
        description:
          "A + button sits on every group card (and as a sticky FAB on the expenses page) — tap it to open the quick-add sheet.",
      },
      {
        icon: "📋",
        title: "Bottom sheet form",
        description:
          "The full expense form in a slide-up sheet: description, amount, currency, payer, split mode, category, date, and notes.",
      },
      {
        icon: "🎤",
        title: "Mic button",
        description:
          "A prominent mic button in the description field triggers voice input — speak the expense, AI fills the rest.",
      },
      {
        icon: "🚪",
        title: "React portal",
        description:
          "The sheet is rendered in a React portal so it appears above everything — including sticky navs and other cards — without z-index fights.",
      },
    ],
  },
  {
    id: "v0-2-pwa",
    version: "v0.2",
    name: "PWA & Install",
    date: "May 10, 2026",
    tag: "Features",
    tagVariant: "cyan",
    headline: "Install Clear on your home screen — iOS and Android.",
    description:
      "Clear is a full Progressive Web App. Add it to your home screen on any device for a native app feel — it works offline, sends push notifications, and removes all browser chrome.",
    features: [
      {
        icon: "📲",
        title: "Home screen install",
        description:
          "Android shows the native 'Add to Home Screen' prompt automatically. iOS users get a step-by-step install hint banner in Safari.",
      },
      {
        icon: "⚙️",
        title: "Web app manifest",
        description:
          "Full manifest with name, icons (192px and 512px any + maskable), theme colour, display standalone, and the required id + scope fields for Chrome Android.",
      },
      {
        icon: "📴",
        title: "Offline shell",
        description:
          "A service worker caches the app shell so the UI loads instantly even on a slow connection.",
      },
      {
        icon: "🍎",
        title: "iOS install hint",
        description:
          "A dismissable banner on iOS Safari walks users through the Share → Add to Home Screen flow — shown once, remembered in localStorage.",
      },
    ],
  },
  {
    id: "v0-1-launch",
    version: "v0.1",
    name: "Clear is Live",
    date: "May 9–10, 2026",
    tag: "Launch",
    tagVariant: "slate",
    headline: "Group expense tracking for trips and shared living — from scratch.",
    description:
      "Clear launched with a complete expense splitting engine: two group types, four split modes, a settlement optimizer that guarantees the fewest possible payments, and recurring expense templates for nests.",
    features: [
      {
        icon: "🗺️",
        title: "Trips",
        description:
          "Track expenses for multi-day travel with dates, cover photo, itinerary, AI narrative, budget tracking, and travel categories.",
      },
      {
        icon: "🏠",
        title: "Nests",
        description:
          "Shared housing tabs with recurring templates, monthly grouping, and household categories — no dates, no itinerary.",
      },
      {
        icon: "⚡",
        title: "Settlement optimizer",
        description:
          "A greedy algorithm collapses any tangle of IOUs into the minimum number of transfers — one payment per person, guaranteed.",
      },
      {
        icon: "✂️",
        title: "Four split modes",
        description:
          "Equal, exact amount, percentage, or shares — all supported with real-time validation and a clear breakdown.",
      },
      {
        icon: "🔁",
        title: "Recurring templates",
        description:
          "Set up monthly expense templates for rent, utilities, and subscriptions. Log them with one tap each month.",
      },
      {
        icon: "🔐",
        title: "Google sign-in",
        description:
          "One-tap authentication via Supabase Auth + Google OAuth. No passwords to remember.",
      },
    ],
  },
];
