# CLAUDE.md — Clear

> Source of truth for Claude Code. Reflects actual built state. When in doubt, ask.

---

## 1. Project Overview

**Clear** — shared expense tracking for trips and households. Members log expenses, app computes minimum-transaction settlements. Deployed on Vercel + Supabase (free tier).

**Tagline**: *Split it. Clear it.*
**Design**: Glassmorphic, cyan/teal palette, frosted-glass cards.

**Two group types:**
- **Trip** — multi-day travel. Has dates, itinerary, AI narrative, budget adherence, travel categories.
- **Nest** — ongoing household. Has recurring expense templates, monthly grouping, household categories. No dates/itinerary.

---

## 2. Tech Stack (LOCKED — do not substitute without asking)

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 16 (App Router, TypeScript) | |
| Styling | Tailwind CSS v4 | CSS-first config, no tailwind.config.ts |
| UI | shadcn/ui | Uses **@base-ui/react** (not Radix) — see gotchas |
| Animation | Framer Motion 12 | Subtle only |
| Charts | Recharts 3 | Insights pages only |
| Icons | lucide-react | |
| QR | qrcode.react | |
| AI | @anthropic-ai/sdk 0.94 | claude-haiku-4-5-20251001 |
| Database | Supabase Postgres | Free tier |
| Auth | Supabase Auth (Google OAuth) | @supabase/ssr v0.6 |
| Realtime | Supabase Realtime | postgres_changes → router.refresh() |
| ORM | Drizzle 0.43 / drizzle-kit 0.31 | |
| Validation | Zod 3 | |
| Forms | react-hook-form 7 + zodResolver | |
| Toasts | sonner 2 | |
| Date utils | date-fns 4 | |
| Theme | next-themes 0.4 | ThemeProvider in root layout |
| Deployment | Vercel | |

**Dev tools**: `tsx`, `dotenv`, `vitest`, `puppeteer-core`
**PDF parsing**: `pdf-parse 1.1.1` (server-side, no AI) — see gotcha below.

**Do NOT add**: NextAuth, Prisma, Redux, MUI, Chakra, Bootstrap, styled-components, tRPC, Pusher/Ably.

---

## 3. Critical Gotchas

### shadcn/ui uses @base-ui/react, NOT Radix

- **No `asChild` prop** — use `render` prop instead: `<Button render={<Link href="..." />}>`
- Button as Link needs `nativeButton={false}`: `<Button render={<Link href="..." />} nativeButton={false}>`
- Prefer plain styled `<Link>` for nav buttons to avoid nativeButton complexity

### CoverPhotoPicker — no `<form>` inside forms

Search uses `<div>` (not `<form>`) with `type="button"` on the search button to prevent parent form submission.

### DB Singleton (prevents HMR connection exhaustion)

```typescript
// lib/db/client.ts
declare global { var _pgClient: postgres.Sql | undefined; }
const client = globalThis._pgClient ?? postgres(connectionString, { prepare: false, max: 3 });
if (process.env.NODE_ENV !== 'production') globalThis._pgClient = client;
```

### proxy.ts (Next.js 16)

Next.js 16 renamed `middleware.ts` → `proxy.ts` with a `proxy` export (not `middleware`). The `config.matcher` uses an explicit route list (`/groups/:path*`, `/insights/:path*`, `/admin/:path*`, `/join/:path*`, `/login`, `/`) — not the old catch-all regex. This limits the Supabase Auth call to only routes that need it.

### Auth pattern — always use `getCurrentUser()`, never raw `getUser()`

`lib/db/queries/auth.ts` exports two React-`cache()`-wrapped helpers:

- **`getCurrentUser()`** — calls `getUser()` (validates JWT against Supabase Auth). One network call per server render, deduplicated across the whole RSC tree.
- **`getMembership(groupId, userId)`** — fetches a single `group_members` row. Also `cache()`-wrapped, so all query functions on the same page (e.g. `getGroupWithMembers`, `getExpenses`, `getBalances` fired in parallel) share one DB lookup instead of each firing their own.

```typescript
// ✅ correct — deduplicated across layout + all query functions, one validated network call
import { getCurrentUser } from "@/lib/db/queries/auth";
const user = await getCurrentUser();

// ❌ wrong — fires an independent undeduped network round trip on every call site
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
```

