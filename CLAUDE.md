# CLAUDE.md — Clear

> Source of truth for Claude Code. Reflects actual built state. When in doubt, ask.

---

## 1. Project Overview

**Clear** — shared expense tracking for trips and households. Members log expenses, app computes minimum-transaction settlements. Deployed on Vercel + Supabase (free tier).

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

**Do NOT add**: NextAuth, Prisma, Redux, MUI, Chakra, Bootstrap, styled-components, tRPC, Pusher/Ably.

---

## 3. Critical Gotchas

### shadcn/ui uses @base-ui/react, NOT Radix

- **No `asChild` prop** — use `render` prop instead: `<Button render={<Link href="..." />}>`
- Button as Link needs `nativeButton={false}`: `<Button render={<Link href="..." />} nativeButton={false}>`
- Prefer plain styled `<Link>` for nav buttons to avoid nativeButton complexity

### CoverPhotoPicker — no `<form>` inside forms

Two tabs: **Search Unsplash** (default) and **Upload from device**. Search uses `<div>` with `type="button"` on the search button to prevent parent form submission. Upload uses `<input type="file" accept="image/*">`. Flow: pick → `URL.createObjectURL` preview → `uploadCoverPhoto` action (`app/actions/upload.ts`) → base64 Buffer → `cover-photos` bucket → public URL via `onChange()`. 5 MB limit enforced client + server. Revoke object URL on upload or close.

### DB Singleton (prevents HMR connection exhaustion)

```typescript
// lib/db/client.ts
declare global { var _pgClient: postgres.Sql | undefined; }
const client = globalThis._pgClient ?? postgres(connectionString, { prepare: false, max: 3 });
if (process.env.NODE_ENV !== 'production') globalThis._pgClient = client;
```

### proxy.ts (Next.js 16)

Next.js 16 renamed `middleware.ts` → `proxy.ts` with a `proxy` export (not `middleware`). The `config.matcher` uses an explicit route list (`/groups/:path*`, `/insights/:path*`, `/admin/:path*`, `/join/:path*`, `/login`, `/`) — not the old catch-all regex. Protected routes: `/groups`, `/insights`, `/join`, `/admin`.

### Auth pattern — always use `getCurrentUser()`, never raw `getUser()`

`lib/db/queries/auth.ts` exports two React-`cache()`-wrapped helpers:
- **`getCurrentUser()`** — validates JWT against Supabase Auth. Deduplicated across the RSC tree.
- **`getMembership(groupId, userId)`** — cached single `group_members` row lookup.

```typescript
// ✅ correct — deduplicated, one validated network call per render
import { getCurrentUser } from "@/lib/db/queries/auth";
const user = await getCurrentUser();

// ❌ wrong — independent undeduped round trip on every call site
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
```

All layout and `lib/db/queries/*.ts` files use `getCurrentUser()`. `ensureDemoGroup()` also uses it (shares cache). Never switch to `getSession()` — cookie-only, no server validation.

### Windows dev — TLS certificate fix

`.npmrc` contains `node-options=--use-system-ca` — required because Node.js 24's bundled CA was missing Supabase's intermediate cert (`UNABLE_TO_VERIFY_LEAF_SIGNATURE`). Do not remove.

### QuickAddSheet — portal + `isOpen` prop pattern

Manages its own `createPortal` and `AnimatePresence` internally. Always pass `isOpen` boolean — never conditionally render from parent, never wrap in external `AnimatePresence`. The backdrop and sheet are direct `AnimatePresence` children (not in a Fragment). Members lazy-fetched on first `isOpen=true` via `fetchedRef`.

### iOS touch & safe-area patterns

**Long-press on TripCard** — 500ms timer, `MOVE_THRESHOLD=8px` (iOS fingers drift). `isLongPressing` → `scale(0.97)` + cyan ring. `touchAction:"manipulation"` removes 300ms tap delay. `navigator.vibrate?.(12)` fires on Android only.

