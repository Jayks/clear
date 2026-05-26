# Clear

**Split it. Clear it.**

Clear is a group expense tracking app for trips and households. Log what each person paid, choose how to split it, and let Clear compute who owes whom — with the minimum number of payments.

---

## Two kinds of groups

**Trips** — multi-day travel with your crew. Hotels, meals, transport, activities. Trip insights, budget tracking, and an AI-generated trip story.

**Nests** — ongoing household expenses. Recurring templates for rent, electricity, WiFi — log each month with one tap. Monthly grouping, settlement context, and household insights.

---

## Features

- **Quick-add expenses** — type a natural description from any group card; AI parses the amount, payer, and split automatically
- **Quick-nav from card** — tap `⋯` (always visible) or long-press any group card to jump directly to Members, Expenses, Settle Up, or Insights
- **Mobile group nav** — inside a group, the full top nav is replaced by a slim contextual header (← back, group name, `⋯`) so screen space goes to content
- **Expense detail** — tap any expense card to open a WhatsApp-style bottom sheet: amount, split breakdown, notes, compact reaction pills, pending dispute card, and an inline comment thread with a persistent footer input — no separate page needed for the common case
- **Expense search** — instant search across description and category; filters and pagination compose naturally
- **Expense audit trail** — every card and edit page shows who logged the expense and who last edited it, with relative timestamps
- **Category recents** — the last 3 used categories appear as quick-tap pills above the full category selector in the expense form (separate per group type)
- **Four split modes** — equal, exact amount, percentage, or shares
- **16 expense categories** — including Tour Package for trips; "Other" prompts a free-text description
- **Minimum-transaction settlement** — greedy optimizer computes the fewest payments to clear all debts
- **UPI pay** — direct payment links on the settle-up page
- **Balance at a glance** — every group card shows your net position (owe / owed / settled / no expenses yet), streaming in without blocking the page
- **Enriched group overview cards** — the Settle Up card shows your live balance ("You owe ₹500" / "Owed ₹300" / "All settled ✓"); Expenses shows total spend for trips or this month's spend for nests; Insights shows the top spending category — all stream in via Suspense without blocking navigation
- **Activity feed** — the group home page shows the last 5 recent events (expenses added, settlements recorded, member joins, disputes raised) with actor avatars, event-type icon badges, "You" personalisation, and relative timestamps; dispute events link directly to the expense thread
- **Expense reactions** — tap 👍 on any expense detail sheet to react; opening the sheet automatically marks the expense as seen (WhatsApp-style read receipt); 👁 Seen by N members appears in the audit trail; reaction counts update optimistically on tap and surface as pills on expense cards
- **Questions & disputes** — any member can raise a ❓ question or ⚠️ dispute on an expense; dispute types include "Remove me", "Change my share", "Split equally", or a free-text message; actionable types auto-resolve when the payer accepts
- **Inline comments** — comment thread lives directly inside the expense detail sheet (WhatsApp-style bubbles, own messages right in cyan, others left in slate); @mention autocomplete with dropdown; optimistic posting — bubble appears instantly before server confirms; comments load with a shimmer skeleton and auto-scroll to the latest on open
- **Expense thread page** — deep-link URL (`/thread`) for each expense; used by notification links and activity feed; shows reactions summary, pending dispute management, full comment history, and resolved disputes
- **Member profile sheets** — tap any member on the Members page or Settle Up page to open a bottom sheet showing their net balance, total paid, total share, and last 3 expenses paid
- **Group insights** — category donut, daily/monthly spend, member contributions, pace tracker, smart observations
- **AI trip narrative** — Haiku generates a shareable trip story and budget-adherence summary
- **Cover photo upload** — pick a photo from Unsplash or upload from your device; stored in Supabase Storage
- **Trip plan upload** — upload a PDF or .txt itinerary and have it auto-filled in the trip form
- **Onboarding tour** — 7-step walkthrough (4 default + 3 extended) with spotlight, celebration, and a nest-specific 2-step overlay for recurring templates
- **Progress nudges** — first-time expense and group creation each show a contextual next-step prompt (shown once)
- **Invite preview** — share links show group name, cover photo, and member count before requiring sign-in
- **Guest claim flow** — guests added by name can claim their expenses when they join via invite link; name corrects automatically from their Google account
- **Notifications** — email and web push alerts when group members log expenses; one-click email unsubscribe; per-group mute toggle in the avatar menu
- **Clear Plus** — freemium subscription: free plan (4 groups, 8 members, 50 expenses each); Plus unlocks unlimited everything, AI features, CSV export, all split modes, templates, and budget tracking. Group admin's plan covers all members.
- **Settings page** — appearance (dark/light theme), billing (plan status, billing cycle, renewal date, downgrade), and notifications (web push toggle) in a tabbed sidebar layout
- **PWA** — installable on iOS and Android, offline-capable service worker
- **Dark mode** — full glassmorphic light + dark theme
- **Realtime** — Supabase Realtime pushes expense/settlement changes to all open sessions

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript) |
| Styling | Tailwind CSS v4 (CSS-first, no config file) |
| UI | shadcn/ui with @base-ui/react |
| Animation | Framer Motion 12 |
| Charts | Recharts 3 |
| Database | Supabase Postgres + Drizzle ORM |
| Auth | Supabase Auth (Google OAuth) |
| Realtime | Supabase Realtime |
| AI | Anthropic claude-haiku-4-5-20251001 |
| PDF parsing | pdf-parse 1.1.1 (server-side, no AI) |
| Deployment | Vercel |