The `(app)/layout.tsx` and all `lib/db/queries/*.ts` files use `getCurrentUser()`. `ensureDemoGroup()` (server action called from groups page) also uses `getCurrentUser()` so it shares the cached result rather than making a 3rd auth call. Do NOT switch `getCurrentUser()` to `getSession()` — Supabase warns it is insecure (cookie-only, no server validation).

### Windows dev — TLS certificate fix

`.npmrc` contains `node-options=--use-system-ca` so all `pnpm` scripts (dev, build, test) use the Windows system CA store instead of Node.js's bundled CA. Required because Node.js 24's bundled CA was missing Supabase's intermediate cert (`UNABLE_TO_VERIFY_LEAF_SIGNATURE`). Do not remove this line.

### QuickAddSheet — portal + `isOpen` prop pattern

`QuickAddSheet` manages its own `createPortal` (renders at `document.body`) and `AnimatePresence` internally. Always pass `isOpen` boolean — never conditionally render the component from the parent, and never wrap it in an external `AnimatePresence`. The backdrop and sheet are direct `AnimatePresence` children (not in a Fragment) so exit animations work correctly. Members are lazy-fetched on first `isOpen=true` via a `fetchedRef`.

### Login page — `intent` param for signup vs sign-in copy

`app/(auth)/login/page.tsx` accepts an `intent=signup` search param. When present, the card shows "Create your account" / "Free to get started — no credit card needed." instead of the default "Sign in to Clear" / "Split expenses with anyone, anywhere." The `returnTo=/join/...` condition takes priority over `intent`.

Convention: all "Get started" / "Start for free" CTAs on the marketing page link to `/login?intent=signup`. "Sign in" links go to `/login` (no param). Never add an `intent` param to sign-in links.

### iOS apple-touch-icon

Served via `metadata.icons.apple` in `app/layout.tsx`, pointing to `/api/pwa-icon?size=192`. Do NOT use `app/apple-icon.tsx` — the App Router file convention for apple icons does not work with Turbopack in Next.js 16.

### iOS PWA install hint

`components/shared/ios-install-hint.tsx` — detects iOS Safari (not Chrome/Firefox on iOS), checks not already in standalone mode, checks localStorage `clear_ios_hint_dismissed`. Shows a dismissable glassmorphic bottom banner instructing users to tap Share → "Add to Home Screen". Rendered in root `app/layout.tsx`. Positioned `bottom-20 md:bottom-6` to clear the MobileNav on mobile.

### PWA manifest required fields

`app/manifest.ts` must include `id: "/"` and `scope: "/"` — Chrome on Android requires `id` to identify the app; without it, Android shows an "older version" privacy warning. The 512×512 icon needs two separate entries: one with `purpose: "any"` and one with `purpose: "maskable"`. Do not collapse them into a single entry.

### Sign-out redirect

`handleSignOut()` in `app/(app)/app-nav.tsx` redirects to `/` (marketing page) after sign-out. This is intentional — users land on the marketing page where they can re-sign in via "Sign in" or "Get started". Do not change this to `/login`.

### Supabase publishable key

Uses new `sb_publishable_*` format for `NEXT_PUBLIC_SUPABASE_ANON_KEY` — @supabase/ssr handles it.

### Drizzle config needs dotenv

`drizzle.config.ts` must call `config({ path: ".env.local" })` — drizzle-kit doesn't auto-load on Windows.

### Settlement formula (corrected)

```
net = totalPaid - totalOwed + settlementsSent - settlementsReceived
```
`settlementsSent` adds (reduces debt); `settlementsReceived` subtracts (shrinks receivable).

### pdf-parse — import from `lib/`, never from `index.js`

`pdf-parse@1.1.1`'s `index.js` has `isDebugMode = !module.parent`. In Turbopack's server bundle `module.parent` is `undefined`, so debug mode fires and `readFileSync` crashes on a missing test file, preventing module load entirely. Always bypass `index.js`:

```typescript
// ✅ correct — bypasses the debug-mode crash
const pdfParse: (buf: Buffer) => Promise<{ text: string }> = require("pdf-parse/lib/pdf-parse.js");

// ❌ wrong — crashes in Turbopack server bundle
import pdfParse from "pdf-parse";
```

### Anthropic SDK — instantiate inside the function

```typescript
// ✅ correct
export async function myAction() {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}
// ❌ wrong — module-level eval before env vars load
const client = new Anthropic();
```

