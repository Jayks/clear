# CLAUDE.md — Clear

> Source of truth for Claude Code. Reflects actual built state. When in doubt, ask.
>
> **Detailed references loaded automatically by directory:**
> `lib/db/CLAUDE.md` — schema, queries, algorithms · `components/CLAUDE.md` — design system, UI patterns · `app/CLAUDE.md` — routes, features, project structure

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

`lib/rate-limit.ts` exports `checkAiRateLimit(userId): boolean` — 20 AI calls/hour per user, shared across all AI features. All five AI actions (`parse-expense.ts`, `narrative.ts`, `parse-chat.ts`, `trip-adherence.ts`, `parse-receipt.ts`) call `getCurrentUser()` then `checkAiRateLimit(user.id)` before invoking Anthropic. In-memory store (best-effort on serverless). `parseExpenseWithAI` returns `null` on rate limit; others return `{ ok: false, error: "Rate limit exceeded..." }`.

### `useSheetDismiss` — do NOT use inside portal sheets hosted on form pages

`useSheetDismiss` pushes `{ bottomSheet: true }` to `window.history` on open and calls `window.history.go(-1)` on programmatic close. In Next.js 16, `go(-1)` triggers a `popstate` event — for the **same URL** (e.g. `/groups/[id]/expenses/new`) the App Router interprets this as a navigation and triggers a full RSC refresh of the current page, wiping form state and leaving the history stack confused (back button appears stuck).

**Rule**: Use `useSheetDismiss` only in sheets that sit at the *root nav level* (QuickAddSheet, TripCardNavSheet, MemberProfileSheet, etc.). Do **not** use it in sheets rendered inside a `<form>` page (e.g. `ReceiptScannerSheet`). Instead, add Escape key handling directly:

```typescript
// ✅ correct — inline Escape only, no history manipulation
useEffect(() => {
  if (!isOpen) return;
  const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
  document.addEventListener("keydown", onKey);
  return () => document.removeEventListener("keydown", onKey);
}, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

// ❌ wrong — causes Next.js 16 RSC refresh via go(-1) popstate on a form page
useSheetDismiss(isOpen, onClose);
```

### Receipt Scanner — `ReceiptScannerSheet` patterns

`components/expense/receipt-scanner-sheet.tsx` — full-screen portal scanner used in `AddExpenseForm`, `AddCircleExpenseForm`, and `QuickAddSheet`.

**State machine**: `idle → viewfinder → processing → results`

**Critical**: `transitionState(next)` revokes `prev.previewUrl` **only when `next.previewUrl !== prev.previewUrl`**. The `processing → results` transition reuses the same `previewUrl` — revoking it before results renders causes `ERR_FILE_NOT_FOUND` on the results `<img>`.

**Instant scan line**: `handleFileInput` creates a blob URL from the *original* file immediately and transitions to `processing` (showing the scan line at once), then compresses + extracts GPS in parallel. After compression, `setState` swaps `file: compressed, gps` without changing `previewUrl` — so display stays smooth and the AI gets the smaller file.

**`onExtracted(result, keepProof)`** — called when user taps "Fill form →". Passes both the parsed data and whether the proof toggle was on, so the parent form can set `proofPending` state and show the "📎 Receipt proof will attach on save" indicator.

**Background proof upload pattern**:
```typescript
// After addExpense returns expenseId — navigate immediately, upload in background:
const proofFile = pendingProofFileRef.current;
if (proofFile && result.expenseId) {
  pendingProofFileRef.current = null;
  setProofPending(false);
  uploadReceiptProofInBackground(result.expenseId, group.id, proofFile);
}
router.push(`/groups/${group.id}/expenses`);
```

**`mapToGroupCategory(aiCategory, groupType)`** — `lib/receipt/map-category.ts`. Maps an AI-returned category string to the nearest valid category for the target group type. Fast path: if the category already exists in the target group's category list, return as-is. Fallback: `CROSS_TYPE_MAP` lookup; if no mapping, returns `"other"` (always valid in every group type).

**`isPlusUser` prop chain**: `canUseAI(user.id)` is called in the RSC page (`expenses/new/page.tsx`, `expenses/page.tsx`, `groups/page.tsx`), passed as `isPlusUser` prop through form components down to `ReceiptScannerSheet`. Plus gate shown in scanner's idle state.