**Safe-area CSS utilities** (top-level in `globals.css`, NOT inside `@layer` — Turbopack rejects `@media` nested inside `@layer`):
- `.h-nav-safe` — `height: calc(4rem + env(safe-area-inset-bottom, 0px))` + padding-bottom. MobileNav inner div.
- `.pb-safe-nav` — `padding-bottom: calc(6rem + env(safe-area-inset-bottom, 0px))`, overridden to `2rem` at `md`. App `<main>`.
- `.bottom-nav-safe` — `bottom: calc(5rem + env(safe-area-inset-bottom, 0px))`. FAB + iOS install hint.

**iOS body scroll-through** — `position:fixed` overlays don't block scroll on iOS Safari. `TripCardNavSheet` and `QuickAddSheet` use non-passive DOM `touchmove` listener (React synthetic events can't call `preventDefault()`). QuickAddSheet exempts its scrollable div via `scrollBodyRef`.

**QuickAddSheet voice stale trigger** — `QuickAddBar` unmounts on close; on reopen it sees stale transcript. Fix: `QuickAddSheet` clears `voiceTrigger` to `null` on close.

### Admin dashboard patterns

**Non-async layout** — `app/admin/layout.tsx` is synchronous so `loading.tsx` works. `requirePlatformAdmin()` in each page query is the authoritative auth check.

**Admin navigation** — `/admin` is outside `/(app)`, so `router.push("/admin")` silently fails. Use `window.location.href = "/admin"` with `window.dispatchEvent(new Event("navprogress"))` first so `NavProgress` starts before the page unloads.

**`withAdminTimeout`** — all admin queries run in `db.transaction()` with `SET LOCAL statement_timeout = 8000`. Hard-cancels slow queries, releases connections immediately.

**Admin query design** — `getAdminStats()`: single SQL round-trip (4 subqueries). `getAdminGroupList()`: JOIN aggregation. `getAdminUserList()`: DB-only from `group_members`, no Supabase `listUsers()` — users show by display name; emails not available without `listUsers()`.

**DB resilience** — `lib/db/client.ts`: `max:3`, `idle_timeout:20`, `connect_timeout:10`. Admin page uses `Promise.race` against a 12s resolving fallback (never rejects).

### Login page — `intent` param

`intent=signup` → shows signup copy. `returnTo=/join/...` takes priority. All "Get started" CTAs link to `/login?intent=signup`; sign-in links never include `intent`.

### iOS apple-touch-icon

Use `metadata.icons.apple` in `app/layout.tsx` → `/api/pwa-icon?size=192`. Do NOT use `app/apple-icon.tsx` — doesn't work with Turbopack in Next.js 16.

### iOS PWA install hint

`components/shared/ios-install-hint.tsx` — detects iOS Safari, checks standalone mode + `clear_ios_hint_dismissed`. Rendered in root layout. Position: `bottom-nav-safe md:bottom-6`.

### PWA manifest required fields

`app/manifest.ts` must include `id:"/"` and `scope:"/"` (Chrome Android requires `id`). 512×512 icon needs two separate entries: `purpose:"any"` and `purpose:"maskable"`.

### Sign-out redirect

`handleSignOut()` redirects to `/` (marketing page). Do not change to `/login`.

### Supabase publishable key

`NEXT_PUBLIC_SUPABASE_ANON_KEY` uses `sb_publishable_*` format — @supabase/ssr handles it.

### Drizzle config needs dotenv

`drizzle.config.ts` must call `config({ path: ".env.local" })` — drizzle-kit doesn't auto-load on Windows.

### Settlement formula (corrected)

```
net = totalPaid - totalOwed + settlementsSent - settlementsReceived
```
`settlementsSent` adds (reduces debt); `settlementsReceived` subtracts (shrinks receivable).

### pdf-parse — import from `lib/`, never from `index.js`