Strip markdown fences before `JSON.parse` — Haiku wraps JSON in ` ```json ``` `:
```typescript
const jsonText = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
```

### `getGroupWithMembers` — parallel group + members fetch

After the membership check, group row and members list are fetched in parallel:
```typescript
const [[group], rawMembers] = await Promise.all([
  db.select().from(groups).where(eq(groups.id, groupId)),
  db.select().from(groupMembers).where(eq(groupMembers.groupId, groupId)).orderBy(groupMembers.joinedAt),
]);
```

### Group member count — correlated subquery

```typescript
memberCount: sql<number>`(select count(*) from group_members where group_members.group_id = ${groups.id})`
```

### `computeTripInsights` still uses `trip` in its interface

The function signature predates the rename. Always call it as:
```typescript
const insights = computeTripInsights({ trip: group, members, expensesWithSplits });
```
Do NOT rename the parameter — it would break the destructuring inside the function.

### Summary page is trips-only

`/summary/[token]` returns 404 for nests (`group.groupType === "nest"`). The AI narrative and shareable trip story are trip-exclusive features. Do not add a nest summary equivalent without discussion.

### Date-range props naming

Components that accept optional date bounds use `groupStartDate`/`groupEndDate` (not `tripStartDate`/`tripEndDate`). The AI `DateContext` interface uses `groupStart`/`groupEnd`. Keep this consistent.

---

## 4. Architecture Principles

1. **Server-first**: RSC by default. `"use client"` only for state, effects, browser APIs, charts.
2. **Server Actions for mutations**: `app/actions/*.ts`. No REST routes for internal CRUD.
3. **Drizzle only for DB reads/writes**. Supabase JS only for Auth + Realtime.
4. **RLS everywhere**: All 5 tables. `drizzle/policies.sql` is the source of truth.
5. **Pure functions for math**: `lib/splits/compute.ts`, `lib/settle/optimize.ts` — never touch DB.
6. **Shared Zod schemas**: same schema for form (zodResolver), server action input, and DB insert.
7. **Optimistic UI via useState**: `removedIds: Set<string>` state, rolls back on server error.
8. **Realtime via router.refresh()**: `useGroupRealtime(groupId)` in `app/(app)/groups/[id]/layout.tsx`.
9. **Auth via shared `getCurrentUser()`**: layout and all `lib/db/queries/*.ts` call `getCurrentUser()` from `lib/db/queries/auth.ts` — React-`cache()`-wrapped so the whole render tree shares 1 auth call. Never call `supabase.auth.getUser()` directly in server components or query functions.
10. **GROUP_CONFIG pattern**: All group-type differences flow through `lib/group-config.ts` — never raw `group.type === 'trip'` checks scattered across files.

---

## 5. Database Schema

Schema files in `lib/db/schema/`. RLS in `drizzle/policies.sql`.

### groups
```
id, name, description, cover_photo_url
group_type: enum('trip', 'nest') default 'trip'
default_currency: text default 'INR'
start_date, end_date: date          -- trips only (optional for nests)
budget: numeric(12,2)               -- optional
itinerary: text                     -- trips only (AI narrative + adherence); max 10,000 chars (Zod-only, DB is unlimited text)
is_archived: boolean default false
is_demo: boolean default false      -- seeded sample group; pinned first
created_by: uuid
share_token: uuid unique default gen_random_uuid()
created_at: timestamptz
```

### group_members
```
id, group_id fk->groups(cascade)
user_id: uuid nullable
guest_name: text nullable
display_name: text nullable
role: enum('admin','member') default 'member'
CHECK: exactly one of (user_id, guest_name)
UNIQUE: (group_id, user_id)
```

### expenses
```
id, group_id fk->groups(cascade), paid_by_member_id fk->group_members
description: text, category: text   -- text, not enum (validated by Zod + GROUP_CONFIG)
custom_category: text nullable      -- free-text label shown when category = 'other'
amount: numeric(12,2), currency: text, expense_date: date, end_date: date, notes: text
is_template: boolean default false  -- recurring expense template (nest)
recurrence: text                    -- 'monthly' | 'weekly' (templates only)
source_template_id: uuid nullable   -- stamps which template produced a logged instance
created_by_user_id: uuid, created_at, updated_at
```

