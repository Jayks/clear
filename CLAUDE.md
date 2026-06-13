# CLAUDE.md — Clear

> Source of truth for Claude Code. Reflects actual built state. When in doubt, ask.
>
> **Detailed references loaded automatically by directory:**
> `lib/db/CLAUDE.md` — schema, queries, algorithms · `components/CLAUDE.md` — design system, UI patterns + component/sheet gotchas · `app/CLAUDE.md` — routes, features, project structure + app-route/action gotchas

---

## 1. Project Overview

**Clear** — shared expense tracking for trips and households, plus bilateral personal debt tracking and shared fund management. Deployed on Vercel + Supabase (free tier).

**Four financial contexts:**
- **Trip** — multi-day travel groups. Has dates, itinerary, AI narrative, budget adherence, travel categories.
- **Nest** — ongoing household groups. Has recurring expense templates, monthly grouping, household categories. No dates/itinerary.
- **Stream** — bilateral personal debt ledger (no group needed). One stream per person; individual debt records within = **entries**.
- **Circle** — shared fund managed by an organiser. Two modes: **recurring** (fixed monthly contributions) and **one_time** (collect toward an optional target/deadline; sub-types: **Fixed** = `contributionAmount != null`, everyone pays the same; **Flexi** = `contributionAmount === null`, everyone contributes any amount). No individual debts — everyone is accountable to a shared wallet. Wallet balance = contributions − wallet expenses.

**Navigation (mobile bottom nav + desktop top nav):**
- **Home** (`/groups`) — Trips · Nests · Circles sections (split, not mixed). `HomeControlBar` provides underline-tab Active/Archived toggle + inline search (collapses to filter chip when blurred with a query).
- **Streams** (`/stream`) — bilateral personal debt dashboard.
- **Insights** (`/insights`) — analytics across all contexts.

**Stream terminology:** The feature = "Streams". The bilateral relationship with one person = "a Stream". An individual debt record within a stream = an **"entry"** (NOT "stream"). This distinction matters in all UI copy.

**Circle terminology:** The feature = "Circles". One circle group = "a Circle". Each member's payment = "a contribution" (NOT "expense"). Admin pool draws = **"wallet expenses"** (logged by admin, `is_advance=false`). Admin personal advances = **"wallet advances"** (`is_advance=true`). Ghost members = added by name without a Clear account; admin records contributions on their behalf. `circleMode: 'recurring' | 'one_time'`. One-time sub-types: **Fixed** (`contributionAmount != null`) = equal contributions; **Flexi** (`contributionAmount === null`) = any amount. Derived helpers: `isFixed = isOneTime && group.contributionAmount !== null`; `isFlexi = isOneTime && group.contributionAmount === null`.

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
| Geocoding | Mapbox API | `NEXT_PUBLIC_MAPBOX_TOKEN`; `lib/geocoding.ts` (`reverseGeocode` + `forwardGeocode`) |
| Image utils | `exifr` + Canvas API | `lib/image-utils.ts` — `compressImage`, `extractGpsFromImage`, `fileToBase64` |
| Database | Supabase Postgres | Free tier |
| Auth | Supabase Auth (Google OAuth) | @supabase/ssr v0.6 |
| Realtime | Supabase Realtime | postgres_changes → router.refresh() |
| ORM | Drizzle 0.45 / drizzle-kit 0.31 | drizzle-orm bumped 0.43→0.45.2 (SQLi-identifier security fix) |
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

> Component/sheet gotchas (CoverPhotoPicker, iOS touch, useSheetDismiss, ReceiptScanner, MapView, SVG/Framer) → `components/CLAUDE.md`
> App-route/action gotchas (Login modal, PWA, sign-out, AI rate limit, pdf-parse) → `app/CLAUDE.md`

### shadcn/ui uses @base-ui/react, NOT Radix

- **No `asChild` prop** — use `render` prop instead: `<Button render={<Link href="..." />}>`
- Button as Link needs `nativeButton={false}`: `<Button render={<Link href="..." />} nativeButton={false}>`
- Prefer plain styled `<Link>` for nav buttons to avoid nativeButton complexity

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
- **`getUserMemberIds(groupIds, userId)`** — batch lookup returning `Record<groupId, memberId>`. One query for N groups.

