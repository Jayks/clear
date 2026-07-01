# CLAUDE.md — Generic Next.js 16 + Supabase Starter

> Source of truth for Claude Code. Fill in the `[PLACEHOLDER]` sections before starting.
> Stack is locked — see Section 2. Add functional requirements in Section 1.
>
> **Reference files loaded automatically by directory (create these as the codebase grows):**
> `lib/db/CLAUDE.md` — schema, queries, algorithms · `components/CLAUDE.md` — design system, UI patterns · `app/CLAUDE.md` — routes, features, project structure

---

## 1. Project Overview

. Project Overview
✏️ Fill this section in before writing any code.

GasFlow B2B — A commercial gas cylinder booking and delivery app for agencies that onboard B2B customers, manage cylinder inventory, collect payments through UPI, and track delivery through assigned delivery personnel. Deployed on Vercel + Supabase (free tier).

Core Domain Concepts
List the 3–6 core entities or "contexts" your app operates on. For each, describe:

What it represents

Its key properties / lifecycle

Terminology that must stay consistent across UI copy and code

Customer — A registered B2B customer account that can place commercial cylinder orders. Key properties include business name, contact person, phone number, delivery address, caution deposit status, login status, cylinder eligibility limit, and active/inactive state. Use Customer consistently for the buying business account, not “user” in business workflows.

Cylinder Inventory — The available stock of commercial gas cylinders maintained by the agency. Key properties include cylinder type, total stock, available stock, reserved stock, delivered stock, and stock adjustment history. Use Inventory for stock records and Cylinder Type for the size variants: 15 Kg, 17 Kg, and 20 Kg.

Booking Order — A customer request to book one or more cylinders. Its lifecycle moves through draft, pending payment, payment pending confirmation, confirmed, assigned, out for delivery, delivered, cancelled, or rejected. Use Order for the transaction record and Booking for the customer-facing action.

Payment — A payment attempt and confirmation record tied to an order, initiated through a UPI deep link. Key properties include order reference, amount, UPI link, payment reference ID, payer-reported status, admin confirmation status, and timestamps. Use Payment Pending Confirmation consistently for the state after customer payment but before admin confirmation, because UPI return from the PSP app does not always guarantee final merchant-side confirmation.

Delivery Assignment — The mapping of a confirmed order to a delivery person for fulfillment. Key properties include assigned delivery person, assigned date, dispatch status, delivery remarks, delivery timestamp, and proof-of-delivery fields if later added. Use Delivery Assignment for dispatch operations and Delivered only after the delivery person updates completion.

Caution Deposit — The refundable onboarding deposit collected before enabling a customer for ordering. Key properties include deposit amount, deposit date, payment mode, receipt/reference number, status, and notes. Use Caution Deposit consistently and do not mix it with order payment terminology.

Term	Meaning
Customer	- A B2B business customer account registered with the agency, not just any app user.
Booking	- The customer action of requesting cylinders; creates an Order record in the system.
Order	- The system transaction record for a booking, payment, and delivery lifecycle.
Cylinder Type	- The stock-keeping category for commercial cylinders, specifically 15 Kg, 17 Kg, or 20 Kg.
Eligibility Limit	- The admin-defined maximum number of cylinders a specific customer is allowed to order.
Caution Deposit - 	The onboarding deposit collected before a customer becomes active for booking.
Payment Pending Confirmation	- Status shown after customer completes a UPI payment attempt and returns to the app, but before merchant-side confirmation or admin approval.
Confirmed	Status - indicating that payment has been verified and the order is approved for fulfillment.
Delivery Assignment	- The operational mapping of a confirmed order to a delivery person.
Delivered - 	Final fulfillment status updated by the assigned delivery person after handover.


The app is a commercial gas cylinder booking and distribution system for a booking agency that stocks cylinders and fulfills orders through delivery personnel to B2B customers. It must support customer onboarding, order booking, payment via UPI deep link, admin approval, inventory management, and delivery confirmation.

The system should operate with three personas: Admin, Customer, and Delivery Person. Each persona has a separate login experience and permission set.

2. Business objective
The app should help the agency manage the full order lifecycle from customer registration to payment confirmation and final delivery. The key business goals are accurate inventory tracking, controlled customer ordering limits, visibility of payment status, and proof of delivery.

The workflow should also reduce manual reconciliation by keeping booking, payment, stock, and delivery status in one system.

3. Personas and access
Persona	Primary purpose	Core permissions
Admin	Manages customers, stock, orders, payments, and delivery assignment	Full access to master data, approvals, inventory, reports, and config
Customer	Places cylinder orders and tracks status	View stock, book cylinders, pay, and track order status
Delivery Person	Marks assigned cylinders as delivered	View assigned deliveries and update delivery status
The customer must authenticate using phone number and OTP. UPI intent flows commonly hand control to a PSP app and then return the user to the merchant app, while the final payment state should be verified server-side before confirming the order.

4. Scope of features
Customer-facing features
Manual or online onboarding form.

Caution deposit collection during onboarding.

Login using mobile number and OTP.

View available cylinder stock by type: 15 kg, 17 kg, and 20 kg.