### expense_splits
```
id, expense_id fk->expenses(cascade), member_id fk->group_members(cascade)
share_amount: numeric(12,2)
split_type: enum('equal','exact','percentage','shares')
split_value: numeric(12,4)
UNIQUE: (expense_id, member_id)
```

### settlements
```
id, group_id, from_member_id, to_member_id fk->group_members
amount: numeric(12,2), currency, note, settled_at
CHECK: from_member_id <> to_member_id
```

### Realtime setup (run once in SQL Editor)
```sql
alter publication supabase_realtime add table expenses;
alter publication supabase_realtime add table expense_splits;
alter publication supabase_realtime add table settlements;
alter publication supabase_realtime add table group_members;
```

---

## 6. Group Config System

`lib/group-config.ts` — single source of truth for type differences:

```typescript
GROUP_CONFIG = {
  trip: { labels, showDates, showItinerary, showNarrative, showAdherence, showRecurring, showBudget, categories: TRIP_CATEGORIES },
  nest: { labels, showDates:false, showItinerary:false, showNarrative:false, showRecurring:true, showBudget:false, categories: NEST_CATEGORIES },
}
```

**Trip categories**: food, accommodation, transport, sightseeing, shopping, activities, groceries, tour_package, other
**Nest categories**: rent, utilities, groceries, subscriptions, food, healthcare, maintenance, supplies, other

Use `getGroupConfig(group.groupType)` in components — never `group.groupType === 'trip'` inline checks.

---

## 7. Design System

### Palette
```css
/* Primary */
--primary: #0891B2;          /* cyan-600 */
/* Gradient: from-cyan-500 to-teal-500 (#06B6D4 → #14B8A6) */
/* Background: linear-gradient(135deg, #EFF6FF, #ECFEFF, #F0FDFA, #ECFDF5) fixed */
```

### Glass utilities (globals.css)
```css
.glass     { background:rgba(255,255,255,0.6); backdrop-filter:blur(20px); border:1px solid rgba(255,255,255,0.75); }
.glass-sm  { background:rgba(255,255,255,0.5); backdrop-filter:blur(12px); }
.glass-nav { background:rgba(255,255,255,0.72); backdrop-filter:blur(24px); border-bottom:1px solid rgba(255,255,255,0.8); }
.dark .glass     { background:rgba(15,23,42,0.75); border:1px solid rgba(51,65,85,0.6); }
.dark .glass-sm  { background:rgba(15,23,42,0.65); }
.dark .glass-nav { background:rgba(15,23,42,0.85); }
.dark body { background:linear-gradient(135deg,#0F172A,#0C1520,#0A1A18,#0B1F15); }
```

### Typography
- **Headings**: Fraunces via `style={{ fontFamily: "var(--font-fraunces)" }}` — NOT Tailwind class
- **Body**: Inter via `--font-inter`
- **Numbers**: `font-variant-numeric: tabular-nums`

### Buttons
```tsx
className="bg-gradient-to-br from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white"
```

### Dark mode conventions
- Labels: `text-slate-700 dark:text-slate-200`
- Body: `text-slate-500 dark:text-slate-400`
- Inputs: `border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60`

### Brand components
- `ClearLogo` (`components/shared/clear-logo.tsx`) — gradient icon box (C-arc + split-coin SVG mark) + optional "Clear" wordmark. Props: `iconSize`, `showWordmark`, `wordmarkClassName`, `className`.
- `ClearIcon` — just the white SVG paths (no background box), for use inside custom coloured/glass containers (e.g. the landing CTA frosted-glass box).
- Icon gradient: `linear-gradient(140deg, #0EA5E9 0%, #0891B2 50%, #0D9488 100%)` — 3-stop, sky→cyan→teal. Use inline style (not Tailwind) to maintain exact stops.
- PWA icons generated by `app/api/pwa-icon/route.ts` (192 + 512 px, edge runtime). Favicon by `app/icon.tsx` (32 px). Both use the same SVG design via `React.createElement` / JSX + `ImageResponse`.

### Navigation
- **Desktop**: sticky top — `ClearLogo` (28 px), Groups, Insights, ThemeToggle, avatar dropdown (Take the tour, Sign out)
- **Mobile**: icon-only top nav + fixed `MobileNav` bottom (Groups, Insights). Content gets `pb-24`. Expenses page adds a cyan FAB (fixed `bottom-24 right-4`, `md:hidden`) for Add Expense.

