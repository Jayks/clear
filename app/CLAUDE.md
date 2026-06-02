# Clear — App Routes & Features Reference

> Loaded when editing `app/**`.

---

## Project Structure

```
clear/
├── app/
│   ├── icon.tsx, error.tsx, not-found.tsx, layout.tsx, page.tsx, globals.css
│   ├── (auth)/login/page.tsx + login-form.tsx
│   ├── @modal/(.)login/page.tsx          # intercepts client-side /login nav as modal overlay
│   ├── auth/callback/route.ts
│   ├── (app)/
│   │   ├── layout.tsx, error.tsx, app-nav.tsx  # 3-tab nav: Home|Streams|Insights; transparent on app pages
│   │   ├── insights/page.tsx + loading.tsx     # receives streamSummary → InsightsTabs → PersonalContent
│   │   ├── upgrade/ + checkout/
│   │   ├── settings/
│   │   ├── groups/
│   │   │   ├── page.tsx                  # Home page: Trips + Nests + Circles sections, HomeControlBar, StreamBadgeSync
│   │   │   ├── loading.tsx
│   │   │   ├── new/page.tsx              # reads ?type=trip|nest|circle → CreateTripForm or CreateCircleForm
│   │   │   │   ├── create-trip-form.tsx  # accepts defaultGroupType?: "trip" | "nest"
│   │   │   │   └── create-circle-form.tsx # 3-step wizard: mode select → details → invite (WhatsApp wa.me)
│   │   │   └── [id]/
│   │   │       ├── layout.tsx (RealtimeRefresh + GroupMobileNav hidden md:block)
│   │   │       ├── page.tsx              # branches on config.isCircle → CircleDashboard OR trip/nest layout
│   │   │       │                         # accepts searchParams.period ("YYYY-MM") for circle cycle nav
│   │   │       ├── edit/, expenses/, members/, settle/, insights/
│   │   └── stream/
│   │       ├── page.tsx                  # RSC → StreamDashboardClient; clears nav badge on mount
│   │       └── [personId]/page.tsx       # RSC → StreamPersonPageClient; passes currentUserName
│   ├── stream/confirm/[token]/page.tsx   # PUBLIC — no auth; guest confirmation page
│   ├── pricing/, changelog/, join/, summary/, api/
│   └── actions/
│       ├── stream.ts                     # 11+ server actions: logStream, confirmStream, disputeStream,
│       │                                 # settleStream, undoSettleStream, forgiveStream, settleWithPerson
│       │                                 # (accepts partialAmount?), undoSettleWithPerson, forgiveAllActiveStreams,
│       │                                 # deleteStream + thin wrappers
│       ├── circle.ts                    # createCircle, recordContribution, selfReportContribution, addCircleExpense, updateCircleStatus
│       ├── groups.ts, expenses.ts, members.ts, settlements.ts, unsplash.ts, upload.ts
│       ├── parse-expense.ts, narrative.ts, trip-adherence.ts, parse-chat.ts, parse-itinerary.ts
│       ├── admin.ts, subscription.ts, interactions.ts, demo.ts
├── components/
│   ├── stream/                          # All stream UI
│   │   ├── stream-summary-strip.tsx / -client.tsx / -skeleton.tsx  # (no longer on Home — strip removed)
│   │   ├── stream-spine-view.tsx        # bilateral timeline: mobile 3-col grid + desktop 2-col
│   │   │                                # SpineCard: swipe-left (mobile) / hover (desktop) → Forgive/MarkPaid/Share
│   │   │                                # Disputed entries: amber tint + stronger border (NOT muted)
│   │   ├── stream-log-sheet.tsx         # "Who paid?" Me/{Name} instead of direction toggle
│   │   ├── stream-dashboard-client.tsx  # search (>6 people), activity feed, clears nav badge on mount
│   │   ├── stream-person-page-client.tsx # hero: full net (consistent with dashboard) + confirmed/pending/disputed breakdown
│   │   ├── stream-person-card.tsx       # attention dots: green=new, amber=disputed (localStorage)
│   │   ├── stream-settle-sheet.tsx      # partial settle: editable amount, "oldest first" backend logic
│   │   ├── stream-forgive-sheet.tsx, stream-settle-sheet.tsx
│   │   ├── stream-entry-row.tsx, stream-settled-celebration.tsx
│   │   ├── stream-badge-sync.tsx        # invisible RSC companion — writes clear_stream_has_badge to localStorage
│   │   └── confirm-stream-client.tsx
│   ├── circle/                          # All circle UI
│   │   ├── circle-dashboard.tsx         # RSC: hero, cycle nav, progress (privacy-aware), contribution roster, one-time celebration, lifecycle status, wallet expenses
│   │   ├── circle-card.tsx              # "use client": clickable header+progress (Link), interactive action area below (chips, Pay, I've paid)
│   │   ├── circle-card-server.tsx       # RSC data loader + CircleCardSkeleton; Suspense-wrapped on home page
│   │   ├── circle-contribution-roster.tsx # "use client": search + pending list (🔔 remind, admin tap→record) + collapsed paid section
│   │   ├── circle-cycle-nav.tsx         # "use client": ← YYYY-MM → navigation via router.push(?period=)
│   │   ├── circle-reminder-button.tsx   # "use client": wraps CircleReminderSheet state
│   │   ├── circle-reminder-sheet.tsx    # "use client": WhatsApp group reminder message generator (ASCII progress bar)
│   │   ├── record-contribution-sheet.tsx # "use client": admin one-tap confirm sheet; calls recordContribution action
│   │   ├── add-circle-expense-form.tsx  # "use client": wallet expense form (From wallet / I paid from my pocket toggle)
│   │   ├── circle-expense-list.tsx      # "use client": expense list with delete + amber advance badge
│   │   ├── circle-one-time-celebration.tsx  # "use client": confetti burst + "Goal/Target reached!" banner (sessionStorage-gated); isFlexi prop switches copy
│   │   └── circle-one-time-status.tsx       # "use client": lifecycle stepper (Collecting→Purchased→Complete) + surplus card; goalReached=true when no target (Flexi)
│   ├── ui/, expense/, trip/, settlement/, marketing/, insights/, tour/
│   └── shared/
│       ├── section-pill-nav.tsx         # sticky section pills; scroll-position active detection (45% viewport threshold); px-4 py-2 text-sm
│       ├── home-control-bar.tsx         # "use client": unified underline-tab toggle (Active/Archived) + inline search; collapses to filter chip on blur; replaces GroupSearchInput + HomeViewToggle
│       ├── global-fab.tsx               # fan-out FAB (Home only): Log expense → GroupPickerSheet → QuickAddSheet; Log entry → StreamLogSheet; auto-hide on scroll
│       ├── home-greeting.tsx            # "Good morning/afternoon/evening, {firstName} 👋" — client, user's local time
│       ├── group-search-input.tsx       # DOM-based filter (data-group-card attrs) — standalone (no longer used on Home; logic inlined in HomeControlBar)
│       ├── mobile-nav.tsx               # 3 tabs: Home|Streams|Insights; Streams badge from localStorage
│       ├── group-mobile-nav.tsx, animated-list, count-up, ...
├── lib/
│   ├── db/
│   │   ├── schema/stream-guests.ts, stream-records.ts, stream-settlements.ts
│   │   └── queries/stream.ts            # getStreamSummary, getStreamDashboard, getStreamWithPerson,
│   │                                    # getPersonDetails, getStreamBadgeData, getStreamActivity (in dashboard)
│   ├── validations/stream.ts
│   ├── notifications/send-stream-notification.ts
│   ├── db/client.ts, schema/*.ts, queries/(groups, expenses, balances, insights, meta, admin, auth, activity, interactions).ts
│   ├── supabase/, demo/, tour/, group-config.ts, categories.ts
│   ├── insights/trip-insights.ts + all-trips-insights.ts + all-nests-insights.ts + group-roles.ts + personal-insights.ts
│   ├── splits/, settle/, interactions/, validations/, analytics.ts, rate-limit.ts, utils.ts
│   ├── subscription/gates.ts + founder.ts
│   └── notifications/expense-email.ts + send-expense-notification.ts + send-push-notification.ts
├── drizzle/policies.sql, indexes.sql, stream-tables.sql, circle-tables.sql, circle-phase4.sql  # applied via Supabase SQL Editor
├── drizzle.config.ts, proxy.ts, vercel.json
├── scripts/seed-streams.ts              # pnpm seed:streams — uses PLATFORM_ADMIN_EMAIL to find user
├── scripts/seed-circles.ts              # pnpm seed:circles — 4 circles covering Phase 4+5 test scenarios
```