Place booking for eligible number of cylinders.

Initiate payment through deep UPI link, especially for GPay.

See payment status as pending, confirmed, or failed.

Track delivery status as assigned, out for delivery, and delivered.

Admin features
Manual customer onboarding.

Record and manage caution deposits.

Configure maximum cylinders allowed per customer.

Maintain inventory and reduce stock on booking.

Confirm receipt of payments after customer reports payment.

Approve or reject bookings if needed.

Assign delivery personnel.

Track customer-wise order counts and limits.

Delivery-person features
View assigned deliveries.

Update delivery status after handover.

Capture delivery completion timestamp and optional remarks.

5. Customer flow
The customer onboarding flow starts with a form that captures identity and business details, then records a caution deposit and creates a login record. After onboarding, the customer can log in using phone number and OTP.

The customer can view available stock for 15 kg, 17 kg, and 20 kg cylinders, select a quantity within the configured limit, and submit the order. The system should then create an order in pending-payment status and initiate UPI payment using a deep link.

After the customer pays in GPay or another UPI app, the app should return to the booking app with a pending confirmation message. The order should remain pending until the admin verifies receipt, after which the customer sees the status as confirmed.

6. Delivery flow
Once an order is confirmed, the admin assigns it to a delivery person. The delivery person can view the assigned order list and mark cylinders as delivered after successful handover.

When the delivery person updates the record, the customer order status should change to delivered immediately or after admin validation, depending on your preferred control model. The customer should be able to see the live delivery status in the app.

7. Admin flow
Admin should be able to manually register customers using a dedicated form and store caution deposit details. Admin should also be able to maintain customer eligibility rules, including maximum cylinders per order and/or per customer.

Admin should have stock management tools to add, reduce, adjust, and audit inventory. The system should decrement stock when an order is reserved or confirmed, based on the business rule you choose.

Admin should also be able to verify payment after the customer reports payment, mark the payment as received, and change the booking to confirmed. This is aligned with UPI intent flows where the customer is redirected back to the merchant app and final status is reconciled through server-side validation or notification.

8. Functional requirements
ID	Requirement	Priority
FR-01	Admin shall create customer accounts manually through a form.	High
FR-02	System shall store customer caution deposit amount and date.	High
FR-03	Customer shall log in using mobile number and OTP.	High
FR-04	Customer shall see available cylinder stock by type.	High
FR-05	Admin shall configure max cylinders allowed per customer.	High
FR-06	Customer shall book only within allowed quantity limits.	High
FR-07	System shall create an order record before payment.	High
FR-08	System shall generate a UPI deep link for payment.	High
FR-09	App shall return to booking app after payment attempt.	High
FR-10	Order shall remain pending until admin confirmation.	High
FR-11	Admin shall confirm or reject payment.	High
FR-12	Delivery person shall update delivery completion.	High
FR-13	Customer shall see order status changes in real time or near real time.	High
FR-14	Admin shall manage inventory quantities and adjustments.	High
FR-15	Admin shall view customer-wise order history and cylinder counts.	Medium
9. Data entities
The system should maintain at least the following entities:

Customer.

Customer login session / OTP verification record.

Cylinder inventory item.

Order.

Order line item.

Payment transaction.

Caution deposit.

Delivery assignment.

Delivery completion record.

Admin configuration settings.

Important operational fields should include customer phone number, business name, address, cylinder type, quantity, booking date, payment status, delivery status, and audit timestamps.

10. Business rules
A customer can order only the number of cylinders allowed by admin configuration.

A booking should not exceed available inventory.

A caution deposit must be recorded before the customer becomes active.

Payment should be marked confirmed only after admin verification or trusted payment confirmation.

Delivery can be marked completed only by the assigned delivery person or admin.

Inventory must be adjusted consistently with booking and cancellation rules.

Customer order history should be preserved for audit and limit enforcement.

These rules fit a gas distribution system where stock control, delivery tracking, and billing are core functions.

11. Payment requirements
The app should support UPI payment via deep link, especially for Google Pay. The payment flow should create a transaction, launch the UPI app, then return to the merchant app with a pending result while final confirmation is completed through admin review or backend verification.

Because UPI app return states can be incomplete or pending, the backend should store a payment reference, reconcile the amount and order ID, and only then move the order to confirmed. This matches standard UPI intent guidance that the final status should be validated server-side and treated as authoritative.

12. Suggested status model
Order status	Meaning
Draft	Customer started but did not submit
Pending payment	Order created, awaiting UPI payment
Payment pending confirmation	Customer paid, awaiting admin verification
Confirmed	Admin verified payment
Assigned	Delivery person allocated
Out for delivery	Delivery in progress
Delivered	Cylinder delivered
Cancelled	Order cancelled before completion
This status chain will give both customer and admin a clear view of the lifecycle.

13. Suggested admin configuration
The admin settings screen should allow:

Max cylinders per customer.

Max cylinders per order.

Stock threshold alerts.

Delivery assignment rules.

Payment confirmation workflow.

Caution deposit amount.

Cylinder-type-wise inventory counts.