```typescript
// ✅ correct — deduplicated, one validated network call per render
import { getCurrentUser } from "@/lib/db/queries/auth";
const user = await getCurrentUser();

// ❌ wrong — independent undeduped round trip on every call site
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
```

Never switch to `getSession()` — cookie-only, no server validation.

### Turbopack — imports after module-level code crash the worker

Any `import` statement that appears after a `const`, `function`, or other module-level code causes Turbopack to abort the worker on **fresh** compilation. The file may compile fine from a warm cache but crashes after a dep change forces a recompile, manifesting as a persistent 404 with `exit code 4294967295`. Keep **all** `import` statements at the very top of every file, before any code.

Common trigger: `const X = dynamic(...)` or `const X = cache(...)` placed before a subsequent `import`.

Use `scripts/find-bad-imports.mjs` (`node scripts/find-bad-imports.mjs`) to scan the project for this pattern.

### Windows dev — TLS certificate fix

`.npmrc` contains `node-options=--use-system-ca` — required because Node.js 24's bundled CA was missing Supabase's intermediate cert (`UNABLE_TO_VERIFY_LEAF_SIGNATURE`). Do not remove.

### Supabase publishable key

`NEXT_PUBLIC_SUPABASE_ANON_KEY` uses `sb_publishable_*` format — @supabase/ssr handles it.

### Drizzle config needs dotenv

`drizzle.config.ts` must call `config({ path: ".env.local" })` — drizzle-kit doesn't auto-load on Windows.

### Resend — use `fetch`, never the SDK

The `resend` npm package v6 pulls in `svix` which crashes the Turbopack worker. Use the Resend HTTP API directly:

```typescript
await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
  body: JSON.stringify({ from: process.env.RESEND_FROM, to, subject, html }),
});
```

### `web-push` — dynamic import only

Static `import webpush from "web-push"` causes a Turbopack worker crash (persistent 404). Always use dynamic import inside the function body:

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

### `scroll-behavior: smooth` — pair with `data-scroll-behavior` on `<html>`

`globals.css` sets `html { scroll-behavior: smooth; }`. Next.js 16 requires the matching `data-scroll-behavior="smooth"` attribute on the `<html>` element in `app/layout.tsx` so the router knows smooth scrolling is intentional and suppresses the console warning. Both must be present.

### Inline `<Script>` — use `dangerouslySetInnerHTML`, not children

React 19 (used by Next.js 16) warns when a `<script>` tag appears as children inside a React component. For `next/script` with inline content (e.g. GA init), always pass the content via `dangerouslySetInnerHTML`:

```tsx
// ✅ correct
<Script id="ga-init" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: `...` }} />

// ❌ wrong — React 19 warning: "Encountered a script tag while rendering React component"
<Script id="ga-init" strategy="afterInteractive">{`...`}</Script>
```

> Note: `next-themes` `<ThemeProvider>` renders its own anti-flash `<script>`. React 19 emits the same warning for it **only during a client-side re-render** (e.g. an error boundary recovering). It is **dev-only** (stripped in production), comes from a third-party, and is harmless — leave it.

### Error boundaries & the shared `ErrorCard`

Page-load error handling is centralised so every failure looks the same and retries correctly:

