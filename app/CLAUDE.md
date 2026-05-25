# Clear — App Routes & Features Reference

> Loaded when editing `app/**`.

---

## Project Structure

```
clear/
├── app/
│   ├── icon.tsx, error.tsx, not-found.tsx, layout.tsx, page.tsx, globals.css
│   ├── (auth)/login/page.tsx + login-form.tsx
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
│   │           ├── expenses/page.tsx, loading.tsx, new/, [expenseId]/edit/, templates/new/, templates/[templateId]/edit/
│   │           ├── members/page.tsx, loading.tsx + forms/buttons
│   │           ├── settle/page.tsx, loading.tsx, balances-section.tsx, mark-paid-button, upi-pay-button
│   │           └── insights/page.tsx + loading.tsx
│   ├── join/[token]/page.tsx + join-button.tsx
│   ├── summary/[token]/page.tsx + opengraph-image.tsx
│   ├── api/groups/[id]/export/route.ts    # CSV download
│   └── actions/
│       ├── groups.ts, expenses.ts, members.ts, settlements.ts, unsplash.ts, upload.ts
│       ├── parse-expense.ts, narrative.ts, trip-adherence.ts, parse-chat.ts, parse-itinerary.ts
│       ├── admin.ts                       # adminDeleteGroup, adminDeleteUser (platform admin only)
│       ├── subscription.ts                # activatePlusDemo, cancelPlusDemo
│       └── demo.ts                        # ensureDemoGroup — seeds trip + nest demos
│   ├── api/
│   │   ├── groups/[id]/export/route.ts, push/subscribe/route.ts, push/unsubscribe/route.ts
│   │   └── unsubscribe/route.ts           # email unsubscribe (HMAC-verified)
├── components/
│   ├── ui/                              # shadcn/base-ui primitives
│   ├── expense/  (expense-card, swipeable-expense-card, expense-detail-sheet, expense-filters, split-editor, quick-add-bar, chat-import-dialog, ...)
│   ├── trip/     (trip-card, trip-card-nav-sheet, trip-card-share-drawer, invite-section, group-balance-badge [async RSC], cover-photo-picker, budget-bar, narrative-section, adherence-card, settle-balance-badge, insights-summary-badge, nest-monthly-badge, group-activity-feed, ...)
│   ├── settlement/ (settlement-breakdown, member-debt-breakdown)
│   ├── insights/ (kpi-card, category-donut, daily-spend-bar, monthly-spend-bar, member-contributions, trips-spend-bar, insights-tabs, ...)
│   ├── tour/     (tour-context.tsx, tour-layer.tsx)
│   └── shared/   (skeleton, animated-list, count-up, confirm-dialog, member-avatar, mobile-nav, group-mobile-nav, realtime-refresh, theme-toggle, nav-progress, clear-logo, invite-qr-sheet, swipe-hint, ios-install-hint, long-press-hint, nest-hint, push-permission-prompt)
├── hooks/  use-trip-realtime.ts, use-warn-before-leave.ts, use-speech-recognition.ts, use-push-subscription.ts, use-recent-categories.ts
├── lib/
│   ├── db/client.ts, schema/*.ts, queries/(groups, expenses, balances, insights, meta, admin, auth, activity).ts
│   ├── supabase/server.ts, client.ts, admin.ts
│   ├── demo/seed-demo-trip.ts + seed-demo-nest.ts
│   ├── tour/types.ts + steps.ts
│   ├── group-config.ts, categories.ts
│   ├── insights/trip-insights.ts + all-trips-insights.ts + all-nests-insights.ts + group-roles.ts
│   ├── parser/parse-expense.ts
│   ├── splits/compute.ts + compute.test.ts
│   ├── settle/optimize.ts + optimize.test.ts
│   ├── validations/trip.ts + expense.ts + settlement.ts
│   ├── analytics.ts, rate-limit.ts, utils.ts
│   ├── subscription/gates.ts            # getUserPlan, getUserSubscription, getGroupPlan, gates, nudges
│   └── notifications/expense-email.ts + send-expense-notification.ts + send-push-notification.ts
├── drizzle/policies.sql, indexes.sql
├── drizzle.config.ts, proxy.ts, vercel.json
```

---

## Demo Data Seeding