A good first version should also support audit logs for every inventory adjustment, payment verification, and status change.

14. Non-functional needs
The app should keep customer and payment data secure, especially OTP data, payment references, and inventory records. It should also be simple enough for field delivery staff to use on low-complexity mobile devices, since delivery confirmation is a core operational step.

The system should be built so that inventory and booking records do not drift apart, meaning every booking, cancellation, or delivery update should create an audit trail. That will help prevent stock mismatch and support reconciliation.


Navigation Model
Describe top-level nav destinations and what each contains.

Home (/) — Role-based landing page that shows quick actions and status summaries. For customers, it shows stock visibility, recent orders, and payment/delivery statuses; for admins, it shows operational metrics, pending confirmations, low stock, and delivery queue; for delivery personnel, it shows assigned deliveries and pending completions.

Login (/login) — Phone-number-based login entry point for customers using OTP, with separate secure admin and delivery login pathways if needed. This page also supports role routing after authentication.

Customer Onboarding (/onboarding) — Form used by admin for manual registration and optionally by customers for online onboarding. It captures business profile, address, phone number, caution deposit details, and account activation information.

Inventory (/inventory) — Admin inventory workspace showing stock by cylinder type, stock adjustments, reservation impact from orders, and low-stock visibility. Customers may see a read-only stock availability version instead of the full management screen.

Orders (/orders) — Central order management page. Customers can create and track bookings here, admins can review and update order/payment status, and delivery personnel can view assigned orders relevant to them.

Payments (/payments) — Payment tracking workspace for UPI payment initiation, customer-reported payment attempts, admin confirmation queue, and reference-level reconciliation. The app should store an internal bill/order reference and track payment confirmation server-side or by admin verification instead of trusting app return alone.

Deliveries (/deliveries) — Delivery operations area for assignment, dispatch tracking, delivery completion updates, and delivery status visibility for customers and admins.

Admin Settings (/admin/settings) — Configuration screen for customer eligibility limits, max cylinders per order/customer, onboarding rules, cylinder master data, and operational settings.

## 2. Tech Stack (LOCKED — do not substitute without asking)

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 16 (App Router, TypeScript) | |
| Styling | Tailwind CSS v4 | CSS-first config, no `tailwind.config.ts` |
| UI | shadcn/ui | Uses **@base-ui/react** (not Radix) — see gotchas |
| Animation | Framer Motion 12 | Subtle only |
| Charts | Recharts 3 | Analytics/dashboard pages only |
| Icons | lucide-react | |
| AI | @anthropic-ai/sdk | Use latest claude model in your category — see gotcha |
| Database | Supabase Postgres | Free tier |
| Auth | Supabase Auth (Google OAuth) | @supabase/ssr v0.6 |
| Realtime | Supabase Realtime | `postgres_changes` → `router.refresh()` |
| ORM | Drizzle 0.45 / drizzle-kit 0.31 | |
| Validation | Zod 3 | |
| Forms | react-hook-form 7 + zodResolver | |
| Toasts | sonner 2 | |
| Date utils | date-fns 4 | |
| Theme | next-themes 0.4 | ThemeProvider in root layout |
| Deployment | Vercel | |

**Notifications**: `web-push 3.6.7` (server-only, dynamic import required — see gotchas)

**Email**: Resend via raw `fetch` — **never** the `resend` npm SDK (see gotchas)

**Dev tools**: `tsx`, `dotenv`, `vitest`

**Do NOT add**: NextAuth, Prisma, Redux, MUI, Chakra, Bootstrap, styled-components, tRPC, Pusher/Ably.

---

## 3. Critical Gotchas

> These are stack-level facts that burned us in production. Read before touching any related code.

### shadcn/ui uses @base-ui/react, NOT Radix

- **No `asChild` prop** — use `render` prop instead: `<Button render={<Link href="..." />}>`
- Button as Link needs `nativeButton={false}`: `<Button render={<Link href="..." />} nativeButton={false}>`
- Prefer plain styled `<Link>` for nav buttons to avoid `nativeButton` complexity.
- **`DropdownMenuLabel` must be inside `DropdownMenuGroup`** — `Menu.GroupLabel` throws `"MenuGroupRootContext is missing"` if used standalone; use a plain styled `<p>` for non-interactive header text instead.

### DB Singleton (prevents HMR connection exhaustion)

```typescript
// lib/db/client.ts
declare global { var _pgClient: postgres.Sql | undefined; }
const client = globalThis._pgClient ?? postgres(connectionString, { prepare: false, max: 3 });
if (process.env.NODE_ENV !== 'production') globalThis._pgClient = client;
```

### proxy.ts (Next.js 16 — replaces middleware.ts)

Next.js 16 renamed `middleware.ts` → `proxy.ts` with a `proxy` export (not `middleware`).

```typescript
// proxy.ts
export function proxy(request: NextRequest) { … }
export const config = { matcher: ['/dashboard/:path*', '/settings/:path*', …] };
// Use an explicit route list — NOT the old catch-all regex.
```

Protected routes are listed explicitly in `config.matcher`. Public routes (e.g. `/join`, `/pay`) must be carved out.