- **`lib/error-utils.ts`** — pure `classifyError(error, isOnline, attemptCount)` → `{ kind: "offline" | "generic" | "persistent", title, message }`. Conservative by design: in production Next.js strips server error messages to a `digest`, and `navigator.onLine` is only trustworthy when `false`, so we do **not** try to distinguish server-vs-bug. `offline` (no network), `persistent` (≥`MAX_QUICK_RETRIES` failed retries), else `generic`. Pure + DI'd online state → fully unit-tested (`lib/error-utils.test.ts`).
- **`components/shared/error-card.tsx`** — the one error surface used by every `error.tsx`. Retry = `router.refresh()` + `reset()` inside a `useTransition` (`reset()` **alone does not refetch RSC data** — the key gotcha). Auto-retries when connectivity returns after being offline; counts attempts to escalate copy; logs `console.error` (observability seam); shows `digest` greyed. Props: `error`, `reset`, `backHref?`, `backLabel?`.
- **`components/shared/offline-banner.tsx`** — slim connectivity strip in the root layout; amber when offline, emerald "Back online" flash on reconnect.
- **Boundary hierarchy**: `app/global-error.tsx` catches **root-layout** failures — it replaces the layout, so it renders its own `<html>/<body>` with **inline styles only** (assume globals.css/Tailwind/fonts all failed). Segment `error.tsx` files (`app/error.tsx`, `app/(app)/error.tsx`, `app/(app)/groups/[id]/`, `stream/`, `insights/`, `app/admin/`) render **inside** their layout, so the nav bars stay visible — they must **not** render `<html>`. `admin/error.tsx` keeps a `Forbidden` special-case (dev-only; message is stripped to a digest in prod).

---

## 4. Architecture Principles

1. **Server-first**: RSC by default. `"use client"` only for state, effects, browser APIs, charts.
2. **Server Actions for mutations**: `app/actions/*.ts`. No REST routes for internal CRUD.
3. **Drizzle only for DB reads/writes**. Supabase JS only for Auth + Realtime.
4. **RLS everywhere**: All 6 tables (incl. `push_subscriptions`). `drizzle/policies.sql` is the source of truth.
5. **Pure functions for math**: `lib/splits/compute.ts`, `lib/settle/optimize.ts` — never touch DB.
6. **Shared Zod schemas**: same schema for form (zodResolver), server action input, and DB insert.
7. **Optimistic UI via useState**: `removedIds: Set<string>` state, rolls back on server error.
8. **Realtime via router.refresh()**: `useGroupRealtime(groupId)` in `hooks/use-trip-realtime.ts` — subscribes to expenses, settlements, group_members, expense_splits. **Disabled in dev** (was consuming 85% of Supabase free-tier CPU). Production only.
9. **Auth via shared `getCurrentUser()`**: React-`cache()`-wrapped, shared across whole render tree.
10. **GROUP_CONFIG pattern**: All type differences via `lib/group-config.ts` — never raw `group.type === 'trip'` checks scattered across files.
11. **Error handling split — boundaries vs toasts**: **Page-load failures** (RSC throws: DB unreachable, query errors) surface through `error.tsx` boundaries rendering the shared `ErrorCard`. **Mutation failures** surface through server actions returning `{ ok: false, error }` + a `sonner` toast. Never mix the two. Critically: a query that fails on page load must **propagate to the boundary** — never `.catch()` it into an empty result, which would render a false "empty state" during an outage (this was the `getAllGroups()` bug on the home page). Only `.catch()`-swallow genuinely optional data (notifications, geocoding, demo seeding, balance badges).

---

## 5. Coding Conventions

