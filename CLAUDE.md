# CLAUDE.md — Wayfare

> Source of truth for Claude Code. Reflects actual built state. When in doubt, ask.

---

## 1. Project Overview

**Wayfare** — group expense tracking for trips. Members log expenses, app computes minimum-transaction settlements. Deployed on Vercel + Supabase (free tier).

**Tagline**: *Travel together. Settle easy.*
**Design**: Glassmorphic, cyan/teal palette, frosted-glass cards.

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

**TanStack Query** is installed but not wired. Do not add QueryClientProvider unless requested.

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

Next.js 16 renamed `middleware.ts` → `proxy.ts` with a `proxy` export (not `middleware`).

### Supabase publishable key

Uses new `sb_publishable_*` format for `NEXT_PUBLIC_SUPABASE_ANON_KEY` — @supabase/ssr handles it.

### Drizzle config needs dotenv

`drizzle.config.ts` must call `config({ path: ".env.local" })` — drizzle-kit doesn't auto-load on Windows.

### Settlement formula (corrected)

```
net = totalPaid - totalOwed + settlementsSent - settlementsReceived
```
`settlementsSent` adds (reduces debt); `settlementsReceived` subtracts (shrinks receivable).

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

### Trip member count — correlated subquery

```typescript
memberCount: sql<number>`(select count(*) from trip_members where trip_members.trip_id = ${trips.id})`
```

---

## 4. Architecture Principles

1. **Server-first**: RSC by default. `"use client"` only for state, effects, browser APIs, charts.
2. **Server Actions for mutations**: `app/actions/*.ts`. No REST routes for internal CRUD.
3. **Drizzle only for DB reads/writes**. Supabase JS only for Auth + Realtime.
4. **RLS everywhere**: All 5 tables. `drizzle/policies.sql` is the source of truth.
5. **Pure functions for math**: `lib/splits/compute.ts`, `lib/settle/optimize.ts` — never touch DB.
6. **Shared Zod schemas**: same schema for form (zodResolver), server action input, and DB insert.
7. **Optimistic UI via useState**: `removedIds: Set<string>` state, rolls back on server error.
8. **Realtime via router.refresh()**: `useTripRealtime(tripId)` in `app/(app)/trips/[id]/layout.tsx`.
9. **Auth checks in every query**: `lib/db/queries/*.ts` verifies user + membership before returning data.

---

## 5. Database Schema

Schema files in `lib/db/schema/`. RLS in `drizzle/policies.sql`.

### trips
```
id, name, description, cover_photo_url
default_currency: text default 'INR'
start_date, end_date: date
budget: numeric(12,2)
itinerary: text           -- used by AI narrative + adherence
is_archived: boolean default false
is_demo: boolean default false  -- seeded sample trip; pinned first in list
created_by: uuid          -- auth.users.id
share_token: uuid unique default gen_random_uuid()
created_at: timestamptz
```

### trip_members
```
id, trip_id fk->trips(cascade)
user_id: uuid nullable    -- auth.users.id
guest_name: text nullable -- guest without account
display_name: text nullable -- from Google full_name
role: enum('admin','member') default 'member'
CHECK: exactly one of (user_id, guest_name)
UNIQUE: (trip_id, user_id)
```

### expenses
```
id, trip_id fk->trips(cascade), paid_by_member_id fk->trip_members
description: text, category: enum('food','accommodation','transport','sightseeing','shopping','activities','groceries','other')
amount: numeric(12,2), currency: text, expense_date: date, notes: text
created_by_user_id: uuid, created_at, updated_at
```

### expense_splits
```
id, expense_id fk->expenses(cascade), member_id fk->trip_members(cascade)
share_amount: numeric(12,2)   -- computed
split_type: enum('equal','exact','percentage','shares')
split_value: numeric(12,4)    -- raw input (null for equal)
UNIQUE: (expense_id, member_id)
```

### settlements
```
id, trip_id, from_member_id, to_member_id fk->trip_members
amount: numeric(12,2), currency, note, settled_at
CHECK: from_member_id <> to_member_id
```

### Realtime setup (run once in SQL Editor)
```sql
alter publication supabase_realtime add table expenses;
alter publication supabase_realtime add table expense_splits;
alter publication supabase_realtime add table settlements;
alter publication supabase_realtime add table trip_members;
```

### display_name backfill (run once)
```sql
update trip_members set display_name = (
  select raw_user_meta_data->>'full_name' from auth.users where auth.users.id = trip_members.user_id
) where user_id is not null and display_name is null;
```