### Auth pattern — always use `getCurrentUser()`, never raw `getUser()`

```typescript
// lib/db/queries/auth.ts
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
});

// ✅ correct — deduplicated, one validated network call per render
import { getCurrentUser } from "@/lib/db/queries/auth";
const user = await getCurrentUser();

// ❌ wrong — independent undeduped round trip on every call site
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
```

Never switch to `getSession()` — cookie-only, no server validation.

### Turbopack — imports after module-level code crash the worker

Any `import` statement that appears **after** a `const`, `function`, or other module-level code causes Turbopack to abort the worker on fresh compilation. The file may compile fine from a warm cache but crashes after a dep change, manifesting as a persistent 404 with `exit code 4294967295`. Keep **all** `import` statements at the very top of every file, before any code.

Common trigger: `const X = dynamic(...)` or `const X = cache(...)` placed before a subsequent `import`.

Create `scripts/find-bad-imports.mjs` to scan the project for this pattern:
```js
// scripts/find-bad-imports.mjs
import { glob } from "glob";
import { readFileSync } from "fs";
const files = await glob("**/*.{ts,tsx}", { ignore: ["node_modules/**", ".next/**"] });
for (const f of files) {
  const lines = readFileSync(f, "utf8").split("\n");
  let seenCode = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith("//") || line.startsWith("*")) continue;
    if (line.startsWith("import ")) { if (seenCode) console.log(`${f}:${i+1} import after code`); }
    else seenCode = true;
  }
}
```

### Windows dev — TLS certificate fix

Add to `.npmrc`:
```
node-options=--use-system-ca
```
Required because Node.js 24's bundled CA may be missing intermediate certs. Do not remove.

### Supabase publishable key

`NEXT_PUBLIC_SUPABASE_ANON_KEY` uses `sb_publishable_*` format — @supabase/ssr handles it.

### Drizzle config needs dotenv on Windows

```typescript
// drizzle.config.ts
import { config } from "dotenv";
config({ path: ".env.local" });
```
drizzle-kit doesn't auto-load `.env.local` on Windows.

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
export async function sendPushNotification(…) {
  const webpush = ((await import("web-push")) as unknown as { default: typeof webpushType }).default;
  webpush.setVapidDetails(…);
}
```

### Anthropic SDK — instantiate inside the function

```typescript
// ✅ correct
export async function myAiAction() {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  // …
}
// ❌ wrong — module-level eval before env vars load
const client = new Anthropic();
```

Strip markdown fences before `JSON.parse` — Claude sometimes wraps JSON in ` ```json ``` `:
```typescript
const jsonText = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
```

### Inline `<Script>` — use `dangerouslySetInnerHTML`, not children

React 19 (used by Next.js 16) warns when a `<script>` tag appears as children inside a React component:

```tsx
// ✅ correct
<Script id="init" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: `…` }} />

// ❌ wrong — React 19 warning
<Script id="init" strategy="afterInteractive">{`…`}</Script>
```

### `scroll-behavior: smooth` — pair with `data-scroll-behavior` on `<html>`

```css
/* globals.css */
html { scroll-behavior: smooth; }
```
```tsx
// app/layout.tsx
<html data-scroll-behavior="smooth">
```
Both must be present; Next.js 16 requires the attribute to suppress the console warning.

### Error boundaries — the split between boundaries and toasts

- **Page-load failures** (RSC throws: DB unreachable, query errors) → `error.tsx` boundary → `ErrorCard` component.
- **Mutation failures** → server action returns `{ ok: false, error }` → `sonner` toast.
- **Never mix the two.** Never `.catch()` a required query into an empty result (renders a false empty state during outages). Only `.catch()`-swallow genuinely optional data (push notifications, geocoding, analytics).

`app/global-error.tsx` catches **root-layout** failures — it replaces the layout entirely, so it must render its own `<html>/<body>` with **inline styles only** (assume globals.css/Tailwind/fonts all failed). Segment `error.tsx` files render **inside** their layout — they must **not** render `<html>`.

Retry pattern:
```typescript
// error.tsx — retry must call BOTH router.refresh() AND reset()
// reset() alone does NOT refetch RSC data
const [isPending, startTransition] = useTransition();
const handleRetry = () => startTransition(() => { router.refresh(); reset(); });
```

### `useSheetDismiss` — do NOT use inside portal sheets on form pages

`useSheetDismiss` pushes `{ bottomSheet: true }` to `window.history` on open and calls `window.history.go(-1)` on close. In Next.js 16, `go(-1)` triggers a `popstate` event — for the **same URL** (e.g. `/items/new`) the App Router interprets this as a navigation and triggers a full RSC refresh, wiping form state.

**Rule**: Use `useSheetDismiss` only in sheets at the root nav level. In sheets rendered inside a `<form>` page, add Escape key handling directly without touching `window.history`.

**Second gotcha — Link inside a sheet that also calls `onClose()` races the async pop.** The `history.go(-1)` is async; if a click handler both closes the sheet AND triggers a `<Link>` forward navigation on the same click, the delayed pop can silently undo the navigation. Fix: skip `onClose()` on in-sheet nav links and use `router.replace(href)` directly.

### Back navigation — deterministic push, not `router.back()`

- **`BackButton`**: always pushes its known `href` (`router.push(href)`) rather than popping browser history.
- **Form save-handlers** for pages reached by pushing forward (edit pages, add pages): call `router.back()` on successful save — NOT `router.push`/`router.replace` to the same list URL, which writes a duplicate history entry (native back button's first press "does nothing").
- **New entity forms** that navigate to a brand-new URL after creation: use `router.replace(newUrl)` — correct because the new URL was never in history.

### Portal sheets — `GroupBottomNav`-style portal mounting guard

When portaling a component to `document.body` that also has Framer Motion animations, guard mounting with `useState(false)` + `useEffect`:
```tsx
const [mounted, setMounted] = useState(false);
useEffect(() => setMounted(true), []);
if (!mounted) return null;
```
**Never use `typeof document !== "undefined"`** for this — it's `true` on the client during hydration, causing a React hydration mismatch and full client re-render.

### SVG + Framer Motion `transform` conflict

Never put both an SVG `transform` attribute AND Framer Motion animation props on the same `motion.g`. Use two wrappers:

```tsx
// ✅ correct
<g transform={`translate(${x}, ${y})`}>
  <motion.g style={{ transformOrigin: "0px 0px" }} initial={{ scale: 0 }} animate={{ scale: 1 }}>
    {/* content at local (0,0) */}
  </motion.g>
