# Clear — Component & Design System Reference

> Loaded when editing `components/**`, `hooks/**`, `app/globals.css`.

---

## Payment Components (`components/payment/`)

Shared atomic UPI payment components used across Trips/Nests/Streams/Circles.

### `UpiPayButton` — Atom 1 (debtor side)
3-button app picker row (G Pay `tez://` | PhonePe `phonepe://` | Any UPI `upi://`) + QR code fallback. Props: `vpa`, `amount`, `currency`, `contextName`, `onTapped?`, `size?: "sm"|"md"`. QR is always shown (more prominent on iOS). `onTapped` fires when any button is tapped — parent uses this to start return-from-UPI detection. Uses `next/dynamic` for QR to avoid SSR.

### `UpiRequestButton` — Atom 2 (creditor side)
Web Share API primary → clipboard copy fallback → WhatsApp `wa.me` secondary. Builds a `/pay?to=userId&am=...` shareable link. Props: `payeeUserId`, `payeeName`, `amount`, `currency`, `contextName`, `size?: "sm"|"md"`. Emerald gradient.

### `PaymentConfirmPrompt` — Atom 3 (return-from-UPI)
Shown after debtor returns from UPI app (parent detects via `visibilitychange`/`focus`). Cyan glass card, 15s auto-dismiss with countdown bar, optional UTR input (max 30 chars). Props: `isVisible`, `onConfirm(utr?)`, `onDismiss`, `confirming?`, `amount`, `currency`. Manages its own timer — parent just toggles `isVisible`.

### `PaymentPendingBadge` — Atom 4 (creditor/admin confirmation surface)
Two states via `canConfirm: boolean`:
- `true` (creditor or admin) — actionable: payer name + amount + method badge + UTR + **[✗ Dispute] [✓ Confirm receipt]** buttons
- `false` (uninvolved member) — read-only: ⏳ "Awaiting confirmation" + amount

Props: `payerName`, `amount`, `currency`, `paymentMethod?`, `utrReference?`, `canConfirm`, `onConfirm?`, `onDispute?`, `confirming?`, `disputing?`.

### `PaymentSheet` — Composite (Trips/Nests settle page)
Direction-aware bottom sheet. Debtor: `UpiPayButton` + `PaymentConfirmPrompt` + method chips. Creditor: `UpiRequestButton` + "already received?" + method chips. Same spring chrome as `StreamSettleSheet`. Props include `direction`, `payer/payee` party objects, `context`, `onSelfReport`, `onMarkPaid`.

### Payment utilities (`lib/payment/`)
- `lib/payment/types.ts` — `PaymentMethod`, `PaymentDirection`, `PAYMENT_METHOD_LABELS/ICONS`
- `lib/payment/utils.ts` — `buildGPayLink`, `buildPhonePeLink`, `buildUpiDeepLink`, `buildUpiQrContent`, `buildPaymentPageUrl`, `buildWhatsAppRequestUrl`, `buildTransactionNote`

