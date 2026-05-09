# Wayfare

**Travel together. Settle easy.**

Wayfare is a group expense tracking app built for trips. Log what each person paid, choose how to split it, and let Wayfare compute who owes whom — with the minimum number of payments. No spreadsheets, no awkward IOUs.

**Live**: https://wayfare-sigma.vercel.app

---

## Features

### Trips
- Create trips with a cover photo (Unsplash search), dates, currency, budget, and optional **trip plan/itinerary**
- Invite members via shareable link or QR code — no account needed to join as a guest
- Budget tracking with progress bar (green → amber → over-budget red)
- Archive completed trips; restore anytime
- Shareable public trip summary page — stats, category breakdown, and an AI-written travel story

### Expenses
- Log expenses with 4 split modes: **equal**, **exact amount**, **percentage**, **shares**
- 8 expense categories with icons and colour coding
- Edit, duplicate, or delete any expense
- Filter by category, payer, date range — search by description
- Sort by date or amount; running filtered total
- **Quick-add parser**: type or **speak** `dinner 2400 raj yesterday split 4` → form fills itself
  - Powered by Claude Haiku (AI mode) with rule-based fallback when offline
  - Understands natural language: member names, relative dates, positional splits ("1st 2 members")
  - **Voice input**: tap the mic, speak the expense — Web Speech API transcribes and AI parses automatically
- **Chat import**: paste a WhatsApp or group chat snippet → AI extracts all expenses at once; preview and edit before bulk-adding
- Export all expenses as CSV

### Settlement
- Per-member net balances with animated count-up numbers
- Minimum-transaction algorithm — at most `n-1` payments for `n` members
- "Mark as paid" records a settlement and updates balances instantly
- **UPI payment link** — "Pay UPI" button on rows where you owe money; enter recipient's UPI ID and tap Open to launch PhonePe/GPay/Paytm pre-filled
- **WhatsApp reminder** — "Remind" button on rows where someone owes you; opens WhatsApp with a pre-filled message including amount and settle link
- Full settlement history with delete
- "How is this calculated?" collapsible 3-step breakdown
- Per-member debt view: who owes whom, down to the rupee

### Insights
- **Per-trip**: KPI cards, daily spend bar, category donut, member contribution chart, 7 smart insight cards
- **Group roles**: Trip Banker, Tab Master, High Roller, Fair Splitter, The Balancer, Traveler — computed per member
- **Payment fairness score** per member (colour-coded bar)
- **Plan vs Reality**: if you wrote a trip itinerary, Claude compares it against actual expenses and shows coverage %, what was covered, what was missed, and what surprised you
- **All-trips portfolio**: total spend across trips, companion count, category habits, spend-per-trip comparison

### Collaboration
- Supabase Realtime — changes appear for all members without refresh
- Member avatars with deterministic colour initials
- Real names from Google OAuth stored at join time
- **Dark mode** — full dark theme with Sun/Moon toggle in nav; persists to `localStorage`, defaults to OS preference

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript) |
| Styling | Tailwind CSS v4 |
| UI | shadcn/ui (@base-ui/react) |
| Animation | Framer Motion |
| Charts | Recharts |
| AI | Anthropic SDK (Claude Haiku) |
| Database | Supabase Postgres + Drizzle ORM |
| Auth | Supabase Auth (Google OAuth) |
| Realtime | Supabase Realtime |
| Validation | Zod + react-hook-form |
| Deployment | Vercel |

---

## Getting Started

### Prerequisites

- Node.js ≥ 20
- pnpm (`npm install -g pnpm`)
- A Supabase project (free tier works)
- A Google Cloud Console OAuth app (free)
- An Unsplash developer account (free)
- An Anthropic API key — optional, enables AI expense parsing and trip narratives

### 1. Clone and install

```bash
git clone https://github.com/Jayks/wayfare.git
cd wayfare
pnpm install
```

### 2. Configure environment variables

```bash
cp .env.local.example .env.local
```