</g>

// ❌ wrong — Framer Motion overrides the SVG transform, collapsing the node to (0,0)
<motion.g transform={`translate(${x}, ${y})`} initial={{ scale: 0 }} animate={{ scale: 1 }} />
```

### SVG SMIL animation elements — use `React.createElement`

JSX types don't expose `path` on `<animateMotion>`. Use `React.createElement`:

```tsx
import React from "react";

<circle r={3} fill="#06B6D4">
  {React.createElement("animateMotion", { path: arcPath, dur: "2s", repeatCount: "indefinite" })}
  {React.createElement("animate", { attributeName: "opacity", values: "0;1;0", dur: "2s", repeatCount: "indefinite" })}
</circle>
```

### iOS body scroll-through on overlays

`position:fixed` overlays don't block scroll on iOS Safari. Use non-passive DOM `touchmove` listeners (React synthetic events can't `preventDefault()`):

```typescript
useEffect(() => {
  if (!isOpen) return;
  const prevent = (e: TouchEvent) => e.preventDefault();
  document.addEventListener("touchmove", prevent, { passive: false });
  return () => document.removeEventListener("touchmove", prevent);
}, [isOpen]);
```

---

## 4. Architecture Principles

1. **Server-first**: RSC by default. `"use client"` only for state, effects, browser APIs, charts.
2. **Server Actions for mutations**: `app/actions/*.ts`. No REST routes for internal CRUD.
3. **Drizzle only for DB reads/writes**. Supabase JS only for Auth + Realtime.
4. **RLS everywhere**: All tables. `drizzle/policies.sql` is the source of truth.
5. **Pure functions for domain math**: `lib/[domain]/compute.ts` — never touch DB inside these.
6. **Shared Zod schemas**: same schema for form (zodResolver), server action input, and DB insert.
7. **Optimistic UI via useState**: `removedIds: Set<string>` state, rolls back on server error.
8. **Realtime via router.refresh()**: subscribe to `postgres_changes` → call `router.refresh()` in the handler. **Disable in dev** (consumes Supabase free-tier CPU). Production only — gate with `process.env.NODE_ENV === "production"`.
9. **Auth via shared `getCurrentUser()`**: React-`cache()`-wrapped, shared across the whole RSC render tree.
10. **Config pattern for entity-type branching**: put all differences between entity types in a single `lib/entity-config.ts` — never inline `entity.type === 'x'` checks across files.
11. **Error handling split — boundaries vs toasts**: see gotchas above.

---

## 5. Coding Conventions

### Server Actions
```typescript
// Return shape — always one of these two, never throw to client
{ ok: true, data: T }
{ ok: false, error: string }
```

### Cache invalidation
```typescript
// revalidatePath — layout variant invalidates the whole subtree
revalidatePath(`/items/${itemId}`, "layout");

// revalidateTag — always two args in Next.js 16
revalidateTag(`item-${itemId}`, "max");
```

### File naming
- kebab-case for all files
- No barrel files (`index.ts` re-exports)

### Money
- `numeric(12,2)` in DB, `number` in TypeScript
- Format with a shared `formatCurrency(amount, currency)` utility
- Never do money arithmetic on floats — round at display only

### Dates
- `date` type in DB (no time component unless needed)
- Format with a shared `formatDate(date)` utility

### Member / user display names
- Always resolve through a single `getDisplayName(member)` helper — `displayName ?? fallback ?? "Member"`. Never access the name property directly.

### Dark mode
- Every colour class needs a `dark:` counterpart
- Never use raw hex colours in JSX — go through Tailwind classes or CSS variables

### Typography
- Display font: `style={{ fontFamily: "var(--font-display)" }}` — never a Tailwind class (font variables are not available as Tailwind utilities by default in v4)
- Body: Inter or system-ui via `--font-body`
- Numbers: `font-variant-numeric: tabular-nums` for all money/count displays

### Mobile tap targets
- Back/nav links: `min-h-[44px]`
- Icon buttons in lists: `w-11 h-11 sm:w-7 sm:h-7`

### Haptic feedback
Create `lib/haptics.ts` with `hapticLight()`, `hapticSuccess()`, `hapticDelete()` that call `navigator.vibrate()` (no-op when unavailable). Call at the success branch, before `toast.success`.

### Toast position
```tsx
// app/layout.tsx
<Toaster position="bottom-center" />
```
Centered above the mobile nav, thumb-reachable on all screen sizes.

### Pagination
Prefer client-side Prev/Next (10/page) over "Load More" for list pages. Only activate pagination for lists over a configurable `PAGE_ALL_THRESHOLD` (e.g. 20 items).

### `AnimatedList` pattern
Wrap card/item lists with a CSS-keyframe-driven `AnimatedList` component (stagger delay via `--list-delay` CSS custom property, capped at item 8 so long lists never take >640ms). Use `CollapsibleList` (Framer Motion `AnimatePresence` + `layout`) when items can be optimistically removed.

### Section headers
Use a consistent pattern: icon badge + label + gradient rule line. Pick an accent colour per section (e.g. amber=analytics, emerald=success/settled, violet=members, cyan=primary, slate=neutral).

```tsx
<div className="flex items-center gap-2.5 mb-4">
  <div className="w-6 h-6 rounded-md bg-cyan-50 dark:bg-cyan-900/30 flex items-center justify-center shrink-0">
    <Icon className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
  </div>
  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</span>
  <div className="flex-1 h-[1.5px] bg-gradient-to-r from-cyan-200/70 to-transparent dark:from-cyan-800/40 dark:to-transparent" />
</div>
```

### App nav bars are transparent
In-app nav bars use `backdrop-blur-sm` (no background). Marketing/public nav bars use a frosted `.glass-nav` class. Never apply `.glass-nav` to in-app navbars.

### Form pages — no `max-w-xl` constraint
Form pages (`new/`, `edit/`) do NOT use `max-w-xl mx-auto` — they inherit the app layout's natural width. Only the app's outer `<main>` has a `max-w` constraint.

### Safe-area CSS utilities
Define these in `globals.css` **outside** `@layer` (Turbopack rejects `@media` nested inside `@layer`):
```css
.h-nav-safe   { height: calc(4rem + env(safe-area-inset-bottom)); }
.pb-safe-nav  { padding-bottom: calc(5rem + env(safe-area-inset-bottom)); }
.bottom-nav-safe { bottom: calc(5rem + env(safe-area-inset-bottom)); }
```

---

## 6. Design System

### Palette
```css
/* Define your primary in globals.css */
--primary: #0891B2;  /* example: cyan-600 */
/* Body gradient (light) */
.light body { background: linear-gradient(135deg, #EFF6FF, #ECFEFF, #F0FDFA, #ECFDF5); }
/* Body gradient (dark) */
.dark body  { background: linear-gradient(135deg, #0D1B2A, #0A1F2C, #0A2228, #0C2024); }
```

### Glass utilities
```css
.glass     { background: rgba(236,243,250,0.55); backdrop-filter: blur(20px); border: 1px solid rgba(203,213,225,0.45); box-shadow: 0 8px 32px rgba(8,145,178,0.08), 0 1px 0 rgba(255,255,255,0.45) inset; }
.glass-sm  { background: rgba(236,243,250,0.45); backdrop-filter: blur(12px); border: 1px solid rgba(203,213,225,0.40); }
.glass-nav { background: rgba(255,255,255,0.88); backdrop-filter: saturate(180%) blur(20px); border-bottom: 1px solid rgba(255,255,255,0.9); }
.dark .glass     { background: rgba(15,23,42,0.75); border: 1px solid rgba(51,65,85,0.6); }
.dark .glass-sm  { background: rgba(15,23,42,0.65); border: 1px solid rgba(51,65,85,0.5); }
.dark .glass-nav { background: rgba(13,18,30,0.92); backdrop-filter: saturate(150%) blur(20px); }
```

> **De-white note:** if `.glass` cards look stark white against the body, deepen the body gradient's lightness to ~92% L and make glass a cool off-white (`rgba(236,243,250,…)`) instead of pure white — cards then read as soft frosted panels.

### Dark mode conventions
```css
/* Labels */ color: text-slate-700 dark:text-slate-200;
/* Body text */ color: text-slate-500 dark:text-slate-400;
/* Inputs */ border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60;
```

### Primary button
```tsx
className="bg-gradient-to-br from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white"
```

### Navigation
**Desktop**: collapsible left sidebar rail (not a top bar). Top section = primary entity type links → separator → feature nav links. Logo always links to Home. Avatar/theme toggle pinned at bottom.

**Mobile bottom nav**: 3–4 tabs with a sliding Framer Motion spring pill (`layoutId="nav-pill"`, spring stiffness 500 / damping 35). Active tab icon + label rendered `relative z-10` on top of the absolute-positioned pill.

**Within-entity mobile nav**: when inside an entity detail page, the global bottom nav hides and a contextual nav (`GroupMobileNav`-equivalent) takes over. Use `resolveNav(pathname, entityId)` that returns `{ backHref, backLabel, pageTitle }`.

**Active nav state**: use an `isNavItemActive(pathname, href, exact?)` helper — some tabs use descendant matching, the Home tab uses `exact: true` so it only lights up on exactly `/`.

---

## 7. Database Patterns

### Schema conventions
- All tables: `id: uuid PK default gen_random_uuid()`, `created_at: timestamptz default now()`
- Foreign keys always `ON DELETE CASCADE` unless you have a specific reason not to
- Money: `numeric(12,2)` — never `float` or `integer cents`
- Dates: `date` (no time) unless you genuinely need `timestamptz`
- Enums: use `text` + Zod validation, not Postgres enums (enums are hard to migrate)
- Soft delete: prefer `is_archived: boolean default false` over hard deletes for user-visible entities

### RLS template
```sql
-- drizzle/policies.sql
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

-- Members can read items in their group
CREATE POLICY "members read items" ON items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = items.group_id AND gm.user_id = auth.uid()
    )
  );

-- Only the creator (or admin) can mutate
CREATE POLICY "creator writes items" ON items
  FOR ALL USING (created_by_user_id = auth.uid());
```

### Query caching pattern
```typescript
// Wrap expensive RSC queries in unstable_cache with explicit tags
export const getItems = unstable_cache(
  async (groupId: string) => db.select(…).from(items).where(eq(items.groupId, groupId)),
  ["items"],
  { tags: [`items-${groupId}`] }
);

// Invalidate on mutation (always two args in Next.js 16)
revalidateTag(`items-${groupId}`, "max");
```

### DB singleton
```typescript
// lib/db/client.ts
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

declare global { var _pgClient: postgres.Sql | undefined; }
const client = globalThis._pgClient ?? postgres(process.env.DATABASE_URL!, { prepare: false, max: 3, idle_timeout: 20, connect_timeout: 10 });
if (process.env.NODE_ENV !== "production") globalThis._pgClient = client;
export const db = drizzle(client);
```

### Auth queries
```typescript
// lib/db/queries/auth.ts
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
});
```

---

## 8. Component Patterns

### Focus trap for sheets/dialogs (WCAG)
Every bottom sheet or modal must trap + restore focus:
```tsx
// hooks/use-focus-trap.ts — on open: save trigger, focus panel; trap Tab/Shift+Tab; on close: restore trigger
const panelRef = useRef<HTMLDivElement>(null);
useFocusTrap(isOpen, panelRef);