`ensureDemoGroup()` (`app/actions/demo.ts`) — called on groups page load:
- Seeds **Goa 2025 · Sample** (trip, `is_demo=true`) — 8 expenses, all 4 split modes, 5 members
- Seeds **Mumbai Flat · Sample** (nest, `is_demo=true`) — 7 recurring templates, 4 months of expenses (Feb–May 2026), partial settlements
- Detects stale nest seed by description string and re-seeds automatically
- Trip card: `data-tour="demo-trip"` | Nest card: `data-tour="demo-nest"`
- Demo groups pinned first (`ORDER BY is_demo DESC`)

---

## Onboarding Tour (7 steps — 4 default + 3 extended)

`getTourSteps(demoTripId)` in `lib/tour/steps.ts`. `DEFAULT_STEP_COUNT = 4`.

**Default tour (stays on /groups):** step 1 = welcome modal, 2 = `[data-tour='new-trip-btn']`, 3 = `[data-tour='trip-card-add-btn']` (quick-add, auto-advances when `[data-tour='quick-add-open']` appears), 4 = `[data-tour='demo-nav-sheet']` (opened via `window.dispatchEvent(new CustomEvent('open-demo-navsheet', { detail: demoTripId }))`), ends with "Done / Show me more →".

**Extended tour (opt-in):** steps 5–7 navigate into demo group → expenses, per-group insights, all-groups insights. Finishing → `/groups` + `CelebrationCard`.

**localStorage keys**: `clear_tour_done`, `clear_nest_hint_done`, `clear_longpress_hint_done`, `first_expense_added`, `first_group_created`.

**Key constraints:**
- Auto-launch polls for `[data-tour='new-trip-btn']` (300ms delay, 250ms interval) — do NOT change to immediate; prevents blank blur before `ensureDemoGroup()` seeding.
- Avatar shows cyan dot at `-top-0.5 -right-0.5` until `clear_tour_done` is set.
- `NestHint` — 2-step overlay on nest expenses page (`[data-tour='templates-section']` → `[data-tour='log-template-btn']`).
- `TripCard` listens for `open-demo-navsheet` custom event via `useEffect`.

---

## Subscription & Monetization

`lib/subscription/gates.ts` — all plan-check logic.

**Key exports:**
- `getUserPlan(userId)` — React-`cache()`-wrapped; returns `"plus"` for BOTH `active` AND `trialing`. Use for feature gates only.
- `getUserSubscription(userId)` — uncached, returns full `Subscription | null`. Use when you need to distinguish active vs trialing (upgrade, checkout, settings pages).
- `getGroupPlan(groupId)` — inherits from group admin's plan.
- `getGroupsAdminPlans(groupIds[])` — batch JOIN for N groups; one query.

**`isPlus` vs `isTrialing` pattern (upgrade/checkout/settings):** use `getUserSubscription(user.id)` — `isPlus = plan==="plus" && status==="active"`, `isTrialing = status==="trialing"`. Never use `getUserPlan()` here — it masks trial state.

**Free plan limits:** 4 non-demo non-archived groups, 8 members per group, 50 expenses per group.
**Plus unlocks:** unlimited everything, AI features, CSV export, all split modes, recurring templates, budget tracking. Group admin's plan covers all members.

**Actions (`app/actions/subscription.ts`):**
- `activatePlusDemo(cycle: "monthly" | "annual")` — upserts subscription: `plan="plus"`, `status="active"`, stores `billingCycle`, sets `currentPeriodEnd` to +30 days. Calls `revalidatePath("/", "layout")`.
- `cancelPlusDemo()` — sets `plan="free"`, `status="cancelled"`, clears `billingCycle` + `currentPeriodEnd`. Calls `revalidatePath("/", "layout")`.

**Upgrade flow:**
1. `/upgrade` — global Monthly/Annual toggle above Free + Plus cards. Trialing users see different subtitle; `isPlus` users see confirmation panel instead.
2. `/upgrade/checkout` — radio picker (defaults from URL `?cycle`). Order summary: price strikethrough → Founder discount → ₹0 total. "Activate Plus free →" calls `activatePlusDemo(cycle)` → `router.push("/groups")`. Redirects away only if `isPlus`; trialing users may still visit.

**Settings page (`/settings`):** `settings-layout.tsx` — `useState` tab switching (`appearance|billing|notifications`). Desktop: sidebar; inactive sections `md:hidden`. Mobile: all stacked. **Anchor-scroll doesn't work** — page too short when only some sections render.

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