### Quick-add sheet (bottom sheet)
Uses `bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl` — **not** the `.glass` class. The `.glass` class (60% opacity) is too transparent when the sheet sits over the dark backdrop overlay. The sheet needs a near-solid surface.

### Group card action buttons — image overlay pattern
`TripCard` has **no footer**. All controls float on the cover image.

**Top-left badges** (`absolute top-3 left-3 z-10`): type badge (`[📍 Trip]` or `[🏠 Nest]`) + member count badge (`[👥 N]`). Both use `bg-black/40 backdrop-blur-sm` pill style. Consistent across all cards — no extra badges here.

**Top-right buttons** (`absolute top-3 right-3 z-10`): Add (`+`), Share, QR, and Quick-nav (`⋯`) — four buttons, all the same frosted-glass style:
```
bg-black/30 hover:bg-black/50 backdrop-blur-md text-white w-8 h-8 rounded-xl shadow-sm shadow-black/20 active:scale-95 transition-all
```

**Sample ribbon** (demo cards only): diagonal amber strip at the bottom-right corner (`absolute`, `rotate-[-45deg]`, `bg-amber-500/90`, `pointer-events-none`). Clipped naturally by the card's `overflow-hidden rounded-2xl`. Text: `SAMPLE` (all-caps, `tracking-widest`).

**Quick-nav sheet** (`TripCardNavSheet`): portal + AnimatePresence bottom sheet. Opens via `⋯` button click (desktop + mobile) or long-press anywhere on the card body (mobile, 500 ms). Shows four destinations — Members, Expenses, Settle Up, Insights — each as a tappable row with a cyan gradient icon. Uses `bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl` (same as QuickAddSheet). `pointer-events-none` on ribbon, `WebkitTouchCallout: none` + `select-none` on card wrapper to suppress iOS image long-press menu and text selection.

### Share button — join URL, not summary URL
`TripCardShareButtons` shares `/join/[shareToken]` (invite page) so recipients can join the group. It does **not** share `/summary/[shareToken]` (the AI trip story). Uses the `Share2` lucide icon (standard OS share icon). The QR dialog encodes the join URL with copy text "Copy invite link" / "Scan to join this group".

### Motion
- Card entrance: `opacity 0→1, y 8→0` over 200ms, stagger 30–50ms via `AnimatedList`
- Balance numbers: `CountUp` (Framer Motion)
- Navigation progress: `NavProgress` (`components/shared/nav-progress.tsx`) — thin cyan→teal bar at top, shown instantly on any link click, completes when pathname changes

---

## 8. Key Algorithms

### Balance formula
```typescript
net = totalPaid - totalOwed + settlementsSent - settlementsReceived
```
Templates (`is_template = true`) are **excluded** from all balance calculations.

### Recurring expenses (nest only)
- Templates: `is_template = true`, `recurrence = 'monthly'|'weekly'`
- Logged instances: `is_template = false`, `source_template_id = <template_id>`, `expense_date = first of current month`
- `getGroupTemplates()` returns each template with `loggedThisMonth` + `lastLoggedDate`
- Double-logging prevented: button disabled once logged this month

### Split computation (`lib/splits/compute.ts`)
Four modes returning `SplitResult[]` with `shareAmount` + `splitValue`:
- `equal`: divide evenly among member IDs
- `exact`: amount per member (must sum to total)
- `percentage`: % per member (must sum to 100)
- `shares`: share count per member (total > 0)

Rounding: `Math.round(n * 100) / 100`. Remainder to first row. **16 Vitest tests — all must pass.**

### Settlement optimizer (`lib/settle/optimize.ts`)
Greedy: split members into creditors/debtors by net, sort desc, match top pairs, emit min transactions. **6 Vitest tests.**

---

## 9. Project Structure