<motion.div ref={panelRef} role="dialog" aria-modal="true" aria-label="…" tabIndex={-1} style={{ outline: "none" }}>
```

### Sheet dismiss pattern
```typescript
// hooks/use-sheet-dismiss.ts
// Pushes a fake history entry on open so hardware back button closes the sheet.
// Pops it automatically when closed programmatically.
// Add Escape key handling.
// DO NOT use inside sheets rendered on form pages — see gotcha above.
```

### Portal guard
```tsx
// Any component that portals to document.body must guard with mounted state
const [mounted, setMounted] = useState(false);
useEffect(() => setMounted(true), []);
if (!mounted) return null;
return createPortal(<Sheet />, document.body);
```

### Optimistic UI pattern
```typescript
// Client component
const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
const visibleItems = items.filter(i => !removedIds.has(i.id));

async function handleDelete(id: string) {
  setRemovedIds(prev => new Set([...prev, id])); // optimistic
  const result = await deleteItem(id);
  if (!result.ok) {
    setRemovedIds(prev => { const next = new Set(prev); next.delete(id); return next; }); // rollback
    toast.error(result.error);
  }
}
```

### Undo-first delete (no confirm dialog)
```typescript
// Prefer undo-first over a confirm dialog for most deletes
const { dismiss } = toast("Deleted", {
  duration: 5000,
  action: { label: "Undo", onClick: () => { undoDelete(id); dismiss(); } },
});
// Deferred server delete — call only after toast expires without undo
setTimeout(() => { if (!undone) deleteItem(id); }, 5000);
```

### `BadgePop` — Framer Motion badge that fires post-hydration
CSS `@keyframes` on SSR-rendered HTML fire during browser parse — too early for the user to see. Use a Framer Motion client component for section header badges that you want to visibly pop in:
```tsx
// components/shared/badge-pop.tsx
"use client";
export function BadgePop({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <motion.div className={className} initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.05 }}>
      {children}
    </motion.div>
  );
}
```

### Swipe-to-reveal vs hover-to-reveal
Detect real touch capability, not viewport width:
```typescript
const [isTouchDevice, setIsTouchDevice] = useState(false);
useEffect(() => {
  const mq = window.matchMedia("(pointer: coarse)");
  setIsTouchDevice(mq.matches);
  mq.addEventListener("change", e => setIsTouchDevice(e.matches));
}, []);
```

---

## 9. AI Integration

### Model selection
Use the latest model appropriate to your task:
- **Fastest / cheapest**: `claude-haiku-4-5-20251001` — receipt parsing, quick NL extraction
- **Balanced**: `claude-sonnet-4-6` — summaries, multi-step reasoning
- **Most capable**: `claude-opus-4-8` — complex analysis

### Rate limiting
```typescript
// lib/rate-limit.ts — in-memory, best-effort on serverless
const calls = new Map<string, { count: number; resetAt: number }>();
export function checkAiRateLimit(userId: string, maxPerHour = 20): boolean {
  const now = Date.now();
  const key = userId;
  const entry = calls.get(key);
  if (!entry || entry.resetAt < now) { calls.set(key, { count: 1, resetAt: now + 3600_000 }); return true; }
  if (entry.count >= maxPerHour) return false;
  entry.count++;
  return true;
}
```

### Instantiation inside functions
```typescript
// ✅ always instantiate inside the action function
export async function myAiAction(input: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Unauthorized" };
  if (!checkAiRateLimit(user.id)) return { ok: false, error: "Rate limited" };

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const response = await client.messages.create({ model: "claude-haiku-4-5-20251001", max_tokens: 1024, messages: [{ role: "user", content: input }] });
  // Strip markdown fences if expecting JSON
  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const json = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return { ok: true, data: JSON.parse(json) };
}
```

---

## 10. Web Push Notifications

### Setup
```typescript
// lib/notifications/send-push.ts
import type webpushType from "web-push";