**`aiFilledFields: Set<string>` + emerald ring**: after `handleReceiptExtracted`, form fields filled by AI show `ring-1 ring-emerald-400/50`. Ring clears when the user manually edits the field via `clearAiFill(field)` registered in `register("field", { onChange: () => clearAiFill("field") })`. Category grid wrapped in ring when `aiFilledFields.has("category")`.

**Expense `receiptUrl` + detail sheet**: `expenses.receiptUrl` (DB: `receipt_url text`) stores the Supabase Storage public URL. `ExpenseDetailSheet` renders a "Receipt" section (cyan Paperclip header) with thumbnail + "Tap to open full size" link when `expense.receiptUrl` is non-null. `updateExpenseMedia` server action (`app/actions/update-expense-media.ts`) writes the URL after background upload.

### Expense Map View — `expense-map-view.tsx` patterns

`components/expense/expense-map-view.tsx` — fourth expense list mode (trips only): Mapbox GL pins with Supercluster clustering, an animated `line-trim-offset` route path, and a date scrubber that auto-pans the camera day by day. `lib/expense/map-helpers.ts` holds the pure helpers (emoji lookup, truncation, haversine distance, spread-out detection — all unit-tested in `lib/receipt/phase6-map.test.ts`).

**`mapGeneration` counter — required for every effect that touches `mapInstance.current`**: a theme toggle destroys the old `mapboxgl.Map` and recreates it (`setMapReady(false)` → async rebuild → `setMapReady(true)`). If the new map's `"load"` fires fast enough (cached style/tiles) to land in the same React batch, React can collapse `true → false → true` into a perceived no-op — dependent effects never see `mapReady` change and stay bound to the destroyed instance (blank map, esp. visible after a dark-mode switch). `mapInstance.current` is a ref, so mutating it doesn't trigger re-renders either. Fix: bump a `mapGeneration` counter in the `"load"` handler (alongside `setMapReady(true)`) and include it in **every** effect's dependency array that reads `mapInstance.current` (markers/clustering, trip-path setup, reveal-path, pan-toward-day) — a counter increment can never be collapsed away by batching.

**Tear down before recreate — guards React Strict Mode double-invoke**: `initMap`'s body resumes asynchronously after `import("mapbox-gl")` resolves, so a stale call can still be in flight when a fresh one starts (dev-mode StrictMode double-mounts). Without a guard, two live `Map` instances can attach to the same container — the second's internal DOM setup wipes the first's canvas out from under it, orphaning any markers already `.addTo()`'d on it (created successfully, `getClusters()` finds them, yet nothing is visible). Always check `if (mapInstance.current) { …remove markers, mapInstance.current.remove(), mapInstance.current = null… }` at the top of `initMap`'s async resolution, before constructing the new `Map`.

**Day-scrub camera always uses `fitBounds`, never `easeTo`-to-centroid**: a plain ease-to-midpoint has two failure modes — spread-out same-day pairs (Chennai lunch + Delhi dinner, ~1750km) average to a meaningless point over open country, and close-together pairs (T. Nagar + Marina, ~10km) stay merged in a cluster bubble because panning alone doesn't change zoom. `fitBounds` computes a zoom that frames the day's pins snugly, which for close pairs naturally pushes them past Supercluster's clustering radius so they "bloom" into individual rich chips. `isSpreadOut(locs)` (50km threshold, `lib/expense/map-helpers.ts`) only changes the `padding`/`maxZoom` passed to `fitBounds` — never the choice between `fitBounds` and `easeTo`.

**Duplicate-coordinate marker offset**: two expenses pinned to the *exact same* lat/lng (e.g. both logged at "Chandni Chowk, Delhi") always cluster below Supercluster's `maxZoom` (zero pixel distance), but past it they return as separate raw points still anchored to the identical coordinate — stacking their chips into an illegible overlap. `render()` tracks a `seenAt: Map<coordKey, count>` and applies a small per-index diagonal `Marker` `offset` (`[idx * 16, idx * -12]`) to fan duplicates out into a readable stagger. Cluster bubbles never need this — Supercluster always collapses same-spot points into one feature regardless of zoom.