```
clear/
├── app/
│   ├── icon.tsx, error.tsx, not-found.tsx, layout.tsx, page.tsx, globals.css
│   ├── (auth)/login/page.tsx + login-form.tsx
│   ├── auth/callback/route.ts
│   ├── (app)/
│   │   ├── layout.tsx, error.tsx, app-nav.tsx
│   │   ├── insights/page.tsx + loading.tsx
│   │   └── groups/
│   │       ├── page.tsx, loading.tsx
│   │       ├── new/page.tsx + create-trip-form.tsx
│   │       └── [id]/
│   │           ├── layout.tsx (RealtimeRefresh), page.tsx
│   │           ├── edit/page.tsx + edit-trip-form.tsx
│   │           ├── expenses/page.tsx, loading.tsx, new/, [expenseId]/edit/, templates/new/, templates/[templateId]/edit/
│   │           ├── members/page.tsx + forms/buttons
│   │           ├── settle/page.tsx, loading.tsx, mark-paid-button, upi-pay-button
│   │           └── insights/page.tsx + loading.tsx
│   ├── join/[token]/page.tsx + join-button.tsx
│   ├── summary/[token]/page.tsx + opengraph-image.tsx
│   ├── api/groups/[id]/export/route.ts    # CSV download
│   └── actions/
│       ├── groups.ts, expenses.ts, members.ts, settlements.ts, unsplash.ts
│       ├── parse-expense.ts, narrative.ts, trip-adherence.ts, parse-chat.ts, parse-itinerary.ts
│       └── demo.ts                        # ensureDemoGroup — seeds trip + nest demos
├── components/
│   ├── ui/                              # shadcn/base-ui primitives
│   ├── expense/  (expense-card, swipeable-expense-card [swipe-to-delete on touch devices], expense-filters [groupByMonth prop], split-editor, quick-add-bar, chat-import-dialog, ...)
│   ├── trip/     (trip-card [data-tour attrs], trip-card-nav-sheet [quick-nav bottom sheet], cover-photo-picker, budget-bar, qr-invite, narrative-section, adherence-card, ...)
│   ├── settlement/ (settlement-breakdown, member-debt-breakdown)
│   ├── insights/ (kpi-card, category-donut, daily-spend-bar, monthly-spend-bar, member-contributions, trips-spend-bar, insights-tabs, ...)
│   ├── tour/     (tour-context.tsx, tour-layer.tsx)
│   └── shared/   (skeleton, animated-list, count-up, confirm-dialog, member-avatar, mobile-nav, realtime-refresh, theme-toggle, nav-progress, clear-logo [ClearLogo + ClearIcon], ios-install-hint)
├── hooks/
│   ├── use-trip-realtime.ts (exports useGroupRealtime), use-warn-before-leave.ts, use-speech-recognition.ts
├── lib/
│   ├── db/client.ts, schema/*.ts, queries/(groups, expenses, balances, insights, meta, admin, auth).ts  # auth.ts exports getCurrentUser (cached)
│   ├── supabase/server.ts, client.ts, admin.ts
│   ├── demo/seed-demo-trip.ts + seed-demo-nest.ts
│   ├── tour/types.ts + steps.ts         # 10-step tour (trip + nest cards)
│   ├── group-config.ts                  # GROUP_CONFIG — type-aware feature flags + categories
│   ├── categories.ts                    # TRIP_CATEGORIES + NEST_CATEGORIES + getCategory()
│   ├── insights/trip-insights.ts + all-trips-insights.ts + all-nests-insights.ts + group-roles.ts
│   ├── parser/parse-expense.ts
│   ├── splits/compute.ts + compute.test.ts
│   ├── settle/optimize.ts + optimize.test.ts
│   ├── validations/trip.ts + expense.ts (addExpenseSchema + addTemplateSchema) + settlement.ts
│   ├── utils.ts
├── drizzle/policies.sql
├── drizzle/indexes.sql          # DB indexes — apply manually in Supabase SQL Editor (not drizzle-kit)
├── drizzle.config.ts, proxy.ts
```

---

## 10. Auth & Realtime

**Auth**: Google OAuth via Supabase. `proxy.ts` (middleware) calls `supabase.auth.getUser()` on protected routes only (explicit matcher — see proxy.ts gotcha above) — validates + refreshes the session cookie. Protected routes: `/groups`, `/insights`, `/join`, `/admin`.

Server components and query functions call `getCurrentUser()` from `lib/db/queries/auth.ts`, which calls `supabase.auth.getUser()` (validates JWT against Supabase Auth server). React `cache()` deduplicates all calls within the same render tree — only one network round-trip per server render. `ensureDemoGroup()` also uses `getCurrentUser()` so it shares the cached result (no extra auth call).

**Realtime**: `useGroupRealtime(groupId)` in `hooks/use-trip-realtime.ts` — subscribes to expenses, settlements, group_members, expense_splits → calls `router.refresh()`. Mounted via `RealtimeRefresh` in `app/(app)/groups/[id]/layout.tsx`.