export async function sendPushToUser(userId: string, title: string, body: string) {
  const webpush = ((await import("web-push")) as unknown as { default: typeof webpushType }).default;
  webpush.setVapidDetails(`mailto:${process.env.VAPID_EMAIL}`, process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
  const subs = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
  await Promise.allSettled(subs.map(sub => webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify({ title, body }))));
}
```

### Push subscription schema
```sql
CREATE TABLE push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, endpoint)
);
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users own subscriptions" ON push_subscriptions FOR ALL USING (user_id = auth.uid());
```

---

## 11. Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=          # sb_publishable_* format
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=                           # Session Pooler URL (pooler.supabase.com:5432)

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=[YOUR_APP_NAME]

# Auth / Admin
PLATFORM_ADMIN_EMAIL=                   # comma-separated; guards /admin dashboard

# AI
ANTHROPIC_API_KEY=

# Email (Resend — use fetch, not SDK)
RESEND_API_KEY=
RESEND_FROM=                            # "AppName <noreply@yourdomain.com>"
RESEND_UNSUBSCRIBE_SECRET=              # random 32-char string for HMAC signing

# Web push (VAPID)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_EMAIL=                            # mailto:you@yourdomain.com

# Cron jobs
CRON_SECRET=                            # bearer secret; Vercel Cron sends as Authorization: Bearer

# Analytics
NEXT_PUBLIC_GA_MEASUREMENT_ID=          # G-XXXXXXXXXX from GA4; omit to disable

# Add your app-specific variables below:
# [YOUR_KEY]=
```

