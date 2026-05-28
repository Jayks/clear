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

### TripTimeline — rich day-by-day summary timeline
`components/trip/trip-timeline.tsx` — `"use client"` component used on the public summary page (`/summary/[token]`).

Data shape: `{ days: DayGroup[], startDate, endDate, currency }` where `DayGroup = { date, entries: { description, category, amount, payerName }[], dayTotal }`.

Each `DayCard` (inner sub-component) renders on scroll via `useInView`:
- Animated connector thread between cards
- Card with dominant-category hex tint at 7% opacity
- Header row: node dot · Day X/Y badge · formatted date · count-up day total
- Payer chips row: unique payers √-scaled by spend share (area ∝ amount); colors from `PAYER_COLORS` by index; tooltip shows name + amount
- Stacked category bar (center-expand, visual-only — no click handler on summary page)
- 🔥 busiest day / "light day" intensity captions
- Always-expanded expense rows (stagger-animate in after card enters view)

No accordion — summary page is a showcase; all expense rows are always visible. `PAYER_COLORS` is a local constant (same palette as expense-filters' `MEMBER_AVATAR_COLORS`). `isBusiest` guard: only true when `spendPct === 100 && !isOff`.

### ImportMembersSheet
`app/(app)/groups/[id]/members/import-members-sheet.tsx` — `"use client"` two-step bottom sheet for bulk-copying members from another group.

Step 1 **pick-group**: list of user's other groups (fetched server-side via `getGroupsForImport`, passed as `sourceGroups` prop). Step 2 **pick-members**: member pills, pre-selected (excluding already-present names), select-all toggle.

Trigger: inline "Import from group" link (shown prominently in a cyan banner when the group has only the admin; shown as a secondary header link otherwise). Uses `useSheetDismiss`. Calls `importMembersFromGroup` server action; respects free-plan 8-member limit. Duplicate detection: `existingNames: Set<string>` passed from page; dupes rendered with `line-through opacity-35`.

### RepeatTripPrompt
`components/trip/repeat-trip-prompt.tsx` — `"use client"`. Shown on a trip group page when trip is complete or archived (admin only). Renders a dismissable prompt card + bottom sheet to create a new trip with members pre-copied.

Show condition (evaluated in group page RSC): `!isNest && isAdmin && (group.isArchived || (!!group.endDate && group.endDate < today))`.
Sheet: trip name (required), optional start/end dates, member pills (pre-selected, toggle-able). Calls `createGroup` then `importMembersFromGroup` → navigates to new group. Dismiss writes `clear_repeat_trip_dismissed_${groupId}` to localStorage.

### SettledCelebration
`components/settlement/settled-celebration.tsx` — `"use client"`. 30-piece CSS confetti burst that fires **once per browser session** when all group debts are cleared (placed just above the "All settled ✓" empty state in `BalancesSection`).

Gated by `sessionStorage.getItem(`clear_settled_confetti_${groupId}`)` — writes `"1"` immediately on mount to prevent re-fire. Auto-removes after 2.5 s. Pieces: mix of 6×14 rectangles and 10×10 squares in Clear's brand palette, burst from `mt-[38vh]` to roughly align with the checkmark icon. `pointer-events-none` so it never blocks interactions.

### DebtFlowGraph
`components/settlement/debt-flow-graph.tsx` — `"use client"` pure-SVG debt-flow visualisation on the Settle Up page.

**Layout**: nodes placed via force-relaxed positions, draggable via pointer events (`onPointerDown` + `onPointerMove`). `hasDragged` ref suppresses particles while dragging to keep rendering smooth.

**Node gradients**: exact `AVATAR_COLORS` palette (8 radial gradients matching `MemberAvatar`). Creditor nodes get a soft halo ring. Node size scales with `Math.abs(net)` (clamped: min `r=22`, max `r=32`).

**Arc rendering**: quadratic bezier `M x1 y1 Q cpx cpy x2 y2`. Control point: midpoint offset by `curvature * len` in the left-normal direction. `userSpaceOnUse` linear gradients from debtor → creditor colour. Framer Motion `pathLength 0→1` draw-in on mount.

**Flow particles**: two SMIL `animateMotion` particles per arc (180° out of phase, `PARTICLE_DUR=1.8s`). Fill is a *lighter tint* of the arc colour so particles are visible on top of the stroke (`#FEF08A` amber-200 for outgoing, `#6EE7B7` emerald-200 for incoming, `#E2E8F0` slate-200 for third-party). Use `React.createElement("animateMotion", {...})` — see CLAUDE.md gotcha.

**Selection**: `selectedArc: number | null` + `selectedId: string | null`. Mutually exclusive — selecting an arc clears `selectedId`, selecting a node clears `selectedArc`. SVG background click clears both.

**Arc tap → payment scroll**: `handleArcClick(i)` calls `document.getElementById("suggestion-${i}")` → `scrollIntoView({ behavior:"smooth", block:"center" })` + 480ms-delayed cyan `box-shadow` flash (12s transition in, 0.55s out). `balances-section.tsx` must set `id={`suggestion-${i}`}` on each suggestion card div.

**3-state info bar** (below graph): arc selected → payment summary + "Settle ↓" button; node selected → member net balance + "View" link; default → hint text.

**Rules of Hooks**: the `if (members.length === 0) return null` early exit is placed BEFORE all hook calls — required because the component has many hooks.

### SettleFlowDemo
`components/marketing/settle-flow-demo.tsx` — `"use client"` static animated demo for the marketing landing page. No DB dependency — all data hardcoded (Goa 2025 trip, 5 members, 3 settlement transfers).

Shares the same `AVATAR_COLORS`, arc math (`quadPath`/`quadMid`), and particle pattern as `DebtFlowGraph`. Key difference: no drag, no selection — pure animation showcase.

**Node animation fix**: uses separate outer `<g transform="translate(x,y)">` for positioning + inner `motion.g style={{ transformOrigin:"0px 0px" }}` for scale/opacity spring. See CLAUDE.md SVG+Framer Motion gotcha.

`gradientUnits="userSpaceOnUse"` on all arc linearGradients with explicit `x1/y1/x2/y2` coordinates.

### QuickAddSheet — portal + `isOpen` prop pattern
Manages its own `createPortal` and `AnimatePresence` internally. Always pass `isOpen` boolean — never conditionally render from parent, never wrap in external `AnimatePresence`. The backdrop and sheet are direct `AnimatePresence` children (not in a Fragment). Members lazy-fetched on first `isOpen=true` via `fetchedRef`.

**`groupType` prop** — keys `useRecentCategories()` to `clear_recent_categories_trip` / `_nest`; recent category pills shown above the category select.

**Post-save UX** — button turns "✓ Saved!" → "+ Add another →" fades in after 200ms; auto-close 2000ms. "Add another" cancels timer + resets form via `setOpenCount`.

**Sticky context on "Add another"** — payer and date carry forward from the previous expense (stored in `lastPayerId` / `lastDate` refs). Amount, description, category, notes always reset. This lets users log a run of expenses quickly without re-selecting the same payer.
