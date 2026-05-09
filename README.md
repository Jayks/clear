# Clear

**Split it. Clear it.**

Clear is a group expense tracking app for trips and households. Log what each person paid, choose how to split it, and let Clear compute who owes whom — with the minimum number of payments.

---

## Two kinds of groups

**Trips** — multi-day travel with your crew. Hotels, meals, transport, activities. Trip insights, budget tracking, and an AI-generated trip story.

**Nests** — ongoing household expenses. Recurring templates for rent, electricity, WiFi — log each month with one tap. Monthly grouping, settlement context, and household insights.

---

## Tech stack

- **Framework**: Next.js 16 (App Router, TypeScript)
- **Styling**: Tailwind CSS v4 (CSS-first, no config file)
- **UI**: shadcn/ui with @base-ui/react
- **Database**: Supabase Postgres + Drizzle ORM
- **Auth**: Supabase Auth (Google OAuth)
- **Realtime**: Supabase Realtime
- **AI**: Anthropic claude-haiku-4-5

## Getting started

```bash
git clone https://github.com/Jayks/clear.git
cd clear
pnpm install
```

Create `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
UNSPLASH_ACCESS_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=Clear
ANTHROPIC_API_KEY=
PLATFORM_ADMIN_EMAIL=
```

```bash
pnpm db:push          # create tables
# Run drizzle/policies.sql in Supabase SQL Editor
pnpm dev
```

## Scripts

```bash
pnpm dev              # dev server
pnpm build            # production build
pnpm typecheck        # TypeScript check
pnpm test             # run vitest
pnpm db:push          # push schema to DB
pnpm db:studio        # open Drizzle Studio
```
