# Clear

**Split it. Clear it.**

Clear is a group expense tracking app for trips and households. Log what each person paid, choose how to split it, and let Clear compute who owes whom — with the minimum number of payments.

---

## Two kinds of groups

**Trips** — multi-day travel with your crew. Hotels, meals, transport, activities. Trip insights, budget tracking, and an AI-generated trip story.

**Nests** — ongoing household expenses. Recurring templates for rent, electricity, WiFi — log each month with one tap. Monthly grouping, settlement context, and household insights.

---

## Features

- **Quick-add expenses** — type a natural description from any group card; AI parses the amount, payer, and split automatically
- **Quick-nav from card** — long-press any group card (or tap `⋯` on desktop) to jump directly to Members, Expenses, Settle Up, or Insights
- **Four split modes** — equal, exact amount, percentage, or shares
- **16 expense categories** — including Tour Package for trips; "Other" prompts a free-text description
- **Minimum-transaction settlement** — greedy optimizer computes the fewest payments to clear all debts
- **UPI pay** — direct payment links on the settle-up page
- **Group insights** — category donut, daily/monthly spend, member contributions, pace tracker, smart observations
- **AI trip narrative** — Haiku generates a shareable trip story and budget-adherence summary
- **Trip plan upload** — upload a PDF or .txt itinerary and have it auto-filled in the trip form
- **Onboarding tour** — 10-step guided walkthrough with spotlight and swipe-to-dismiss sheet
- **PWA** — installable on iOS and Android, offline-capable service worker
- **Dark mode** — full glassmorphic light + dark theme
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
4. Run `drizzle/policies.sql` in the SQL Editor to apply RLS policies
5. Enable Realtime for tables: `expenses`, `expense_splits`, `settlements`, `group_members`

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
```

---

## Project structure

```
app/
  (app)/          — authenticated app (groups, expenses, insights, settle)
  (auth)/         — login page
  api/pwa-icon/   — PWA icon endpoint (192 + 512 px, edge runtime)
  manifest.ts     — PWA manifest
  icon.tsx        — favicon (32 px)
  page.tsx        — landing / marketing page
components/
  expense/        — expense cards, quick-add sheet, split editor
  trip/           — group cards, cover photo picker, budget bar
  insights/       — charts and insights tabs
  shared/         — clear-logo, nav, skeletons, animated-list, tour layer
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
- **GROUP_CONFIG** — all trip/nest differences flow through `lib/group-config.ts`
- **QuickAddSheet / TripCardNavSheet** — own their own portal (`document.body`) and `AnimatePresence`; always rendered, visibility controlled via `isOpen` prop. Cards have no footer — Add, Share, and QR float on the cover image (`w-10 h-10` on mobile for iOS tap targets); `⋯` is desktop-only (`hidden md:flex`), long-press opens the nav sheet on mobile
