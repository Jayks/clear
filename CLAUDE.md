# CLAUDE.md — Clear

> Source of truth for Claude Code. Reflects actual built state. When in doubt, ask.
>
> **Detailed references loaded automatically by directory:**
> `lib/db/CLAUDE.md` — schema, queries, algorithms · `components/CLAUDE.md` — design system, UI patterns · `app/CLAUDE.md` — routes, features, project structure

---

## 1. Project Overview

**Clear** — shared expense tracking for trips and households, plus bilateral personal debt tracking. Deployed on Vercel + Supabase (free tier).

**Three financial contexts:**
- **Trip** — multi-day travel groups. Has dates, itinerary, AI narrative, budget adherence, travel categories.
- **Nest** — ongoing household groups. Has recurring expense templates, monthly grouping, household categories. No dates/itinerary.
- **Stream** — bilateral personal debt ledger (no group needed). One stream per person; individual debt records within = **entries**.

**Navigation (mobile bottom nav + desktop top nav):**
- **Home** (`/groups`) — Trips section + Nests section (split, not mixed). Section jump pills.
- **Streams** (`/stream`) — bilateral personal debt dashboard.
- **Insights** (`/insights`) — analytics across all contexts.

**Stream terminology:** The feature = "Streams". The bilateral relationship with one person = "a Stream". An individual debt record within a stream = an **"entry"** (NOT "stream"). This distinction matters in all UI copy.

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

### iOS touch & safe-area patterns

**Long-press on TripCard** — 500ms timer, `MOVE_THRESHOLD=8px`. `touchAction:"manipulation"` removes 300ms tap delay.

**iOS body scroll-through** — `position:fixed` overlays don't block scroll on iOS Safari. `TripCardNavSheet` and `QuickAddSheet` use non-passive DOM `touchmove` listeners (React synthetic events can't `preventDefault()`). QuickAddSheet exempts its scrollable div via `scrollBodyRef`.

### AI action rate limiting

`lib/rate-limit.ts` exports `checkAiRateLimit(userId): boolean` — 20 AI calls/hour per user, shared across all AI features. All four AI actions (`parse-expense.ts`, `narrative.ts`, `parse-chat.ts`, `trip-adherence.ts`) call `getCurrentUser()` then `checkAiRateLimit(user.id)` before invoking Anthropic. In-memory store (best-effort on serverless). `parseExpenseWithAI` returns `null` on rate limit; others return `{ ok: false, error: "Rate limit exceeded..." }`.

### Login — modal vs standalone

Login renders as a **modal overlay** (via Next.js parallel routes + intercepting routes) when navigated to client-side from a marketing page; it renders as a **standalone full page** when accessed directly (new tab, email link) or via a `proxy.ts` hard redirect.

- `app/@modal/(.)login/page.tsx` — intercepts client-side nav to `/login`; renders `components/shared/login-modal.tsx` (desktop: centered glass dialog; mobile: bottom sheet).
- `app/(auth)/login/page.tsx` — unchanged standalone fallback.
- `components/shared/login-modal.tsx` — client component; Escape key + backdrop click → `router.back()`; scroll-locks body on mount.

**`scroll={false}` required on every `/login` `<Link>` in marketing pages.** Without it, Next.js scrolls to the `{modal}` slot (rendered after `{children}` in the layout) when the intercepting route mounts, jumping the page to the bottom. The `intent` and `returnTo` params work identically in both modes.

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

### pdf-parse — import from `lib/`, never from `index.js`

```typescript
// ✅ correct
const pdfParse: (buf: Buffer) => Promise<{ text: string }> = require("pdf-parse/lib/pdf-parse.js");
// ❌ wrong — crashes in Turbopack server bundle
import pdfParse from "pdf-parse";
```

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

### SVG + Framer Motion `transform` conflict

`motion.g` with both an SVG `transform` attribute AND Framer Motion `scale`/`opacity` animation props causes Framer Motion to **override** the SVG transform, wiping the `translate(x,y)` and collapsing the element to `(0,0)`. The node becomes invisible (scale 0 at the SVG origin).

**Fix** — separate positioning from animation with two wrappers:
```tsx
// ✅ correct — static <g> for position, motion.g for animation only
<g transform={`translate(${node.x}, ${node.y})`}>
  <motion.g
    style={{ transformOrigin: "0px 0px" }}   // scale from local (0,0) = node centre
    initial={{ scale: 0, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ type: "spring", stiffness: 380, damping: 22 }}
  >
    {/* circles, text, etc. at local (0,0) coords */}
  </motion.g>
</g>

// ❌ wrong — Framer Motion replaces "translate(x,y)" with "scale(0)" on the same element
<motion.g
  transform={`translate(${node.x}, ${node.y})`}
  initial={{ scale: 0, opacity: 0 }}
  animate={{ scale: 1, opacity: 1 }}
>
```