---

## 6. Design System

### Palette
```css
/* Primary */
--primary: #0891B2;          /* cyan-600 */
/* Gradient: from-cyan-500 to-teal-500 (#06B6D4 → #14B8A6) */
/* Background: linear-gradient(135deg, #EFF6FF, #ECFEFF, #F0FDFA, #ECFDF5) fixed */

/* Category hex (lib/categories.ts) */
food:#EA580C  accommodation:#2563EB  transport:#9333EA  sightseeing:#0D9488
shopping:#DB2777  activities:#16A34A  groceries:#65A30D  other:#64748B
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
Never `bg-primary` on gradient buttons.

### Dark mode conventions
- Labels: `text-slate-700 dark:text-slate-200`
- Body: `text-slate-500 dark:text-slate-400`
- Muted: `text-slate-400 dark:text-slate-300` (always go **lighter** in dark)
- Inputs: `border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100`
- Read-only: `bg-slate-50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 cursor-default`
- Badges: e.g. `bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400`
- Dark tokens: bg `#0F172A`, card `#1E293B`, primary `#22D3EE`, border/input `#334155`

### Navigation
- **Desktop**: sticky top — logo, Trips, Insights, ThemeToggle, Help (BookOpen → `/docs/wayfare-user-manual.html`), avatar dropdown
- **Mobile**: icon-only top nav (`hidden md:inline` on labels) + fixed `MobileNav` bottom. Content gets `pb-24`. Help in avatar dropdown.

### Motion
- Card entrance: `opacity 0→1, y 8→0` over 200ms, stagger 30–50ms via `AnimatedList`
- Balance numbers: `CountUp` (Framer Motion)
- Collapsible: `AnimatePresence` + `motion.div` height+opacity
- No bouncy springs, parallax, or animated gradients

---

## 7. Key Algorithms

### Balance formula
```typescript
net = totalPaid - totalOwed + settlementsSent - settlementsReceived
```

### Split computation (`lib/splits/compute.ts`)
Four modes returning `SplitResult[]` with `shareAmount` + `splitValue`:
- `equal`: divide evenly among member IDs
- `exact`: amount per member (must sum to total)
- `percentage`: % per member (must sum to 100)
- `shares`: share count per member (total > 0)

Rounding: `Math.round(n * 100) / 100`. Remainder to first row. **22 Vitest tests — all must pass.**

### Settlement optimizer (`lib/settle/optimize.ts`)
Greedy: split members into creditors/debtors by net, sort desc, match top pairs, emit min transactions. **6 Vitest fixtures.**

---

## 8. Project Structure

```
wayfare/
├── app/
│   ├── icon.tsx, error.tsx, not-found.tsx, layout.tsx, page.tsx, globals.css
│   ├── (auth)/login/page.tsx + login-form.tsx
│   ├── auth/callback/route.ts
│   ├── (app)/
│   │   ├── layout.tsx, error.tsx, app-nav.tsx
│   │   ├── insights/page.tsx + loading.tsx
│   │   └── trips/
│   │       ├── page.tsx, loading.tsx
│   │       ├── new/page.tsx + create-trip-form.tsx
│   │       └── [id]/
│   │           ├── layout.tsx (RealtimeRefresh), page.tsx
│   │           ├── edit/page.tsx + edit-trip-form.tsx
│   │           ├── expenses/page.tsx, loading.tsx, new/, [expenseId]/edit/
│   │           ├── members/page.tsx + forms/buttons
│   │           ├── settle/page.tsx, loading.tsx, mark-paid-button, upi-pay-button
│   │           └── insights/page.tsx + loading.tsx
│   ├── join/[token]/page.tsx + join-button.tsx
│   ├── summary/[token]/page.tsx + opengraph-image.tsx
│   ├── api/trips/[id]/export/route.ts    # CSV download
│   └── actions/
│       ├── trips.ts, expenses.ts, members.ts, settlements.ts, unsplash.ts
│       ├── parse-expense.ts, narrative.ts, trip-adherence.ts, parse-chat.ts
│       └── demo.ts                          # ensureDemoTrip — seeds/deduplicates sample trip
├── components/
│   ├── ui/                              # shadcn/base-ui primitives
│   ├── expense/  (expense-card, expense-filters, split-editor, quick-add-bar, chat-import-dialog, ...)
│   ├── trip/     (trip-card, cover-photo-picker, budget-bar, qr-invite, narrative-section, adherence-card, ...)
│   ├── settlement/ (settlement-breakdown, member-debt-breakdown)
│   ├── insights/ (kpi-card, category-donut, daily-spend-bar, member-contributions, trips-spend-bar, ...)
│   ├── tour/     (tour-context.tsx, tour-layer.tsx)
│   └── shared/   (skeleton, animated-list, count-up, confirm-dialog, member-avatar, mobile-nav, realtime-refresh, theme-toggle)
├── hooks/
│   ├── use-trip-realtime.ts, use-warn-before-leave.ts, use-speech-recognition.ts
├── lib/
│   ├── db/client.ts, schema/*.ts, queries/(trips, expenses, balances, insights, meta).ts
│   ├── supabase/server.ts, client.ts, admin.ts
│   ├── demo/seed-demo-trip.ts           # seeds Goa sample trip (8 expenses, all split modes)
│   ├── tour/types.ts + steps.ts         # TourStep type; getTourSteps(demoTripId) — 8-step sequence
│   ├── parser/parse-expense.ts          # rule-based parser
│   ├── splits/compute.ts + compute.test.ts
│   ├── settle/optimize.ts + optimize.test.ts
│   ├── insights/trip-insights.ts + all-trips-insights.ts
│   ├── validations/trip.ts + expense.ts
│   ├── categories.ts, unsplash.ts, utils.ts
├── scripts/ (seed-test, seed-temple-tour, take-screenshots, generate-manual-pdf)
├── drizzle/policies.sql
├── public/docs/ (wayfare-user-manual.html, screenshots/)
├── drizzle.config.ts, proxy.ts
```