---

## Home Page (`app/(app)/groups/page.tsx`)

RSC. **No stream strip** — Streams has its own nav tab. Sections (top → bottom):

1. `HomeGreeting` — `"use client"` personal greeting (`Good morning/afternoon/evening, {firstName} 👋`). `firstName` from `user.user_metadata.full_name`. Only rendered when `user` is set.
2. `StreamBadgeSync` (invisible client component) — fetches `getStreamBadgeData(userId)`, writes `clear_stream_has_badge` to localStorage so `MobileNav` can show the badge dot.
3. `HomeControlBar` — `"use client"`. Unified underline-tab toggle + inline search. Renders when `archived.length > 0` OR `groups.length > 5`. Passes `activeContent` and `archivedContent` RSC nodes as props; switches between them client-side (no re-fetch). Search auto-collapses on blur — empty query = silent close; active query = collapse to `[🔍 query ×]` filter chip. Tab switch clears filter + scrolls to top. `showSearch={groups.length > 5}`.
4. **Active content** (rendered inside `HomeControlBar.activeContent`):
   - `SectionPillNav` — sticky (`sticky top-14 z-40`); `NavSection[]` for trips/nests/circles only (no amber Archived pill — Archived has its own tab now). `CreatePill[]` for missing types. Renders when 2+ sections OR createPills.
   - **Trips section** — `<section id="trips" data-group-section scroll-mt-28>`; cyan header (MapPin, `+`); TripCard grid. Demo groups sorted last (`ORDER BY is_demo ASC`). Balance badge skipped on demo cards.
   - **Nests section** — `<section id="nests" data-group-section scroll-mt-28>`; emerald header (Home icon, `+`); TripCard grid. Same demo ordering.
   - **Circles section** — `<section id="circles" data-group-section scroll-mt-28>`; violet header (Coins, `+`); `CircleCardServer` (Suspense-streamed). Circle card header/progress is a `<Link>` to the group dashboard; interactive action area (chips, Pay, I've paid) is outside the link.
5. **Archived content** (rendered inside `HomeControlBar.archivedContent`):
   - `SectionPillNav` — archived sections only; same colors (cyan/emerald/violet); no create pills. Renders when 2+ archived types.
   - **Archived Trips** (`id="archived-trips"`), **Archived Nests** (`id="archived-nests"`), **Archived Circles** (`id="archived-circles"`) — full opacity, no `+` buttons. Archived circles use TripCard (not CircleCardServer — interactive chips irrelevant for archived).
6. **Empty state** — shown when 0 groups AND 0 archived; side-by-side CTAs (New Trip + New Nest).
7. `GlobalFab` — rendered when `!isEmpty`; always visible regardless of Active/Archived tab.

**Demo groups order**: `getAllGroups()` orders `is_demo ASC` — real groups first, demo groups at the bottom of their section. Previously `is_demo DESC` (demo first) — changed so experienced users see their real groups first.

**Balance badge**: skipped (`undefined`) when `group.isDemo` — avoids DB round-trip for sample groups. Shows shimmer pulse skeleton during load (replaces old `···` flash).

**`CircleCardServer`** — RSC, Suspense-wrapped per circle card. Calls `getCircleCardData()`, renders `CircleCard`. CircleCard is `"use client"` with optimistic updates. Card header+progress area is a `<Link href="/groups/[id]">` (hover tint, navigates to dashboard). Pending chips, Pay, I've paid remain outside the link as independent interactive elements.

**Trip alive badges** — `computeTripStatus(startDate, endDate)` in `components/trip/trip-card.tsx` replaces the date subtitle when a trip is live: `active` ("Day X of Y", cyan-300 + pulsing dot), `lastDay` ("Last day 🏁", amber-300), `justReturned` ("Just returned ✓", emerald-300, ≤7 days). Not shown for nests or archived groups.

---

## Circle Pages

### `/groups/[id]` — Circle dashboard (`components/circle/circle-dashboard.tsx`)

`GroupPage` detects `config.isCircle` and renders `CircleDashboard` instead of the trip/nest layout. `searchParams.period` ("YYYY-MM") controls cycle navigation for recurring mode.

**Dashboard sections (top → bottom):**
1. **Hero card** — violet/rose gradient header (based on mode), circle name, mode badge, deadline countdown (one-time), edit + share buttons (admin).
2. **Progress section** (inside hero card):
   - Cycle nav (`CircleCycleNav`) — ← prev | "June 2026" | next → (next hidden on current period). Recurring only.
   - Committed line — "N × ₹X = ₹Y committed this cycle" (recurring).
   - Progress bar — privacy-aware: one-time + `admin_only` + non-admin → shows "X/Y contributed" count only (no ₹ total). Otherwise shows `₹collected / ₹target` or `₹cycleCollected collected`.
   - **Wallet balance** + runway health (🟢 >2mo / 🟡 1-2mo / 🔴 <1mo). Recurring only.
3. **One-time celebration** (`CircleGoalCelebration`) — one-time mode; fires 🎯 confetti + "Goal reached!" banner when `allTimeCollected ≥ targetAmount`. SessionStorage-gated (`clear_circle_goal_${groupId}`). CSS `@keyframes confettiFall`.
4. **Personal status card** — Recurring: member view, current period only. One-time: member view, any time. Shows ✓ contributed or ⏳ pending with amount.
5. **Contribution roster** (`CircleContributionRoster`) — search bar + pending section (🔔 remind bell for admin, tap → `RecordContributionSheet`) + collapsed paid section (shows individual amounts). One-time mode: admin can tap paid member to record additional contributions.
6. **Send reminder** (`CircleReminderButton` + `CircleReminderSheet`) — admin only when pending members exist. WhatsApp group message with ASCII progress bar + pending names + UPI link.
7. **One-time lifecycle status** (`CircleGoalStatus`) — one-time mode only. Stepper: Collecting → Purchased → Complete. Admin sees transition buttons. Surplus card when status=purchased and walletBalance > 0 ("Keep in wallet" / "Note as distributed → Complete").
8. **Wallet expenses** section — last 3 expenses inline (category icon, description, date, amount, advance badge). "View all →" links to `/expenses`. Admin CTA: "Log wallet expense" → `/expenses/new`.
9. **Members card** — bottom of dashboard. Shows member count, up to 8 avatar initials (solid violet = joined Clear, dashed ring = ghost/unclaimed), amber `⏳ N members haven't joined Clear yet` notice when ghosts exist. Header right: `+ Add / Manage` link (admin only). Full-width `[Members]` button → `/members` for all roles (label identical regardless of role — permissions enforced on the members page).

**Cycle navigation**: `router.push(\`/groups/${id}?period=${YYYY-MM}\`)` — RSC re-renders with new period.
**Wallet balance** = SUM(contributions) − SUM(non-template expenses) — computed in `getCircleDashboardData` which now also returns `recentExpenses: RecentPoolExpense[]` (last 3, with payer name).
**Contribution privacy**: `group.contributionPrivacy === 'admin_only'` + `!isAdmin` → hide ₹ totals from progress section.

### `/groups/[id]/expenses` — Circle wallet expenses page

`ExpensesPage` branches on `config.isCircle`. Circle view:
- Violet header "Wallet expenses" (Coins icon). No AI import, no templates, no FAB.
- Admin-only "Log wallet expense" button → `/expenses/new`.
- Summary strip: "Total drawn from wallet: ₹X".
- `CircleExpenseList` — simple rows: CategoryIcon + description + date + amount + admin trash icon. Advance expenses show amber "Advanced by [name]" badge.

### `/groups/[id]/expenses/new` — Circle wallet expense form

Branches on `config.isCircle`. Non-admins → redirected to `/groups/[id]`. Admin → `AddCircleExpenseForm`:
- **Source toggle**: "From wallet" (violet, 🏦 — `isAdvance=false`) vs "I paid from my pocket" (amber, wallet icon — `isAdvance=true`).
- Category grid (CIRCLE_CATEGORIES — 8 types). Date with Today/Yesterday shortcuts. Notes optional.
- Submit → `addCircleExpense` action → `isAdvance` stored in `expenses.is_advance` column.
- Toast: "Wallet expense logged!" or "Advance logged!".

### Circle server actions (`app/actions/circle.ts`)

- `createCircle` — creates group + admin member + ghost members.
- `recordContribution` — admin records for any member.
- `selfReportContribution` — member self-reports.
- `addCircleExpense` — admin only; no splits; sets `isAdvance`; revalidates wallet balance tags.
- `updateCircleStatus` — admin only; one-time mode; transitions `active → purchased → complete`; revalidates group cache.

### `/groups/new?type=circle` — Circle creation (`create-circle-form.tsx`)

3-step wizard:
- **Step 1**: Mode selection — Recurring (violet) vs One-time (rose).
- **Step 2**: Details — recurring: name, ₹/month, contribution day (1–28); one-time: **Fixed/Flexi picker** first (Fixed=set amount per person, Flexi=any amount), then Fixed: amount per person (required) + optional total target; Flexi: optional soft target + currency; both: deadline/UPI/privacy/wallet toggle under "More options". Add ghost members (name + phone; phone used for WhatsApp invite, not persisted). `contributionSubType: "fixed"|"flexi"` is UI-only state stripped before `createCircle` action — Flexi sends `contributionAmount: undefined`.
- **Step 3**: Invite — WhatsApp wa.me deep link, copy button, "Go to my Circle".

`createCircle` returns `{ groupId, shareToken, creatorName }`. Circle created at end of Step 2.

---

## Stream Pages

### `/stream` (dashboard) — `app/(app)/stream/page.tsx`
RSC → `StreamDashboardClient`. `StreamDashboardClient` writes `clear_stream_last_viewed = Date.now()` + removes `clear_stream_has_badge` on mount (clears nav badge). Shows: net position cards, person lists (owed-to-me / i-owe), pending entries, past section, activity feed (last 5 events by `updatedAt`).

### `/stream/[personId]` — `app/(app)/stream/[personId]/page.tsx`
RSC → `StreamPersonPageClient`. Passes `currentUserName` from `user.user_metadata.full_name`. Hero shows **full net** (same as dashboard) with confirmed/pending/disputed breakdown below. Spine view replaces old Open/History list sections.

**`StreamSpineView`** (`components/stream/stream-spine-view.tsx`):
- **Mobile**: 3-col grid `[48px 12px 1fr]` — date+net (col1), spine dot (col2), SpineCard (col3). "I owe" cards indented `pl-5`.
- **Desktop**: true 2-col with centre spine. Left = they owe me, Right = I owe them.
- **SpineCard swipe (mobile)**: swipe left → glass overlay with action buttons: 📱 Share (pending guest), ✓ Mark Paid (any active), 💚 Forgive (creditor only).
- **SpineCard hover (desktop)**: action pills appear on hover in the top corner.
- **Disputed entries**: amber tint + stronger border, NOT muted — signals "needs attention."
- **Running net**: each spine node shows `↑₹10.6k` / `↓₹8.9k` — cumulative net after each entry chronologically.

### `/stream/confirm/[token]` — **PUBLIC** (`app/stream/confirm/[token]/page.tsx`)
No auth. UUID validation. 4 server-rendered states + `ConfirmStreamClient` for active. `proxy.ts` carves it out of auth protection.

### Stream settle — partial amount
`StreamSettleSheet` has an editable amount field (default = full net). If user reduces it, `settleWithPerson(counterpartId, note, partialAmount)` settles oldest entries first until amount covered.

---

## Landing Page (`app/page.tsx`)

RSC. Redirects authenticated users to `/groups`. Renders `<CarouselLanding />`.

### `CarouselLanding` (`components/marketing/carousel-landing.tsx`)

`"use client"` fullscreen horizontal carousel. 9 slides (SLIDE_COUNT = 9):

| # | Slide | Key visual |
|---|---|---|
| 0 | **Hero** | Animated gradient mesh blobs, ClearIcon 72px, 3 context pills, social proof ticker |
| 1 | **Overview** | 2×2 context grid: Trips · Nests · Streams · Circle (coming soon, dashed border) |
| 2 | **AI-powered** | Phone frame: Type/Speak toggle + waveform + parsed chips |
| 3 | **Debt Flow** | Phone frame: `SettleFlowDemo` inside phone (AppBar + graph + summary bar) |
| 4 | **Settle Up** | Phone frame: balance hero + net table + min-payment UPI cards |
| 5 | **Insights** | Phone frame: KPI 2×2 + category bars + member contribution bars |
| 6 | **Nests** | Phone frame: recurring templates list with 1-tap Log buttons |
| 7 | **Streams** | Phone frame: bilateral spine view with confirmed/pending entries |
| 8 | **CTA** | Glass gradient card: "You've seen it. Now clear yours." |

**`PhoneFrame`** — HD Deep Purple iPhone 15 Pro style (`290×628px`). `tilt` prop (`rotateY` degrees) for 3-D lean. Realistic dynamic island, chamfered edge gradient, side buttons, screen glare overlay, ambient shadow.

**`ResponsivePhone`** — mobile: `310px` wide, `78%` height clipped (phone "rises" from bottom, bottom nav hidden). Desktop: full frame with optional tilt. `accentGlow` prop = per-slide radial glow behind phone.

**`FeatureSlide`** — standard slide shell (phone top on mobile, side-by-side on desktop). Props: `labelHex` (renders a pill/badge label with tinted bg), `pills` (2 feature chips shown on mobile AND desktop), `bullets` (desktop sidebar only), `callouts` (overlay `<Callout>` badges).

**`Callout`** — glass pill overlaid inside the phone's visible clip area (not outside/beside it). Positioned `absolute` within `div.relative` wrapping `ResponsivePhone`. Visible on all screen sizes (`z-30`, no `hidden md:`).

**Behaviour:**
- **Auto-advance**: slides 0→1→2, 8s each; cancels immediately on any touch/key/pointer
- **Keyboard nav**: `←` / `→` arrow keys
- **Right-edge peek**: subtle `backdrop-blur` gradient on the right edge signals more slides
- **Bottom bar**: dots + slide label (left) · About · Pricing · Changelog links (right). No duplicate CTA.
- **Hero blobs**: 3 animated radial gradient divs (`blob1/2/3` CSS keyframes), ~14–22s drift cycles

---

## Expense Social Layer

### Thread page — `app/(app)/groups/[id]/expenses/[expenseId]/thread/page.tsx`
RSC. Auth: `getCurrentUser()` → redirect `/login`; `getMembership()` → 404. Fetches in parallel: group+members, expense row, `fetchExpenseCommentsAction` (fresh, bypasses cache), `getExpenseReactions`, `getExpenseDisputes`.

Sections (top → bottom):
1. **Reactions summary** — groups by emoji, shows count + label pills
2. **Pending dispute card** — Accept / Decline for payer or admin (inline `"use server"` form actions)
3. **`ThreadCommentSection`** — client component; owns optimistic comment state for the thread page; renders `ThreadDiscussion` (bubble UI) + sticky `ThreadCommentInput` at `fixed bottom-nav-safe`
4. **Resolved disputes** — historical ✅/❌ section

### Expense detail sheet — `components/expense/expense-detail-sheet.tsx`
WhatsApp-style single-scroll bottom sheet. Key behaviours:
- **Header**: category icon + title + ✏️ edit (if `canEdit`) + ✕ close. No separate footer edit button.
- **Reactions**: compact `rounded-full` pills — only 👍 (thumbs_up), ❓ (opens `QuestionForm`), ⚠️ (opens `DisputeForm`). `seen` removed from manual pills.
- **Auto-seen**: `markSeenAction` fires on every open (`useEffect([isOpen])`). Upsert — no toggle, no duplicates. Passive `👁 Seen by N members` receipt shown in audit trail.
- **Seen count optimistic**: if RSC hasn't confirmed current user yet, display `rscCount + 1` immediately.
- **Reaction count optimistic**: `getDisplayCount(emoji)` applies ±1 delta vs the RSC-confirmed value so count updates instantly on tap without waiting for `router.refresh()`.
- **Comments**: fetched fresh via `fetchExpenseCommentsAction` on open; skeleton shown while loading (`CommentSkeleton` — 2 shimmer bubbles). Cached per expense instance; re-fetched when `expense.id` changes.
- **Auto-scroll**: `scrollToLatest()` uses double-`requestAnimationFrame` + `scrollBodyRef.current.scrollTop = scrollHeight`. Fires from fetch callback (first open) AND from `useEffect([isOpen])` for cached subsequent opens.
- **Optimistic post**: bubble appears immediately; replaced with server data after `fetchExpenseCommentsAction`; on DB error, bubble stays with `isOptimistic: false`.
- **Footer**: compact `ThreadCommentInput` always visible (iMessage style).

### `ThreadDiscussion` — `components/expense/thread-discussion.tsx`
Pure display component. Props: `comments: OptimisticComment[]`, `currentMemberId`, `isAdmin`, `onDelete`. Bubble layout: own messages right (cyan gradient, `rounded-br-sm`), others left (slate, `rounded-bl-sm`). Exports `OptimisticComment = CommentRow & { isOptimistic?: boolean }`.

### `ThreadCommentInput` — `components/expense/thread-comment-input.tsx`
Two modes: **compact** (sheet footer — auto-resize textarea, `Enter` sends, icon-only send button) and **full** (thread page — 2-row textarea, `⌘↵` hint, "Send" label). Props: `onPost`, `isSubmitting`, `compact?`. Parent owns the server action call; component just calls `onPost(content, mentionedIds)`.

### Interaction actions — `app/actions/interactions.ts`
- `markSeenAction(expenseId, groupId)` — upserts `seen` reaction (`onConflictDoNothing`) AND upserts `expense_reads.last_read_at = now()` (`onConflictDoUpdate`). Both writes run in `Promise.all`. No return value. Called fire-and-forget from the detail sheet; the sheet also chains `router.refresh()` after it to clear the unread dot.
- `addComment(...)` — two-tier push notifications: Tier 1 @mentioned members (`@mention` title), Tier 2 payer + prior commenters not already @mentioned (`New comment` title). Both tiers exclude the commenter and respect `notifications_muted`.
- `fetchExpenseCommentsAction(expenseId, groupId)` — bypasses `unstable_cache`; returns fresh `CommentRow[]`. DB errors return `[]` (never throws). Used by both detail sheet and thread page RSC.
- All other mutations return `{ ok: true } | { ok: false, error }` and call `revalidateTag(`interactions-${groupId}`, "max")`.

### Inline server actions in RSC (thread page pattern)
```tsx
<form action={async () => { "use server"; await acceptDispute(id); }}>
```
Valid in Next.js App Router RSC files. Used for Accept / Decline buttons on the thread page.

### Interaction mutations — always call `router.refresh()` after success
`ExpenseDetailSheet` calls `router.refresh()` after every successful interaction so RSC-fetched `interactionCounts` update without full navigation. Pattern applies to: `handleReaction`, `handleAcceptDispute`, `handleDeclineDispute`, `handlePost` (comment), `handleDeleteComment`, `QuestionForm.onSuccess`, `DisputeForm.onSuccess`.

---

## Groups Page

`app/(app)/groups/page.tsx` — RSC. **Seeding order matters**: `ensureDemoGroup()` is `await`-ed first, then `getAllGroups()` runs. This prevents a race condition where `getAllGroups()` SELECT completes before the demo INSERT on first load, showing a spurious empty state.

---

## Settle Page

`app/(app)/groups/[id]/settle/` — page flow is structured to answer questions in natural reading order top → bottom:

1. **`SettleHeroCard`** — personal position. Shows the net amount with two inline figures: "You put in ₹X · fair share ₹Y" directly below the large number so the user immediately understands *why* they owe/are owed without opening anything. Shows person pills for each specific payment.
2. **`DebtFlowGraph`** — interactive SVG of the full group's debt flows. Wrapped in a `glass rounded-2xl overflow-hidden` card. `touchAction: "pan-y"` on the SVG allows vertical page scroll on mobile.
3. **Net balances** (inline in `BalancesSection`, always visible) — a `glass rounded-2xl` card showing every member's net in two columns: name and `+/−₹X` (emerald = owed, amber = owes, "you" cyan pill). Gated by `balances.some(b => b.net !== 0)` so it doesn't appear when all settled.
4. **"Minimum payments"** section (was "Suggested payments") — payment action cards with subtitle "Transfers that zero out all the balances above". `id="suggestion-${i}"` on each card for arc-tap scroll.
5. **`SettleBreakdownSection`** (Suspense, streamed) → **`SettlementBreakdown`** — single accordion "How were expenses split?", expense ledger only. Steps 2 and 3 of the old "How is this calculated?" are now always visible on the page; the accordion's only job is the raw expense + split detail for verification.
6. **Payment history** — past settlements.

**`SectionHeader`** local component in `balances-section.tsx` accepts an optional `subtitle?: string` shown below the icon + label + gradient rule line (padded `pl-9` to align under the label).

**`SettlementBreakdown` props** — simplified to `{ expensesWithSplits, members, currency }`. No longer receives `balances`, `suggestions`, or `pastSettlementsTotal` (those are now rendered directly in `BalancesSection`).

---

## Demo Data Seeding

`ensureDemoGroup()` (`app/actions/demo.ts`) — called on groups page load:
- Seeds **Goa 2025 · Sample** (trip, `is_demo=true`) — 8 expenses, all 4 split modes, 5 members
- Seeds **Mumbai Flat · Sample** (nest, `is_demo=true`) — 7 recurring templates, 4 months of expenses (Feb–May 2026), partial settlements
- Detects stale nest seed by description string and re-seeds automatically
- Trip card: `data-tour="demo-trip"` | Nest card: `data-tour="demo-nest"`
- Demo groups pinned first (`ORDER BY is_demo DESC`)

---

## Onboarding Tour (9 steps — 4 default + 5 extended)

`getTourSteps(demoTripId)` in `lib/tour/steps.ts`. `DEFAULT_STEP_COUNT = 4`.

**Default tour (stays on /groups):** step 1 = welcome modal, 2 = `[data-tour='new-trip-btn']`, 3 = `[data-tour='trip-card-add-btn']` (quick-add, auto-advances when `[data-tour='quick-add-open']` appears), 4 = `[data-tour='demo-nav-sheet']` (opened via `window.dispatchEvent(new CustomEvent('open-demo-navsheet', { detail: demoTripId }))`), ends with "Done / Show me more →".

**Extended tour (opt-in, 5 steps):** steps 5–9:
- 5 (idx 4): `[data-tour='expense-list-header']` → expenses page — search/filter
- 6 (idx 5): `[data-tour='expense-timeline-day1']` → expenses page — Day 1 card only; dispatches `tour-switch-timeline-view` event (400ms delay); `ExpenseFilters` listens and calls `setAndSaveViewMode("timeline")`; first `DaySection` (index 0) carries `data-tour="expense-timeline-day1"` via `dataTour` prop
- 7 (idx 6): `[data-tour='debt-flow-graph']` → settle page — debt flow graph (wrapper div in `balances-section.tsx`)
- 8 (idx 7): `[data-tour='insights-charts']` → per-group insights — category/spend charts
- 9 (idx 8): `[data-tour='all-insights-trips']` → /insights — all-groups spending story

Finishing → `/groups` + `CelebrationCard`.

**localStorage keys**: `clear_tour_done`, `clear_nest_hint_done`, `clear_longpress_hint_done`, `first_expense_added`, `first_group_created`.

**Key constraints:**
- Auto-launch polls for `[data-tour='new-trip-btn']` (300ms delay, 250ms interval) — do NOT change to immediate; prevents blank blur before `ensureDemoGroup()` seeding.
- Avatar shows cyan dot at `-top-0.5 -right-0.5` until `clear_tour_done` is set.
- `NestHint` — 2-step overlay on nest expenses page (`[data-tour='templates-section']` → `[data-tour='log-template-btn']`).
- `TripCard` listens for `open-demo-navsheet` custom event via `useEffect`.
- `ExpenseFilters` listens for two tour custom events: `tour-switch-full-view` (step 5) and `tour-switch-timeline-view` (step 6); both call `setAndSaveViewMode()` and persist to localStorage.
- `showMore()` (in `tour-context.tsx`) pre-writes `"full"` to `clear_expense_view_mode` localStorage **before** navigating to `/expenses`, so the component mounts in list mode even if "timeline" was previously saved. The 400ms event is a backup for the already-mounted case.
- `demoTripId` is read by iterating **all** `<a>` tags inside `[data-tour='demo-trip']` with a no-`$`-anchor regex — necessary because the member-count badge link (`/groups/{id}/members`) appears before the main group link in DOM order.

---

## Subscription & Monetization

### Pricing constants — `lib/subscription/founder.ts` (server-only)

Single source of truth for all prices and founder slot logic. `import "server-only"` guards it from client bundles. All RSC pages import from here and pass computed values as serializable props to client components — nothing is hardcoded in UI.

```
FOUNDER_SLOTS_TOTAL = 500
FOUNDER_PRICE       = { monthly: 79,  annual: 699 }   // ₹79/mo · ₹699/yr
REGULAR_PRICE       = { monthly: 99,  annual: 799 }   // ₹99/mo · ₹799/yr
FOUNDER_ANNUAL_MONTHLY_EQUIV = 58   // floor(699 / 12)
REGULAR_ANNUAL_MONTHLY_EQUIV = 66   // floor(799 / 12)
FOUNDER_ANNUAL_SAVINGS       = 489  // 99×12 − 699  (savings vs paying regular monthly)
REGULAR_ANNUAL_SAVINGS       = 389  // 99×12 − 799
```

- `getFounderSlotsClaimed()` — counts `status='active'` subscriptions; **fails open** (returns 0 on DB error so founder pricing always shows rather than blocking upgrade)
- `isFounderActive(claimed)` — `true` when `claimed < FOUNDER_SLOTS_TOTAL`

### Plan-check logic — `lib/subscription/gates.ts`

**Key exports:**
- `getUserPlan(userId)` — React-`cache()`-wrapped; returns `"plus"` for BOTH `active` AND `trialing`. Use for feature gates only.
- `getUserSubscription(userId)` — uncached, returns full `Subscription | null`. Use when you need to distinguish active vs trialing (upgrade, checkout, settings pages).
- `getGroupPlan(groupId)` — inherits from group admin's plan.
- `getGroupsAdminPlans(groupIds[])` — batch JOIN for N groups; one query.

**`isPlus` vs `isTrialing` pattern (upgrade/checkout/settings):** use `getUserSubscription(user.id)` — `isPlus = plan==="plus" && status==="active"`, `isTrialing = status==="trialing"`. Never use `getUserPlan()` here — it masks trial state.

**Free plan limits:** 4 non-demo non-archived groups, 8 members per group, 50 expenses per group.
**Plus unlocks:** unlimited everything, AI features, CSV export, all split modes, recurring templates, budget tracking. Group admin's plan covers all members.

### Actions — `app/actions/subscription.ts`

- `activatePlusDemo(cycle: "monthly" | "annual")` — upserts subscription: `plan="plus"`, `status="active"`, stores `billingCycle`, sets `currentPeriodEnd` to +30 days. Calls `revalidatePath("/", "layout")`.
- `cancelPlusDemo()` — sets `plan="free"`, `status="cancelled"`, clears `billingCycle` + `currentPeriodEnd`. Calls `revalidatePath("/", "layout")`.

### Upgrade flow

1. **`/pricing`** — public. `PlanCards` is async RSC (fetches founder slots, renders amber founder banner with slot progress bar + strikethrough pricing). `FaqSection` is `"use client"` (accordion open/close state, Expand all / Collapse all toggle, 2-column grid at `lg:`, `max-w-5xl`).
2. **`/upgrade`** — RSC fetches founder slots + user sub; passes all computed pricing props to `PricingCards` (client). Amber founder notice banner above cards when active. Monthly/Annual toggle; both views show ~~regular price~~ → founder price. `isPlus` users see "You're on Plus" panel; trialing users see upgrade CTA. Layout: `max-w-5xl`, `flex-1 justify-center` fills viewport height.
3. **`/upgrade/checkout`** — RSC same data fetch, passes to `CheckoutForm` (client). Annual view shows savings callout box (emerald). "Activate Plus free →" calls `activatePlusDemo(cycle)` → `router.push("/groups")`. Redirects away only if `isPlus`; trialing users may still visit.

### Settings page (`/settings`)

`settings-layout.tsx` — `useState` tab switching (`appearance|billing|notifications|profile`). Desktop: sidebar; inactive sections `md:hidden`. Mobile: all stacked. **Anchor-scroll doesn't work** — page too short when only some sections render.

**Profile section** — editable display name. `updateDisplayNameAction` (in `app/actions/members.ts`) updates every `group_members` row for the user in one query; returns `{ ok, error }`. Shows Google avatar + email (read-only). Input saves on blur.

**Admin users table**: `sm:hidden` mobile cards + `hidden sm:block` desktop table.

---

## Insights Architecture

### Per-group (`/groups/[id]/insights`)

RSC. Fetches `getGroupWithMembers(id, { full: true })`, `getGroupExpensesWithSplits(id)`, and `getCurrentUser()` in parallel. Computes `computeTripInsights`, `computeGroupRoles`, and `computeSpendTrajectory` server-side.

**Trip state** is derived from `startDate`/`endDate` vs today (string comparison on `"yyyy-MM-dd"`):
- `active` — today is within the trip range
- `completed` — trip has ended
- `future` — trip hasn't started (may have pre-booked expenses)
- `undated` — no dates set

**Trip section order** (state-aware):
1. Desktop header (Back · amber icon · "Insights" · meta-line · Share summary link)
2. Mobile meta-line (`md:hidden`) — always visible on small screens
3. Opening sentence card — rule-based narrative: "Day 3 of 5 · Food at 38% · ₹2,100/day" (active) / "Food dominated at 38% · under budget 🎉" (completed) / pre-booked + budget + T-minus (future)
4. **Active trip only**: Pace Tracker BEFORE KPIs (hero position on live trip)
5. **Future trip only**: T-minus badge (🗓️ "Starts in N days")
6. KPI grid (2×2 on mobile, 4-col on sm+): Total spend (accent) · Per person · Daily avg · Contextual 4th → budget% if budget set, else "Your position" (links to /settle, hover ring, "settle →" sub)
7. Highlights strip — 3 vivid `HighlightsStrip` cards: biggest expense · peak day · tab-picker. **Quality guard**: only renders when `expenseList.length >= 3` to avoid tautologies with 1–2 expenses. Dynamic grid: 1 highlight → `grid-cols-1 max-w-sm`, 2 → `grid-cols-2`, 3 → `grid-cols-3`.
8. Pace Tracker (non-active trips) — `groupId` prop for "Review expenses →" link on watch/over. When trip complete + under budget: `"Under budget 🎉"` badge + emerald ambient glow. When complete: "Final total" label replaces "Projected total".
9. Breakdown section header + 3 charts: CategoryDonut · Stacked DailySpendBar · MemberContributions
10. Group Dynamics — hidden when `members.length < 2`; shows fairness score + distinctive roles only (Traveler badges suppressed)
11. Cross-trip comparison (Suspense-streamed `CrossTripSection` — owns its section header so it only renders when insights exist)
12. Plan vs Reality (`AdherenceCard`) — trips with itinerary only

**Nest section order**:
1–3 same header/meta/opening as trip
4. KPI grid: This month (accent + MoM sub-label) · Per person this month · Recurring this month (₹X · Y%) · All time
5. Highlights strip: category mover (biggest MoM category delta) · recurring coverage % · biggest single expense (tab-picker fallback)
6. Nest Pace Card — monthly projection: `thisMonthSpend / daysElapsed × daysInMonth` vs 3-month rolling avg. Shows "On pace / Watch it / Trending over / Building baseline". "Review expenses →" link on watch/over.
7. Breakdown: CategoryDonut · MonthlySpendBar (with `monthlyAverage` reference line) · MemberContributions
8. Group Dynamics

**Key component props added**:
- `MemberContributions`: `fairShare?` → cyan dashed `ReferenceLine x={fairShare}` labelled "fair share"; bars to right = overpaid, left = underpaid. `currentMemberId` → "You" label in cyan on Y-axis, darker cyan bars for current user's row. `currentUserNet` → net callout below chart. `settleHref` → "Collect →" / "Settle →" link.
- `MonthlySpendBar`: `monthlyAverage?` → cyan dashed `ReferenceLine y={monthlyAverage}` labelled "avg".
- `PaceTrackerCard`: `groupId` prop for action links.

**`DaySpend` interface** (in `lib/insights/trip-insights.ts`): includes `cats: Record<string, number>` — category slug → amount for that day. Populated by `dayCatMap` in `computeTripInsights`. Used by `DailySpendBar` for stacked bars.

**`DailySpendBar`**: stacked bar chart using `DaySpend.cats`. Categories sorted by total spend descending (largest at bottom = most visually prominent). Uses `CATEGORY_HEX` for fill colors — same palette as `CategoryDonut` so color language threads across charts. Top-3 compact legend in card header. Peak-day total annotated in cyan above the tallest stack via `LabelList` on the topmost `Bar`. Falls back to plain cyan bar when `cats` is empty.

**`HighlightsStrip`** (`components/insights/highlights-strip.tsx`): `"use client"`. `Highlight[]` from `lib/insights/trip-insights.ts`. Each card has Framer Motion scale+fade stagger (90ms apart), colored gradient orbs (`accentColor` Tailwind gradient pair), Fraunces title, `line-clamp-2` sub. Dynamic `grid-cols` based on `highlights.length`.

**`NestPaceCard`** (`components/insights/nest-pace-card.tsx`): `computeNestPaceData()` exported from same file. `NestPaceStatus`: `on_track | watch | over | building | complete`. Rolling avg from last 3 completed months. Shows `daysElapsed / daysInMonth` progress, projected vs avg bar, action link when over/watch.

**Trip highlights** only compute when `expenseList.length >= 3`. Nest highlights each have their own data guards (e.g. category mover requires prior-month data, recurring requires templates).

**`fairShare`** passed to `MemberContributions`: `Math.round(insights.totalSpend / members.length)`. **`nestMonthlyAverage`** passed to `MonthlySpendBar`: `Math.round(insights.totalSpend / monthlyData.length)`.

### All-groups (`/insights`)

RSC → `InsightsTabs` (`"use client"`, `AnimatePresence` tab cross-fade). `getAllTripsInsightsData`, `getAllNestsInsightsData`, and `getPersonalInsightsData` fetched in parallel alongside `getUserPlan`. `InsightsTabs` is client-only for tab state — all heavy computation is server-side in the lib functions.

**`InsightsTabs` props**: `tripsData`, `nestsData`, `primaryCurrency`, `personalData: PersonalInsights | null`, `isPlusUser: boolean`.

**Tab switcher**: always renders all available tabs — Trips (if any), Nests (if any), and **You** (always). "You" tab uses violet active state (`from-violet-500 to-purple-600`) to distinguish it from the cyan Trips/Nests tabs.

**Cross-tab card** (`components/insights/cross-tab-card.tsx`): shown above the tab switcher when user has **both** trips and nests. Shows home daily rate (`monthlyAverage / 30`) vs travel daily rate (`totalSpend / totalDays`), multiplier ("travel is 7.5× more expensive"), and combined all-time total when same currency (INR). Framer Motion entrance.

**Trips tab** (`TripsContent`):
- Heading: "Your travel story" + `N trips · N days on the road · since YYYY`
- KPIs: Total spent (accent) · Trips (avg sub) · Days on road · Companions
- Highlights: biggest trip · `dailyPace` (₹/day) · most-traveled-with companion (userId match + guest name fallback across groups)
- `TripsBreakdownCharts` component: groups `byTrip` by currency; single-currency → TripsSpendBar + CategoryDonut side-by-side; multi-currency → one `TripsSpendBar` per currency (labelled "Spend per trip · INR/USD") + CategoryDonut below. Prevents meaningless cross-currency amount comparison on one axis.
- `TripsSpendBar` (horizontal, `ComposedChart`): `layout="vertical"`, chronological order (oldest top), two-line Y-axis tick (trip name + date · days via SVG `<tspan>`), trend `Line` for 3+ trips (dashed cyan, connects bar tips top→bottom = spending trajectory). Peak bar = full cyan, others = light cyan.
- Per-trip link cards: colorful gradient icons cycling through 8 gradients, "May 2024 · 5 days · N members" subtitle.

**Nests tab** (`NestsContent`):
- Heading: "Your household story" + `N nests · since MMM YYYY · ₹X/mo average`
- KPIs: Monthly average (accent + MoM sub) · Total spend · Recurring/mo (₹X · Y%) · Mates
- Highlights: recurring baseline · biggest month ever · year-over-year (same-period comparison `Jan–May YYYY vs Jan–May YYYY-1`) or MoM fallback
- MonthlySpendBar + CategoryDonut
- Per-nest link cards: teal/emerald cycling gradients

**You tab** (`PersonalContent` from `components/insights/personal-content.tsx`):
- **Plus gate**: non-Plus users see `PersonalPlusGate` (violet upgrade card). Plus/trialing users see full content.
- **Opening sentence** — rule-based: "Since YYYY, you've shared ₹X with N people across N groups." + optional sub "You almost always pay first — and always get paid back." (shown when banker float > 15% of share).
- **KPI row** — Total your share (amber accent card) + Avg/month (glass card). No filler count KPIs.
- **Zone 1 — Right now** (net position): two side-by-side glass cards (Owed to you / You owe), each with per-group rows linking to `/groups/[id]/settle`. Only rendered when `totalOwedToMe > 0 || totalIOwe > 0`.
- **Zone 2 — Financial circle**: up to 5 `PersonalCompanion` cards (userId-matched Clear users across all groups). Each card: `MemberAvatar` (same hash-gradient system) + name + active dot (shared in last 90 days) + group count + human label ("Your most shared companion" etc.) + shared total. Stagger-animated via Framer Motion.
- **Zone 3 — Triggered insight + Banker card**: ONE insight card fires from 4 rules (priority: companion dominance → heavy banker → YoY trajectory → milestone). `BankerCard` shows paid upfront vs actual share, animated progress bar, year-over-year trend arrow (only when prev year float exists). Only rendered when banker float > 10% of total share.
- **Zone 4 — Breakdown**: `CategoryDonut` (your share by category, not group totals) + `GroupShareBars` (animated per-group horizontal bars, each row links to `/groups/[id]/insights`).

**Triggered insight rules** (first match wins):
1. Companion: companion appears in ≥3 groups
2. Banker: float > 30% of total share
3. YoY: this year's total > same point last year by >30%
4. Milestone: total share crossed ₹20k / ₹50k / ₹1L / ₹2L / ₹5L

**`PersonalInsights` data model** (`lib/insights/personal-insights.ts`):
- `totalShare`, `totalPaidUpfront`, `bankerFloat`, `bankerFloatPrevYear` — core money numbers
- `netByGroup[]` — per-group net (primary currency only), sorted by abs(net) desc, settled groups excluded
- `companions[]` — userId-matched members, sorted by groupCount then totalShared, max 5
- `byCategory[]` — `CategorySlice[]` of user's personal share (not group totals)
- `byGroup[]` — per-group share breakdown, sorted by myShare desc
- `triggeredInsight` — `{ text, icon } | null`
- `openingSentence`, `openingSub` — pre-computed narrative strings
- Primary currency = highest-volume currency across all splits (same approach as trips tab)

**Data model additions**:
- `TripSummary`: `startDate`, `endDate` — enables days computation, chronological sort, date subtitles on link cards
- `AllTripsInsights`: `totalDays`, `dailyPace`, `mostTraveledWith`, `mostTraveledMonth`, `highlights[]`
- `AllNestsInsights`: `recurringTotal`, `recurringPct`, `biggestMonth`, `yearOverYear`, `currency`, `highlights[]`
- `AllNestsInsights.currency` — from `nests[0].defaultCurrency`; replaces hardcoded `"INR"` throughout the nest insights tab

**`section headers`** throughout all tabs use amber icon-badge + gradient rule (matching per-group insights and design system). Implemented as a local `SectionHeader` component in each content component.

**`data-tour` attributes**: `data-tour="trip-kpis"` on trip KPI grid; `data-tour="all-insights-trips"` on `TripsBreakdownCharts` div.

---

## Admin Dashboard Patterns

**Non-async layout** — `app/admin/layout.tsx` is synchronous so `loading.tsx` works. `requirePlatformAdmin()` in each page query is the authoritative auth check.

**Admin navigation** — `/admin` is outside `/(app)`, so `router.push("/admin")` silently fails. Use `window.location.href = "/admin"` with `window.dispatchEvent(new Event("navprogress"))` first so `NavProgress` starts before the page unloads.

**`withAdminTimeout`** — all admin queries run in `db.transaction()` with `SET LOCAL statement_timeout = 8000`. Hard-cancels slow queries, releases connections immediately.

**Admin query design** — `getAdminStats()`: 4 subqueries in 1 round-trip. `getAdminUserList()`: DB query inside `withAdminTimeout`; Supabase Admin `listUsers()` OUTSIDE the transaction (identifies platform admins by email). Email field returns empty string in UI.

**Admin delete** — `adminDeleteGroup` + `adminDeleteUser` in `app/actions/admin.ts`. Group delete cascades via FK. Guards: demo groups and platform admins cannot be deleted.

**DB resilience** — `lib/db/client.ts`: `max:3`, `idle_timeout:20`, `connect_timeout:10`. Admin page uses `Promise.race` against 12s fallback (never rejects).