---

## 11. Coding Conventions

- **TypeScript strict**. No `any`. Use `unknown` and narrow.
- **Server actions** return `{ ok: true, data }` or `{ ok: false, error }`. Never throw to client.
- **Money**: `numeric(12,2)` in DB, `number` in TS. Format with `formatCurrency()`.
- **Dates**: `date` type (no time). Format with `formatDate()`. For recurring expense logging: always first of current month (`YYYY-MM-01`).
- **Member names**: always `getMemberName(member)` → `displayName ?? guestName ?? "Member"`.
- **revalidatePath**: always `revalidatePath('/groups/${groupId}', 'layout')` — layout variant invalidates whole subtree.
- **File names**: kebab-case. No barrel files — import from actual file.
- **Fraunces font**: `style={{ fontFamily: "var(--font-fraunces)" }}` — never Tailwind class.
- **Dark mode**: every colour class needs a `dark:` counterpart.
- **Mobile-first**: grids `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`, multi-action rows `flex-col gap sm:flex-row`.
- **GROUP_CONFIG**: use `getGroupConfig(group.groupType)` for any type-specific label, flag, or category list.
- **Date-range props**: name as `groupStartDate`/`groupEndDate` in components, `groupStart`/`groupEnd` in `DateContext`.
- **CategoryValue**: 16 categories across trip + nest (incl. `tour_package`) — defined in `lib/parser/parse-expense.ts`. AI actions validate against this union type.
- **customCategory**: when `category === "other"`, a free-text `customCategory` field is required in `addExpenseSchema` (`.superRefine()` guard). Stored in `expenses.custom_category`. Display in `ExpenseCard` when non-null.
- **Expense dates**: no trip date range restriction — users may log pre-booked expenses (flights, hotels) dated before the trip start.
- **Form props**: expense/edit forms use `group: Group` (not `trip`). The `computeTripInsights` function is the one exception — call it with `{ trip: group }`.
- **Templates excluded from totals**: always filter `eq(expenses.isTemplate, false)` in any query that computes spend or balances.
- **Mobile tap targets**: all back/nav links use `min-h-[44px]`; expense card action buttons `w-11 h-11 sm:w-7 sm:h-7`; split editor number inputs use `inputMode="decimal"` (or `"numeric"` for shares).
- **Multi-item flex rows on mobile**: rows combining info text + multiple action buttons (e.g. template section) use `flex-col sm:flex-row` — info on the top row with `flex-1 min-w-0`, amount + actions on the bottom row indented to align. Avoids a single `flex` row leaving zero space for text on narrow screens.

---