### SVG SMIL animation elements (`animateMotion`, `animate`) — use `React.createElement`

React's JSX types don't expose the `path` attribute on `<animateMotion>` or all attributes on `<animate>`. Using them as JSX produces TypeScript errors. Bypass with `React.createElement` — identical DOM output, no type errors:

```tsx
import React from "react";   // must be a default import, not just named hooks

// ✅ correct — React.createElement for SMIL animation elements
<circle r={2.5} fill="#FDE68A">
  {React.createElement("animateMotion", {
    path: arc.d,
    dur: "2s",
    repeatCount: "indefinite",
    begin: "0.5s",
  })}
  {React.createElement("animate", {
    attributeName: "opacity",
    values: "0;0.9;0.9;0",
    keyTimes: "0;0.08;0.82;1",
    dur: "2s",
    repeatCount: "indefinite",
    begin: "0.5s",
  })}
</circle>

// ❌ wrong — TS error: "path" is not a valid prop on animateMotion
<animateMotion path={arc.d} dur="2s" repeatCount="indefinite" />
```

Use `gradientUnits="userSpaceOnUse"` with explicit `x1/y1/x2/y2` for directional SVG gradients along arc paths — `objectBoundingBox` (the default) scales incorrectly for non-rectangular path bounding boxes.

### Inline `<Script>` — use `dangerouslySetInnerHTML`, not children

React 19 (used by Next.js 16) warns when a `<script>` tag appears as children inside a React component. For `next/script` with inline content (e.g. GA init), always pass the content via `dangerouslySetInnerHTML`:

```tsx
// ✅ correct
<Script id="ga-init" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: `...` }} />

// ❌ wrong — React 19 warning: "Encountered a script tag while rendering React component"
<Script id="ga-init" strategy="afterInteractive">{`...`}</Script>
```

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
- **GROUP_CONFIG**: use `getGroupConfig(group.groupType)` — never `group.groupType === 'trip'` inline checks.
- **Category icons**: always `<CategoryIcon category={…} size="sm|md" />` — renders `bg-gradient-to-br ${cat.gradient} text-white`. Never use `cat.color` / `cat.textColor` for icon containers (those are kept for charts only).
- **Category active chips**: active state = `bg-gradient-to-br ${catMeta.gradient} text-white shadow-sm`. Never hardcode `from-cyan-500 to-teal-500` for category chips.
- **Expense amount color**: green (`text-emerald-600 dark:text-emerald-400`) when the current user is the payer; neutral (`text-slate-800 dark:text-slate-100`) otherwise.
- **Section headers**: icon-badge + label + gradient rule line. Accent color by destination — amber=Insights, emerald=Settle, violet=Members, cyan=Expenses, slate=neutral. Pattern: `w-6 h-6 rounded-md bg-[color]-50 dark:bg-[color]-900/30` badge + `h-[1.5px] bg-gradient-to-r from-[color]-200/70 to-transparent dark:from-[color]-800/40 dark:to-transparent` rule. See `components/CLAUDE.md` for full table.
- **AnimatedList**: wrap card/item lists for CSS `@keyframes list-enter` entrance stagger (`y 16→0, opacity 0→1, 300ms`). Default `staggerMs=80`. Delay via `--list-delay` CSS custom property (not inline `animationDelay`). Use `initialDelayMs` to continue stagger across split lists. Stagger cap `Math.min(i, 8)`. Falls back to plain div on `prefers-reduced-motion`.
- **FadeIn**: wrap section-level blocks for scroll-triggered reveal (`useInView once`, `y 20→0`, 550ms). Applied to all below-fold sections in per-group and overall insights pages. Props: `delay` (ms), `direction` (`up`|`left`|`right`|`none`), `className`.
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
- **`recordSettlement` returns `settlementId`**: `{ ok: true, settlementId: string }` — used by `MarkPaidButton` to wire the 5-second Undo toast. `deleteSettlement(settlementId, groupId)` is the paired action.
- **`useSheetDismiss(open, onClose)`** (`hooks/use-sheet-dismiss.ts`): adds Escape key + Android/browser back-button dismissal to any bottom sheet. Pushes a fake history entry on open so the hardware back button closes the sheet rather than navigating away; pops it automatically when closed programmatically. Use in every new bottom sheet component.
- **Dismissable prompt localStorage keys**: `clear_repeat_trip_dismissed_${groupId}` — `RepeatTripPrompt` reads after mount to avoid SSR mismatch. Pattern: read in `useEffect`, write on dismiss, render `null` if key is set.
- **Settlement celebration sessionStorage key**: `clear_settled_confetti_${groupId}` — `SettledCelebration` fires once per browser session when all debts are cleared. Stores `"1"` immediately on mount to prevent double-fire on re-renders.
- **Stream entry terminology**: individual debt records within a Stream are called **"entries"** in UI copy (not "streams"). "Log entry →", "3 entries", "New entry", etc. The Stream feature / relationship itself = "Stream".
- **Stream nav badge localStorage keys**: `clear_stream_has_badge` ("disputed" | "new" | absent) — written by `StreamBadgeSync` on Home page, cleared by `StreamDashboardClient` on mount. `clear_stream_last_viewed` (ms timestamp) — set when /stream dashboard opens. `MobileNav` reads badge after hydration and on `stream-badge-update` custom event.
- **Stream settled celebration**: `clear_stream_settled_${personId}` — `StreamSettledCelebration` fires confetti once per session when all-square with a person.
- **`SectionPillNav`** (`components/shared/section-pill-nav.tsx`) — sticky pill row (`sticky top-14`) that tracks the active section via `IntersectionObserver`. Accepts `sections: NavSection[]` + optional `createPills: CreatePill[]` for dashed "create" prompts. Sections need `scroll-mt-28` to clear both AppNav + sticky pills. Color system: cyan=Trips, emerald=Nests, violet=Circle, **amber=Archived** (amber is unambiguous; slate looked disabled). Pill size: `px-4 py-2 text-sm`. Observer uses a `Set` of currently-intersecting sections and picks the **last one in page order** (handles tall sections whose bottom still overlaps the trigger band when a shorter section below scrolls in). Pills also call `setActiveId(id)` directly `onClick` for instant visual feedback without waiting for observer.
- **`GlobalFab`** (`components/shared/global-fab.tsx`) — fixed `bottom-nav-safe right-4 z-50` fan-out FAB on the Home page. Warm sunset gradient (`from-orange-400 to-rose-500`). Main `+` rotates 45° to `×` on open. Two staggered mini FABs: cyan **Log expense** → `GroupPickerSheet` (group selector) → `QuickAddSheet`; indigo **Log entry** → `StreamLogSheet`. Auto-hides on scroll down (`y:96, opacity:0`), reappears on scroll up or when near top (`currentY < 80`). Always visible when fan is open (`fabVisible || fabOpen`). Only rendered when Home page has groups (`!isEmpty`). `GroupPickerSheet`: inline portal sheet with recent cover-photo tiles (top 2 non-demo groups) + full trips/nests list; uses `useSheetDismiss` for back-button + Escape. `QuickAddSheet` gets optional `onBack?` prop — shows `← Change group` button in header that re-opens the picker.
- **`HomeGreeting`** (`components/shared/home-greeting.tsx`) — `"use client"` time-based greeting at top of Home page. Uses client's local time (not UTC) for correct timezone. Three states: Good morning (5–12), Good afternoon (12–17), Good evening (17+, incl. late night — "Good night" intentionally omitted as it implies signoff). Renders `{greeting}, {firstName} 👋` in Fraunces; falls back to no name if `user_metadata.full_name` absent.
- **Trip alive badges** — `computeTripStatus(startDate, endDate)` in `components/trip/trip-card.tsx` — pure helper, no deps. Returns `{ type, label, color }` or null. Types: `active` ("Day X of Y", `text-cyan-300`, pulsing dot), `lastDay` ("Last day 🏁", `text-amber-300`), `justReturned` ("Just returned ✓", `text-emerald-300`, shown for 7 days after endDate). Badge replaces the date subtitle line on TripCard when a status exists; falls back to dates otherwise. Not shown for nests or archived groups.
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
pnpm seed:streams        # 3 stream counterparts, 30 entries (all statuses)
```

---

## 8. Working Style

- **Ask before scope creep** — new deps, new feature areas, skipping sections.
- **Run `pnpm typecheck && pnpm test` before declaring done**.
- **Read existing code first** — check `lib/utils.ts`, components, queries before writing new ones.
- **No silent failures** — every error path has a toast, boundary, or visible feedback.
- **Keep this file and subdirectory CLAUDE.md files updated** when decisions change.