- **Server actions** return `{ ok: true, data }` or `{ ok: false, error }`. Never throw to client.
- **Money**: `numeric(12,2)` in DB, `number` in TS. Format with `formatCurrency()`.
- **Dates**: `date` type (no time). Format with `formatDate()`. Recurring: always first of month (`YYYY-MM-01`).
- **Member names**: always `getMemberName(member)` → `displayName ?? guestName ?? "Member"`.
- **revalidatePath**: `revalidatePath('/groups/${groupId}', 'layout')` — layout variant invalidates whole subtree.
- **revalidateTag**: always two args — `revalidateTag('group-${groupId}', 'max')`.
- **File names**: kebab-case. No barrel files.
- **Fraunces font**: `style={{ fontFamily: "var(--font-fraunces)" }}` — never Tailwind class.
- **Dark mode**: every colour class needs a `dark:` counterpart.
- **GROUP_CONFIG**: use `getGroupConfig(group.groupType)` — never `group.groupType === 'trip'` inline checks. Use `config.isCircle` to branch circle-specific logic.
- **Category icons**: always `<CategoryIcon category={…} size="sm|md" />` — renders `bg-gradient-to-br ${cat.gradient} text-white`. Never use `cat.color` / `cat.textColor` for icon containers (those are kept for charts only).
- **Category active chips**: active state = `bg-gradient-to-br ${catMeta.gradient} text-white shadow-sm`. Never hardcode `from-cyan-500 to-teal-500` for category chips.
- **Expense amount color**: green (`text-emerald-600 dark:text-emerald-400`) when the current user is the payer; neutral (`text-slate-800 dark:text-slate-100`) otherwise.
- **Section headers**: icon-badge + label + gradient rule line. Accent color by destination — amber=Insights, emerald=Settle, violet=Members, cyan=Expenses, slate=neutral. Pattern: `w-6 h-6 rounded-md bg-[color]-50 dark:bg-[color]-900/30` badge + `h-[1.5px] bg-gradient-to-r from-[color]-200/70 to-transparent dark:from-[color]-800/40 dark:to-transparent` rule. See `components/CLAUDE.md` for full table.
- **AnimatedList / FadeIn**: wrap card/item lists (`AnimatedList`, `staggerMs=80`, stagger cap 8, `initialDelayMs` for split lists) and section-level blocks (`FadeIn`, scroll-triggered, 550ms) — see `components/CLAUDE.md` for full API.
- **Shared constants in `lib/utils.ts`**: `DEFAULT_CURRENCY` (`"INR"`), `SUPPORTED_CURRENCIES`, `CHART_AXIS_TICK`.
- **`CATEGORY_VALUES`** from `lib/categories.ts` — `[string, ...string[]]` for `z.enum()`. Use in AI action schemas.
- **`?from=groups` on expense new page**: `searchParams.from === "groups"` → back button → `/groups`.
- **customCategory**: required when `category === "other"` (`.superRefine()` guard in `addExpenseSchema`).
- **Expense dates**: no trip date range restriction — pre-booked expenses may predate trip start.
- **Form props**: use `group: Group` (not `trip`).
- **Templates excluded from totals**: always filter `eq(expenses.isTemplate, false)`.
- **Mobile tap targets**: back/nav links `min-h-[44px]`; expense card buttons `w-11 h-11 sm:w-7 sm:h-7`.
- **Form pages — no `max-w-xl` constraint**: form pages (`new/`, `edit/`, `members/`) do NOT use `max-w-xl mx-auto` — they inherit the app layout's natural width so they don't look narrow on laptop. Only the app's outer `<main>` has `max-w-2xl`.
- **Pagination threshold**: `expense-filters.tsx` uses `PAGE_ALL_THRESHOLD = 20` — pagination (Prev/Next, 10/page) only activates for groups with >20 expenses; smaller groups render all at once.
- **Haptic feedback**: `lib/haptics.ts` exports `hapticLight()` (50ms, expense save/update), `hapticSuccess()` ([30,20,50]ms pattern, settlement paid), `hapticDelete()` (80ms, delete confirmed). All are no-ops when `navigator.vibrate` is unavailable (iOS Safari, desktop). Call at the success branch, before `toast.success`.
- **Toast position**: `<Toaster position="bottom-center" />` in `app/layout.tsx` — centered above the mobile nav, thumb-reachable on all screen sizes.
- **Card type stripe**: `TripCard` and `CircleCard` inner glass div contains an `absolute top-0 left-0 right-0 h-[3px] z-20 rounded-t-2xl` div with a `bg-gradient-to-r from-{color}/80 via-{color}/50 to-transparent` — sits above cover photos. Colors: cyan=Trip, emerald=Nest, violet=Circle-recurring, amber=Circle-one-time/Demo, slate=Archived.
- **`SplitAmount`** (`components/shared/split-amount.tsx`) — renders currency amounts with symbol at `font-medium opacity-70` and number at full weight. Props: `amount`, `currency?`, `className?`, `decimals?`. Use for prominent money displays (balance badges, person card amounts). `CURRENCY_LOCALE` is now exported from `lib/utils.ts`.
- **`BadgePop`** (`components/shared/badge-pop.tsx`) — Framer Motion client component that spring-animates its children from `scale(0) opacity(0)` on mount. Use for section header icon badges in RSC pages (CSS keyframe animations fire during SSR parse — too early for the user to see; this component fires after hydration). Import in RSC files as a normal import; Next.js handles the client boundary automatically.
- **`recordSettlement` returns `settlementId`**: `{ ok: true, settlementId: string }` — used by `MarkPaidButton` to wire the 5-second Undo toast. `deleteSettlement(settlementId, groupId)` is the paired action.
- **`useSheetDismiss(open, onClose)`** (`hooks/use-sheet-dismiss.ts`): adds Escape key + Android/browser back-button dismissal to any bottom sheet. Pushes a fake history entry on open so the hardware back button closes the sheet rather than navigating away; pops it automatically when closed programmatically. Use in every new bottom sheet component.
- **Dismissable prompt localStorage keys**: `clear_repeat_trip_dismissed_${groupId}` — `RepeatTripPrompt` reads after mount to avoid SSR mismatch. Pattern: read in `useEffect`, write on dismiss, render `null` if key is set.
- **Settlement celebration sessionStorage key**: `clear_settled_confetti_${groupId}` — `SettledCelebration` fires once per browser session when all debts are cleared. Stores `"1"` immediately on mount to prevent double-fire on re-renders.
- **Stream entry terminology**: individual debt records within a Stream are called **"entries"** in UI copy (not "streams"). "Log entry →", "3 entries", "New entry", etc. The Stream feature / relationship itself = "Stream".
- **Stream nav badge localStorage keys**: `clear_stream_has_badge` ("disputed" | "new" | absent) — written by `StreamBadgeSync` on Home page, cleared by `StreamDashboardClient` on mount. `clear_stream_last_viewed` (ms timestamp) — set when /stream dashboard opens. `MobileNav` reads badge after hydration and on `stream-badge-update` custom event.
- **Stream settled celebration**: `clear_stream_settled_${personId}` — `StreamSettledCelebration` fires confetti once per session when all-square with a person.
- **`SectionPillNav`** — sticky `top-14`; sections need `scroll-mt-28`. Colors: cyan=Trips, emerald=Nests, violet=Circles, **amber=Archived**. See `components/CLAUDE.md`.
- **`GlobalFab`** — fan-out FAB, Home page only (`!isEmpty`), `bottom-nav-safe right-4 z-50`; Log expense → `GroupPickerSheet` → `QuickAddSheet`; Log entry → `StreamLogSheet`. See `components/CLAUDE.md`.
- **`GroupActionHub`** (`components/trip/group-action-hub.tsx`) — 3-zone action hub replacing `TripCardNavSheet` + `TripCardQuickAdd`. Zone 1 (Log expense): Scan/Voice/Type tiles that open `QuickAddSheet` with `startMode` prop (`"scan"` auto-opens scanner, `"voice"` auto-starts mic after 350ms, `"text"` normal). Zone 2 (Jump to): Trips/Nests = 4 tiles; Circles = Expenses+Members only (no Settle/Insights). Zone 3 (Manage): Edit · Archive/Unarchive (admin-only) + Share (all members — visible whenever `joinUrl` is present). Zone 3 is hidden entirely when the user is not admin and `joinUrl` is absent. Entry points: `⋯` button on cards, 500ms long-press on cards, `GroupMobileNav`, `GroupHeroHub`. Circle-aware: Zone 1 hidden entirely for `groupType === "circle"`.
- **`onContextMenu` suppression on touch cards** — use `suppressNextClick.current`, NOT `touchStartPos.current`: `onContextMenu={(e) => { if (suppressNextClick.current) e.preventDefault(); }}`. Windows Chrome fires `contextmenu` AFTER `touchend`, so `touchStartPos` is already null by then; `suppressNextClick` stays `true` until the `click` handler runs (after `contextmenu` in the synthetic event sequence).
- **`HomeGreeting`** — client, user's local time (not UTC); emoji prefix (☀️ morning 5–11, ⛅ afternoon 12–16, 🌙 evening 17+); `text-2xl md:text-3xl` Fraunces heading.
- **Trip alive badges** — `computeTripStatus(startDate, endDate)` in `trip-card.tsx`: `active`/"Day X of Y", `lastDay`/"Last day 🏁", `justReturned`/"Just returned ✓" (≤7 days). Rendered as a glass pill badge (`bg-black/30 backdrop-blur-md border border-white/20 rounded-full px-2.5 py-1`) with `animate-ping` pulsing dot on active. Not shown on nests or archived.
- **`GroupSearchInput`** (`components/shared/group-search-input.tsx`) — only renders when `totalCount > 5`. Uses `data-group-card` + `data-group-name` attributes on TripCard wrappers and `data-group-section` on section elements for DOM-based filter.
- **Home page Trips/Nests sections**: each `<section>` gets `id="trips"/"nests"/"archived"`, `data-group-section=""`, and `scroll-mt-28`. Each TripCard wrapper gets `data-group-card=""` + `data-group-name={group.name.toLowerCase()}`.
- **New group URL pre-fill**: `/groups/new?type=trip` or `?type=nest` — `NewGroupPage` reads `searchParams.type` and passes `defaultGroupType` prop to `CreateTripForm`. Form `defaultValues` uses it.
- **App nav bars are transparent**: `AppNav`, `MobileNav`, `GroupMobileNav` all use `backdrop-blur-sm` (no background). Marketing navs (`/`, `/pricing`, `/changelog`) still use `glass-nav`. Do NOT apply `glass-nav` to in-app navbars.
- **AppNav hides on mobile for Stream pages**: `isInsideStream = pathParts[0] === "stream" && pathParts[1] !== "confirm"` — same pattern as `isInsideGroup`. Stream pages have their own custom sticky headers.

