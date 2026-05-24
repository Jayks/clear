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

**Notifications**: `web-push 3.6.7` (server-only, dynamic import required — see gotchas)

**Dev tools**: `tsx`, `dotenv`, `vitest`, `puppeteer-core`

**Do NOT add**: NextAuth, Prisma, Redux, MUI, Chakra, Bootstrap, styled-components, tRPC, Pusher/Ably.

---

## 3. Critical Gotchas

### shadcn/ui uses @base-ui/react, NOT Radix

- **No `asChild` prop** — use `render` prop instead: `<Button render={<Link href="..." />}>`
- Button as Link needs `nativeButton={false}`: `<Button render={<Link href="..." />} nativeButton={false}>`
- Prefer plain styled `<Link>` for nav buttons to avoid nativeButton complexity

### CoverPhotoPicker — no `<form>` inside forms

Two tabs: **Search Unsplash** (default) and **Upload from device**. Search uses `<div>` with `type="button"` to prevent parent form submission. Flow: pick → `URL.createObjectURL` preview → `getSignedUploadUrl` action → browser calls `supabase.storage.uploadToSignedUrl()` directly (raw file, never via Vercel) → `onChange(publicUrl)`. 5 MB limit enforced client-side. Revoke object URL on upload or close. **No base64** — avoids Vercel's 4.5 MB body limit.

### DB Singleton (prevents HMR connection exhaustion)

```typescript
// lib/db/client.ts
declare global { var _pgClient: postgres.Sql | undefined; }
const client = globalThis._pgClient ?? postgres(connectionString, { prepare: false, max: 3 });
if (process.env.NODE_ENV !== 'production') globalThis._pgClient = client;
```

### proxy.ts (Next.js 16)

Next.js 16 renamed `middleware.ts` → `proxy.ts` with a `proxy` export (not `middleware`). The `config.matcher` uses an explicit route list (`/groups/:path*`, `/insights/:path*`, `/admin/:path*`, `/settings/:path*`, `/settings`, `/login`, `/`) — not the old catch-all regex. Protected routes: `/groups`, `/insights`, `/admin`, `/settings`. `/join` is **public** — unauthenticated users see the invite preview; the join action itself guards auth.

### Auth pattern — always use `getCurrentUser()`, never raw `getUser()`

`lib/db/queries/auth.ts` exports:
- **`getCurrentUser()`** — React-`cache()`-wrapped, validates JWT against Supabase Auth. Deduplicated across the RSC tree.
- **`getMembership(groupId, userId)`** — React-`cache()`-wrapped single `group_members` row lookup.
- **`getUserMemberIds(groupIds, userId)`** — batch lookup returning `Record<groupId, memberId>`. One query for N groups. Used on the groups page to load balance badges efficiently.

```typescript
// ✅ correct — deduplicated, one validated network call per render
import { getCurrentUser } from "@/lib/db/queries/auth";
const user = await getCurrentUser();

// ❌ wrong — independent undeduped round trip on every call site
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
```

All layout and `lib/db/queries/*.ts` files use `getCurrentUser()`. `ensureDemoGroup()` also uses it (shares cache). Never switch to `getSession()` — cookie-only, no server validation.

### Turbopack — imports after module-level code crash the worker

Any `import` statement that appears after a `const`, `function`, or other module-level code causes Turbopack to abort the worker on **fresh** compilation. The file may compile fine from a warm cache but crashes after a dep change forces a recompile, manifesting as a persistent 404 with `exit code 4294967295`. Keep **all** `import` statements at the very top of every file, before any code.

Common trigger: `const X = dynamic(...)` or `const X = cache(...)` placed before a subsequent `import`.

Use `scripts/find-bad-imports.mjs` (`node scripts/find-bad-imports.mjs`) to scan the project for this pattern.

### Windows dev — TLS certificate fix

`.npmrc` contains `node-options=--use-system-ca` — required because Node.js 24's bundled CA was missing Supabase's intermediate cert (`UNABLE_TO_VERIFY_LEAF_SIGNATURE`). Do not remove.