**Mapbox Standard style — custom layer colours need `*-emissive-strength`, not just `slot`**: the map uses `mapbox://styles/mapbox/standard` (theme-driven `lightPreset: "day"|"night"` via `setConfigProperty("basemap", "lightPreset", …)` in the `"load"` handler — far richer/more detailed than the legacy `light-v11`/`dark-v11`). `slot: "top"` on `addLayer` controls **draw order** (puts a layer above the basemap's buildings/labels) but does **not** exempt it from Standard's scene-wide lighting/fog colour-grading post-process — applied across the whole render, "top" slot included — which washes authored hex colours toward a uniform cool blue in the `night` preset (symptom: "the path renders solid black" → after `slot` fix, "still a flat cyan-ish wash, no colour difference between layers"). The actual fix is `"line-emissive-strength": 1` (the family covers `line-`/`fill-`/`icon-`/etc.) — Standard's documented escape hatch that makes a layer self-illuminated/glow with its own authored colour, independent of scene lighting. **Any custom layer whose colour must render true across `lightPreset`s needs this**, not just `slot`.

**Trip-path traveled vs upcoming colour identity**: `trip-path` (revealed-so-far solid overlay, drawn last/on top, `line-trim-offset` reveals it growing from the route's start) = emerald-green gradient = "traveled"; `trip-path-bg` (always-visible full-route dashed background, drawn first/underneath) = muted amber/yellow = "upcoming" — showing through wherever the green hasn't grown over it yet. The *layering itself* is the traveled/upcoming contrast — no separate sync logic needed. Palette is theme-aware (brighter/lighter emerald-400→300→200 + amber-300 for dark; deeper emerald-700→600→500 + amber-600 for light), recomputed inside the layer-creation effect off `resolvedTheme` (which the effect already re-runs on via `mapGeneration`) — mirrors the app's "every colour class needs a `dark:` counterpart" rule.

**Cinema mode — 3D buildings/landmarks need a closer zoom floor + longer per-stop dwell**: cinema mode (`▶ Play this trip`, 52° `PITCH_CINEMA` tilt) toggles Standard's `show3dObjects` config property for 3D buildings/landmarks during the flythrough. They only render as visible relief from roughly **street-level zoom (≈16) upward** — the regular scrubber's close-up zoom floor (13, neighbourhood-level) is too far out for any extrusion to show. `ZOOM_CINEMA_CLOSEUP = 16` is applied conditionally (`cinemaMode ? ZOOM_CINEMA_CLOSEUP : 13`) to all three close-up `easeTo` calls — the regular scrubber's zoom is untouched. Cinema also dwells longer per sub-day stop than manual scrubbing — `SUB_STEP_MS_CINEMA = 2600` vs `SUB_STEP_MS = 1100` — giving freshly-loaded zoom-16 tiles + 3D pop-in time to finish rendering before the camera advances. **Read the cinema/manual choice via a ref (`cinemaModeRef`, mirrored from `cinemaMode` and set directly during render — a documented-safe pattern), never as a dependency of the sub-day sequencer effect**: depending on `cinemaMode` directly tears down a running multi-stop walk and restarts its counter at 0 the instant the mode is toggled mid-sequence, while `scrubSubStep` (reset only by the `${scrubDate}:${subStepCount}`-keyed synchronous-render logic) keeps its higher value — visibly jumping backward. Reading the ref at each `setTimeout` schedule point keeps the walk uninterrupted; only its remaining beats' pace shifts instantly.

**Seed data for map testing**: `pnpm seed:panindia` (`scripts/seed-pan-india.ts`) creates "Pan-India Explorer 2026" — 18 located expenses across 7 days deliberately covering every map scenario (close pairs, same-city clusters, cross-country same-day spread, dense clustering, isolated pins). Use it for any future map-feature regression testing.

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

Never put both an SVG `transform` attribute AND Framer Motion animation props on the same `motion.g` — Framer Motion overrides the SVG transform, collapsing the node to `(0,0)`. Use two wrappers:

```tsx
// ✅ correct — static <g> for position, motion.g for animation only
<g transform={`translate(${node.x}, ${node.y})`}>
  <motion.g style={{ transformOrigin: "0px 0px" }} initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
    {/* content at local (0,0) */}
  </motion.g>
</g>

// ❌ wrong — motion.g with both transform attr and animation props
<motion.g transform={`translate(${node.x}, ${node.y})`} initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
```

### SVG SMIL animation elements (`animateMotion`, `animate`) — use `React.createElement`

JSX types don't expose `path` on `<animateMotion>`. Use `React.createElement` (requires default `import React from "react"`):

```tsx
// ✅ correct
<circle r={2.5} fill="#FDE68A">
  {React.createElement("animateMotion", { path: arc.d, dur: "2s", repeatCount: "indefinite" })}
  {React.createElement("animate", { attributeName: "opacity", values: "0;0.9;0.9;0", dur: "2s", repeatCount: "indefinite" })}
</circle>

// ❌ wrong — TS error: "path" is not a valid prop
<animateMotion path={arc.d} dur="2s" repeatCount="indefinite" />
```

Use `gradientUnits="userSpaceOnUse"` with explicit `x1/y1/x2/y2` for arc gradients — `objectBoundingBox` scales incorrectly for non-rectangular paths.

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
- **`recordSettlement` returns `settlementId`**: `{ ok: true, settlementId: string }` — used by `MarkPaidButton` to wire the 5-second Undo toast. `deleteSettlement(settlementId, groupId)` is the paired action.
- **`useSheetDismiss(open, onClose)`** (`hooks/use-sheet-dismiss.ts`): adds Escape key + Android/browser back-button dismissal to any bottom sheet. Pushes a fake history entry on open so the hardware back button closes the sheet rather than navigating away; pops it automatically when closed programmatically. Use in every new bottom sheet component.
- **Dismissable prompt localStorage keys**: `clear_repeat_trip_dismissed_${groupId}` — `RepeatTripPrompt` reads after mount to avoid SSR mismatch. Pattern: read in `useEffect`, write on dismiss, render `null` if key is set.
- **Settlement celebration sessionStorage key**: `clear_settled_confetti_${groupId}` — `SettledCelebration` fires once per browser session when all debts are cleared. Stores `"1"` immediately on mount to prevent double-fire on re-renders.
- **Stream entry terminology**: individual debt records within a Stream are called **"entries"** in UI copy (not "streams"). "Log entry →", "3 entries", "New entry", etc. The Stream feature / relationship itself = "Stream".
- **Stream nav badge localStorage keys**: `clear_stream_has_badge` ("disputed" | "new" | absent) — written by `StreamBadgeSync` on Home page, cleared by `StreamDashboardClient` on mount. `clear_stream_last_viewed` (ms timestamp) — set when /stream dashboard opens. `MobileNav` reads badge after hydration and on `stream-badge-update` custom event.
- **Stream settled celebration**: `clear_stream_settled_${personId}` — `StreamSettledCelebration` fires confetti once per session when all-square with a person.
- **`SectionPillNav`** — sticky `top-14`; sections need `scroll-mt-28`. Colors: cyan=Trips, emerald=Nests, violet=Circles, **amber=Archived**. See `components/CLAUDE.md`.
- **`GlobalFab`** — fan-out FAB, Home page only (`!isEmpty`), `bottom-nav-safe right-4 z-50`; Log expense → `GroupPickerSheet` → `QuickAddSheet`; Log entry → `StreamLogSheet`. See `components/CLAUDE.md`.
- **`HomeGreeting`** — client, user's local time (not UTC); morning 5–12, afternoon 12–17, evening 17+.
- **Trip alive badges** — `computeTripStatus(startDate, endDate)` in `trip-card.tsx`: `active`/"Day X of Y", `lastDay`/"Last day 🏁", `justReturned`/"Just returned ✓" (≤7 days). Not shown on nests or archived.
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
- **Create test cases before starting implementing. Run test cases that can be tested automatcially(unit testing , some functional testing) and verify all pass,  before confirming for user validation.
- **For user validation, always present the test cases that can only be manually tested. Present 1 test case at a time. Ask the user to confirm whether the testing is a Pass, Fail, Skip. 