**Transaction note standard**: always `"Clear · ${contextName}"` (max 50 chars). QR always uses generic `upi://` URI (camera scan works on iOS even when `upi://` URI scheme doesn't).

### UPI ID management (`lib/db/queries/upi.ts`, `app/actions/upi-ids.ts`)
`getUserUpiIds`, `getDefaultUpiId`, `getMemberDefaultUpiIds` (batch). Actions: `saveUpiId` (upsert, max 5, auto-default), `deleteUpiId` (auto-promotes next default), `setDefaultUpiId`. Schema: `lib/db/schema/upi-ids.ts` (`user_upi_ids` table).

### /pay public page (`app/pay/`)
No-auth shareable payment link. Reads `?to=userId&am=...`. Server-fetches payee name + UPI ID. `UpiPayButton` + return-from-UPI prompt on client. `app/pay/opengraph-image.tsx` for WhatsApp OG preview (ASCII-safe only — no `₹` in OG image).

### Self-report / confirm / dispute pattern
All four financial contexts use the same pattern:
- **Debtor self-reports** with `paymentMethod` + `utrReference` → `is_confirmed=false` → push-notifies creditor/admin
- **Creditor/admin confirms** → `is_confirmed=true` → push-notifies debtor/member
- **Creditor/admin disputes** → deletes the unconfirmed record → push-notifies debtor/member
- **`canConfirm`** is always pre-computed by the parent (never inside atoms): Trips/Nests = `isAdmin || toMember.userId === currentUser.id`; Streams = creditor OR admin; Circles = admin only

**Circle-specific**: admin self-reports auto-confirm (`isConfirmed: isAdmin`); non-admin self-reports await admin review.

---

## Design System

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
.glass-nav { background:rgba(255,255,255,0.88); backdrop-filter:saturate(180%) blur(20px); border-bottom:1px solid rgba(255,255,255,0.9); }
.dark .glass     { background:rgba(15,23,42,0.75); border:1px solid rgba(51,65,85,0.6); }
.dark .glass-sm  { background:rgba(15,23,42,0.65); border:1px solid rgba(51,65,85,0.5); }
.dark .glass-nav { background:rgba(13,18,30,0.92); backdrop-filter:saturate(150%) blur(20px); }
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
- **Desktop**: sticky top — `ClearLogo` (28px), **Home** · **Streams** · **Insights**, ThemeToggle, avatar dropdown.
- **Mobile bottom nav**: 3 tabs — **Home** (`/groups`) · **Streams** (`/stream`) · **Insights** (`/insights`). `MobileNav` reads `clear_stream_has_badge` from localStorage and shows a small dot on Streams (amber=disputed, green=new). Clears when pathname is `/stream*`.
- **Mobile top nav**: icon-only `AppNav` hidden on group detail pages (`isInsideGroup`) AND stream pages (`isInsideStream`). Those pages have their own custom sticky headers.
- **App nav bars are transparent**: `AppNav`, `MobileNav`, `GroupMobileNav` all use `backdrop-blur-sm` (no background, no border). **Marketing/public pages** (`/`, `/pricing`, `/changelog`, `/admin`) still use `.glass-nav`. Do NOT use `.glass-nav` on in-app navbars.
- Content uses `.pb-safe-nav`. FAB (`bottom-nav-safe right-4 md:hidden`) on Expenses page (outer container uses `pb-24 md:pb-0` to clear FAB). MobileNav inner div uses `.h-nav-safe`.
- **Within group routes on mobile**: `AppNav` hides (`hidden md:block`); `GroupMobileNav` renders inside `<main>` as `sticky top-0 z-40 -mx-6 -mt-6` (negative margins break out of padding).
- **Within stream routes on mobile**: same — `AppNav` hides, custom stream header takes over with `backdrop-blur-sm`.
- **Plus badge on avatar**: violet ✦ circle at `-bottom-0.5 -right-0.5`. Dropdown shows `✦ Plus` pill next to user name.
- **Within group routes on mobile**: `AppNav` hides (`hidden md:block`); `GroupMobileNav` renders inside `<main>` as `sticky top-0 z-40 -mx-6 -mt-6` (negative margins break out of padding; sticky scrolls past TrialBanner). Shows: ← Back | group name (Fraunces) | `⋯` → `TripCardNavSheet`.
- **Plus badge on avatar**: violet ✦ circle at `-bottom-0.5 -right-0.5` (distinct from cyan tour dot at `-top-0.5 -right-0.5`). Dropdown header also shows a `✦ Plus` pill next to the user's name. Only shown when `plan === "plus"` (active paid, not trialing).

### Quick-add sheet
Uses `bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl` — NOT `.glass` (60% opacity is too transparent over the dark backdrop overlay).

### Safe-area CSS utilities
(top-level in `globals.css`, NOT inside `@layer` — Turbopack rejects `@media` nested inside `@layer`):
- `.h-nav-safe` — nav height + `safe-area-inset-bottom`. MobileNav inner div.
- `.pb-safe-nav` — content bottom padding + safe area, overridden to `2rem` at `md`. App `<main>`.
- `.bottom-nav-safe` — `bottom` value for FAB + iOS install hint.

### Group card action buttons — two-wrapper structure (critical)

`TripCard` uses two nested wrappers to keep action buttons outside the `<Link>`:
- **Outer div**: positioning, hover, touch handlers. NO `overflow-hidden`.
- **Inner div** (`glass rounded-2xl overflow-hidden`): clips image + ribbon. Contains `<Link>` (image area only → group overview).
- **Top-left badges** are on the OUTER div (`absolute top-3 left-3 z-10`): type pill (`pointer-events-none`) + member count `<Link>` → `/members`.
- **Balance badge** — wrapped in a `<Link>` → `/settle`. `onTouchStart stopPropagation` prevents triggering card's long-press timer.
- **Top-right buttons** on outer div: Add, Share — `⋯` always visible (`flex w-10 h-10 md:w-8 md:h-8`).
- **TripCardNavSheet** is also on outer div.

`suppressNextClick` ref pattern — long-press sets `true` for 300ms after lift; click handlers on badges check it and call `e.preventDefault()` to prevent navigation after a long-press.

React portals bubble through the React tree, not the DOM — portal-spawning components (QuickAddSheet, InviteQRSheet) must be React-parented outside the `<Link>`. No `e.stopPropagation()` needed.

**Diagonal ribbons** (`absolute bottom-[22px] right-[-30px] w-[130px] rotate-[-45deg]`, `pointer-events-none`): Demo = amber `SAMPLE`, Archived = slate `ARCHIVED`. On the inner div so the ribbon spans image + badge.

**TripCardNavSheet** — portal + AnimatePresence bottom sheet. Opens via `⋯` click (all devices) or 500ms long-press (all). Four destinations: Members, Expenses, Settle Up, Insights.

### Share / invite pattern — platform-aware Web Share API

`TripCardShareDrawer` — single share icon on card. `navigator.share()` directly → iOS AbortError → `InviteQRSheet`; non-iOS AbortError → nothing (Windows/Android native share sheet already has QR + copy); no Web Share API → clipboard copy.

`InviteSection` — on group detail + members pages. Same platform-aware logic. Embeds `ConfirmDialog` for "Reset invite link". `currentUrl` state updates after token regeneration.

`InviteQRSheet` (`components/shared/invite-qr-sheet.tsx`) — iOS-only QR bottom sheet. Portal + AnimatePresence, non-passive `touchmove` prevention. Shares `/join/[shareToken]`.

### Motion
- Card entrance: `opacity 0→1, y 16→0` over 300ms, stagger via `AnimatedList` (CSS keyframes)
- Scroll-triggered section reveals: `FadeIn` (`components/shared/fade-in.tsx`) — `useInView` once, `y 20→0, opacity 0→1`, 550ms, cubic `[0.25,0.1,0.25,1]`. Applied to below-fold sections in insights pages. Supports `delay` (ms) and `direction` (`up`|`left`|`right`|`none`).
- Balance numbers: `CountUp` (Framer Motion animate). Accepts `maximumFractionDigits` prop (default 2; pass `0` for whole-number currencies like KPI cards).
- `NavProgress` (`components/shared/nav-progress.tsx`) — cyan→teal bar at top. Lives in root `app/layout.tsx`. Triggers on `<a>` clicks + custom `navprogress` window event (dispatched before `window.location.href` navigations to cross-layout routes).

#### `AnimatedList` API (`components/shared/animated-list.tsx`)
```tsx
<AnimatedList
  className="grid …"        // forwarded to outer div (supports data-tour, etc.)
  staggerMs={80}            // ms between items (default 80)
  initialDelayMs={0}        // base delay before first item — lets split lists cascade seamlessly
>
  {items.map(…)}            // children: React.ReactNode[]
</AnimatedList>
```
- **CSS-driven** — uses `@keyframes list-enter` + `.animate-list-enter` class. Fires on DOM insertion, independent of React hydration. Safe after skeleton→content swaps on mobile.
- Stagger delay passed via CSS custom property `--list-delay` (inline style) read by `animation-delay: var(--list-delay, 0s)` in the class. More reliable than inline `animationDelay` overriding a shorthand across browsers.
- Each item wrapped in `<div class="h-full animate-list-enter">` — `h-full` ensures grid rows are equal height even when card content lengths differ.
- `useReducedMotion()` — when OS `prefers-reduced-motion` is set, renders a plain `<div>` with no animation and no `opacity:0` risk.
- Stagger cap: `Math.min(i, 8)` — items 9+ share item-8 delay so a 30-item list never exceeds 640ms total.
- `initialDelayMs` — use when a list is visually split across two `AnimatedList` instances (e.g. expense list first-2 inside tour spotlight, rest outside). Set `initialDelayMs={staggerMs * 2}` on the second list so the cascade feels continuous.

### Category Color System

#### `CategoryIcon` (`components/expense/category-icon.tsx`)
```tsx
<CategoryIcon category="food" size="sm" />  // size: "sm" (w-8 h-8) | "md" (w-10 h-10, default)
```
Renders a `bg-gradient-to-br ${cat.gradient}` rounded box with `text-white` icon. **Never** use the old `cat.color` / `cat.textColor` pattern for icon containers — those are kept only for chart axis ticks and chat-import dialogs.

#### `Category` type (in `lib/categories.ts`)
```typescript
interface Category {
  value: string; label: string; icon: LucideIcon;
  color: string;      // pale tint bg — kept for Recharts axis fills only
  textColor: string;  // icon color — kept for chart legends only
  gradient: string;   // vibrant gradient pair for CategoryIcon, e.g. "from-orange-400 to-red-400"
}
```
All 17 categories (trip + nest) have a `gradient` value. Use `cat.gradient` for any icon container or active-chip coloring.

#### Section header color-identity system
Each major destination has a fixed accent color applied to section header icon badges + gradient rule lines:

| Page / section | Color | Badge bg | Icon color | Rule gradient |
|---|---|---|---|---|
| Insights (all pages) | **amber** | `bg-amber-50 dark:bg-amber-900/30` | `text-amber-500 dark:text-amber-400` | `from-amber-200/70 … dark:from-amber-800/40` |
| Settle Up | **emerald** | `bg-emerald-50 dark:bg-emerald-900/30` | `text-emerald-600 dark:text-emerald-400` | `from-emerald-200/70 … dark:from-emerald-800/40` |
| Members | **violet** | `bg-violet-50 dark:bg-violet-900/30` | `text-violet-500 dark:text-violet-400` | `from-violet-200/70 … dark:from-violet-800/40` |
| Expenses | **cyan** | `bg-cyan-50 dark:bg-cyan-900/30` | `text-cyan-600 dark:text-cyan-400` | `from-cyan-200/70 … dark:from-cyan-800/40` |
| Neutral (activity feed, generic) | **slate** | — | — | `from-slate-300/60 … dark:from-slate-600/50` |

Rule line markup:
```tsx
<div className="flex items-center gap-2.5 mb-4">
  <div className="w-6 h-6 rounded-md bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
    <Icon className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
  </div>
  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</span>
  <div className="flex-1 h-[1.5px] bg-gradient-to-r from-amber-200/70 to-transparent dark:from-amber-800/40 dark:to-transparent" />
</div>
```

#### `KpiCard` accent behavior
`<KpiCard accent />` renders a full `bg-gradient-to-br from-amber-500 to-orange-400 shadow-md shadow-amber-500/25` hero card with `text-white` text (label at `text-white/70`, sub at `text-white/60`). Use on the primary metric in any KPI grid (first card).

---

## Insights Components (`components/insights/`)

### `HighlightsStrip`
`"use client"`. Accepts `Highlight[]` from `lib/insights/trip-insights.ts`. Each card: Framer Motion `scale+opacity` entrance with 90ms stagger; colored gradient orb via `accentColor` (Tailwind gradient pair); Fraunces title; `line-clamp-2` sub-text. Dynamic grid: 1 item → `grid-cols-1 sm:grid-cols-2 max-w-sm`; 2 → `grid-cols-2`; 3 → `grid-cols-3`. Never use `grid-cols-3` hardcoded — a single highlight in a 3-col grid renders at 33% width.

### `DailySpendBar`
`"use client"`. Accepts `DaySpend[]` (which includes `cats: Record<string, number>` for per-category per-day amounts). Renders a **stacked bar chart** with one `Bar` per category (sorted by total descending → largest at bottom of stack). Uses `CATEGORY_HEX` fill colors — same palette as `CategoryDonut`, threading color language across both charts. Top-3 compact legend in card header. Peak-day total annotated in cyan via `LabelList` on the topmost `Bar`. Falls back to plain cyan bar when `cats` is empty. Chart `margin={{ top: 18 }}` to give room for the peak annotation.

### `MonthlySpendBar`
`"use client"`. Optional `monthlyAverage?: number` prop — draws a dashed cyan `ReferenceLine y={monthlyAverage}` labelled `"avg"` at `insideTopRight`. Makes each month's above/below-baseline position immediately readable without hovering.

### `MemberContributions`
`"use client"`. Key props:
- `currentMemberId?` — renders "You" in cyan on Y-axis, cyan-600 bars (vs cyan-400 for others)
- `currentUserNet?` + `settleHref?` — net callout below chart with "Collect →" / "Settle →" link
- `fairShare?` — dashed cyan `ReferenceLine x={fairShare}` labelled `"fair share"`; bars to the right = overpaid, left = underpaid. Pass `Math.round(totalSpend / members.length)`.

### `PaceTrackerCard`
Requires `groupId: string` prop (for "Review expenses →" link on watch/over pace). When `daysRemaining === 0`: label changes to "Final total" (not "Projected"). When complete + under budget: `"Under budget 🎉"` badge + soft emerald ambient orb. `groupId` also used for the action link.

### `NestPaceCard` + `computeNestPaceData`
Both exported from `components/insights/nest-pace-card.tsx`. `computeNestPaceData({ thisMonthSpend, monthlyHistory, thisMonthKey, monthLabel })` → `NestPaceData | null`. Status thresholds: projected ≤ avg×1.1 = `on_track`; ≤ avg×1.3 = `watch`; > avg×1.3 = `over`; < 2 months history = `building`. Returns `null` when `thisMonthSpend === 0`.

### `TripsSpendBar`
`"use client"`. `ComposedChart` with `layout="vertical"` (horizontal bars). Accepts `title?` override for multi-currency labelling (e.g. `"Spend per trip · INR"`). **Trend line** (`Line`) rendered when `data.length >= 3` — dashed cyan, connects bar tips chronologically (oldest at top, newest at bottom), shows spending trajectory. Two-line Y-axis tick via SVG `<tspan>`: trip name (line 1) + `"May '24 · 5d"` (line 2). Always pass `y={y}` on the `<text>` element — without it all labels render at y=0.

### `CrossTabCard`
`"use client"`. Shown above the tab switcher in all-groups insights when user has both trips and nests. Props: `tripsData`, `nestsData`, `currency`. Shows home daily rate (`monthlyAverage / 30`), travel daily rate (`dailyPace`), multiplier (only when > 1), and combined all-time total (only when `currency === "INR"` — avoids summing mixed currencies). Returns `null` when both rates are 0.

### `PersonalContent` + `PersonalPlusGate`
`"use client"`. Both exported from `components/insights/personal-content.tsx`. Rendered inside `InsightsTabs` when `activeTab === "you"`.

**`PersonalPlusGate`** — shown to non-Plus users: violet gradient icon + copy + "Upgrade to Clear Plus →" link to `/upgrade`.

**`PersonalContent`** — shown to Plus/trialing users. Props: `data: PersonalInsights`. Four zones:
1. **Opening sentence** + KPI row (amber accent total-share card + avg/month glass card)
2. **Right now** — net position; `NetGroupRow` sub-component: group icon (Home/MapPin), name, net amount (emerald if owed, amber if owe), arrow; links to `/groups/[id]/settle`
3. **Financial circle** — `CompanionCard` sub-component per companion: `MemberAvatar` (hash-gradient), name, active dot (green, last 90 days), group count, human label, shared total; Framer Motion stagger `delay={index * 0.07}`
4. **Triggered insight card** (amber border, emoji icon) + `BankerCard` (paid-upfront vs share, animated progress bar `framer motion width 0→%`, year-over-year trend line with `TrendingUp` icon) + `CategoryDonut` + `GroupShareBars`

**`GroupShareBars`** — glass card, per-group horizontal bars; each row is a `<Link>` to `/groups/[id]/insights`; bars animate via `motion.div width 0→%` with `delay: 0.1 + i * 0.05`; gradient matches `GROUP_GRADIENTS[i % 8]` (same palette as `TRIP_GRADIENTS` in insights-tabs).

**Avatar colours**: `MemberAvatar` uses `hashName(name) % 8` — same system as rest of app, consistent across groups page, members page, debt-flow graph, and this tab.

---

## Key Components

### CircleCard (`components/circle/circle-card.tsx`)

`"use client"`. Home-page card for Circle groups. Shares the same visual grammar as `TripCard` — do not revert to the old left-bar layout.

**Structure (three zones, top to bottom):**
1. **Gradient header (`h-44`)** — `bg-gradient-to-br ${heroGrad}` matching TripCard height exactly. Contains absolute-positioned mode badge (top-left), `TripCardShareDrawer` (top-right), group name in Fraunces + `Wallet · ₹X` subtitle (bottom-left), optional target or per-person hint (bottom-right). Entire header is a `<Link>` to the dashboard.
2. **3px progress bar** — acts as the visual divider between header and strip. Fills left to right; turns emerald at 100%.
3. **Bottom strip** — `flex-1` (absorbs extra height in grid rows). Left: `X/Y paid` count or `✓ All paid` emerald state. Right: role-aware CTA — admin sees `N pending →` button (taps open `RecordContributionSheet` for first pending member); member sees Pay ↗ / I've paid / ⏳ Pending / You're clear.

**Theme-aware gradient + pattern:**
- Light mode: pale tinted gradient (`slate-100→indigo-100` for recurring, `orange-50→amber-100` for one-time) + **coloured SVG pattern** (indigo wave / amber lollipops at 20–28% opacity).
- Dark mode: deep dark gradient (`slate-800→indigo-900` / `slate-800→amber-900`) + **white SVG pattern** (10–18% opacity).
- Implemented as **two overlay divs**: `dark:hidden` for light pattern, `hidden dark:block` for dark pattern. No JS theme detection needed.

**SVG patterns (conceptual):**
- Recurring: dashed centre axis + continuous sine wave (`M0,30 C55,2 100,2 100,30 S145,58 200,30`) + filled circles at peaks (x=71,y=9), troughs (x=129,y=51), and zero-crossings. Tile: `200×60px`, `backgroundRepeat: repeat`.
- One-time: five discrete vertical bars at varying heights with a circle on top of each (lollipop chart). No connecting line — reads as separate individual contributions. Same tile size.

**Colours:**
- `heroGrad` includes `dark:` variants inline: `"from-slate-100 to-indigo-100 dark:from-slate-800 dark:to-indigo-900"`.
- Mode badge: `bg-indigo-500/15 text-indigo-700 dark:bg-indigo-400/20 dark:text-indigo-200` (recurring) / amber equivalent (one-time).
- Ambient resting shadow: `shadow-md shadow-violet-500/15` (recurring) / `shadow-amber-500/15` (one-time); `hover:shadow-xl` at `/30`. **Two-wrapper structure** (same as TripCard) — outer div owns shadow + hover lift, inner `glass rounded-2xl overflow-hidden` owns clipping. Necessary because `overflow-hidden` + `border-radius` + `box-shadow` on the same element clips the shadow in Chrome/Safari.
- Card uses `h-full flex flex-col` so all cards in a grid row are equal height.

**Wallet label:** The collected amount is labelled "Wallet" (not "Pool") everywhere on the card. Consistent with "Wallet balance" on the dashboard.

---

**No-cover-photo SVG patterns** — when `!group.coverPhotoUrl`, the `h-44` header renders a vivid identity gradient + one SVG pattern overlay div. Pattern constants shared via **`lib/group-patterns.ts`** (exports: `TRIP_TREE_LIGHT/DARK`, `TRIP_PATTERN_STYLE`, `NEST_BUILDING_LIGHT/DARK`, `NEST_PATTERN_STYLE`) — imported by both `trip-card.tsx` and the group dashboard page.
- **Trip** — `from-cyan-500 to-teal-500` gradient (both modes) + rounded-canopy tree silhouettes. Four trees per 220×110 tile — each = ground-shadow ellipse → trunk rect (6px) → wide branch-spread ellipse (shoulder, reads as branches) → dome circle. Colours: `cyan-600 #0891b2` (light variant), `white` at boosted opacity (vivid/dark variant). `repeat-x`, `backgroundPosition: bottom`.
- **Nest** — `from-emerald-500 to-teal-500` gradient (both modes) + city skyline silhouettes. 14-building panorama per 400×110 tile with 2px gaps between every building; antennae on two tallest; window grids (3-col×5-row, 2-col×4-row) on prominent buildings. Colours: `emerald-600 #059669` (light), `white` (vivid/dark). 400px tile means repeat fires ≤ once per card.
- **Single pattern div** — no `dark:hidden`/`hidden dark:block` split. White shapes work on vivid gradient in both modes; `TRIP_TREE_LIGHT`/`NEST_BUILDING_LIGHT` (coloured shapes) kept in `lib/group-patterns.ts` for future use.
- **Legibility overlay unified** — `from-slate-900/70 via-slate-900/20 to-transparent` for both photo and no-photo cases. Vivid gradient needs the same dark protection as a real cover photo.
- **Card hover shadows** — type-matched: Trip = `shadow-cyan-500/15 hover:shadow-cyan-500/30`; Nest = `shadow-emerald-500/15 hover:shadow-emerald-500/30`. Was Plus-gated violet; now always shown at consistent `/15`→`/30` levels matching Circle cards.
- **Dashboard hero consistency** — the same pattern (`TRIP_TREE_DARK` / `NEST_BUILDING_DARK`) is layered into `app/(app)/groups/[id]/page.tsx` hero (no-photo state): sits between the gradient and the dark overlay so it shows clearly at the top and disappears behind the text at the bottom.

### Group Card Balance Badge
`components/trip/group-balance-badge.tsx` — async RSC streamed into each active `TripCard` via `<Suspense>`. States: owe (amber) / owed (emerald) / settled (muted emerald) / no expenses (slate) / multi-currency (muted). Groups page batch-fetches all member IDs via `getUserMemberIds(groupIds, userId)` (one query). Archived cards get no badge. `TripCard` accepts `balanceBadge?: React.ReactNode`.

### Group Overview Quick-Action Card Badges (async RSCs)
All streamed via `<Suspense>`, cached with existing tags — no action file changes needed:
- `components/trip/settle-balance-badge.tsx` — live net balance on Settle Up card. Calls `getBalances()`, tagged `balances-${groupId}`.
- `components/trip/insights-summary-badge.tsx` — top spending category on Insights card. Calls `getTopCategory()`, tagged `balances-${groupId}`.
- `components/trip/nest-monthly-badge.tsx` — this month's spend on Expenses card (nests only). Calls `getThisMonthSpent()`, cache key includes year+month.
- `components/trip/group-activity-feed.tsx` — recent activity feed (5 items, both trips and nests) after budget bar. Tagged `group-${groupId}` + `balances-${groupId}`.

### Expense Detail Sheet
`components/expense/expense-detail-sheet.tsx` — bottom sheet on expense card tap. Self-contained inside `SwipeableExpenseCard`. Fetches splits on demand via `fetchExpenseSplitsAction`. Also contains:
- **Reaction bar** — 👍 (thumbs_up) toggle via `addReaction`; ❓ opens `QuestionForm`; ⚠️ opens `DisputeForm`. All call `router.refresh()` on success so card pills update without navigation.
- **Dispute status card** — shows when a `pendingDispute` exists; payer/admin see Accept & Decline buttons.
- **Resolved disputes** — accepted/declined/cancelled disputes shown below the pending card; each has a status icon and resolution label. Separated from the pending dispute section.
- **Thread link** — "Discussion (N)" card linking to `/groups/${groupId}/expenses/${expenseId}/thread`.
- **Seen avatar stack** — `SeenAvatarStack` in the audit trail; shows overlapping `MemberAvatar` circles (max 5 visible + "+N" overflow). Optimistic: adds current user immediately before RSC confirms. Replaces the old "Seen by N members" text.
- **`markSeenAction` + `router.refresh()`** — fires on every open so the unread dot on the card clears immediately.
- `QuestionForm` and `DisputeForm` render at `z-[60]` (above the sheet's `z-50`).

### QuestionForm / DisputeForm
`components/expense/question-form.tsx` and `components/expense/dispute-form.tsx` — portal sheets at `z-[60]`. Both call `router.refresh()` + `onClose()` via the parent's `onSuccess` callback.
- `DisputeForm`: 4 types — `remove_me`, `change_share` (amount input), `split_equal`, `other` (message). Auto-resolve tip shown for actionable types.
- `QuestionForm`: plain textarea (280 chars) + "Withdraw" path when `existingDisputeId` present (calls `cancelMyDispute`).

### ThreadCommentInput
`components/expense/thread-comment-input.tsx` — sticky comment input on the thread page.
- @mention detection: scans from last `@` before cursor, filters members by name prefix, dropdown uses `onMouseDown + e.preventDefault()` to avoid blur race.
- `insertMention(member)` replaces `@query` with `@Name ` and refocuses.
- ⌘↵ / Ctrl+Enter submits. @ button inserts `@` at cursor. Max 500 chars.
- Final submission validates that all `@Name` tokens are still present before calling `addComment`.

### MemberProfileSheet
`components/shared/member-profile-sheet.tsx` — portal bottom sheet at `z-50`. Triggered from:
- **Members page** (`MemberListClient`) — no `netBalance` prop; stats-only view.

Props: `member`, `groupId`, `currency`, `currentMemberId`, `netBalance?`, `isOpen`, `onClose`.
Lazy-loads stats via `fetchMemberStatsAction` on first open; resets on `member.id` change (prevents stale data across members). Escape key + Android back-button close via `useSheetDismiss`.

### SwipeableExpenseCard — responsive action reveal

`components/expense/swipeable-expense-card.tsx` — wrapper around `ExpenseCard` with two behaviour modes:

- **Desktop** — `group` wrapper; `ExpenseCard` rendered with `hoverRevealActions` prop → Edit/Duplicate/Delete buttons are `opacity-0 group-hover:opacity-100` (invisible at rest, appear on hover). Zero extra taps.
- **Mobile** — swipe left → card snaps back to 0 → glass overlay fades in (`backdrop-blur-md bg-white/75 dark:bg-slate-800/75`) → 3 large `w-14 h-14` buttons: Edit (cyan), Duplicate (slate), Delete (red). Swipe right or tap outside → overlay dismissed. Delete still goes through `ConfirmDialog`.

`ExpenseCard` props for this pattern:
- `hideActions` — hides the button row entirely (mobile: buttons are in the overlay)
- `hoverRevealActions` — wraps button row in `opacity-0 group-hover:opacity-100`

### MemberListClient
`app/(app)/groups/[id]/members/member-list-client.tsx` — replaces static member list. Each row is `<div role="button">` (not `<button>`) to avoid nested-button violation with `RemoveMemberButton` inside. `stopPropagation` on the actions wrapper prevents Remove button from opening the sheet.

**Ghost member states** — rows where `guestName !== null && userId === null` (unclaimed invite) show:
- `⏳ Not joined yet` amber label below the member name
- A `📤` share icon (admin-only) — taps `navigator.share()` with a personalised message, falls back to opening `wa.me` with the invite URL pre-filled
Props added: `inviteUrl: string`, `groupName: string`.

### TripTimeline — rich day-by-day summary timeline
`components/trip/trip-timeline.tsx` — `"use client"`, used on `/summary/[token]`. Data: `{ days: DayGroup[], startDate, endDate, currency }`. Each `DayCard` renders on scroll (`useInView`): animated connector, dominant-category hex tint, Day X/Y badge, count-up total, payer chips (√-scaled by spend), stacked category bar, always-expanded expense rows. No accordion — summary is a showcase. `PAYER_COLORS` local constant; `isBusiest` only when `spendPct === 100 && !isOff`.

### SectionPillNav
`components/shared/section-pill-nav.tsx` — `"use client"` sticky pill nav for the Home page. Accepts `sections: NavSection[]` (id, label, count, color) + optional `createPills: CreatePill[]` (dashed pills linking to create pages for missing group types).

Sits `sticky top-14 z-40 -mx-6 px-6 backdrop-blur-sm`. Pill size: `px-4 py-2 text-sm` (was `px-3 py-1.5 text-xs` — bumped for better tap targets). Active pill gets accent colour: cyan=Trips, emerald=Nests, violet=Circle, **amber=Archived** (slate looked disabled; amber is unambiguous). `SectionColor` type: `"cyan" | "emerald" | "violet" | "amber" | "slate"`. Sections need `scroll-mt-28` to clear both the AppNav and this sticky bar.

**Observer pattern** — keeps a `Set<string>` of all currently-intersecting sections (not just the latest entry). Callback picks the **last section in page order** that is in the Set — this correctly handles tall sections whose bottom still overlaps the trigger band when a shorter section below enters from the bottom. Pills also call `setActiveId(id)` directly `onClick` for instant visual feedback without waiting for the observer.

### GlobalFab
`components/shared/global-fab.tsx` — fixed `bottom-nav-safe right-4 z-50` fan-out FAB rendered on the Home page (only when groups exist). Warm sunset gradient `from-orange-400 to-rose-500` + `shadow-orange-500/35`. Main `+` rotates 45° → `×` on open via Framer Motion spring.

**Fan items** — two staggered mini FABs (stagger 0.05s / 0.11s):
- **Log expense** (cyan, Receipt icon) → `GroupPickerSheet` (unless only 1 group, then opens `QuickAddSheet` directly)
- **Log entry** (indigo, ArrowLeftRight icon) → `StreamLogSheet`

**Auto-hide** — `fabVisible` state + passive scroll listener. Hides (`y:96, opacity:0`) when scrolling down >8px delta; shows when scrolling up or `currentY < 80`. Always visible when `fabOpen`. Wrapper is a `motion.div` with spring transition.

**`GroupPickerSheet`** — inline portal component. Recent tiles: top 2 non-demo active groups (cover photo, name, member count). Full list: remaining trips + nests sections with mini thumbnails. Empty states handled. Uses `useSheetDismiss(isOpen, onClose)` for Escape key + Android back button (same as all other sheets).

**State machine**: `fabOpen` → picker or stream sheet → `quickAddGroup` + `quickAddOpen`. Separate `quickAddGroup`/`quickAddOpen` states ensure exit animation plays cleanly before data is cleared (150ms open delay, 350ms close delay).

**`QuickAddSheet` `onBack` prop** — when provided, the sheet header left side shows `← Change group` (tappable, calls `onBack`). Without it, shows plain "Add expense" label. Backward-compatible (optional prop).

### HomeGreeting
`components/shared/home-greeting.tsx` — `"use client"` personal greeting at the top of the Home page. Uses client's local time so the greeting matches the user's timezone (not server UTC). Three greetings: **Good morning** (5–11), **Good afternoon** (12–16), **Good evening** (17+, incl. late night — "Good night" omitted as it implies signoff). Renders `{greeting}, {firstName} 👋` in Fraunces `text-xl`. `firstName` extracted from `user.user_metadata.full_name` server-side and passed as prop; gracefully omits name if absent.

### GroupSearchInput
`components/shared/group-search-input.tsx` — `"use client"` search input. Only renders when `totalCount > 5`. Filters by querying `[data-group-card]` DOM elements and hiding those where `data-group-name` doesn't match. Also hides `[data-group-section]` elements when all their cards are hidden.

### AddMembersSheet
`app/(app)/groups/[id]/members/add-members-sheet.tsx` — `"use client"` unified member-add sheet replacing the retired `AddGuestForm` + `ImportMembersSheet`. Triggered by the single violet **[+ Add members]** button on the members page.

**Modes (internal state machine):**
- `main` — search bar + chip selection + bulk paste (inline textarea, always free) + escape hatches
- `group-picker` — list of user's other groups → `group-members` (member pills, select-all toggle)
- `group-members` — member pill grid with pre-selection and dupe detection
- `share` — post-add success step: WhatsApp share button (`wa.me` URL) + copy link

**Plus gating:**
- **Clear network** (past members from all other groups, deduplicated by `userId` for Clear users / by name for ghosts) — **Plus only**. Free users with a network see a personalised teaser: first 3 names dimmed at 50% opacity with a frosted lock card showing the count + "Upgrade to Plus" CTA. Free users with no prior groups see nothing. Gate uses `isPlusUser: boolean` prop fetched via `getGroupPlan()` on the page.
- **Import from a group** — **Plus only**, hidden entirely for free users (teaser covers the upgrade pitch).
- **Bulk paste** (comma/newline textarea) and **manual typing** → always free.

**Submission:** all paths call `importMembersFromGroup(groupId, names[])` which handles deduplication + free-plan 8-member limit. On success, switches to `share` mode.

**Props:** `groupId`, `groupName`, `inviteUrl`, `networkMembers` (from `getNetworkMembers()`), `sourceGroups` (from `getGroupsForImport()`), `existingNames: Set<string>`, `isPlusUser: boolean`. Uses `useSheetDismiss`.

### RepeatTripPrompt
`components/trip/repeat-trip-prompt.tsx` — `"use client"`. Shown on a trip group page when trip is complete or archived (admin only). Renders a dismissable prompt card + bottom sheet to create a new trip with members pre-copied.

Show condition (evaluated in group page RSC): `!isNest && isAdmin && (group.isArchived || (!!group.endDate && group.endDate < today))`.
Sheet: trip name (required), optional start/end dates, member pills (pre-selected, toggle-able). Calls `createGroup` then `importMembersFromGroup` → navigates to new group. Dismiss writes `clear_repeat_trip_dismissed_${groupId}` to localStorage.

### SettledCelebration
`components/settlement/settled-celebration.tsx` — `"use client"`. 30-piece CSS confetti burst that fires **once per browser session** when all group debts are cleared (placed just above the "All settled ✓" empty state in `BalancesSection`).

Gated by `sessionStorage.getItem(`clear_settled_confetti_${groupId}`)` — writes `"1"` immediately on mount to prevent re-fire. Auto-removes after 2.5 s. Pieces: mix of 6×14 rectangles and 10×10 squares in Clear's brand palette, burst from `mt-[38vh]` to roughly align with the checkmark icon. `pointer-events-none` so it never blocks interactions.

### DebtFlowGraph
`components/settlement/debt-flow-graph.tsx` — `"use client"` pure-SVG debt-flow on Settle Up page. Root: `glass rounded-2xl overflow-hidden mb-6`. Nodes draggable via pointer events; `hasDragged` ref suppresses particles while dragging. Node size ∝ `|net|` (r 22–32), `AVATAR_COLORS` palette. Arcs: quadratic bezier + `userSpaceOnUse` gradient + Framer Motion `pathLength 0→1`. SMIL particles via `React.createElement("animateMotion")` — see CLAUDE.md gotcha.

**Critical:** SVG uses `touchAction: "pan-y"` — do NOT revert to `"none"` (blocks mobile scroll). Arc tap → `document.getElementById("suggestion-${i}")` scroll + flash; `balances-section.tsx` must set `id="suggestion-${i}"` on each card. `selectedArc`/`selectedId` are mutually exclusive. `if (members.length === 0) return null` must come BEFORE all hook calls.

### SettleFlowDemo
`components/marketing/settle-flow-demo.tsx` — static version of `DebtFlowGraph` (same arc math, SMIL particles, `AVATAR_COLORS`; no drag/selection; hardcoded data). Used on `/about` page and inside `CarouselLanding` slide 3 (`PhoneFrame` + dark `AppBar`). Same SVG+Framer Motion two-wrapper fix applies.

### QuickAddSheet — portal + `isOpen` prop pattern
Manages its own `createPortal` and `AnimatePresence` internally. Always pass `isOpen` boolean — never conditionally render from parent, never wrap in external `AnimatePresence`. The backdrop and sheet are direct `AnimatePresence` children (not in a Fragment). Members lazy-fetched on first `isOpen=true` via `fetchedRef`.

**`groupType` prop** — keys `useRecentCategories()` to `clear_recent_categories_trip` / `_nest`; recent category pills shown above the category select.

**Post-save UX** — button turns "✓ Saved!" → "+ Add another →" fades in after 200ms; auto-close 2000ms. "Add another" cancels timer + resets form via `setOpenCount`.

**Sticky context on "Add another"** — payer and date carry forward from the previous expense (stored in `lastPayerId` / `lastDate` refs). Amount, description, category, notes always reset. This lets users log a run of expenses quickly without re-selecting the same payer.