### QuickAddSheet — portal + `isOpen` prop pattern

Manages its own `createPortal` and `AnimatePresence` internally. Always pass `isOpen` boolean — never conditionally render from parent, never wrap in external `AnimatePresence`. The backdrop and sheet are direct `AnimatePresence` children (not in a Fragment). Members lazy-fetched on first `isOpen=true` via `fetchedRef`.

**`groupType` prop** — keys `useRecentCategories()` to `clear_recent_categories_trip` / `_nest`; recent category pills shown above the category select.

**Post-save UX** — button turns "✓ Saved!" → "+ Add another →" fades in after 200ms; auto-close 2000ms. "Add another" cancels timer + resets form via `setOpenCount`.

### iOS touch & safe-area patterns

**Long-press on TripCard** — 500ms timer, `MOVE_THRESHOLD=8px`. `touchAction:"manipulation"` removes 300ms tap delay.

**Safe-area CSS utilities** (top-level in `globals.css`, NOT inside `@layer` — Turbopack rejects `@media` nested inside `@layer`):
- `.h-nav-safe` — nav height + `safe-area-inset-bottom`. MobileNav inner div.
- `.pb-safe-nav` — content bottom padding + safe area, overridden to `2rem` at `md`. App `<main>`.
- `.bottom-nav-safe` — `bottom` value for FAB + iOS install hint.

**iOS body scroll-through** — `position:fixed` overlays don't block scroll on iOS Safari. `TripCardNavSheet` and `QuickAddSheet` use non-passive DOM `touchmove` listeners (React synthetic events can't `preventDefault()`). QuickAddSheet exempts its scrollable div via `scrollBodyRef`.

**QuickAddSheet voice stale trigger** — clears `voiceTrigger` to `null` on close (QuickAddBar unmounts on close).

### Admin dashboard patterns

**Non-async layout** — `app/admin/layout.tsx` is synchronous so `loading.tsx` works. `requirePlatformAdmin()` in each page query is the authoritative auth check.

**Admin navigation** — `/admin` is outside `/(app)`, so `router.push("/admin")` silently fails. Use `window.location.href = "/admin"` with `window.dispatchEvent(new Event("navprogress"))` first so `NavProgress` starts before the page unloads.

**`withAdminTimeout`** — all admin queries run in `db.transaction()` with `SET LOCAL statement_timeout = 8000`. Hard-cancels slow queries, releases connections immediately.

**Admin query design** — `getAdminStats()`: 4 subqueries in 1 round-trip. `getAdminUserList()`: DB query inside `withAdminTimeout`; Supabase Admin `listUsers()` OUTSIDE the transaction (identifies platform admins by email). Email field returns empty string in UI.

**Admin delete** — `adminDeleteGroup` + `adminDeleteUser` in `app/actions/admin.ts`. Group delete cascades via FK. Guards: demo groups and platform admins cannot be deleted.

**DB resilience** — `lib/db/client.ts`: `max:3`, `idle_timeout:20`, `connect_timeout:10`. Admin page uses `Promise.race` against 12s fallback (never rejects).

### AI action rate limiting

`lib/rate-limit.ts` exports `checkAiRateLimit(userId): boolean` — 20 AI calls/hour per user, shared across all AI features. All four AI actions (`parse-expense.ts`, `narrative.ts`, `parse-chat.ts`, `trip-adherence.ts`) call `getCurrentUser()` then `checkAiRateLimit(user.id)` before invoking Anthropic. In-memory store (best-effort on serverless). `parseExpenseWithAI` returns `null` on rate limit (falls back to rule-based parser); others return `{ ok: false, error: "Rate limit exceeded..." }`.

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

### Resend — use `fetch`, never the SDK

The `resend` npm package v6 pulls in `svix` as a dependency, which uses Node.js streams incompatibly with this environment, crashing the Turbopack worker and causing a 404 on any page that imports the action chain. Use the Resend HTTP API directly:

```typescript
await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
  body: JSON.stringify({ from: process.env.RESEND_FROM, to, subject, html }),
});
```

### `web-push` — dynamic import only

