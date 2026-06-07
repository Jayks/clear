# Clear

**Split it. Clear it.**

Clear is a shared expense and personal debt tracking app. Log what each person paid, choose how to split it, and let Clear compute who owes whom — with the minimum number of payments. No group needed for everyday debts.

---

## Four financial contexts

**Trips** — multi-day travel with your crew. Hotels, meals, transport, activities. Trip insights, budget tracking, and an AI-generated trip story.

**Nests** — ongoing household expenses. Recurring templates for rent, electricity, WiFi — log each month with one tap. Monthly grouping, settlement context, and household insights.

**Streams** — bilateral personal debt ledger. Track what you owe (and who owes you) without creating a group. "He covered my Uber." "I owe her lunch." Each relationship is a Stream; individual debt records are entries. Guests can confirm or dispute via a shareable link — no account required.

**Circles** — shared fund management. Two modes: **Recurring** (fixed monthly contributions — cricket club, office kitty, RWA, savings circle) and **One-time** (collect toward an optional target with a deadline — birthday gift pool, farewell fund, trip pool; sub-types: **Fixed** = equal contributions, **Flexi** = any amount). No individual debts — everyone is accountable to a shared wallet. Wallet balance = total contributions − wallet expenses. Admin records contributions with one tap; members pay via **UPI app picker** (G Pay / PhonePe / Any UPI) or self-report payment — admin confirms or disputes from the roster with a single tap. Admin self-reports auto-confirm. Admin logs wallet expenses (direct draws or personal advances). One-time lifecycle: Collecting → Purchased → Complete with surplus acknowledgment.

---

## Navigation

Three-tab structure: **Home** (Trips + Nests + Circles) · **Streams** · **Insights**

The Home page has an **Active / Archived** underline-tab toggle above the section pills. Active view shows Trips · Nests · Circles with colour-coded headers and a sticky pill nav. Archived view shows the same type groupings at full opacity. The tab row doubles as a search bar — a 🔍 icon expands to a full search input; blurring with a query collapses it to a filter chip `[🔍 query ×]` so the tabs stay accessible.

---

## Features