---

## 9. Auth & Realtime

**Auth**: Google OAuth via Supabase. `proxy.ts` refreshes session + redirects unauthenticated → `/login`. Use `@supabase/ssr` v0.6 with `getAll()`/`setAll()` cookie pattern.

**Realtime**: `useTripRealtime(tripId)` subscribes to expenses, settlements, trip_members, expense_splits channels → calls `router.refresh()` on any change. Mounted via `RealtimeRefresh` in `app/(app)/trips/[id]/layout.tsx`.

---

## 10. Coding Conventions

- **TypeScript strict**. No `any`. Use `unknown` and narrow.
- **Server actions** return `{ ok: true, data }` or `{ ok: false, error }`. Never throw to client.
- **Money**: `numeric(12,2)` in DB, `number` in TS. Format with `formatCurrency()`.
- **Dates**: `date` type (no time). Format with `formatDate()`. Default with `smartDefaultDate(trip.startDate, trip.endDate)` — never hardcode `new Date()`.
- **Member names**: always `getMemberName(member)` → `displayName ?? guestName ?? "Member"`.
- **revalidatePath**: always `revalidatePath('/trips/${tripId}', 'layout')` — layout variant invalidates whole subtree.
- **File names**: kebab-case. No barrel files — import from actual file.
- **Fraunces font**: `style={{ fontFamily: "var(--font-fraunces)" }}` — never Tailwind class.
- **Dark mode**: every colour class needs a `dark:` counterpart. Go lighter, not darker (e.g. `text-slate-400 dark:text-slate-300`).
- **Mobile-first**:
  - List/data pages: no inner max-width (use layout's `max-w-7xl`). Form pages: `max-w-2xl`.
  - Multi-action rows: `flex-col gap sm:flex-row sm:items-center`.
  - Button labels: `hidden sm:inline` when space-constrained.
  - Grids: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` — never hardcode without responsive prefix.
  - Nav labels: `hidden md:inline`.

**AI prompt injection hardening** (all four Claude actions):
- User data wrapped in XML tags in `user` turn (`<expense_text>`, `<chat_transcript>`, etc.)
- Member names/IDs in `<members>` tags in `user` turn (not `system`)
- Post-parse cross-validate returned member IDs against actual trip member set

---

## 11. Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY        # sb_publishable_* format
SUPABASE_SERVICE_ROLE_KEY
DATABASE_URL                         # Direct Postgres (URL-encode special chars in password)
UNSPLASH_ACCESS_KEY
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=Wayfare
ANTHROPIC_API_KEY                    # optional; restart pnpm dev after adding
PLATFORM_ADMIN_EMAIL                 # comma-separated; guards /admin dashboard
```

**Vercel DATABASE_URL**: must use Session Pooler (not direct connection):
```
postgresql://postgres.[ref]:[password]@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres
```

---

## 12. Key Scripts

```bash
pnpm dev / build / typecheck
pnpm test / pnpm test --run
pnpm db:push / db:studio
pnpm seed                     # Goa trip, 10 members, 30 expenses
pnpm seed:temple              # South India temple tour, 20 members
pnpm manual:screenshots       # 16 Puppeteer screenshots (needs pnpm dev + cookies.json)
pnpm manual:pdf               # generate PDF from HTML manual
```

---

## 13. Deployment

**Production**: https://wayfare-sigma.vercel.app | **Repo**: https://github.com/Jayks/wayfare.git (main)

**New Supabase project setup**:
1. `pnpm db:push`
2. Run `drizzle/policies.sql` in SQL Editor
3. Run Realtime publication SQL (see §5)
4. Add Google OAuth callback URL

---

## 14. Onboarding Tour (Phase 21)

### Demo trip seeding
`ensureDemoTrip()` (`app/actions/demo.ts`) — called from the trips page on every load:
- Checks if user already has a demo trip (`is_demo = true`). If yes (even one), returns early.
- If more than one exists (race condition), deletes extras keeping the oldest.
- If none exists, seeds "Goa 2025 · Sample" via `lib/demo/seed-demo-trip.ts` — 5 members, 8 expenses covering all 4 split modes.
- **Do NOT call `revalidatePath` inside `ensureDemoTrip`** — it is called during render from a server component, and Next.js 16 forbids `revalidatePath` during render.
- Demo trip is pinned first in the trips list (`ORDER BY is_demo DESC`), has an amber "Sample Trip" badge and ring on the card.

### Tour engine
`TourProvider` (`components/tour/tour-context.tsx`) wraps `(app)/layout.tsx`:
- Auto-launches on first visit via `localStorage` key `wayfare_tour_done`.
- Replayable from avatar dropdown → "Take the tour".
- On finish (Done button): navigates to `/trips` + shows a sonner toast with "New trip" CTA.
- On skip (X button): closes silently, no navigation.
- Reads the demo trip ID from the `[data-tour='demo-trip']` card's Link href at step 3 — no server call needed.
- Prefetches the next step's page with `router.prefetch()` while the user reads the current step.
- **Do NOT call `router.push` inside a `setStep` updater callback** — it triggers a React render-time setState error. Always check outside the updater.

`TourLayer` (`components/tour/tour-layer.tsx`):
- Rendered via `createPortal` to `document.body` to avoid stacking context issues.
- Backdrop: **4-quadrant divs** (top/bottom/left/right of spotlight) with `backdrop-filter: blur(6px)` + dark tint. The spotlight area itself is left fully sharp and unblurred.
- Resets `rect` to null immediately on step change — prevents old spotlight bleeding onto new page during navigation.
- Shows full-screen blur + spinner while the target element is loading on the new page.
- Spotlight ring uses `box-shadow` for the cyan outline + glow.

### Tour step sequence (8 steps)
`getTourSteps(demoTripId)` in `lib/tour/steps.ts` — steps 4–7 are only appended once `demoTripId` is known:
1. Welcome modal (null target)
2. New trip button (`[data-tour='new-trip-btn']`, /trips)
3. Sample trip card (`[data-tour='demo-trip']`, /trips) ← demoTripId read here
4. Trip quick-actions grid (`[data-tour='trip-quick-actions']`, /trips/[id])
5. Expense add button (`[data-tour='expense-add-btn']`, /trips/[id]/expenses)
6. Suggested payments (`[data-tour='settle-suggestions']`, /trips/[id]/settle)
7. Trip KPI cards (`[data-tour='trip-kpis']`, /trips/[id]/insights)
8. All-trips Insights nav (`[data-tour='nav-insights']`, /trips)

---

## 16. Out of Scope (v1)

Email/push notifications, receipt uploads, PDF export serving, multi-currency FX, PWA/offline, mobile app, activity log, expense comments, claim guest profile, TanStack Query data fetching.

---

## 17. Working Style

- **Ask before scope creep** — new deps, new feature areas, skipping sections.
- **Run `pnpm typecheck && pnpm test` before declaring done**.
- **Read existing code first** — check `lib/utils.ts`, components, queries before writing new ones.
- **No silent failures** — every error path has a toast, boundary, or visible feedback.
- **Keep this file updated** when decisions change.