Static `import webpush from "web-push"` in any file reachable from a page component causes a Turbopack worker crash (persistent 404). Always use dynamic import inside the function body:

```typescript
import type webpushType from "web-push";

export async function sendPushToMembers(...) {
  const webpush = ((await import("web-push")) as unknown as { default: typeof webpushType }).default;
  webpush.setVapidDetails(...);
}
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

`opts: { full?: boolean }` (default `false`). When false, `itinerary` is `null`. Pass `{ full: true }` only on insights and edit pages. Cached via `unstable_cache` tagged `group-${groupId}` — invalidated by `revalidateTag` only.

### Group cache invalidation — `revalidateTag` required on mutations

Always two args: `revalidateTag(\`group-${groupId}\`, "max")` — single-arg form is a TS error in Next.js 16. Call on: `updateGroup`, `archiveGroup`, `regenerateShareToken`, `addGuestMember`, `removeMember`, `joinGroup`, `claimGuestMember`.

**`getAllGroups()`** — one query returning `{ active, archived }`. Replaces `getGroups()` + `getArchivedGroups()`.

### `getBalances()` — cached, currency-filtered CTE

`getBalances(groupId, defaultCurrency)` — filters to `defaultCurrency` expenses only. Returns `{ balances, suggestions, hasMixedCurrencies }`. Wrapped in `unstable_cache` tagged `balances-${groupId}`. Must call `revalidateTag('balances-${groupId}', 'max')` on every action touching expenses or settlements: `addExpense`, `updateExpense`, `duplicateExpense`, `deleteExpense`, `logFromTemplate`, `autoLogDueTemplates`, `recordSettlement`, `deleteSettlement`.

**CTE alias pitfall**: 4 CTE aliases must be unique (`paid_total`, `owed_total`, `sent_total`, `received_total`) — Postgres raises "column reference is ambiguous" if all named `total`.

### Join page — existing member redirect + guest claim flow

`app/join/[token]/page.tsx`: (1) existing member → `getMembership()` → immediate `redirect(/groups/${group.id})`; (2) `getGroupByToken()` returns `unclaimedGuests` (null `user_id`) → cyan pill list → `claimGuestMember(token, guestMemberId)` atomically sets `user_id`, clears `guest_name`, sets `displayName` from Google.

`claimGuestMember` in `app/actions/members.ts`. Call `revalidateTag(\`group-${group.id}\`, 'max')` after claim.

### Misc constraints

- `computeTripInsights`: always `{ trip: group, ... }` — do not rename `trip`.
- `/summary/[token]` returns 404 for nests.
- **Date-range props**: components use `groupStartDate`/`groupEndDate`; AI `DateContext` uses `groupStart`/`groupEnd`.

---

## 4. Architecture Principles

1. **Server-first**: RSC by default. `"use client"` only for state, effects, browser APIs, charts.
2. **Server Actions for mutations**: `app/actions/*.ts`. No REST routes for internal CRUD.
3. **Drizzle only for DB reads/writes**. Supabase JS only for Auth + Realtime.
4. **RLS everywhere**: All 6 tables (incl. `push_subscriptions`). `drizzle/policies.sql` is the source of truth.
5. **Pure functions for math**: `lib/splits/compute.ts`, `lib/settle/optimize.ts` — never touch DB.
6. **Shared Zod schemas**: same schema for form (zodResolver), server action input, and DB insert.
7. **Optimistic UI via useState**: `removedIds: Set<string>` state, rolls back on server error.
8. **Realtime via router.refresh()**: `useGroupRealtime(groupId)` in `hooks/use-trip-realtime.ts` — subscribes to expenses, settlements, group_members, expense_splits. All four subscriptions filter by `group_id=eq.${groupId}` (expense_splits gained a `group_id` column for this). Mounted via `RealtimeRefresh` in `app/(app)/groups/[id]/layout.tsx`. **Disabled in dev** (was consuming 85% of Supabase free-tier CPU). Production only.
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
notifications_muted: boolean default false   -- per-group email + push opt-out
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
created_by_user_id: uuid
updated_by_user_id: uuid nullable   -- set by updateExpense(); null on create
created_at: timestamptz, updated_at: timestamptz
```

### expense_splits
```
id
group_id: uuid nullable fk->groups(cascade)   -- added for realtime filtering; always populated on new inserts
expense_id fk->expenses(cascade), member_id fk->group_members(cascade)
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

### push_subscriptions
```
id
user_id: uuid fk->auth.users(cascade)
endpoint: text NOT NULL
p256dh: text NOT NULL
auth: text NOT NULL
created_at: timestamptz
UNIQUE: (user_id, endpoint)
```
RLS: users read/write only their own rows. Schema: `lib/db/schema/push-subscriptions.ts`.

### subscriptions
```
id
user_id: uuid NOT NULL UNIQUE
plan: text default 'free'           -- 'free' | 'plus'
status: text default 'trialing'     -- 'trialing' | 'active' | 'cancelled'
trial_ends_at: timestamptz
current_period_end: timestamptz
billing_cycle: text nullable        -- 'monthly' | 'annual'
admin_override: boolean default false
razorpay_subscription_id: text nullable
created_at, updated_at: timestamptz
```
Schema: `lib/db/schema/subscriptions.ts`. **Note:** `pnpm db:push` has a pre-existing drizzle-kit bug with `group_members` CHECK constraint — apply new columns via direct SQL in Supabase SQL Editor.

### Supabase Storage — `cover-photos` bucket (run once)

Dashboard → Storage → New bucket: name `cover-photos`, Public, 5 MB limit. Three RLS policies: authenticated insert (folder = `auth.uid()`), public select, authenticated delete own. Files at `{userId}/{timestamp}-{slug}.{ext}`. `next.config.ts` has Supabase project hostname in `remotePatterns`.

### Realtime setup — add `expenses`, `expense_splits`, `settlements`, `group_members` to `supabase_realtime` publication (SQL Editor, run once).

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
- **Desktop**: sticky top — `ClearLogo` (28px), Groups, Insights, ThemeToggle, avatar dropdown (Admin [if platform admin], Take the tour, Settings, Sign out).
- **Mobile**: icon-only top nav + fixed `MobileNav` bottom. Content uses `.pb-safe-nav`. FAB (`bottom-nav-safe right-4 md:hidden`) on Expenses page (outer container uses `pb-24 md:pb-0` to clear FAB). MobileNav inner div uses `.h-nav-safe`.
- **Within group routes on mobile**: `AppNav` hides (`hidden md:block`); `GroupMobileNav` renders inside `<main>` as `sticky top-0 z-40 -mx-6 -mt-6` (negative margins break out of padding; sticky scrolls past TrialBanner). Shows: ← Back | group name (Fraunces) | `⋯` → `TripCardNavSheet`.
- **Plus badge on avatar**: violet ✦ circle at `-bottom-0.5 -right-0.5` (distinct from cyan tour dot at `-top-0.5 -right-0.5`). Dropdown header also shows a `✦ Plus` pill next to the user's name. Only shown when `plan === "plus"` (active paid, not trialing).

### Quick-add sheet
Uses `bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl` — NOT `.glass` (60% opacity is too transparent over the dark backdrop overlay).

### Group card action buttons — two-wrapper structure (critical)

`TripCard` uses two nested wrappers to keep action buttons outside the `<Link>`:
- **Outer div**: positioning, hover, touch handlers. NO `overflow-hidden`.
- **Inner div** (`glass rounded-2xl overflow-hidden`): clips image + ribbon. Contains `<Link>` (image area only) with top-left badges and diagonal ribbon.
- **Buttons** are children of the OUTER div (`absolute top-3 right-3 z-10`): Add, Share — `⋯` always visible (`flex w-10 h-10 md:w-8 md:h-8`).
- **TripCardNavSheet** is also on outer div.

React portals bubble through the React tree, not the DOM — portal-spawning components (QuickAddSheet, InviteQRSheet) must be React-parented outside the `<Link>`. No `e.stopPropagation()` needed.

**Diagonal ribbons** (`absolute bottom-[22px] right-[-30px] w-[130px] rotate-[-45deg]`, `pointer-events-none`): Demo = amber `SAMPLE`, Archived = slate `ARCHIVED`. On the inner div so the ribbon spans image + badge.

**TripCardNavSheet** — portal + AnimatePresence bottom sheet. Opens via `⋯` click (all devices) or 500ms long-press (all). Four destinations: Members, Expenses, Settle Up, Insights.

### Share / invite pattern — platform-aware Web Share API

`TripCardShareDrawer` — single share icon on card. `navigator.share()` directly → iOS AbortError → `InviteQRSheet`; non-iOS AbortError → nothing (Windows/Android native share sheet already has QR + copy); no Web Share API → clipboard copy.

`InviteSection` — on group detail + members pages. Same platform-aware logic. Embeds `ConfirmDialog` for "Reset invite link" (absorbs old `RegenerateTokenButton`). `currentUrl` state updates after token regeneration.

`InviteQRSheet` (`components/shared/invite-qr-sheet.tsx`) — iOS-only QR bottom sheet. Portal + AnimatePresence, non-passive `touchmove` prevention. Shares `/join/[shareToken]`.

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
- **Auto-log on page load**: `autoLogDueTemplates(groupId)` in `app/actions/expenses.ts` is called on the nest group overview page (`app/(app)/groups/[id]/page.tsx`) — logs any due templates automatically. Best-effort (wrapped in `.catch(() => {})`). Only fires for nest groups.

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
│   ├── trip/     (trip-card, trip-card-nav-sheet, trip-card-share-drawer, invite-section, group-balance-badge [async RSC], cover-photo-picker, budget-bar, narrative-section, adherence-card, ...)
│   ├── settlement/ (settlement-breakdown, member-debt-breakdown)
│   ├── insights/ (kpi-card, category-donut, daily-spend-bar, monthly-spend-bar, member-contributions, trips-spend-bar, insights-tabs, ...)
│   ├── tour/     (tour-context.tsx, tour-layer.tsx)
│   └── shared/   (skeleton, animated-list, count-up, confirm-dialog, member-avatar, mobile-nav, group-mobile-nav, realtime-refresh, theme-toggle, nav-progress, clear-logo, invite-qr-sheet, swipe-hint, ios-install-hint, long-press-hint, nest-hint, push-permission-prompt)
├── hooks/  use-trip-realtime.ts, use-warn-before-leave.ts, use-speech-recognition.ts, use-push-subscription.ts, use-recent-categories.ts
├── lib/
│   ├── db/client.ts, schema/*.ts, queries/(groups, expenses, balances, insights, meta, admin, auth).ts
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

## 10. Coding Conventions

- **Server actions** return `{ ok: true, data }` or `{ ok: false, error }`. Never throw to client.
- **Money**: `numeric(12,2)` in DB, `number` in TS. Format with `formatCurrency()`.
- **Dates**: `date` type (no time). Format with `formatDate()`. Recurring: always first of month (`YYYY-MM-01`).
- **Member names**: always `getMemberName(member)` → `displayName ?? guestName ?? "Member"`.
- **revalidatePath**: `revalidatePath('/groups/${groupId}', 'layout')` — layout variant invalidates whole subtree.
- **revalidateTag**: always two args — `revalidateTag('group-${groupId}', 'max')`.
- **File names**: kebab-case. No barrel files.
- **Fraunces font**: `style={{ fontFamily: "var(--font-fraunces)" }}` — never Tailwind class.
- **Dark mode**: every colour class needs a `dark:` counterpart.
- **GROUP_CONFIG**: use `getGroupConfig(group.groupType)` — never `group.groupType === 'trip'` inline checks.
- **Shared constants in `lib/utils.ts`**: `DEFAULT_CURRENCY` (`"INR"`), `SUPPORTED_CURRENCIES`, `CHART_AXIS_TICK`. Import here — never redeclare inline.
- **`CATEGORY_VALUES`** from `lib/categories.ts` — `[string, ...string[]]` for `z.enum()`. Use in AI action schemas.
- **`?from=groups` on expense new page**: `searchParams.from === "groups"` → back button → `/groups`. QuickAddSheet "Full form →" passes `?from=groups`.
- **customCategory**: required when `category === "other"` (`.superRefine()` guard in `addExpenseSchema`). Stored in `expenses.custom_category`.
- **Expense dates**: no trip date range restriction — pre-booked expenses may predate trip start.
- **Form props**: use `group: Group` (not `trip`).
- **Templates excluded from totals**: always filter `eq(expenses.isTemplate, false)`.
- **Mobile tap targets**: back/nav links `min-h-[44px]`; expense card buttons `w-11 h-11 sm:w-7 sm:h-7`.

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

# Email notifications (Resend)
RESEND_API_KEY                       # re_... from Resend dashboard
RESEND_FROM                          # e.g. "Clear <notifications@yourdomain.com>"
RESEND_UNSUBSCRIBE_SECRET            # random 32-char string for HMAC signing

# Web push notifications (VAPID)
NEXT_PUBLIC_VAPID_PUBLIC_KEY         # generated once via: node -e "require('web-push').generateVAPIDKeys()..."
VAPID_PRIVATE_KEY
VAPID_EMAIL                          # mailto:you@yourdomain.com

# Analytics
NEXT_PUBLIC_GA_MEASUREMENT_ID        # G-XXXXXXXXXX from GA4 dashboard; omit to disable tracking
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

## 13. Onboarding Tour (7 steps — 4 default + 3 extended)

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

## 14. Group Card Balance Badge

`components/trip/group-balance-badge.tsx` — async RSC streamed into each active `TripCard` via `<Suspense>`. States: owe (amber) / owed (emerald) / settled (muted emerald) / no expenses (slate) / multi-currency (muted). Groups page batch-fetches all member IDs via `getUserMemberIds(groupIds, userId)` (one query). Archived cards get no badge. `TripCard` accepts `balanceBadge?: React.ReactNode`.

## 15. Expense Detail Sheet

`components/expense/expense-detail-sheet.tsx` — bottom sheet on expense card tap. Self-contained inside `SwipeableExpenseCard`. Fetches splits on demand via `fetchExpenseSplitsAction` (auth-checked, returns `ExpenseSplit[]`). Escape key closes.

## 16. Subscription & Monetization

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

## 17. Insights Architecture

**Per-group** (`/groups/[id]/insights`): Trip → KPIs, PaceTracker, CategoryDonut, DailySpendBar, MemberContributions, GroupRoles, CrossTripCard, AdherenceCard, SmartInsights. Nest → KPIs, CategoryDonut, MonthlySpendBar (stacked recurring+adhoc), MemberContributions, GroupRoles, SmartInsights.

**All-groups** (`/insights`) — tabbed (Trips / Nests). Tab switcher only if user has both. `getAllTripsInsightsData` uses single `GROUP BY group_id` query. `getAllNestsInsightsData` derives category totals in-memory.

---

## 18. Deployment

**Repo**: https://github.com/Jayks/clear.git (master)
**Deployment**: Vercel (live). Add all env vars (incl. VAPID + Resend) in Vercel dashboard → Settings → Environment Variables. Set `NEXT_PUBLIC_APP_URL` to the production URL.

---

## 19. Key Scripts

```bash
pnpm dev / build / typecheck
pnpm test / pnpm test --run
pnpm db:push / db:studio
pnpm seed                # Goa trip — 10 members, 30 expenses (requires 1 existing group)
pnpm seed:temple         # South India temple tour — 20 members
```

**Puppeteer scripts**: `scripts/take-screenshots.js` (16 screenshots, needs `pnpm dev` + `cookies.json`), `scripts/generate-manual-pdf.js`.

---

## 20. Working Style

- **Ask before scope creep** — new deps, new feature areas, skipping sections.
- **Run `pnpm typecheck && pnpm test` before declaring done**.
- **Read existing code first** — check `lib/utils.ts`, components, queries before writing new ones.
- **No silent failures** — every error path has a toast, boundary, or visible feedback.
- **Keep this file updated** when decisions change.
