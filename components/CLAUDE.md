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
/* Phase 3 de-white: the old body gradient was ~97% L (near-white), so frosted
   .glass cards (backdrop-blur reveals the bg) composited to stark white.
   Fix = deepen the body gradient to ~92% L AND make glass a cool off-white
   (236,243,250) instead of pure white. Cards now read as soft frosted panels. */
.glass     { background:rgba(236,243,250,0.55); backdrop-filter:blur(20px); border:1px solid rgba(203,213,225,0.45); box-shadow:0 8px 32px rgba(8,145,178,0.08),0 1px 0 rgba(255,255,255,0.45) inset; }
.glass-sm  { background:rgba(236,243,250,0.45); backdrop-filter:blur(12px); border:1px solid rgba(203,213,225,0.40); }
.glass-nav { background:rgba(255,255,255,0.88); backdrop-filter:saturate(180%) blur(20px); border-bottom:1px solid rgba(255,255,255,0.9); }
.dark .glass     { background:rgba(15,23,42,0.75); border:1px solid rgba(51,65,85,0.6); }
.dark .glass-sm  { background:rgba(15,23,42,0.65); border:1px solid rgba(51,65,85,0.5); }
.dark .glass-nav { background:rgba(13,18,30,0.92); backdrop-filter:saturate(150%) blur(20px); }
.light body { background:linear-gradient(135deg,#DCEAFE 0%,#D6F5FB 35%,#D5F6EE 70%,#D9F2E6 100%); }
.dark body  { background:linear-gradient(135deg,#0D1B2A 0%,#091C1A 35%,#0A1F17 70%,#0C1A24 100%); }
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

### Brand components — the "B-Converge" mark
- The mark = a **chamfered boxy C** (= Clear) — flat left side, 45° cut corners, and two 45° lips cupping the node (`d="M73 25 L66 18 L32 18 L18 32 L18 68 L32 82 L66 82 L73 75"`, `stroke-linejoin="miter"`) — with **two inflow strokes** (the L + r) converging into a **split node** (left half bright = e, right half dimmed = a) — every letter of "Clear" is hidden in it. Retired the old C-arc + split-coin (the coin only described "splitting", which is now just 2 of 4 contexts). Geometry lives once in `ClearIcon`; the favicon/PWA/OG/settle-card copies inline the same paths (viewBox `0 0 100 100`).
- `ClearLogo` (`components/shared/clear-logo.tsx`) — gradient **glass** icon box (specular bloom + rim overlays) + optional wordmark. Props: `iconSize`, `showWordmark`, `wordmarkClassName`, `className`.
- `ClearIcon` — white SVG paths only (no box), for custom coloured/glass containers. The glyph is intentionally right-shifted (C on the left, node/strokes on the right) — matches the app icon; do not re-center per-call.
- Icon gradient (richer cyan→teal glass): `linear-gradient(140deg, #22D3EE 0%, #0BB6D4 42%, #0E8FA8 78%, #0B5E70 100%)` — use inline style (not Tailwind) to keep exact stops.
- PWA / apple-touch icons: `app/api/pwa-icon/route.ts` (192+512, edge). Favicon: `app/icon.tsx` (32px). Both layer the glass material (gradient base + specular + vignette + rim) since Satori can't do SVG blur/clip. OG images (`app/pay`, `app/summary`) + `app/api/settle-card` inline the same glyph. The split-node seam intentionally vanishes at favicon size.

### Navigation
- **Desktop**: sticky top — `ClearLogo` (28px), **Home** · **Streams** · **Insights**, ThemeToggle, avatar dropdown.
- **Mobile bottom nav**: 3 tabs — **Home** (`/groups`) · **Streams** (`/stream`) · **Insights** (`/insights`). `MobileNav` reads `clear_stream_has_badge` from localStorage and shows a small dot on Streams (amber=disputed, green=new). Clears when pathname is `/stream*`. Active tab rendered with a **sliding Framer Motion spring pill** (`layoutId="nav-pill"`, `bg-cyan-100 dark:bg-cyan-950/70`, spring stiffness 500 / damping 35) — icon + label rendered `relative z-10` on top of the absolute-positioned pill. Do NOT use a static bg class on the nav item; the pill handles the active background. **Active logic** = `isNavItemActive(pathname, href, exact?)` (`lib/nav/active.ts`): Streams/Insights use descendant matching (detail pages keep the tab lit), but **Home passes `exact: true`** so it lights only on `/groups` — inside a specific group (`/groups/[id]/…`, a self-contained section with its own `GroupMobileNav`) no bottom tab is highlighted.
- **Mobile top nav**: icon-only `AppNav` hidden on group detail pages (`isInsideGroup`) AND stream pages (`isInsideStream`). Those pages have their own custom sticky headers.
- **App nav bars are transparent**: `AppNav`, `MobileNav`, `GroupMobileNav` all use `backdrop-blur-sm` (no background, no border). **Marketing/public pages** (`/`, `/pricing`, `/changelog`, `/admin`) still use `.glass-nav`. Do NOT use `.glass-nav` on in-app navbars.
- Content uses `.pb-safe-nav`. FAB (`bottom-nav-safe right-4 md:hidden`) on Expenses page (outer container uses `pb-24 md:pb-0` to clear FAB). MobileNav inner div uses `.h-nav-safe`.
- **Within group routes on mobile**: `AppNav` hides (`hidden md:block`); `GroupMobileNav` renders inside `<main>` as `sticky top-0 z-40 -mx-6 -mt-6` (negative margins break out of padding).
- **Within stream routes on mobile**: same — `AppNav` hides, custom stream header takes over with `backdrop-blur-sm`.
- **Plus badge on avatar**: violet ✦ circle at `-bottom-0.5 -right-0.5`. Dropdown shows `✦ Plus` pill next to user name.
- **Within group routes on mobile**: `AppNav` hides (`hidden md:block`); `GroupMobileNav` renders inside `<main>` as `sticky top-0 z-40 -mx-6 -mt-6` (negative margins break out of padding; sticky scrolls past TrialBanner). Header = **‹ Back · group-name ▾ (switcher) · ⋯**. **Back is HIERARCHICAL** (`router.push(backHref)`, never `router.back()`): section → overview, deep pages (add/edit/thread/templates) → their list, overview → Home — matches the label shown, so the bottom-nav hopping never feels like "going in circles". The centre is the **group-name ▾ switcher** on the overview + four section pages (the highlighted bottom-nav tab tells you the section, so the header doesn't repeat it); deep task pages show the **task title + section icon** instead (no switcher). `resolveNav(pathname, groupId)` returns `{ switcher, section, pageTitle, icon, backHref, backLabel }`.

- **In-group navigation (the contextual nav model)** — three jobs, one home each:
  - **Navigate within the group**: **`GroupBottomNav`** (mobile, `components/shared/group-bottom-nav.tsx`) — while inside a group the global `MobileNav` hides (`mobile-nav.tsx` returns null when `pathname` is `/groups/[id]/…`, not `/groups` or `/groups/new`) and this contextual bar takes its place: Overview · Expenses · Settle · Members · Insights, context-coloured sliding pill (`layoutId="group-nav-pill"`, `theme.navPill`). **`GroupDesktopNav`** (`group-desktop-nav.tsx`) is the desktop counterpart — a sticky tab strip below `AppNav` (rendered by the group layout in a `hidden md:block sticky top-14 z-30 -mx-8 -mt-8` wrapper), active tab gets a context-gradient underline. Both use **optimistic active** (set the tapped section in local state so the indicator moves on click, not after the route commits — fixes jumpiness) and the **shared tab list `getGroupTabs(groupId, groupType)`** (`lib/nav/group-tabs.ts`, circle-aware: circles drop Settle/Insights). **`GroupBottomNav` portals to `document.body`** — required because the group layout sits inside `PageTransition` (keyed on pathname), whose per-nav opacity/translate replay was flickering the fixed bar; portaling moves it out of that subtree. The portal is guarded by a `mounted` state (`useState(false)` + `useEffect(() => setMounted(true), [])`, return `null` until mounted) — **never use `typeof document !== "undefined"`** for this: that's `false` on the server but `true` on the client during hydration, which causes a React hydration mismatch and forces a full client re-render.
  - **Switch between groups**: **`GroupSwitcherSheet`** (`group-switcher-sheet.tsx`) — opened by the group-name ▾ in `GroupMobileNav`/`GroupDesktopNav`. Lazy-fetches active groups via the `getSwitcherGroups()` server action (no cost on normal loads). **Section-preserving**: switching from Settle lands on the target's Settle, falling back to overview for Circles (no Settle/Insights). Shows the existing `NavProgress` bar + an in-row "Switching…" state; auto-closes when `groupId` changes. **Deliberately NOT `useSheetDismiss`** (its fake-history entry would pollute the back stack on the selection navigation) — plain Escape handler + `useFocusTrap` instead. **Back-navigation correctness (sessionStorage handshake)**: when switching from a section page the sheet stores `{ groupId, section }` under `sessionStorage.key "clearSwitcherSection"` then calls `router.replace("/groups/B")`. `GroupMobileNav`'s `useEffect([pathname, groupId])` reads the key on landing, validates `groupId` matches and `pathname === "/groups/B"`, removes the key, and calls `router.push("/groups/B/section")`. Resulting history: `[..., /groups/A/settle, /groups/B, /groups/B/settle]` → back → `/groups/B` overview ✓. `setTimeout(0)` was tried first but is unreliable — App Router can cancel the `replace` when the `push` fires before it commits; sessionStorage decouples the two navigations.
  - **Act on the group**: the **`⋯` `GroupActionHub`** — Zone 2 "Jump to" is now gated by `showJumpTo` (default true). Kept on the **home-page card ⋯** (a deep-link shortcut; no bottom nav there); passed `showJumpTo={false}` from the inside-group entry points (`GroupMobileNav`, `GroupHeroHub`) where the bottom nav / overview cards already cover it.

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
- **Top-right button** on outer div: `⋯` only (`flex w-10 h-10 md:w-8 md:h-8`) — opens `GroupActionHub`. (The old standalone Share button was removed; Share now lives in Zone 3 of the hub for all members. The old standalone `+` quick-add button was removed when `GroupActionHub` was introduced — Zone 1 handles all three add modes.)
- **`GroupActionHub`** is also on outer div (rendered as a sibling portal to `document.body`).

`suppressNextClick` ref pattern — long-press sets `true` when the 500ms timer fires; click handlers on badges call `e.preventDefault()` to block navigation after a long-press; **`onContextMenu` also checks it** (`onContextMenu={(e) => { if (suppressNextClick.current) e.preventDefault(); }}`) to suppress the browser right-click/hold menu on Windows touchscreen laptops. Do NOT use `touchStartPos.current` for this check — Windows Chrome fires `contextmenu` after `touchend`, at which point `touchStartPos` is already null.

React portals bubble through the React tree, not the DOM — portal-spawning components (QuickAddSheet, InviteQRSheet) must be React-parented outside the `<Link>`. No `e.stopPropagation()` needed.

**Diagonal ribbons** (`absolute bottom-[22px] right-[-30px] w-[130px] rotate-[-45deg]`, `pointer-events-none`): Demo = amber `SAMPLE`, Archived = slate `ARCHIVED`. On the inner div so the ribbon spans image + badge.

**`GroupActionHub`** (`components/trip/group-action-hub.tsx`) — portal + AnimatePresence bottom sheet replacing the old `TripCardNavSheet` + `TripCardQuickAdd`. Opens via `⋯` click or 500ms long-press on both `TripCard` and `CircleCard`, and from `GroupMobileNav` (inner group `⋯`) and `GroupHeroHub` (group overview page hero `⋯`). Three zones: **Log expense** (Scan/Voice/Type tiles, hidden for circles), **Jump to** (4-tile nav for trips/nests; 2-tile Expenses+Members for circles — gated by `showJumpTo`, default true; passed `false` from inside-group entry points where the contextual bottom nav / overview cards already cover it, kept on the home-page card `⋯` as a deep-link shortcut), **Manage** (Edit · Archive · Share, admin-only). `QuickAddSheet` gains `startMode?: "scan" | "voice" | "text"` prop — hub tiles pass it to auto-trigger the correct mode on open. **Archive is undo-first** (not a confirm): tap → applies immediately + closes hub + Undo toast (Undo = inverse). Same undo-first rule as `archive-button.tsx` on the edit page. The old two-step inline confirm bar was removed.

### Share / invite pattern — platform-aware Web Share API

`TripCardShareDrawer` — single share icon on card. `navigator.share()` directly → iOS AbortError → `InviteQRSheet`; non-iOS AbortError → nothing (Windows/Android native share sheet already has QR + copy); no Web Share API → clipboard copy.

`InviteSection` — on group detail + members pages. Same platform-aware logic. Embeds `ConfirmDialog` for "Reset invite link". `currentUrl` state updates after token regeneration.

`InviteQRSheet` (`components/shared/invite-qr-sheet.tsx`) — iOS-only QR bottom sheet. Portal + AnimatePresence, non-passive `touchmove` prevention. Shares `/join/[shareToken]`.

### Motion
- Card entrance: `opacity 0→1, y 16→0` over 300ms, stagger via `AnimatedList` (CSS keyframes)
- Scroll-triggered section reveals: `FadeIn` (`components/shared/fade-in.tsx`) — `useInView` once, `y 20→0, opacity 0→1`, 550ms, cubic `[0.25,0.1,0.25,1]`. Applied to below-fold sections in insights pages. Supports `delay` (ms) and `direction` (`up`|`left`|`right`|`none`).
- Balance numbers: `CountUp` (Framer Motion animate). Accepts `maximumFractionDigits` prop (default 2; pass `0` for whole-number currencies like KPI cards).
- `NavProgress` (`components/shared/nav-progress.tsx`) — cyan→teal bar at top. Lives in root `app/layout.tsx`. Triggers on `<a>` clicks + custom `navprogress` window event (dispatched before `window.location.href` navigations to cross-layout routes).
- **`animate-rule-enter`** — CSS class in `globals.css` (`transform-origin: left; animation: rule-enter 0.7s cubic-bezier(0.16,1,0.3,1) both; animation-delay: 0.25s`). Applied to every `h-[1.5px]` gradient rule line in section headers across the codebase. Works reliably for rule lines because most live inside `FadeIn` wrappers (below-fold sections) or at a scroll position the user hasn't reached yet — by the time the DOM enters the viewport the animation still has time to play. Do NOT use this for elements visible immediately at page-top (above the fold on first paint) — those need a Framer Motion `BadgePop`-style component instead.
- **Mobile nav sliding pill** — `layoutId="nav-pill"` on the absolutely-positioned `motion.div` inside each active `MobileNav` link. Framer Motion interpolates the pill position between tabs via `layout` animations (spring stiffness 500 / damping 35). All nav content (`icon + label`) must be `relative z-10` to sit above the pill.

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

#### `CollapsibleList` (`components/shared/collapsible-list.tsx`) — rows resolve, not vanish
Drop-in replacement for `AnimatedList` (same `className`/`staggerMs`/`initialDelayMs` props) for lists where items are optimistically **removed**. On removal a row **collapses** (`exit={{ height: 0, opacity: 0 }}` via `AnimatePresence`) and siblings slide up (`layout`) instead of snapping out on `router.refresh()`; new rows fade/slide in with the same stagger. Pairs with the optimistic `removedIds` Set — filtering an id out triggers that child's exit animation. Each child MUST carry a stable `key`. `prefers-reduced-motion` → instant swap (no transform/height/`layout`).
- **In use:** `CircleExpenseList` and the main expense list (`expense-filters.tsx` full/compact + monthly views) — undo-first delete now collapses the row.
- **NOT used (deliberate):** the timeline view (custom `useInView` scroll-reveal `motion.div`) and the Settle suggestion cards (marking paid recomputes the whole min-payment plan, so there's no clean single-row removal to animate).

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
`components/trip/group-balance-badge.tsx` — async RSC streamed into each active `TripCard` via `<Suspense>`. States: owe (amber) / owed (emerald) / settled (muted emerald) / no expenses (slate) / multi-currency (muted). Props: `{ groupId, userId }`. Reads `getHomeBalances(userId)` (`lib/db/queries/balances.ts`) — **one batched, React-`cache()`-deduped query** that computes the current user's net (+ mixed-currency / has-expenses flags) for ALL the user's groups at once. Every badge on the page shares that single query, so the old N-heavy-CTE fan-out (one `getBalances` per card, which serialised through the `max:3` pool on cold load) is gone while Suspense streaming is preserved. `unstable_cache` tagged with every `balances-${id}` so any group's mutation refreshes the batch. Groups page still batch-fetches member IDs via `getUserMemberIds(groupIds, userId)` for role/`isAdmin`. Archived + demo cards get no badge. `TripCard` accepts `balanceBadge?: React.ReactNode`.

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
- **Mobile** — swipe left → card snaps back to 0 → glass overlay fades in (`backdrop-blur-md bg-white/75 dark:bg-slate-800/75`) → 3 large `w-14 h-14` buttons: Edit (cyan), Duplicate (slate), Delete (red). Swipe right or tap outside → overlay dismissed. Delete is **undo-first** (optimistic remove + 5s Undo toast, deferred server delete) — same pattern as the desktop `DeleteExpenseButton`. **All expense deletes (trip/nest desktop + mobile swipe, and circle wallet via `CircleExpenseList` → `DeleteExpenseButton`) use undo-first; none use `ConfirmDialog`.**

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
`components/shared/global-fab.tsx` — fixed `bottom-nav-safe right-4 z-50` FAB rendered on the Home page (only when groups exist). Cyan brand gradient `from-cyan-500 to-teal-500` + `shadow-cyan-500/35`, plain `+` glyph. **Destination-first, not type-first**: tapping the FAB opens the unified `GroupPickerSheet` directly — there is no expense/entry fan (that was confusing; "entry" is jargon). The picker disambiguates by *who/where*, and the record type is inferred from the target (group → expense flow; person → stream entry).

**Auto-hide** — `fabVisible` state + passive scroll listener. Hides (`y:96, opacity:0`) when scrolling down >8px delta; shows when scrolling up or `currentY < 80`. Wrapper is a `motion.div` with spring transition.

**`GroupPickerSheet`** — inline portal component titled "Add to…" (or "Add expense to…" when the user has no Streams). Layout is decided by the pure, unit-tested `resolvePickerSections()` in `global-fab-logic.ts` (recent tiles = top 2 non-demo active groups; remaining trips/nests/circles lists; whether the People section shows). Sections:
- **Recent** — cover-photo tiles → `GroupTile` → expense flow.
- **Groups** (Trips/Nests/Circles) — `GroupListRow` → expense flow.
- **People** — shown only when `hasStreams` (the hybrid rule: groups-only users never see it). Lazy-loads recent stream counterparts via `getRecentStreamCounterpartsAction()` on open; each `PersonListRow` → `StreamLogSheet` with `preselectedPerson` (jumps to the amount step). Always ends with a "Someone else…" / "Log a personal debt" row that opens the stream sheet on its pick-person step.

`hasStreams` is passed from `groups/page.tsx` as `streamBadge.latestUpdatedAt !== null` (reuses the already-fetched badge query — no extra DB call). Picking a **group** → `chooserOpen` (mode chooser: `LogExpenseTiles` Scan/Voice/Type) → `QuickAddSheet` with `startMode`. Picking a **person** → `streamOpen` + `streamPerson`. Uses `useSheetDismiss` + `useFocusTrap`.

**State machine**: `pickerOpen` → (group) `quickAddGroup` + `chooserOpen`/`quickAddOpen`, or (person) `streamPerson` + `streamOpen`. Separate states + 150ms open / 350ms close delays let exit animations finish before data clears.

**`QuickAddSheet` `onBack` prop** — when provided, the sheet header left side shows `← Change group` (tappable, calls `onBack`). Without it, shows plain "Add expense" label. Backward-compatible (optional prop).

### HomeGreeting
`components/shared/home-greeting.tsx` — `"use client"` personal greeting at the top of the Home page. Uses client's local time so the greeting matches the user's timezone (not server UTC). Three greetings: **☀️ Good morning** (5–11), **⛅ Good afternoon** (12–16), **🌙 Good evening** (17+, incl. late night — "Good night" omitted as it implies signoff). Renders `{emoji} {greeting}, {firstName}` in Fraunces `text-2xl md:text-3xl` — emoji prefix, no trailing 👋 (removed to avoid double punctuation). `firstName` extracted from `user.user_metadata.full_name` server-side and passed as prop; gracefully omits name if absent.

### GroupSearchInput
`components/shared/group-search-input.tsx` — `"use client"` search input. Only renders when `totalCount > 5`. Filters by querying `[data-group-card]` DOM elements and hiding those where `data-group-name` doesn't match. Also hides `[data-group-section]` elements when all their cards are hidden.

### SplitAmount
`components/shared/split-amount.tsx` — renders a currency amount with visual weight hierarchy: currency symbol at `font-medium opacity-70` (lighter) and the numeric digits at full weight. Uses `Intl.NumberFormat` + a regex split on first digit boundary. Props: `amount: number`, `currency?: string`, `className?: string`, `decimals?: number` (default 0). Use for any prominent money display (balance badges, person cards) where the symbol should recede and the number should dominate. Not a `"use client"` component — can be used in RSC. Requires `CURRENCY_LOCALE` from `lib/utils.ts` (exported).

### BadgePop
`components/shared/badge-pop.tsx` — `"use client"` Framer Motion wrapper that spring-animates its children from `scale(0) opacity(0)` to full size on mount (`scale: 1, opacity: 1`, spring stiffness 400 / damping 15, `delay: 0.05`). Use for section header icon-badge divs in RSC pages. **CSS `@keyframes` animations on SSR-rendered HTML fire during browser parse — before the user's eyes land on the page — so they are invisible.** `BadgePop` fires after React hydration (post-paint), guaranteeing the pop-in is user-visible. Wraps the `w-6 h-6 rounded-md bg-*` badge div; the `className` is applied to the `motion.div`. Do NOT use CSS `animate-badge-pop`.

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

**Submission:** all paths call `importMembersFromGroup(groupId, names[])` which handles deduplication. On success, switches to `share` mode. (Member count is unlimited on all plans since the June 2026 re-cut — no add-count cap. The "Clear network" / "Import from a group" *convenience* features remain Plus-only.)

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

---

## Component Gotchas

### CoverPhotoPicker — no `<form>` inside forms

Two tabs: **Search Unsplash** (default) and **Upload from device**. Search uses `<div>` with `type="button"` to prevent parent form submission. Flow: pick → `URL.createObjectURL` preview → `getSignedUploadUrl` action → browser calls `supabase.storage.uploadToSignedUrl()` directly (raw file, never via Vercel) → `onChange(publicUrl)`. 5 MB limit enforced client-side. Revoke object URL on upload or close. **No base64** — avoids Vercel's 4.5 MB body limit.

### iOS touch & safe-area patterns

**Long-press on TripCard** — 500ms timer, `MOVE_THRESHOLD=8px`. `touchAction:"manipulation"` removes 300ms tap delay.

**iOS body scroll-through** — `position:fixed` overlays don't block scroll on iOS Safari. `TripCardNavSheet` and `QuickAddSheet` use non-passive DOM `touchmove` listeners (React synthetic events can't `preventDefault()`). QuickAddSheet exempts its scrollable div via `scrollBodyRef`.

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

### `useFocusTrap` — every sheet/dialog must trap + restore focus (WCAG)

`hooks/use-focus-trap.ts` — `useFocusTrap(active, panelRef)`. On open: saves the trigger, moves focus into the panel (respects any inner `autoFocus`, else focuses the `tabIndex={-1}` panel container so the mobile keyboard isn't popped). Traps Tab/Shift+Tab inside the panel; on close/unmount restores focus to the trigger. **History-independent** — unlike `useSheetDismiss` it touches no `window.history`, so it is safe even on form-page sheets where `useSheetDismiss` is banned.

**Pattern for any portal sheet/dialog** (the `Sheet` primitive already does this internally; hand-rolled portals must add it):
```tsx
const panelRef = useRef<HTMLDivElement>(null);
useFocusTrap(isOpen, panelRef);
// on the panel element:
<motion.div ref={panelRef} role="dialog" aria-modal="true" aria-label="…" tabIndex={-1} style={{ outline: "none" }} …>
```

- **Nesting is handled by a module-level trap stack** — when a trapped sheet opens another (e.g. `ExpenseDetailSheet` → `DisputeForm`/`QuestionForm`, which portal OUTSIDE the parent panel), only the **topmost** trap reacts to Tab/focus-in; the lower one stays registered (so it never prematurely restores focus) and resumes when the inner closes. Keep the parent's trap `active` the whole time — do **not** gate it off, which would fire its focus-restore early (focus would jump to the page behind).
- **Nested-dialog Escape**: a nested form's own Escape handler must use **capture phase + `e.stopPropagation()`** on the Escape key so the parent sheet's `useSheetDismiss` Escape doesn't also fire and close both at once (`QuestionForm`/`DisputeForm` do this).
- Pure wrap-decision logic lives in `components/shared/sheet-focus.ts` (`resolveFocusTrap`), unit-tested. `getFocusable` uses `getClientRects()` (not `offsetParent`, which is null under a `position:fixed` panel).
- **Coverage**: the `Sheet` primitive + every hand-rolled sheet (`PaymentSheet`, `MemberProfileSheet`, `StreamSettleSheet`, `StreamForgiveSheet`, `RecordContributionSheet`, `InviteQRSheet`, `CircleReminderSheet`, `QuestionForm`, `DisputeForm`, `ExpenseDetailSheet`, `ReceiptScannerSheet`, `GroupPickerSheet`) now use it. Any **new** sheet must too.

### Receipt Scanner — `ReceiptScannerSheet` patterns

`components/expense/receipt-scanner-sheet.tsx` — full-screen portal scanner used in `AddExpenseForm`, `AddCircleExpenseForm`, and `QuickAddSheet`.

**State machine**: `idle → viewfinder → processing → results`

**Critical**: `transitionState(next)` revokes `prev.previewUrl` **only when `next.previewUrl !== prev.previewUrl`**. The `processing → results` transition reuses the same `previewUrl` — revoking it before results renders causes `ERR_FILE_NOT_FOUND` on the results `<img>`.

**Instant scan line**: `handleFileInput` creates a blob URL from the *original* file immediately and transitions to `processing` (showing the scan line at once), then compresses + extracts GPS in parallel. After compression, `setState` swaps `file: compressed, gps` without changing `previewUrl` — so display stays smooth.

**Two files, two purposes**: `startProcessing(originalFile, proofFile, gps, previewUrl)` takes both the **original** capture/upload and the **compressed** copy. The AI gets the original (tiled — see below) so long receipts stay full-resolution; the compressed `proofFile` is what's stored when "Keep as proof" is on. Don't conflate them — passing the compressed file to the AI re-introduces the legibility loss tiling exists to avoid.

**Long-receipt tiling** (`prepareReceiptImages` in `lib/image-utils.ts` + `planReceiptTiles` in `lib/receipt/tile-plan.ts`): the AI path no longer uses `fileToBase64`. `prepareReceiptImages(originalFile)` returns `string[]` of base64 JPEG data URLs — **one** ~800px-wide image for normal photos, or **2–4 overlapping vertical tiles** for tall receipts (aspect ratio > 2.5). Each tile is kept under the vision API's ~1568px / 1.15 MP cap (otherwise the API downscales a long receipt until the line items are illegible). `parseReceiptWithAI` takes `base64Images: string[]`, sends one image block per tile, and — when tiled — instructs Haiku that the images are top-to-bottom segments of one receipt (merge items, read the grand total from the segment that has it, don't double-count the overlap). `tile-plan.ts` is pure geometry, unit-tested in `lib/receipt/tile-plan.test.ts`. `max_tokens` is 3072 (a long itemised/merged receipt overflows the old 1024); the race timeout is 12s single / 18s multi-tile. Tuning knob for merge quality = the multi-tile prompt text in `parse-receipt.ts`.

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

**Expense `receiptUrl` + detail sheet**: `expenses.receiptUrl` (DB: `receipt_url text`) stores the Supabase Storage object URL. The `receipt-photos` bucket is **PRIVATE** (receipts are financial documents), so the detail sheet never renders the stored URL directly — `ExpenseDetailSheet` calls `getReceiptViewUrl(expenseId)` (`app/actions/update-expense-media.ts`) on open, which verifies group membership then mints a 1-hour **signed URL** via the service-role client (bypasses storage RLS). The "Receipt" section (cyan Paperclip header) shows a spinner placeholder until the signed URL resolves, then the thumbnail + "Tap to open full size" link. `getReceiptViewUrl` extracts the in-bucket path from either a full (legacy public) URL or a bare path, so existing rows keep working. `updateExpenseMedia` writes the URL after background upload; uploads use signed upload tokens (work on a private bucket).

### Expense Map View — `expense-map-view.tsx` patterns

`components/expense/expense-map-view.tsx` — fourth expense list mode (trips only): Mapbox GL pins with Supercluster clustering and an animated `line-trim-offset` route path. **One view, always cinema** (per `MAP_CINEMA_PLAYER_PLAN.md`): the card is a launcher only (all pins, full route, "▶ Replay Journey" button, no scrubber); tapping it opens a full-screen **cinema player** with an establishing shot, a segmented day bar / range scrubber, step chevrons, play/pause, a top milestone caption (payer line included), and a closing epilogue. `lib/expense/map-helpers.ts` holds the pure helpers (emoji lookup, truncation, haversine distance, spread-out detection, `buildAllDayStops`/`buildScrubPositions`/`getPayerNames` — all unit-tested in `lib/receipt/phase6-map.test.ts`).

**`mapGeneration` counter — required for every effect that touches `mapInstance.current`**: a theme toggle destroys the old `mapboxgl.Map` and recreates it (`setMapReady(false)` → async rebuild → `setMapReady(true)`). If the new map's `"load"` fires fast enough (cached style/tiles) to land in the same React batch, React can collapse `true → false → true` into a perceived no-op — dependent effects never see `mapReady` change and stay bound to the destroyed instance (blank map, esp. visible after a dark-mode switch). `mapInstance.current` is a ref, so mutating it doesn't trigger re-renders either. Fix: bump a `mapGeneration` counter in the `"load"` handler (alongside `setMapReady(true)`) and include it in **every** effect's dependency array that reads `mapInstance.current` (markers/clustering, trip-path setup, reveal-path, pan-toward-day) — a counter increment can never be collapsed away by batching.

**Tear down before recreate — guards React Strict Mode double-invoke**: `initMap`'s body resumes asynchronously after `import("mapbox-gl")` resolves, so a stale call can still be in flight when a fresh one starts (dev-mode StrictMode double-mounts). Without a guard, two live `Map` instances can attach to the same container — the second's internal DOM setup wipes the first's canvas out from under it, orphaning any markers already `.addTo()`'d on it. Always check `if (mapInstance.current) { …remove markers, mapInstance.current.remove(), mapInstance.current = null… }` at the top of `initMap`'s async resolution, before constructing the new `Map`.

**Day-scrub camera always uses `fitBounds`, never `easeTo`-to-centroid**: a plain ease-to-midpoint fails for spread-out same-day pairs (Chennai lunch + Delhi dinner averages to open country) and close pairs (T. Nagar + Marina stay clustered because zoom doesn't change). `fitBounds` frames the day's pins snugly, which for close pairs pushes past Supercluster's clustering radius so chips "bloom". `isSpreadOut(locs)` (50km threshold) only changes `padding`/`maxZoom` — never the choice between `fitBounds` and `easeTo`.

**Duplicate-coordinate marker offset**: two expenses at the exact same lat/lng stack past Supercluster `maxZoom`. `render()` tracks `seenAt: Map<coordKey, count>` and applies diagonal `Marker` `offset` (`[idx * 16, idx * -12]`) to fan them into a readable stagger.

**Mapbox Standard style — custom layer colours need `*-emissive-strength`, not just `slot`**: `slot: "top"` controls draw order only — does NOT exempt layers from Standard's scene-wide lighting/fog colour-grading. Fix: `"line-emissive-strength": 1` makes a layer self-illuminated with its authored colour, independent of scene lighting. **Any custom layer whose colour must render true across `lightPreset`s needs this**, not just `slot`.

**Trip-path traveled vs upcoming**: `trip-path` (solid emerald overlay, `line-trim-offset` growing from start) = "traveled"; `trip-path-bg` (dashed amber full-route background) = "upcoming". The layering IS the contrast — no sync logic needed. Palette is theme-aware: brighter emerald-400→300→200 + amber-300 for dark; deeper emerald-700→600→500 + amber-600 for light.

**Cinema player state model**: `cinemaOpen` (replaces the old `cinemaMode` toggle — the card is always reachable, cinema is the only "play" surface), `establishingShot`, `autoplayComplete` (deliberately NOT the same as `scrubDate === null` — the ⊞ Overview button also nulls `scrubDate` on demand and must NOT pop the epilogue, which is reserved for autoplay actually finishing), and `manualSubStepRef` (set to `stopIdx + 1` by every manual jump — drag/chevron/segment-tap/`goToDay1` — immediately before changing `scrubDate`; consumed once by the render-time sub-step reset, then cleared). `scrubToPosition(date, stopIdx)` is the single low-level "jump to this exact stop" primitive everything funnels through; same-day jumps set `scrubSubStep` directly (changing `scrubDate` to its own value is a no-op in React, so the reset block never re-fires for those).

**Per-stop sequencer is now pause-aware (two effects, not one)**: an autoplay walk through a multi-stop day used to run via a single self-perpetuating `setTimeout` chain keyed only on `[scrubDate, subStepCount]` — completely blind to `isPlaying`, so pausing mid-walk only stopped the day-to-day advance while the in-progress per-stop reveal kept ticking until the day finished (confirmed in testing). Fixed by splitting it: Effect 1 decides ONCE per arrival (deps `[scrubDate, subStepCount]` only) whether this is a fresh autoplay arrival eligible to walk — stashed in `isAutoWalkRef` so the decision survives later `isPlaying` toggles. Effect 2 does the ticking and IS reactive to both `scrubSubStep` and `isPlaying` — schedules exactly one step `SUB_STEP_MS` ahead when walking-and-playing, otherwise no-ops (freezing in place); resuming re-fires it, which reads the current (paused-at) `scrubSubStep` and continues from there. `SUB_STEP_MS = 2600` — unified from two separate manual(1100)/cinema(2600) constants since manual navigation is now always instant (no timer at all), so only autoplay's tile-load-friendly pace matters. `ZOOM_CINEMA_CLOSEUP = 16` is reserved for arrivals where lingering close on ONE place IS the story (single-stop days, gap-day holds) — multi-stop per-stop walks use the gentler `ZOOM_CINEMA_MULTISTOP_WALK = 14` instead, so touring several nearby stops in one city doesn't yo-yo the camera to street-level on each one (confirmed disorienting in testing; loses "where am I in the city").

**Nested sheet gotchas inside the cinema overlay** (`ExpenseDetailSheet` opened from a pin tap while cinema is open):
- **Don't use `useSheetDismiss` for the cinema container itself** — `ExpenseDetailSheet` already uses that hook internally, and two independent instances both listening to the same global `popstate` (neither aware of the other's pushed history entry) cross-talk: closing — or, in dev Strict Mode, the double-invoked mount/cleanup/mount of — the inner sheet's effect pops its own entry, and the resulting `popstate` also reaches cinema's listener, exiting the whole cinema. Cinema's dismiss is hand-rolled instead, gating Escape/popstate reactions on `!selectedExpenseIdRef.current` (a ref mirroring `selectedExpenseId`) so a nested sheet's pop is left for IT to consume — mirrors how `useFocusTrap`'s stack already defers to the innermost trap.
- **z-index**: cinema sits at `z-[100]` (deliberately above the app's normal `z-50` sheet tier, so the full-screen takeover reliably covers nav bars). `ExpenseDetailSheet` accepts an optional `zIndexClass` prop (default `"z-50"`) — pass `"z-[110]"` when rendering it from inside cinema, or it renders fully functional but invisible, hidden behind the opaque overlay (confirmed in testing — looked like "the sheet isn't opening").

**Controls-row layout**: anchor fixed-width elements (day label, ⊞ Overview) to the row's ends; wrap the variable-content button cluster in its OWN `flex-1 justify-center` div. Putting `flex-1` directly on a label between two button groups lets it eat all the slack itself, shoving the whole cluster to one side and stranding the far element alone at the screen edge on a wide viewport (confirmed in testing — read as "the button is missing").

**Seed**: `pnpm seed:panindia` creates "Pan-India Explorer 2026" — 18 located expenses across 7 days covering every map scenario (close pairs, same-city clusters, cross-country same-day spread).

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
