# Clear — App Routes & Features Reference

> Loaded when editing `app/**`.

---

## Project Structure

```
clear/
├── app/
│   ├── icon.tsx, error.tsx, not-found.tsx, layout.tsx, page.tsx, globals.css
│   ├── (auth)/login/page.tsx + login-form.tsx   # standalone fallback (direct URL / proxy redirects)
│   ├── @modal/default.tsx                        # null — slot is empty when no modal active
│   │   └── (.)login/page.tsx                     # intercepts client-side /login nav → LoginModal overlay
│   ├── auth/callback/route.ts
│   ├── (app)/
│   │   ├── layout.tsx, error.tsx, app-nav.tsx
│   │   ├── insights/page.tsx + loading.tsx
│   │   ├── upgrade/page.tsx + pricing-cards.tsx (client: billing toggle, Free/Plus cards)
│   │   │   └── checkout/page.tsx + checkout-form.tsx (order summary, activatePlusDemo)
│   │   ├── settings/page.tsx + settings-layout.tsx + billing-section.tsx + notifications-section.tsx
│   │   └── groups/
│   │       ├── page.tsx, loading.tsx
│   │       ├── new/page.tsx + create-trip-form.tsx
│   │       └── [id]/
│   │           ├── layout.tsx (RealtimeRefresh + GroupMobileNav, async), page.tsx
│   │           ├── edit/page.tsx + edit-trip-form.tsx
│   │           ├── expenses/page.tsx, loading.tsx, new/, [expenseId]/edit/, [expenseId]/thread/page.tsx, templates/new/, templates/[templateId]/edit/
│   │           ├── members/page.tsx, loading.tsx + forms/buttons + import-members-sheet.tsx
│   │           ├── settle/page.tsx, loading.tsx, balances-section.tsx, balance-cards-client.tsx, mark-paid-button, upi-pay-button
│   │           └── insights/page.tsx + loading.tsx
│   ├── pricing/page.tsx + plan-cards.tsx + faq-section.tsx   # public — no auth; plan-cards is async RSC (fetches founder slots); faq-section is client (Expand all / accordion state)
│   ├── changelog/page.tsx + loading.tsx   # public — 15-release timeline; data in lib/changelog.ts
│   ├── join/[token]/page.tsx + join-button.tsx
│   ├── summary/[token]/page.tsx + opengraph-image.tsx
│   ├── api/groups/[id]/export/route.ts    # CSV download
│   └── actions/
│       ├── groups.ts (+ importMembersFromGroup), expenses.ts, members.ts, settlements.ts, unsplash.ts, upload.ts
│       ├── parse-expense.ts, narrative.ts, trip-adherence.ts, parse-chat.ts, parse-itinerary.ts
│       ├── admin.ts                       # adminDeleteGroup, adminDeleteUser (platform admin only)
│       ├── subscription.ts                # activatePlusDemo, cancelPlusDemo
│       ├── interactions.ts                # addReaction, raiseQuestion, raiseDispute, cancelMyDispute, acceptDispute, declineDispute, addComment, deleteComment, fetchMemberStatsAction
│       └── demo.ts                        # ensureDemoGroup — seeds trip + nest demos
│   ├── api/
│   │   ├── groups/[id]/export/route.ts, push/subscribe/route.ts, push/unsubscribe/route.ts
│   │   └── unsubscribe/route.ts           # email unsubscribe (HMAC-verified)
├── components/
│   ├── ui/                              # shadcn/base-ui primitives
│   ├── expense/  (expense-card, swipeable-expense-card, expense-detail-sheet, expense-filters, split-editor, quick-add-bar, chat-import-dialog, question-form, dispute-form, thread-comment-input, ...)
│   ├── trip/     (trip-card, trip-card-nav-sheet, trip-card-share-drawer, invite-section, group-balance-badge [async RSC], cover-photo-picker, budget-bar, narrative-section, adherence-card, settle-balance-badge, insights-summary-badge, nest-monthly-badge, group-activity-feed, trip-timeline, repeat-trip-prompt, ...)
│   ├── settlement/ (settlement-breakdown, member-debt-breakdown, settled-celebration, debt-flow-graph, settle-hero-card)
│   ├── marketing/ (settle-flow-demo — hardcoded animated SVG debt-flow demo for landing page, no DB dependency)
│   ├── insights/ (kpi-card, category-donut, daily-spend-bar, monthly-spend-bar, member-contributions, trips-spend-bar, insights-tabs, ...)
│   ├── tour/     (tour-context.tsx, tour-layer.tsx)
│   └── shared/   (skeleton, animated-list, count-up, confirm-dialog, member-avatar, member-profile-sheet, mobile-nav, group-mobile-nav, realtime-refresh, theme-toggle, nav-progress, clear-logo, invite-qr-sheet, swipe-hint, ios-install-hint, long-press-hint, nest-hint, push-permission-prompt)
├── hooks/  use-trip-realtime.ts, use-warn-before-leave.ts, use-speech-recognition.ts, use-push-subscription.ts, use-recent-categories.ts, use-sheet-dismiss.ts
├── lib/
│   ├── db/client.ts, schema/*.ts, queries/(groups [+ getGroupsForImport], expenses, balances, insights, meta, admin, auth, activity, interactions).ts
│   ├── supabase/server.ts, client.ts, admin.ts
│   ├── demo/seed-demo-trip.ts + seed-demo-nest.ts
│   ├── tour/types.ts + steps.ts
│   ├── group-config.ts, categories.ts
│   ├── insights/trip-insights.ts + all-trips-insights.ts + all-nests-insights.ts + group-roles.ts
│   ├── parser/parse-expense.ts
│   ├── interactions/split-transforms.ts + split-transforms.test.ts   # pure dispute auto-resolve transforms (20 tests)
│   ├── splits/compute.ts + compute.test.ts
│   ├── settle/optimize.ts + optimize.test.ts
│   ├── validations/trip.ts + expense.ts + settlement.ts
│   ├── analytics.ts, rate-limit.ts, utils.ts
│   ├── changelog.ts                       # typed static data — 15 ChangelogRelease entries (newest first)
│   ├── subscription/gates.ts            # getUserPlan, getUserSubscription, getGroupPlan, gates, nudges
│   ├── subscription/founder.ts          # server-only; all pricing constants + getFounderSlotsClaimed() + isFounderActive()
│   └── notifications/expense-email.ts + send-expense-notification.ts + send-push-notification.ts
├── drizzle/policies.sql, indexes.sql
├── drizzle.config.ts, proxy.ts, vercel.json
```