## 12. Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY        # sb_publishable_* format
SUPABASE_SERVICE_ROLE_KEY
DATABASE_URL                         # Session Pooler URL (pooler.supabase.com:5432)
UNSPLASH_ACCESS_KEY
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=Clear
ANTHROPIC_API_KEY
PLATFORM_ADMIN_EMAIL                 # comma-separated; guards /admin dashboard
```

---

## 13. Demo Data Seeding

`ensureDemoGroup()` (`app/actions/demo.ts`) — called on groups page load:
- Seeds **Goa 2025 · Sample** (trip, `is_demo=true`) — 8 expenses, all 4 split modes, 5 members
- Seeds **Mumbai Flat · Sample** (nest, `is_demo=true`) — 7 recurring templates, 4 months of expenses (Feb–May 2026), partial settlements
- Detects stale nest seed by description string and re-seeds automatically
- Trip card: `data-tour="demo-trip"` | Nest card: `data-tour="demo-nest"` (tour targets both)
- Demo groups pinned first (`ORDER BY is_demo DESC`)

---

## 14. Onboarding Tour (10 steps)

`getTourSteps(demoTripId)` in `lib/tour/steps.ts`:
1. Welcome modal — "Trips for travel, Nests for home"
2. New group button (`[data-tour='new-trip-btn']`, `/groups`)
3. Sample Trip card (`[data-tour='demo-trip']`, `/groups`)
4. Sample Nest card (`[data-tour='demo-nest']`, `/groups`)
5. Quick-add button on a group card (`[data-tour='trip-card-add-btn']`, `/groups`)
6. Trip quick-actions (`[data-tour='trip-quick-actions']`, `/groups/[id]`)
7. Add expense (`[data-tour='expense-add-btn']`, `/groups/[id]/expenses`)
8. Settle up (`[data-tour='settle-suggestions']`, `/groups/[id]/settle`)
9. Trip chart grid (`[data-tour='trip-charts']`, `/groups/[id]/insights`) — CategoryDonut + DailySpendBar
10. All-groups insights charts (`[data-tour='all-insights-charts']`, `/insights`)

**All `data-tour` targets:**
| Attribute | File |
|---|---|
| `new-trip-btn` | `app/(app)/groups/page.tsx` |
| `demo-trip` | `components/trip/trip-card.tsx` |
| `demo-nest` | `components/trip/trip-card.tsx` |
| `trip-card-add-btn` | `components/trip/trip-card-quick-add.tsx` |
| `trip-quick-actions` | `app/(app)/groups/[id]/page.tsx` |
| `expense-add-btn` | `app/(app)/groups/[id]/expenses/page.tsx` |
| `settle-suggestions` | `app/(app)/groups/[id]/settle/page.tsx` |
| `trip-charts` | `app/(app)/groups/[id]/insights/page.tsx` |
| `all-insights-charts` | `components/insights/insights-tabs.tsx` (all 3 chart grid divs) |
| `nav-trips` / `nav-insights` | `app-nav.tsx` + `mobile-nav.tsx` (nav links, not currently tour targets) |

Tour localStorage key: `clear_tour_done`. Replayable from avatar dropdown.

**Tour UX behaviour**: The popover is always visible (even while navigating between pages). During loading, the description area shows a spinner; the Next button is disabled until the target element is found. The "Taking a moment…" hint appears after 1.5 s (not 3 s). When `demoTripId` is first resolved, all 4 inner trip pages are prefetched at once.

**Auto-launch timing**: The tour does NOT start immediately on mount. It polls for `[data-tour='new-trip-btn']` (300 ms initial delay, then every 250 ms) before setting `active = true`. This prevents the blank full-screen blur that occurred when the tour launched before `ensureDemoGroup()` had finished seeding and the RSC had rendered the page content. Do not change this to an immediate launch.

---

## 15. Insights Architecture

### Per-group insights (`/groups/[id]/insights`)
Type-aware page:
- **Trip**: total/per-person/daily KPIs, PaceTracker, CategoryDonut, DailySpendBar, MemberContributions, GroupRoles, CrossTripCard, AdherenceCard, SmartInsights
- **Nest**: this-month/last-month/per-person KPIs, CategoryDonut, MonthlySpendBar (stacked recurring+adhoc), MemberContributions, GroupRoles, SmartInsights

### All-groups insights (`/insights`) — tabbed
- **Trips tab**: "Your travel story" — total spend, trip count, companions, TripsSpendBar, CategoryDonut, smart insights, per-trip links
- **Nests tab**: "Your household spending" — monthly average, total, housemates, MonthlySpendBar, CategoryDonut, smart insights, per-nest links
- Shows tab switcher only if user has both trips and nests

**Query optimizations in `lib/db/queries/insights.ts`**:
- `getAllTripsInsightsData`: per-trip expense totals fetched in a single `GROUP BY group_id` query (not 1 query per trip)
- `getAllNestsInsightsData`: category totals derived in-memory from the expenses already fetched (no second DB query)

---

## 16. Deployment

**Repo**: https://github.com/Jayks/clear.git (master)
**Deployment**: Vercel (pending — new Supabase project needs wiring)

---

## 17. Key Scripts

```bash
pnpm dev / build / typecheck
pnpm test / pnpm test --run
pnpm db:push / db:studio
pnpm seed                # Goa trip — 10 members, 30 expenses (requires 1 existing group)
pnpm seed:temple         # South India temple tour — 20 members
```

**Puppeteer scripts** (for upcoming user manual):
- `scripts/take-screenshots.js` — captures 16 app screenshots (needs `pnpm dev` + `cookies.json`)
- `scripts/generate-manual-pdf.js` — generates PDF from HTML manual source

---

## 18. Working Style

- **Ask before scope creep** — new deps, new feature areas, skipping sections.
- **Run `pnpm typecheck && pnpm test` before declaring done**.
- **Read existing code first** — check `lib/utils.ts`, components, queries before writing new ones.
- **No silent failures** — every error path has a toast, boundary, or visible feedback.
- **Keep this file updated** when decisions change.
