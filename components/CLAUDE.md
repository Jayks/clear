# Clear — Component & Design System Reference

> Loaded when editing `components/**`, `hooks/**`, `app/globals.css`.

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
.glass-nav { background:rgba(255,255,255,0.72); backdrop-filter:blur(24px); border-bottom:1px solid rgba(255,255,255,0.8); }
.dark .glass     { background:rgba(15,23,42,0.75); border:1px solid rgba(51,65,85,0.6); }
.dark .glass-sm  { background:rgba(15,23,42,0.65); border:1px solid rgba(51,65,85,0.5); }
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
- **Desktop**: sticky top — `ClearLogo` (28px), Groups, Insights, ThemeToggle, avatar dropdown (Admin [if platform admin], Take the tour, **What's New** → `/changelog`, Settings, Sign out).
- **Mobile**: icon-only top nav + fixed `MobileNav` bottom. Content uses `.pb-safe-nav`. FAB (`bottom-nav-safe right-4 md:hidden`) on Expenses page (outer container uses `pb-24 md:pb-0` to clear FAB). MobileNav inner div uses `.h-nav-safe`.
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
- Card entrance: `opacity 0→1, y 8→0` over 200ms, stagger via `AnimatedList`
- Balance numbers: `CountUp` (Framer Motion)
- `NavProgress` (`components/shared/nav-progress.tsx`) — cyan→teal bar at top. Lives in root `app/layout.tsx`. Triggers on `<a>` clicks + custom `navprogress` window event (dispatched before `window.location.href` navigations to cross-layout routes).

#### `AnimatedList` API (`components/shared/animated-list.tsx`)
```tsx
<AnimatedList
  className="grid …"        // forwarded to outer div (supports data-tour, etc.)
  staggerMs={40}            // ms between items (default 40)
  initialDelayMs={0}        // base delay before first item — lets split lists cascade seamlessly
>
  {items.map(…)}            // children: React.ReactNode[]
</AnimatedList>
```
- `useReducedMotion()` — when OS `prefers-reduced-motion` is set, renders a plain `<div>` at full opacity (no animation, no `opacity:0` invisible-content risk).
- Stagger cap: `Math.min(i, 8)` — items 9+ all animate at item-8 delay so a 30-item list never exceeds 320ms total.
- `initialDelayMs` — use when a list is visually split across two `AnimatedList` instances (e.g. expense list first-2 inside tour spotlight, rest outside). Set `initialDelayMs={staggerMs * 2}` on the second list so the cascade feels continuous.
- Extends `Omit<React.HTMLAttributes<HTMLDivElement>, "children">` — all extra props (`data-tour`, `id`, etc.) are forwarded to the wrapper div.

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

## Key Components

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
- **Settle page** (`BalanceCardsClient`) — `netBalance` pre-populated from balance calculation; shows emerald/red banner.

Props: `member`, `groupId`, `currency`, `currentMemberId`, `netBalance?`, `isOpen`, `onClose`.
Lazy-loads stats via `fetchMemberStatsAction` on first open; resets on `member.id` change (prevents stale data across members). Escape key and backdrop close.

### SwipeableExpenseCard — responsive action reveal

`components/expense/swipeable-expense-card.tsx` — wrapper around `ExpenseCard` with two behaviour modes:

- **Desktop** — `group` wrapper; `ExpenseCard` rendered with `hoverRevealActions` prop → Edit/Duplicate/Delete buttons are `opacity-0 group-hover:opacity-100` (invisible at rest, appear on hover). Zero extra taps.
- **Mobile** — swipe left → card snaps back to 0 → glass overlay fades in (`backdrop-blur-md bg-white/75 dark:bg-slate-800/75`) → 3 large `w-14 h-14` buttons: Edit (cyan), Duplicate (slate), Delete (red). Swipe right or tap outside → overlay dismissed. Delete still goes through `ConfirmDialog`.

`ExpenseCard` props for this pattern:
- `hideActions` — hides the button row entirely (mobile: buttons are in the overlay)
- `hoverRevealActions` — wraps button row in `opacity-0 group-hover:opacity-100`

### MemberListClient / BalanceCardsClient
`app/(app)/groups/[id]/members/member-list-client.tsx` — replaces static member list. Each row is `<div role="button">` (not `<button>`) to avoid nested-button violation with `RemoveMemberButton` inside. `stopPropagation` on the actions wrapper prevents Remove button from opening the sheet.

`app/(app)/groups/[id]/settle/balance-cards-client.tsx` — balance cards grid as tappable buttons opening `MemberProfileSheet` with `netBalance`.

### QuickAddSheet — portal + `isOpen` prop pattern
Manages its own `createPortal` and `AnimatePresence` internally. Always pass `isOpen` boolean — never conditionally render from parent, never wrap in external `AnimatePresence`. The backdrop and sheet are direct `AnimatePresence` children (not in a Fragment). Members lazy-fetched on first `isOpen=true` via `fetchedRef`.

**`groupType` prop** — keys `useRecentCategories()` to `clear_recent_categories_trip` / `_nest`; recent category pills shown above the category select.

**Post-save UX** — button turns "✓ Saved!" → "+ Add another →" fades in after 200ms; auto-close 2000ms. "Add another" cancels timer + resets form via `setOpenCount`.

**Sticky context on "Add another"** — payer and date carry forward from the previous expense (stored in `lastPayerId` / `lastDate` refs). Amount, description, category, notes always reset. This lets users log a run of expenses quickly without re-selecting the same payer.