---

## 6. Environment Variables

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
CRON_SECRET                          # bearer secret for /api/cron/* routes; Vercel Cron sends it as `Authorization: Bearer`

# Geocoding (receipt scanner location + LocationInput dropdown)
NEXT_PUBLIC_MAPBOX_TOKEN             # pk.eyJ1... — Mapbox public token; omit to disable geocoding

# Email notifications (Resend)
RESEND_API_KEY
RESEND_FROM                          # e.g. "Clear <notifications@yourdomain.com>"
RESEND_UNSUBSCRIBE_SECRET            # random 32-char string for HMAC signing

# Web push notifications (VAPID)
NEXT_PUBLIC_VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY
VAPID_EMAIL                          # mailto:you@yourdomain.com

# Analytics
NEXT_PUBLIC_GA_MEASUREMENT_ID        # G-XXXXXXXXXX from GA4 dashboard; omit to disable tracking
```

---

## 7. Deployment & Scripts

**Repo**: https://github.com/Jayks/clear.git (master) · **Deployment**: Vercel (live).

```bash
pnpm dev / build / typecheck
pnpm test / pnpm test --run
pnpm db:push / db:studio
pnpm seed                # Goa trip — 10 members, 30 expenses
pnpm seed:temple         # South India temple tour — 20 members
pnpm seed:panindia       # Pan-India Explorer — 5 members, 18 located expenses across every map-pin scenario
pnpm seed:streams        # 3 stream counterparts, 30 entries (all statuses)
```

---

## 8. Working Style

- **Ask before scope creep** — new deps, new feature areas, skipping sections.
- **Run `pnpm typecheck && pnpm test` before declaring done**.
- **Read existing code first** — check `lib/utils.ts`, components, queries before writing new ones.
- **No silent failures** — every error path has a toast, boundary, or visible feedback.
- **Keep this file and subdirectory CLAUDE.md files updated** when decisions change.
- **Create test cases before starting implementing. Run test cases that can be tested automatically (unit testing, some functional testing) and verify all pass, before confirming for user validation.**
- **For user validation, always present the test cases that can only be manually tested. Present 1 test case at a time. Ask the user to confirm whether the testing is a Pass, Fail, Skip.**