---

## Landing Page (`app/page.tsx`)

RSC. Redirects authenticated users to `/groups`. Section order (top → bottom):

1. Nav → Hero → Ticker → How it works → Why Clear? (comparison table + feature pills)
2. Recurring templates → Trip timeline → AI features → Notifications → Social layer
3. **Settlement** — "One payment each / No chasing" before/after table (Goa 2025 example, 5 people → 3 transfers)
4. **Debt Flow** — animated `SettleFlowDemo` mockup (`components/marketing/settle-flow-demo.tsx`) + copy + 3 feature bullets (2-column desktop)
5. **Insights** — category bars + member contributions mockup + copy
6. Plus teaser → Bottom CTA → Footer

**Why Clear? table** — 6-row comparison (Other apps vs Clear ✦): AI parsing · guest members · minimum transactions · **Debt Flow graph** · notifications · in-app disputes. Feature pills below include "Debt flow graph".

`SettleFlowDemo` is a `"use client"` component with hardcoded Goa 2025 data (same 5 members and 3 transfers as the Settlement section). Shared node gradients (`AVATAR_COLORS`) and particle patterns with the real `DebtFlowGraph`.

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

**Per-group** (`/groups/[id]/insights`): Trip → KPIs, PaceTracker, CategoryDonut, DailySpendBar, MemberContributions, GroupRoles, CrossTripCard, AdherenceCard, SmartInsights. Nest → KPIs, CategoryDonut, MonthlySpendBar (stacked recurring+adhoc), MemberContributions, GroupRoles, SmartInsights.

**All-groups** (`/insights`) — tabbed (Trips / Nests). Tab switcher only if user has both. `getAllTripsInsightsData` uses single `GROUP BY group_id` query. `getAllNestsInsightsData` derives category totals in-memory.

---

## Admin Dashboard Patterns

**Non-async layout** — `app/admin/layout.tsx` is synchronous so `loading.tsx` works. `requirePlatformAdmin()` in each page query is the authoritative auth check.

**Admin navigation** — `/admin` is outside `/(app)`, so `router.push("/admin")` silently fails. Use `window.location.href = "/admin"` with `window.dispatchEvent(new Event("navprogress"))` first so `NavProgress` starts before the page unloads.

**`withAdminTimeout`** — all admin queries run in `db.transaction()` with `SET LOCAL statement_timeout = 8000`. Hard-cancels slow queries, releases connections immediately.

**Admin query design** — `getAdminStats()`: 4 subqueries in 1 round-trip. `getAdminUserList()`: DB query inside `withAdminTimeout`; Supabase Admin `listUsers()` OUTSIDE the transaction (identifies platform admins by email). Email field returns empty string in UI.

**Admin delete** — `adminDeleteGroup` + `adminDeleteUser` in `app/actions/admin.ts`. Group delete cascades via FK. Guards: demo groups and platform admins cannot be deleted.

**DB resilience** — `lib/db/client.ts`: `max:3`, `idle_timeout:20`, `connect_timeout:10`. Admin page uses `Promise.race` against 12s fallback (never rejects).