- **Circles** — shared fund with two modes. **Recurring**: fixed monthly contributions (cricket fund, office kitty, RWA, savings circle); cycle navigation ← → to browse history; admin records with one tap; members pay via UPI deep link or self-report. **One-time**: collect toward an optional target with a deadline (birthday gift, farewell fund, trip pool); sub-types **Fixed** (equal per-person amount) and **Flexi** (any amount); deadline countdown and progress bar; lifecycle stepper (Collecting → Purchased → Complete); 🎯 goal-hit celebration with confetti when 100%+ collected; surplus card when wallet > 0 after purchase ("Keep in wallet" / "Note as distributed"). Both modes: wallet balance, monthly runway health signal (🟢/🟡/🔴), WhatsApp reminder message generator (ASCII progress bar + pending names + UPI link), ghost members (added by name, no Clear account required), 3-step creation wizard (mode → details → invite), shareable WhatsApp invite with UPI + join link in 60 seconds. **Wallet expenses**: admin logs draws from wallet ("From wallet") or personal advances ("I paid from my pocket") — advance expenses show an amber "Advanced by [name]" badge in the expense list. Contribution privacy toggle (one-time mode): "Organiser only" hides ₹ totals from non-admin members (shows count only).
- **Streams** — bilateral debt tracking without a group. Log entries like "Rahul paid my cab" or "I owe her dinner"; each person gets a Stream page with a bilateral spine timeline (they owe me on one side, I owe them on the other); running net delta shown on every spine node; swipe left on any entry to access Forgive/Mark Paid/Share; partial settle with editable amount; all-square confetti celebration. Guest confirm/dispute via token link (no login required). Nav badge on the Streams tab shows new activity across all streams. **Direction-aware settle sheet**: creditor gets UPI request link (Web Share API); debtor with a Clear-user counterpart self-reports (is_confirmed=false, creditor confirms); debtor with a guest counterpart settles directly. Settlement badge shown in spine for unconfirmed self-reports; creditor can confirm or dispute from the spine.
- **Streams — spine view** — bilateral timeline showing entries directionally left/right of a centre spine line. Running cumulative net (`↑₹10.6k`) on each spine node so you can read the full history of a relationship at a glance. Disputed entries show amber tint with stronger border (attention treatment, not muted). Mobile: swipe left → Mark Paid / Forgive / Share overlay. Desktop: hover → inline action pills.
- **Global quick-add FAB** — warm sunset `+` button fixed on the Home page; taps open a fan with two options: **Log expense** (picks a group via cover-photo tiles + full list, then opens the quick-add form; auto-skips picker when only one group) and **Log entry** (opens the Stream log sheet directly). Auto-hides when scrolling down, reappears on scroll up. Back-button / Escape dismisses the group picker correctly on all platforms.
- **Home greeting** — time-aware personal greeting at the top of the Home page ("Good morning/afternoon/evening, [Name] 👋") using the user's local timezone.
- **Trip alive badges** — active trip cards show a live status badge replacing the date range: "Day 3 of 8" (cyan, pulsing dot), "Last day 🏁" (amber), or "Just returned ✓" (emerald, shown for 7 days after the trip ends).
- **Group card identity patterns** — Trip and Nest cards without a cover photo use a vivid identity gradient + white SVG silhouette pattern: **Trip** = `cyan-500 → teal-500` with rounded-canopy tree silhouettes (4 trees, 220×110 tile — each has a branch-spread shoulder ellipse that distinguishes it from a balloon); **Nest** = `emerald-500 → teal-500` with a 14-building city skyline (400×110 tile, antennae + window grids on prominent buildings); **Circle** = pale indigo (recurring) or amber (one-time) with sine-wave or lollipop SVG patterns. All patterns are `repeat-x` anchored at the bottom. Pattern constants in `lib/group-patterns.ts` are shared between the home-page card thumbnail and the group dashboard hero so both surfaces are visually identical when no cover photo is set.
- **AI receipt scanning** — tap the camera icon on any Add Expense form (Plus feature) to scan a receipt photo. Haiku vision reads the amount, merchant name, date, category, and GPS-tagged location in one shot. Detected fields fill the form automatically with an emerald ring highlight so you can see exactly what AI touched; editing any field clears its ring. Enable "Keep as proof" to attach the receipt photo to the expense — it uploads in the background after save and appears as a thumbnail in the expense detail sheet. Available in full Add Expense forms (Trips/Nests/Circles) and the compact QuickAdd sheet. Category cross-mapping ensures AI-detected categories are always valid for the target group type. Location field shows a Mapbox geocoding dropdown on trips; stays hidden on nests unless AI detected a location.
- **Quick-add expenses** — type a natural description from any group card; placeholder shows a live example like `"Coffee ₹120 paid by Priya"` so AI parsing is immediately obvious; AI fills amount, payer, and split automatically; a live `÷ N members = ₹X each` pill appears as you type so you always know each person's share before confirming
- **Quick-nav from card** — tap `⋯` (always visible) or long-press any group card to jump directly to Members, Expenses, Settle Up, or Insights; the balance badge links directly to Settle Up; the member count badge links directly to Members
- **Mobile group nav** — inside a group, the full top nav is replaced by a slim contextual header (← back, group name, `⋯`) so screen space goes to content
- **Expense detail** — tap any expense card to open a WhatsApp-style bottom sheet: amount, split breakdown, notes, compact reaction pills, pending dispute card, resolved dispute history, an inline comment thread with a persistent footer input, and a direct "View thread" link — no separate page needed for the common case
- **Expense search** — instant search across description and category; filters and pagination compose naturally; pagination only appears for groups with >20 expenses (smaller groups show all at once)
- **Timeline view** — third expense list mode (trips only): animated day-by-day view with stacked category bar (proportional colored segments, clickable to filter), √-scaled payer avatar chips (area ∝ amount paid), count-up day totals, connector threads that draw on scroll, Day X/Y orientation badges, 🔥 busiest day callouts, and empty-day ghost rows for the full trip range
- **Map view** — fourth expense list mode (trips only): every located expense (AI-scanned GPS or manually pinned) plotted on a Mapbox map with Supercluster clustering — individual stops show rich chips (category emoji + truncated description + amount), dense groupings collapse into "N · ₹total" cluster bubbles that bloom into chips on zoom-in. An animated `line-trim-offset` route path traces the trip geographically. A date scrubber replays the trip day by day, auto-framing the camera to that day's pins (`fitBounds` — wide for cross-country same-day spreads like a Chennai-to-Delhi flight day, tight for same-city clusters so they un-merge into readable chips). Full dark-mode support.
- **Expense audit trail** — every card and edit page shows who logged the expense and who last edited it, with relative timestamps
- **Expense card actions** — Edit, Duplicate, Delete revealed on hover (desktop) or via swipe-left overlay with large tap targets (mobile); no visual clutter when browsing
- **Category recents** — the last 3 used categories appear as quick-tap pills above the full category selector in the expense form (separate per group type)
- **Four split modes** — equal, exact amount, percentage, or shares
- **16 expense categories** — each with a distinct vibrant gradient icon (Food = orange→red, Transport = blue→indigo, Accommodation = violet→purple, etc.); including Tour Package for trips; "Other" prompts a free-text description
- **Minimum-transaction settlement** — greedy optimizer computes the fewest payments to clear all debts; Settle Up page shows the math top-to-bottom: personal paid/share/net on the hero card, everyone's net balances always visible, then the minimum payment actions — no accordion required to understand the numbers
- **Debt Flow graph** — interactive SVG visualisation on the Settle Up page, enclosed in a glass card: draggable member nodes with gradient avatars, animated money-flow particles pulsing along arcs, arc-tap scrolls to the exact payment card with a cyan flash highlight, node-tap opens member balance details; 3-state info bar (arc selected / node selected / hint); vertical page scroll passes through on mobile (`touchAction: pan-y`)
- **UPI pay** — unified payment flow across all four financial contexts. **Settle Up (Trips/Nests)**: direction-aware `PaymentSheet` — debtors get a 3-app picker (G Pay / PhonePe / Any UPI) + QR + 15s return-from-UPI confirm prompt; creditors get a Web Share API request link (native iOS/Android share sheet). **Streams**: same direction-aware sheet in `StreamSettleSheet`; guest counterparts settle directly, Clear-user counterparts go through self-report → confirm flow. **Circles**: `UpiPayButton` in the contribution action (dashboard + home card); admin self-reports auto-confirm; member self-reports create an unconfirmed record the admin confirms or disputes from the roster. **Shareable `/pay` page**: no-auth public link with OG preview for WhatsApp. **UPI IDs**: saved in Settings > Profile (up to 5, with label + default star); G Pay / PhonePe / Paytm / Amazon Pay app pills + `@` suffix autocomplete. Self-report → confirm flow: debtor reports with optional UTR reference; creditor/admin sees `PaymentPendingBadge` (confirm/dispute); confirmed settlements show payment method icon in history.
- **Balance at a glance** — every group card shows your net position (owe / owed / settled / no expenses yet), streaming in without blocking the page
- **Enriched group overview cards** — the Settle Up card shows your live balance ("You owe ₹500" / "Owed ₹300" / "All settled ✓"); Expenses shows total spend for trips or this month's spend for nests; Insights shows the top spending category — all stream in via Suspense without blocking navigation
- **Activity feed** — the group home page shows the last 5 recent events (expenses added, settlements recorded, member joins, disputes raised) with actor avatars, event-type icon badges, "You" personalisation, and relative timestamps; all events are tappable: expenses → thread, disputes → thread, settlements → Settle Up, member events → Members page
- **Expense reactions** — tap 👍 on any expense detail sheet to react; opening the sheet automatically marks the expense as seen (WhatsApp-style read receipt); 👁 Seen by N members appears in the audit trail; reaction counts update optimistically on tap and surface as pills on expense cards
- **Questions & disputes** — any member can raise a ❓ question or ⚠️ dispute on an expense; dispute types include "Remove me", "Change my share", "Split equally", or a free-text message; actionable types auto-resolve when the payer accepts
- **Inline comments** — comment thread lives directly inside the expense detail sheet (WhatsApp-style bubbles, own messages right in cyan, others left in slate); @mention autocomplete with dropdown; optimistic posting — bubble appears instantly before server confirms; comments load with a shimmer skeleton and auto-scroll to the latest on open
- **Expense thread page** — deep-link URL (`/thread`) for each expense; used by notification links and activity feed; shows reactions summary, pending dispute management, full comment history, and resolved disputes
- **Undo settlement** — "Mark paid" shows a 5-second toast with an Undo action; tapping it deletes the settlement and refreshes the page, preventing accidental payments from becoming permanent
- **All settled celebration** — when all debts are cleared the Settle Up page shows a celebration card with a total tracked amount, payment count, and member count instead of a flat empty state; a 30-piece confetti burst fires once per session at that moment
- **Member profile sheets** — tap any member on the Members page to open a bottom sheet showing their net balance, total paid, total share, and last 3 expenses paid
- **Personal finance view** — a "You" tab on the all-groups insights page showing your personal numbers across every group: total your share (not group totals), a live net-position card bucketed into "Owed to you / You owe" with per-group rows linking directly to each Settle Up page, a financial circle of the people you share money with most (matched by Clear account, ranked by group count + shared total, with a "last active" green dot for recent activity), a banker card comparing what you paid upfront vs your actual share with an animated progress bar and year-over-year trend, a rule-based triggered insight (companion dominance → heavy banker → spending trajectory → milestone), category donut of your personal spend, and per-group share bars. Plus-only feature; non-Plus users see an upgrade prompt.
- **Group insights** — story-driven analytics for every trip and nest. **Trip**: state-aware layout (pace tracker leads on active trips, T-minus badge on future trips, celebration state on completed under-budget trips); rule-based opening sentence ("Day 3 of 5 · Food at 38% · ₹2,100/day"); four KPIs including contextual "Your position" that links directly to Settle Up; three-card Highlights strip (biggest expense, peak day, tab-picker — suppressed until ≥3 expenses to avoid tautologies); stacked daily-spend bar chart with per-category colour coding (same palette as the donut, so colour language threads across charts) and peak-day annotation; member contributions chart with a "fair share" dashed reference line (bars right of line = overpaid, left = underpaid) and "You" highlighting; fairness score + distinctive member roles; cross-trip comparison (Suspense-streamed); Plan vs Reality AI analysis. **Nest**: monthly-average reference line on the spend bar so every month reads as above/below baseline at a glance; recurring vs one-off always split and surfaced; monthly pace projection (at this rate, how much will we spend?) vs 3-month rolling average; year-over-year same-period comparison when history exists. **All-groups**: home-vs-travel comparison card (₹X/day at home · ₹Y/day traveling · Nx more expensive) when both group types exist; trips chart is horizontal and chronological with a trend line connecting bar tips — at a glance you see if trips are getting more expensive; per-currency grouping so INR and USD trips are never compared on the same axis; companion insight (most frequent travel mate, matched by account or consistent guest name); daily travel pace (₹/day across all trips); nest year-over-year and biggest-month-ever highlights
- **Add members — unified sheet** — a single violet **[+ Add members]** button on the Members page opens a multi-mode sheet: (1) **Clear network** — searchable, multi-select list of every person the admin has shared with across past groups, deduplicated by account; tap to select, chip appears at the top (Plus only — free users see a personalised teaser with real names dimmed and a count-based upgrade nudge); (2) **Import from a group** — pick a prior group and bulk-copy its members with one tap (Plus only, hidden for free users); (3) **Bulk paste** — type or paste comma/newline-separated names (always free); (4) **Manual type** — search input with "Add as guest" CTA for new names (always free). After any addition a share step appears with a WhatsApp invite button and copy link. Ghost members (not yet on Clear) show `⏳ Not joined yet` + a per-row `📤` share icon on the member list. Free plan limit (8 members) enforced server-side on all paths
- **Repeat trip prompt** — when a trip ends or is archived, admins see a dismissable prompt to create a new trip with the same squad pre-populated; a bottom sheet lets them name the trip, pick dates, and toggle which members to copy
- **AI trip narrative** — Haiku generates a shareable trip story and budget-adherence summary
- **Rich trip summary timeline** — the public `/summary/[token]` page shows the same animated day-by-day timeline: stacked category bars, payer chips, count-up totals, connector threads, Day X/Y badges, and always-expanded expense rows for a shareable visual recap
- **Cover photo upload** — pick a photo from Unsplash or upload from your device; stored in Supabase Storage
- **Trip plan upload** — upload a PDF or .txt itinerary and have it auto-filled in the trip form
- **Onboarding tour** — 9-step walkthrough (4 default + 5 extended) with spotlight, celebration, and a nest-specific 2-step overlay for recurring templates; extended steps navigate into the demo group and show the expense list (full view), day-by-day timeline (Day 1 spotlighted), debt flow graph, per-group insights, and all-groups insights in sequence
- **Progress nudges** — first-time expense and group creation each show a contextual next-step prompt (shown once)
- **Group creation** — type selector shows clear descriptions ("One-time trips & events" / "Home, flatmates & recurring"); optional fields (cover photo, dates) labelled upfront; budget, description, and itinerary hidden behind `+ More options` for a clean first-time flow
- **Invite preview** — share links show group name, cover photo, and member count before requiring sign-in; group admin's Share + Edit buttons are in the card hero; invite link reset and group archive live on the Edit page under Admin actions
- **Guest claim flow** — guests added by name can claim their expenses when they join via invite link; name corrects automatically from their Google account
- **Notifications** — email and web push alerts when group members log expenses; one-click email unsubscribe; per-group mute toggle in the avatar menu
- **Clear Plus** — freemium subscription: free plan (4 groups, 8 members, 50 expenses each); Plus unlocks unlimited everything, AI features, CSV export, all split modes, templates, and budget tracking. **₹99/month · ₹799/year** (GST-inclusive). Founder pricing ₹79/₹699 locked forever for the first 500 subscribers — live slot counter on the pricing page. Group admin's plan covers all members.
- **Settings page** — appearance (dark/light theme), billing (plan status, billing cycle, renewal date, downgrade), notifications (web push toggle), and profile (editable display name synced across all groups) in a tabbed sidebar layout
- **What's New** — changelog accessible from the avatar dropdown inside the app, and from the marketing page nav
- **PWA** — installable on iOS and Android, offline-capable service worker
- **Dark mode** — full glassmorphic light + dark theme
- **Entrance animations** — expense lists, balance cards, and KPI grids stagger in via CSS `@keyframes` (`opacity+translateY`, 300ms, 80ms stagger default); CSS-driven so animations fire on DOM insertion independent of React hydration — reliable after skeleton→content swaps on mobile; capped at item 8 so long lists never exceed ~640ms total; automatically disabled for `prefers-reduced-motion`
- **Scroll-triggered section reveals** — below-fold sections on both the per-group and overall insights pages (`FadeIn` via `useInView`) fade up as you scroll into them, once only; same easing curve as the landing page so the motion language is consistent across the whole product
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
| Geocoding | Mapbox API (receipt location + LocationInput dropdown) |
| Image utils | exifr (EXIF GPS) + Canvas API (compression) |
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