Fill in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
DATABASE_URL=postgresql://postgres:your-password@db.your-project.supabase.co:5432/postgres
UNSPLASH_ACCESS_KEY=your_access_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=Wayfare
ANTHROPIC_API_KEY=sk-ant-...   # optional
```

> **Note**: URL-encode special characters in DATABASE_URL password: `#` → `%23`, `@` → `%40`
>
> **Note**: Restart `pnpm dev` after adding `ANTHROPIC_API_KEY` — env vars are read at server startup.

### 3. Set up the database

```bash
pnpm db:push
```

Apply Row-Level Security policies in the **Supabase SQL Editor** — copy and run `drizzle/policies.sql`.

Enable Realtime on the required tables (also in SQL Editor):

```sql
alter publication supabase_realtime add table expenses;
alter publication supabase_realtime add table expense_splits;
alter publication supabase_realtime add table settlements;
alter publication supabase_realtime add table trip_members;
```

### 4. Configure Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials
2. Create an OAuth 2.0 Client ID (Web application)
3. Add Authorized redirect URI: `https://<your-supabase-project>.supabase.co/auth/v1/callback`
4. Copy Client ID + Secret into Supabase → Authentication → Providers → Google

### 5. Start the dev server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Development Commands

```bash
pnpm dev            # start dev server
pnpm build          # production build
pnpm typecheck      # TypeScript check
pnpm test           # Vitest unit tests (watch)
pnpm test --run     # single test run
pnpm db:push        # sync schema to Supabase
pnpm db:studio      # Drizzle Studio (visual DB browser)
pnpm seed           # seed a Goa trip (10 members, 30 expenses, all split modes)
pnpm seed:temple    # seed a South India temple tour (20 members, 24 expenses)
```

---

## Project Structure

```
app/              Next.js App Router pages, API routes, and server actions
components/       React components (ui, expense, trip, settlement, insights, shared)
hooks/            Client-side hooks (realtime, form warnings)
lib/              Business logic, DB queries, schemas, algorithms, parser, utilities
scripts/          Seed scripts
drizzle/          RLS policies SQL
```

See `CLAUDE.md` for the complete structure, all architectural decisions, and gotchas.

---

## Testing

22 unit tests covering the split computation and settlement optimizer:

```bash
pnpm test --run
```

Seed realistic test data for manual testing:

```bash
pnpm seed
# "Goa Summer 2025" — 10 members, 30 expenses across all split modes and categories

pnpm seed:temple
# "South India Temple Circuit 2026" — 20 members, 24 expenses, current user as admin
```

---

## Deployment

### Vercel

1. Push to a Git repo and import in [Vercel](https://vercel.com)
2. Add all env vars from `.env.local.example` (use production values)
3. Set `NEXT_PUBLIC_APP_URL` to your production domain
4. **DATABASE_URL on Vercel** must use the Session Pooler endpoint — not the direct connection:
   ```
   postgresql://postgres.[ref]:[password]@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres
   ```

### Production Supabase

Create a **separate** Supabase project for production. Repeat the `db:push`, RLS SQL, and Realtime SQL steps against the production project.

---

## Architecture Notes

- **Server-first**: React Server Components handle all data fetching. `"use client"` only for state, effects, browser APIs, and charts.
- **No REST API routes for mutations**: All writes go through Next.js Server Actions (`app/actions/`). The one exception is the CSV export, which is a GET route handler.
- **Drizzle only**: All DB reads/writes use Drizzle ORM. The Supabase JS client is only used for auth and realtime.
- **RLS everywhere**: All 5 tables have Row-Level Security. The DB enforces access control independently of the app layer.
- **AI graceful degradation**: All AI features (quick-add parser, trip narrative) fall back cleanly when `ANTHROPIC_API_KEY` is absent or the API is unavailable.
- **Realtime via router.refresh()**: Supabase Realtime triggers `router.refresh()` — no client-side cache management needed.

For complete architectural decisions, gotchas, and conventions see [CLAUDE.md](./CLAUDE.md).

---

## License

MIT