`index.js` triggers debug mode in Turbopack (`module.parent` is `undefined`), crashing on a missing test file:

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

### `getGroupWithMembers` — cached fetch, itinerary excluded by default

`opts: { full?: boolean }` (default `false`). When false, `itinerary` is `null` in SELECT. Pass `{ full: true }` only on insights and edit pages. Cached via `unstable_cache` tagged `group-${groupId}`, no TTL — invalidated by `revalidateTag` only. Auth/membership check runs before the cache.

### Group cache invalidation — `revalidateTag` required on mutations

```typescript
revalidateTag(`group-${groupId}`, "max");  // ✅ Next.js 16
revalidateTag(`group-${groupId}`);          // ❌ deprecated single-arg form — TS error
```

Must call on: `updateGroup`, `archiveGroup`, `regenerateShareToken` (groups.ts); `addGuestMember`, `removeMember`, `joinGroup` (members.ts). Any new action writing to `groups` or `group_members`.

### `getAllGroups()` replaces `getGroups()` + `getArchivedGroups()`

`lib/db/queries/groups.ts` exports `getAllGroups()` — one query, returns `{ active, archived }`.

### `getBalances()` — single CTE round-trip

4 CTEs → LEFT JOINed onto `group_members`. Aliases must be unique (`paid_total`, `owed_total`, `sent_total`, `received_total`) — Postgres raises "column reference is ambiguous" if all named `total`. Outer SELECT uses `COALESCE(cte.column, '0')`.

### Group member count — correlated subquery

```typescript
memberCount: sql<number>`(select count(*) from group_members where group_members.group_id = ${groups.id})`
```

### `computeTripInsights` still uses `trip` in its interface

Always call as: `computeTripInsights({ trip: group, members, expensesWithSplits })`. Do not rename.

### Summary page is trips-only

`/summary/[token]` returns 404 for nests. Do not add a nest equivalent without discussion.

### Date-range props naming

Components: `groupStartDate`/`groupEndDate`. AI `DateContext`: `groupStart`/`groupEnd`.

---

## 4. Architecture Principles

1. **Server-first**: RSC by default. `"use client"` only for state, effects, browser APIs, charts.
2. **Server Actions for mutations**: `app/actions/*.ts`. No REST routes for internal CRUD.
3. **Drizzle only for DB reads/writes**. Supabase JS only for Auth + Realtime.
4. **RLS everywhere**: All 5 tables. `drizzle/policies.sql` is the source of truth.
5. **Pure functions for math**: `lib/splits/compute.ts`, `lib/settle/optimize.ts` — never touch DB.
6. **Shared Zod schemas**: same schema for form (zodResolver), server action input, and DB insert.
7. **Optimistic UI via useState**: `removedIds: Set<string>` state, rolls back on server error.
8. **Realtime via router.refresh()**: `useGroupRealtime(groupId)` in `hooks/use-trip-realtime.ts` — subscribes to expenses, settlements, group_members, expense_splits. Mounted via `RealtimeRefresh` in `app/(app)/groups/[id]/layout.tsx`. **Disabled in dev** (was consuming 85% of Supabase free-tier CPU). Production only.
9. **Auth via shared `getCurrentUser()`**: React-`cache()`-wrapped, shared across whole render tree. Never call `supabase.auth.getUser()` directly in server components or query functions.
10. **GROUP_CONFIG pattern**: All type differences via `lib/group-config.ts` — never raw `group.type === 'trip'` checks scattered across files.

---

## 5. Database Schema

Schema files in `lib/db/schema/`. RLS in `drizzle/policies.sql`.