---

## 12. Deployment & Scripts

```bash
# Dev
pnpm dev                    # start dev server (Turbopack)
pnpm build                  # production build — do NOT run while dev server is live
pnpm typecheck              # tsc --noEmit

# Testing
pnpm test                   # vitest watch
pnpm test --run             # vitest single run (CI)

# Database
pnpm db:push                # push schema changes (use SQL Editor for tables with CHECK constraints)
pnpm db:studio              # Drizzle Studio GUI

# Utilities
node scripts/find-bad-imports.mjs   # find imports after module-level code (Turbopack crash risk)
```

> ⚠️ **Never run `pnpm build` while `pnpm dev` is live** — it corrupts the shared `.next` directory (module-factory HMR errors + PWA SW serves stale chunks). Recovery: kill dev, `rm -rf .next`, restart, hard-reload + unregister SW.

---

## 13. Working Style

- **Ask before scope creep** — new deps, new feature areas, skipping sections.
- **Run `pnpm typecheck && pnpm test` before declaring done.**
- **Read existing code first** — check `lib/utils.ts`, components, queries before writing new ones.
- **No silent failures** — every error path has a toast, boundary, or visible feedback.
- **Keep CLAUDE.md files updated** when decisions change (this file + any sub-directory CLAUDE.md files).
- **Create test cases before implementing.** Run all automatically-testable cases (unit + functional) and verify they pass before asking for user validation.
- **For user validation, present manual-only test cases ONE AT A TIME.** Ask the user to confirm each as Pass / Fail / Skip before moving to the next.

---

## 14. Project-Specific Additions

> ✏️ Add anything that doesn't fit the sections above — custom algorithms, third-party integrations, business rules, domain-specific gotchas discovered during development.

### [Feature / Domain A]

_Describe the non-obvious design decisions here._

### [Feature / Domain B]

_Describe the non-obvious design decisions here._