# Geocoding (receipt scanner + LocationInput)
NEXT_PUBLIC_MAPBOX_TOKEN=             # pk.eyJ1... — omit to disable location features

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
5. Run `drizzle/circle-tables.sql` in the SQL Editor to add Circle support (extends `group_type` enum, adds circle columns to `groups`, creates `circle_contributions` table with RLS)
5b. Run `drizzle/circle-phase4.sql` to add `is_advance` column to `expenses` (required for wallet expense logging)
6. Enable Realtime for tables: `expenses`, `expense_splits`, `settlements`, `group_members`
6. Create a Storage bucket named `cover-photos` (public, 5 MB limit) and run the Storage RLS policies from CLAUDE.md
7. Create a Storage bucket named `receipt-photos` (private, 10 MB limit) — run `drizzle/policies.sql` (includes receipt-photos RLS: members can upload to their group's path, authenticated users can read)
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
pnpm seed:panindia    # seed Pan-India Explorer trip — 18 located expenses covering every map-pin scenario
pnpm seed:streams     # seed 3 stream counterparts, 30 entries (all statuses)
pnpm seed:circles     # seed 4 circles covering Phase 4+5 test scenarios
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
  page.tsx        — landing page (redirects authed users → /groups; renders CarouselLanding)
  about/          — full-feature marketing page (/about)
  pricing/        — public pricing page (plan-cards async RSC + faq-section client)
components/
  circle/         — circle-dashboard (RSC), circle-card + server (home card), circle-chip-grid, circle-cycle-nav, circle-reminder-sheet/button, record-contribution-sheet
  expense/        — expense cards, quick-add sheet, split editor, detail sheet (WhatsApp-style), reaction/question/dispute forms, thread discussion (bubble UI), thread comment input
  trip/           — group cards, cover photo picker, budget bar, overview badge RSCs (balance, insights, activity feed)
  settlement/     — debt-flow-graph (interactive SVG), settle-hero-card, settled-celebration
  marketing/      — carousel-landing (9-slide fullscreen carousel with HD phone frames), settle-flow-demo (animated SVG debt-flow, used in /about and inside carousel phone)
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