### groups
```
id, name, description, cover_photo_url
group_type: enum('trip', 'nest') default 'trip'
default_currency: text default 'INR'
start_date, end_date: date          -- trips only
budget: numeric(12,2)               -- optional
itinerary: text                     -- trips only; max 10,000 chars (Zod-only, DB is unlimited)
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
custom_category: text nullable      -- free-text label when category = 'other'
amount: numeric(12,2), currency: text, expense_date: date, end_date: date, notes: text
is_template: boolean default false  -- recurring template (nest)
recurrence: text                    -- 'monthly' | 'weekly' (templates only)
source_template_id: uuid nullable
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

### Supabase Storage — `cover-photos` bucket (run once)

Create via Supabase dashboard → Storage → New bucket:
- Name: `cover-photos` | Public: **Yes** | File size limit: `5242880` (5 MB)

RLS policies (run in SQL Editor):
```sql
create policy "Authenticated users can upload cover photos"
on storage.objects for insert to authenticated
with check (bucket_id = 'cover-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Public can read cover photos"
on storage.objects for select to public
using (bucket_id = 'cover-photos');

create policy "Users can delete their own cover photos"
on storage.objects for delete to authenticated
using (bucket_id = 'cover-photos' and (storage.foldername(name))[1] = auth.uid()::text);
```

Files at `{userId}/{timestamp}-{slug}.{ext}`. `next.config.ts` has `riyfedftffuqzxtcpdde.supabase.co` in `remotePatterns`.

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
--primary: #0891B2;  /* cyan-600 */
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
- `ClearLogo` (`components/shared/clear-logo.tsx`) — gradient icon box (C-arc + split-coin SVG mark) + optional wordmark. Props: `iconSize`, `showWordmark`, `wordmarkClassName`, `className`.
- `ClearIcon` — SVG paths only (no background box), for custom coloured/glass containers.
- Icon gradient: `linear-gradient(140deg, #0EA5E9 0%, #0891B2 50%, #0D9488 100%)` — use inline style (not Tailwind) to maintain exact stops.
- PWA icons: `app/api/pwa-icon/route.ts` (192+512px, edge). Favicon: `app/icon.tsx` (32px).

### Navigation
- **Desktop**: sticky top — `ClearLogo` (28px), Groups, Insights, ThemeToggle, avatar dropdown (Take the tour, Sign out).
- **Mobile**: icon-only top nav + fixed `MobileNav` bottom. Content uses `.pb-safe-nav`. FAB (`bottom-nav-safe right-4 md:hidden`) on Expenses page. MobileNav inner div uses `.h-nav-safe`.

### Quick-add sheet
Uses `bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl` — NOT `.glass` (60% opacity is too transparent over the dark backdrop overlay).

### Group card action buttons — two-wrapper structure (critical)

`TripCard` uses two nested wrappers to keep action buttons outside the `<Link>`:

```
<div>  ← outer: positioning, hover, touch handlers. NO overflow-hidden.
  <div class="glass rounded-2xl overflow-hidden">  ← inner: clips image + ribbon
    <Link href="/groups/[id]">  ← image area only
      badges, ribbon, title/dates
    </Link>
  </div>
  <div class="absolute top-3 right-3 z-10">  ← buttons on OUTER div, outside Link
    TripCardQuickAdd / TripCardShareButtons / ⋯ button
  </div>
  TripCardNavSheet
</div>
```

React portals bubble events through the React tree, not the DOM tree — portal-spawning components (QuickAddSheet, QR Dialog) must be React-parented outside the `<Link>` to avoid triggering navigation on portal clicks. No `e.stopPropagation()` patches needed.

**Top-left badges** (`absolute top-3 left-3 z-10` on image div inside Link): type badge + member count. `bg-black/40 backdrop-blur-sm` pill style.

**Top-right buttons** (`absolute top-3 right-3 z-10 gap-2 md:gap-1.5`, on outer div): Add, Share, QR — `⋯` desktop-only (`hidden md:flex`). Style: `bg-black/30 hover:bg-black/50 backdrop-blur-md text-white w-10 h-10 md:w-8 md:h-8 rounded-xl shadow-sm shadow-black/20 active:scale-95 transition-all`. Icons: `w-5 h-5 md:w-4 md:h-4`.

**Diagonal ribbons** (`absolute bottom-[22px] right-[-30px] w-[130px] rotate-[-45deg]`, `pointer-events-none`):
- Demo: `bg-amber-500/90`, inner div `ring-2 ring-amber-400/40`. Text: `SAMPLE`.
- Archived: `bg-slate-500/80`, inner div `ring-2 ring-slate-400/30`. Text: `ARCHIVED`.

**TripCardNavSheet** — portal + AnimatePresence bottom sheet. Opens via `⋯` click (desktop) or 500ms long-press (all). Four destinations: Members, Expenses, Settle Up, Insights. Same `bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl` background. Non-passive `touchmove` listener prevents iOS body scroll-through.

### Share button — join URL, not summary URL
`TripCardShareButtons` shares `/join/[shareToken]`. QR encodes same URL with "Copy invite link" / "Scan to join this group".

### Motion
- Card entrance: `opacity 0→1, y 8→0` over 200ms, stagger via `AnimatedList`
- Balance numbers: `CountUp` (Framer Motion)
- `NavProgress` (`components/shared/nav-progress.tsx`) — cyan→teal bar at top. Lives in root `app/layout.tsx`. Triggers on `<a>` clicks + custom `navprogress` window event (dispatched before `window.location.href` navigations to cross-layout routes).

---

## 8. Key Algorithms

### Balance formula
```
net = totalPaid - totalOwed + settlementsSent - settlementsReceived
```
Templates (`is_template = true`) excluded from all balance calculations.

### Recurring expenses (nest only)
- Templates: `is_template=true`, `recurrence='monthly'|'weekly'`
- Logged instances: `is_template=false`, `source_template_id=<id>`, `expense_date=first of current month`
- `getGroupTemplates()` returns each template with `loggedThisMonth` + `lastLoggedDate`
- Double-logging prevented: button disabled once logged this month

### Split computation (`lib/splits/compute.ts`)
Four modes → `SplitResult[]` with `shareAmount` + `splitValue`:
- `equal`: divide evenly; `exact`: sum must equal total; `percentage`: sum must equal 100; `shares`: total > 0

Rounding: `Math.round(n * 100) / 100`. Remainder to first row. **16 Vitest tests — all must pass.**

### Settlement optimizer (`lib/settle/optimize.ts`)
Greedy: creditors/debtors by net, sort desc, match top pairs, emit min transactions. **6 Vitest tests.**

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
│   │           ├── members/page.tsx, loading.tsx + forms/buttons
│   │           ├── settle/page.tsx, loading.tsx, balances-section.tsx, mark-paid-button, upi-pay-button
│   │           └── insights/page.tsx + loading.tsx
│   ├── join/[token]/page.tsx + join-button.tsx
│   ├── summary/[token]/page.tsx + opengraph-image.tsx
│   ├── api/groups/[id]/export/route.ts    # CSV download
│   └── actions/
│       ├── groups.ts, expenses.ts, members.ts, settlements.ts, unsplash.ts, upload.ts
│       ├── parse-expense.ts, narrative.ts, trip-adherence.ts, parse-chat.ts, parse-itinerary.ts
│       └── demo.ts                        # ensureDemoGroup — seeds trip + nest demos
├── components/
│   ├── ui/                              # shadcn/base-ui primitives
│   ├── expense/  (expense-card, swipeable-expense-card [swipe-to-delete on touch], expense-filters [groupByMonth prop], split-editor, quick-add-bar, chat-import-dialog, ...)
│   ├── trip/     (trip-card [data-tour attrs], trip-card-nav-sheet, cover-photo-picker, budget-bar, qr-invite, narrative-section, adherence-card, ...)
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
│   ├── group-config.ts, categories.ts
│   ├── insights/trip-insights.ts + all-trips-insights.ts + all-nests-insights.ts + group-roles.ts
│   ├── parser/parse-expense.ts
│   ├── splits/compute.ts + compute.test.ts
│   ├── settle/optimize.ts + optimize.test.ts
│   ├── validations/trip.ts + expense.ts (addExpenseSchema + addTemplateSchema) + settlement.ts
│   ├── utils.ts
├── drizzle/policies.sql, indexes.sql    # indexes applied manually in Supabase SQL Editor
├── drizzle.config.ts, proxy.ts
```

---

## 10. Coding Conventions

- **TypeScript strict**. No `any`. Use `unknown` and narrow.
- **Server actions** return `{ ok: true, data }` or `{ ok: false, error }`. Never throw to client.
- **Money**: `numeric(12,2)` in DB, `number` in TS. Format with `formatCurrency()`.
- **Dates**: `date` type (no time). Format with `formatDate()`. Recurring: always first of month (`YYYY-MM-01`).
- **Member names**: always `getMemberName(member)` → `displayName ?? guestName ?? "Member"`.
- **revalidatePath**: always `revalidatePath('/groups/${groupId}', 'layout')` — layout variant invalidates whole subtree.
- **revalidateTag**: always two args — `revalidateTag('group-${groupId}', 'max')`.
- **File names**: kebab-case. No barrel files — import from actual file.
- **Fraunces font**: `style={{ fontFamily: "var(--font-fraunces)" }}` — never Tailwind class.
- **Dark mode**: every colour class needs a `dark:` counterpart.
- **Mobile-first**: grids `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`, multi-action rows `flex-col gap sm:flex-row`.
- **GROUP_CONFIG**: use `getGroupConfig(group.groupType)` — never `group.groupType === 'trip'` inline checks.
- **Date-range props**: `groupStartDate`/`groupEndDate` in components, `groupStart`/`groupEnd` in `DateContext`.
- **Shared constants in `lib/utils.ts`**: `DEFAULT_CURRENCY` (`"INR"`), `SUPPORTED_CURRENCIES` (9-currency array), `CHART_AXIS_TICK` (`{ fontSize: 10, fill: "#94A3B8" }`). Import here — never redeclare inline.
- **`CATEGORY_VALUES`** from `lib/categories.ts` — deduped union typed as `[string, ...string[]]` for `z.enum()`. Use in AI action Zod schemas.
- **`?from=groups` on expense new page**: `searchParams.from === "groups"` → back button → `/groups`. QuickAddSheet "Full form →" passes `?from=groups`.
- **customCategory**: required when `category === "other"` (`.superRefine()` guard in `addExpenseSchema`). Stored in `expenses.custom_category`.
- **Expense dates**: no trip date range restriction — pre-booked expenses (flights, hotels) dated before trip start are allowed.
- **Form props**: use `group: Group` (not `trip`). Exception: `computeTripInsights({ trip: group, ... })`.
- **Templates excluded from totals**: always filter `eq(expenses.isTemplate, false)`.
- **Mobile tap targets**: back/nav links `min-h-[44px]`; expense card buttons `w-11 h-11 sm:w-7 sm:h-7`; split inputs `inputMode="decimal"` (or `"numeric"` for shares).
- **Multi-item flex rows on mobile**: `flex-col sm:flex-row` — info `flex-1 min-w-0`, amount + actions on bottom row indented.

---

## 11. Environment Variables

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

## 12. Demo Data Seeding

`ensureDemoGroup()` (`app/actions/demo.ts`) — called on groups page load:
- Seeds **Goa 2025 · Sample** (trip, `is_demo=true`) — 8 expenses, all 4 split modes, 5 members
- Seeds **Mumbai Flat · Sample** (nest, `is_demo=true`) — 7 recurring templates, 4 months of expenses (Feb–May 2026), partial settlements
- Detects stale nest seed by description string and re-seeds automatically
- Trip card: `data-tour="demo-trip"` | Nest card: `data-tour="demo-nest"`
- Demo groups pinned first (`ORDER BY is_demo DESC`)

---

## 13. Onboarding Tour (10 steps)

`getTourSteps(demoTripId)` in `lib/tour/steps.ts`:
1. Welcome modal — "Trips for travel, Nests for home"
2. `[data-tour='new-trip-btn']` — New group button (`app/(app)/groups/page.tsx`)
3. `[data-tour='demo-trip']` — Sample Trip card (`components/trip/trip-card.tsx`)
4. `[data-tour='demo-nest']` — Sample Nest card (`components/trip/trip-card.tsx`)
5. `[data-tour='trip-card-add-btn']` — Quick-add button (`components/trip/trip-card-quick-add.tsx`)
6. `[data-tour='trip-quick-actions']` — Quick-actions (`app/(app)/groups/[id]/page.tsx`)
7. `[data-tour='expense-add-btn']` — Add expense (`app/(app)/groups/[id]/expenses/page.tsx`)
8. `[data-tour='settle-suggestions']` — Settle up (`app/(app)/groups/[id]/settle/page.tsx`)
9. `[data-tour='trip-charts']` — Chart grid (`app/(app)/groups/[id]/insights/page.tsx`)
10. `[data-tour='all-insights-charts']` — All-groups charts (`components/insights/insights-tabs.tsx`, all 3 chart grid divs)

Tour localStorage key: `clear_tour_done`. Replayable from avatar dropdown.

**Tour UX**: Popover always visible during navigation. Loading: spinner in description, Next disabled until target found. "Taking a moment…" hint after 1.5s (not 3s). All 4 inner trip pages prefetched when `demoTripId` first resolves.

**Auto-launch**: Polls for `[data-tour='new-trip-btn']` (300ms initial delay, then every 250ms) before setting `active=true`. Do not change to immediate launch — prevents blank blur before `ensureDemoGroup()` finishes seeding.

---

## 14. Insights Architecture

### Per-group (`/groups/[id]/insights`)
- **Trip**: total/per-person/daily KPIs, PaceTracker, CategoryDonut, DailySpendBar, MemberContributions, GroupRoles, CrossTripCard, AdherenceCard, SmartInsights
- **Nest**: this-month/last-month/per-person KPIs, CategoryDonut, MonthlySpendBar (stacked recurring+adhoc), MemberContributions, GroupRoles, SmartInsights

### All-groups (`/insights`) — tabbed
- **Trips tab**: total spend, trip count, companions, TripsSpendBar, CategoryDonut, smart insights, per-trip links
- **Nests tab**: monthly average, total, housemates, MonthlySpendBar, CategoryDonut, smart insights, per-nest links
- Tab switcher shows only if user has both trips and nests

**Query optimizations**: `getAllTripsInsightsData` uses single `GROUP BY group_id` query (not 1 per trip). `getAllNestsInsightsData` derives category totals in-memory from already-fetched expenses.

---

## 15. Deployment

**Repo**: https://github.com/Jayks/clear.git (master)
**Deployment**: Vercel (pending — new Supabase project needs wiring)

---

## 16. Key Scripts

```bash
pnpm dev / build / typecheck
pnpm test / pnpm test --run
pnpm db:push / db:studio
pnpm seed                # Goa trip — 10 members, 30 expenses (requires 1 existing group)
pnpm seed:temple         # South India temple tour — 20 members
```

**Puppeteer scripts**: `scripts/take-screenshots.js` (16 screenshots, needs `pnpm dev` + `cookies.json`), `scripts/generate-manual-pdf.js`.

---

## 17. Working Style

- **Ask before scope creep** — new deps, new feature areas, skipping sections.
- **Run `pnpm typecheck && pnpm test` before declaring done**.
- **Read existing code first** — check `lib/utils.ts`, components, queries before writing new ones.
- **No silent failures** — every error path has a toast, boundary, or visible feedback.
- **Keep this file updated** when decisions change.