---

## Getting started

```bash
git clone https://github.com/Jayks/clear.git
cd clear
pnpm install
```

Create `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=       # sb_publishable_* format
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=                         # Session Pooler URL
UNSPLASH_ACCESS_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=Clear
ANTHROPIC_API_KEY=
PLATFORM_ADMIN_EMAIL=                 # comma-separated, guards /admin

# Email notifications
RESEND_API_KEY=
RESEND_FROM=                          # e.g. "Clear <notifications@yourdomain.com>"
RESEND_UNSUBSCRIBE_SECRET=            # random 32-char string

# Web push notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_EMAIL=                          # mailto:you@yourdomain.com

# Analytics (optional)
NEXT_PUBLIC_GA_MEASUREMENT_ID=        # G-XXXXXXXXXX from GA4 dashboard
```

```bash
pnpm db:push          # create tables
# Run drizzle/policies.sql in Supabase SQL Editor
pnpm dev
```

### Supabase setup

1. Create a project at [supabase.com](https://supabase.com)
2. Enable Google OAuth under Authentication → Providers
3. Add `http://localhost:3000/**` to Authentication → URL Configuration → Redirect URLs
4. Run `drizzle/policies.sql` in the SQL Editor to apply RLS policies (includes policies for `expense_reactions`, `expense_comments`, and `expense_disputes`)
5. Enable Realtime for tables: `expenses`, `expense_splits`, `settlements`, `group_members`
6. Create a Storage bucket named `cover-photos` (public, 5 MB limit) and run the Storage RLS policies from CLAUDE.md
7. Generate VAPID keys: `node -e "const wp=require('web-push');console.log(wp.generateVAPIDKeys())"` and add to `.env.local`

### Windows note

`.npmrc` sets `node-options=--use-system-ca` so Node.js uses the Windows system certificate store. Required for Node.js 24+ to verify Supabase's TLS certificate.

---

## Scripts

```bash
pnpm dev              # dev server (Turbopack)
pnpm dev:restart      # kill existing dev server and restart
pnpm build            # production build
pnpm typecheck        # TypeScript check
pnpm test             # run Vitest
pnpm db:push          # push schema to DB
pnpm db:studio        # open Drizzle Studio
pnpm seed             # seed Goa trip demo data
pnpm seed:temple      # seed South India temple tour
```

---

## Project structure

```
app/
  (app)/          — authenticated app (groups, expenses, expense thread, insights, settle, upgrade, settings)
  (auth)/         — login page (standalone; used for direct URL access and proxy.ts redirects)
  @modal/         — parallel route slot; (.)login intercepts client-side /login nav as a modal overlay
  api/pwa-icon/   — PWA icon endpoint (192 + 512 px, edge runtime)
  manifest.ts     — PWA manifest
  icon.tsx        — favicon (32 px)
  page.tsx        — landing / marketing page
components/
  expense/        — expense cards, quick-add sheet, split editor, detail sheet (WhatsApp-style), reaction/question/dispute forms, thread discussion (bubble UI), thread comment input
  trip/           — group cards, cover photo picker, budget bar, overview badge RSCs (balance, insights, activity feed)
  insights/       — charts and insights tabs
  shared/         — clear-logo, nav, skeletons, animated-list, tour layer, member profile sheet
  tour/           — tour context and spotlight layer
lib/
  db/             — Drizzle schema, queries, auth
  splits/         — split computation (4 modes, 16 tests)
  settle/         — settlement optimizer (6 tests)
  demo/           — demo group seeders
  tour/           — tour steps and types
```

---

## Architecture notes

- **Server-first** — RSC by default; `"use client"` only for state, effects, charts
- **Server Actions** for all mutations — no REST routes for internal CRUD
- **`getCurrentUser()`** — React-`cache()`-wrapped `getUser()` call; deduplicates auth across the render tree
- **`unstable_cache`** — group row + members list cached server-side per group (tag `group-${groupId}`); invalidated on any group or member mutation via `revalidateTag`
- **`getBalances()`** — single SQL CTE round-trip (4 aggregates + members in one query)
- **GROUP_CONFIG** — all trip/nest differences flow through `lib/group-config.ts`
- **Subscription gates** — `lib/subscription/gates.ts` exports `getUserPlan()` (cached, returns "plus" for active + trialing), `getUserSubscription()` (uncached, full row for billing UI), and per-feature gate functions (`canCreateGroup`, `canUseAI`, `canAddMember`, etc.)
- **QuickAddSheet / TripCardNavSheet** — own their own portal (`document.body`) and `AnimatePresence`; always rendered, visibility controlled via `isOpen` prop. Cards have Add + Share floating on the cover image; `⋯` always visible (`w-10 h-10` on mobile for iOS tap targets). QuickAddSheet has post-save "✓ Saved!" state → "+ Add another expense →" link with 2 s auto-close
- **Platform-aware share / invite** — `TripCardShareDrawer` + `InviteSection` call `navigator.share()` directly; iOS cancel (AbortError) falls back to `InviteQRSheet` (QR + copy); Windows/Android cancel does nothing (native sheet already includes QR + copy)
- **GroupBalanceBadge** — async RSC streamed into each active TripCard via `Suspense`; batch-loads all member IDs in one query (`getUserMemberIds`), then calls cached `getBalances` per group
