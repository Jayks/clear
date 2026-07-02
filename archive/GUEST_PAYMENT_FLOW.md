# Guest Payment Flow — Design Spec

> **Status:** Design doc (2026-06-17). Approved scope = full parity across all contexts.
> **Reviewed:** 2026-06-17 (pass 1) — RLS leak fixed, circle/settlement asymmetry resolved, API signatures corrected, Flexi + ghost-creditor edge cases handled.
> **Reviewed:** 2026-06-17 (pass 2) — UUID type corrections, `payee_member_id` gap filled, Flexi amount collection added, §0 architectural rule corrected against actual codebase, `selfReportExternalPayment` circle dedup guard added, `getPendingRequestsForGroup` defined, `confirmExternalPayment` currency-freshness noted, `proxy.ts` change clarified. See §15 for full changelog.
> **Reviewed:** 2026-06-17 (pass 3) — dedup index multi-creditor collapse fixed (added `payee_member_id` to the key), `confirmExternalPayment` reordered behind a transient `confirming` claim to close the orphan-confirmed gap, guest-path `recorded_by`/`member_id` specified, `getDefaultUpiId` return shape corrected, circle confirm deep-link clarified as a scroll target. See §15 for full changelog.
> **Reviewed:** 2026-06-17 (pass 4) — one-time circle confirmed-check gated on `circlePeriod` (mirrors `selfReportContribution`'s `if (input.period)` guard), "already-confirmed" edge case handled at both self-report and confirm layers so `contributionId` is never null, notification target tightened to `payeeUserId`. See §15 for full changelog.
> **Reviewed:** 2026-06-18 (pass 5) — `canConfirm` tightened to admin-only (creditor can't call `recordSettlement`), `getPendingRequestsForGroup` expiry filter removed (self-reported payments must survive past token expiry), `selfReportExternalPayment` circle INSERT made atomic with status UPDATE (single transaction), null `contributionId` recovery guard added to `confirmExternalPayment`, `buildSettleRequestMessage` format specced. See §15 for full changelog.
> **Reviewed:** 2026-06-18 (pass 6) — expired-pending re-send deadlock fixed (renew-in-place on reuse), concurrent first-send unique-violation now caught + re-looked-up, circle contribution INSERT `currency` made explicit (was silently defaulting non-INR to INR), Flexi OG-image null-amount branch specced. See §15 for full changelog.
> **Confirmation policy:** Admin must confirm (self-report → `self_reported` → admin taps "Confirm").
> **Relates to:** `RAZORPAY_PLAN.md`, `stream/confirm/[token]` (the gold-standard reference).

> ### ⚠️ Core architectural rule (read before §5/§7)
> Self-report does **NOT** behave uniformly across contexts, because the pending state lives in different places:
> - **Circle** — has a native pending state (`circle_contributions.is_confirmed = false`). A token self-report **creates the unconfirmed contribution row immediately** (mirroring the existing `selfReportContribution`). `confirmExternalPayment` just flips `is_confirmed = true`. The `payment_request` is only the token/delivery envelope. → the existing roster "⏳ N awaiting confirmation" surface works with **no UI change** (Section 7 holds).
> - **Trip / Nest** — the `settlements` table already has `is_confirmed` (used by the **authenticated** `selfReportSettlement` / `confirmSettlement` path for Clear members). The `payment_requests` guest flow is a **parallel, no-auth path**: the `payment_request.status` carries the pending state for the ghost's self-report; a settlement row with `is_confirmed=true` is created only when the admin calls `confirmExternalPayment` (via `recordSettlement`, which is admin-only and always writes confirmed). Do NOT reuse `selfReportSettlement` here — it requires `getCurrentUser()`. A new "Pending external payments" surface is required (Section 7).

---

## 1. The Problem

Clear has three distinct financial contexts where money flows to/from people who may not have a Clear account (ghosts). Today:

| Context | Guest gets notified | Guest can pay via UPI | Guest can confirm outside app |
|---|---|---|---|
| **Circle** | ✅ WhatsApp reminder (admin sends manually) | ✅ `upi://` embedded in message | ❌ Dead end — admin must manually record |
| **Trip / Nest** | ❌ No flow for ghost debtors | ⚠️ Admin must manually compose share link | ❌ No path at all |
| **Stream** | ✅ WhatsApp link auto-generated | ✅ Embedded in `/stream/confirm/[token]` | ✅ `/stream/confirm/[token]` |

Stream is the only context with a complete self-service flow. The gap = **no public "I've paid" page for Circles or Trips/Nests**.

---

## 2. Two Sub-flows

### Flow A — Ghost owes money (most common)
The ghost is a group member who hasn't paid yet. Admin sends them a payment request.

```
Admin taps "Send reminder" / "Request payment"
  → Clear generates a token → builds WhatsApp message
  → Ghost receives message with:
       - What they owe + to whom
       - UPI deep-link (G Pay / PhonePe / Any UPI app picker)
       - /request/[token] URL with "I've paid" button
  → Ghost opens /request/[token] in browser (no login needed)
  → Ghost taps UPI → pays in native app → returns → taps "I've paid"
       - Optional: paste UTR/Transaction ID
  → status = self_reported
  → Admin notified: "💸 Payment reported · [Name] says they paid ₹X. Confirm →"
  → Admin taps confirm in-app → status = confirmed
       - If circle: contribution row auto-created/confirmed
       - If trip/nest: settlement row auto-created/confirmed
```

### Flow B — Ghost is owed money (less common)
A Clear user paid a ghost creditor outside the app, and needs the ghost to confirm receipt.

```
Clear user records payment in app, taps "Request confirmation from [name]"
  → Token generated → WhatsApp message sent with /request/[token]
  → Ghost opens page → sees "[X] says they paid you ₹Y for [Trip]"
  → Ghost taps "Confirm received"
  → status = confirmed (auto, no admin step needed — ghost IS the creditor)
  → Clear user notified: "✓ [Name] confirmed receipt of ₹Y"
```

**Initial implementation: Flow A only.** Flow B is low-frequency and can follow in a later pass.

---

## 3. Database Schema

### New table: `payment_requests`

```sql
-- drizzle/payment-requests.sql
CREATE TABLE payment_requests (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token              uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,

  -- Context (denormalized for public page render — no auth-protected DB joins needed)
  context_type       text NOT NULL CHECK (context_type IN ('circle', 'trip', 'nest')),
  group_id           uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  group_name         text NOT NULL,

  -- What's owed.
  -- NULLABLE: Flexi one-time circles (contribution_amount IS NULL) have no fixed amount —
  -- the page shows "contribute any amount" and the UPI link omits `am=`. All other
  -- contexts (recurring/Fixed circles, trip/nest settle suggestions) always set it.
  amount             numeric(12, 2),
  currency           text NOT NULL DEFAULT 'INR',
  description        text,              -- e.g. "June 2026 contribution", "Goa trip"

  -- Ghost (the one who owes / Flow A payer)
  payer_name         text NOT NULL,     -- guestName from group_members
  payer_member_id    uuid REFERENCES group_members(id) ON DELETE SET NULL,

  -- Recipient (the Clear user to notify + provide UPI to)
  payee_user_id      uuid NOT NULL,     -- auth.users.id
  payee_member_id    uuid REFERENCES group_members(id) ON DELETE SET NULL,
                                        -- group_members.id of the creditor;
                                        -- required for recordSettlement(toMemberId) on confirm
  payee_name         text NOT NULL,     -- denormalized
  payee_upi_id       text,              -- denormalized at generation time (stale OK — 7-day window)

  -- Circle-specific
  circle_period      text,              -- "2026-06" for recurring; NULL for one-time

  -- Status
  -- 'confirming' is a transient claim held by confirmExternalPayment while it writes the
  -- financial row — see §5. It exists only for the duration of one admin confirm; on success
  -- it advances to 'confirmed', on failure it rolls back to 'self_reported'.
  status             text NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'self_reported', 'confirming', 'confirmed', 'disputed')),
  payment_method     text CHECK (payment_method IN ('upi', 'cash', 'bank')),
  utr_reference      text,              -- optional transaction ID from ghost

  -- Back-references (filled in when admin confirms in-app)
  settlement_id      uuid REFERENCES settlements(id) ON DELETE SET NULL,
  contribution_id    uuid,              -- circle_contributions.id (soft ref — no FK, row may not exist yet)

  -- Audit
  created_by_user_id uuid NOT NULL,     -- admin who generated the request (auth.users.id)
  created_at         timestamptz NOT NULL DEFAULT now(),
  expires_at         timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  self_reported_at   timestamptz,
  confirmed_at       timestamptz
);

-- Dedup: at most one LIVE (pending/self_reported) request per payer per PAYEE per period.
-- Prevents duplicate tokens when an admin re-taps "Send reminder" (see §5 generatePaymentRequest).
--
-- payee_member_id MUST be in the key. A trip/nest ghost debtor can legitimately owe SEVERAL
-- creditors at once (the settle optimizer emits one suggestion per creditor — e.g. "pay Arjun
-- ₹500" AND "pay Priya ₹300"). Without payee_member_id the key collapses to (group, payer) and
-- the second request is blocked / silently reuses the first one's token (wrong payee + amount).
-- For circles the payee is the single organiser, so the key still reduces to one-per-period.
-- COALESCE both nullable members to '' so the partial index treats a SET-NULL'd FK consistently
-- (NULLs are otherwise distinct in a unique index, which would defeat dedup).
CREATE UNIQUE INDEX payment_requests_one_live_per_payer
  ON payment_requests (
    group_id,
    COALESCE(payer_member_id::text, ''),
    COALESCE(payee_member_id::text, ''),
    COALESCE(circle_period, '')
  )
  WHERE status IN ('pending', 'self_reported');

-- RLS: enable, but add NO public/anon policy.
-- The public /request/[token] page reads via the Drizzle direct connection, which BYPASSES RLS
-- (identical to how /stream/confirm/[token] reads stream_records — that table has NO public
-- SELECT policy either). A `FOR SELECT USING (true)` policy would expose the ENTIRE table to any
-- holder of the anon key (every name, amount, payee UPI id, payee user id) — a data leak. Do NOT add one.
ALTER TABLE payment_requests ENABLE ROW LEVEL SECURITY;

-- No policies. Anon/authenticated clients get zero rows via the Supabase JS client.
-- All reads (public page) + writes (self-report, confirm) go through server actions / queries
-- using the Drizzle service connection, which is not subject to RLS.
```

> **Note on the Drizzle schema default:** the SQL has `DEFAULT (now() + interval '7 days')` for `expires_at`, but the Drizzle schema below omits it. That is intentional — `generatePaymentRequest` always sets `expiresAt` explicitly. If you ever insert via Drizzle without it, the SQL default still applies at the DB level.

### Drizzle schema (`lib/db/schema/payment-requests.ts`)

```typescript
// Convention match: status / context_type are plain `text` + app-level validation
// (same as `category`, circle `status`). Do NOT declare a pgEnum — the codebase doesn't
// use DB enums for these and an unused pgEnum is dead code.
//
// UUID columns: all FK and user-id columns use uuid() to match the rest of the schema
// (group_members.ts, settlements.ts, circle-contributions.ts all use uuid for ids/fks).
import { pgTable, uuid, text, numeric, timestamp } from "drizzle-orm/pg-core";

export const paymentRequests = pgTable("payment_requests", {
  id:               uuid("id").primaryKey().defaultRandom(),
  token:            uuid("token").notNull().unique().defaultRandom(),

  contextType:      text("context_type").notNull(),
  groupId:          uuid("group_id").notNull(),
  groupName:        text("group_name").notNull(),

  amount:           numeric("amount", { precision: 12, scale: 2 }),  // nullable — see §3 (Flexi circles)
  currency:         text("currency").notNull().default("INR"),
  description:      text("description"),

  payerName:        text("payer_name").notNull(),
  payerMemberId:    uuid("payer_member_id"),

  payeeUserId:      uuid("payee_user_id").notNull(),
  payeeMemberId:    uuid("payee_member_id"),    // creditor's group_members.id — required for recordSettlement
  payeeName:        text("payee_name").notNull(),
  payeeUpiId:       text("payee_upi_id"),

  circlePeriod:     text("circle_period"),

  status:           text("status").notNull().default("pending"),
  paymentMethod:    text("payment_method"),
  utrReference:     text("utr_reference"),

  settlementId:     uuid("settlement_id"),
  contributionId:   uuid("contribution_id"),    // soft ref to circle_contributions.id (nullable, no FK)

  createdByUserId:  uuid("created_by_user_id").notNull(),
  createdAt:        timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt:        timestamp("expires_at", { withTimezone: true }).notNull(),
  selfReportedAt:   timestamp("self_reported_at", { withTimezone: true }),
  confirmedAt:      timestamp("confirmed_at", { withTimezone: true }),
});
```

---

## 4. New Public Page: `/request/[token]`

### Route: `app/request/[token]/page.tsx`

Carved out of auth in `proxy.ts` (same as `/stream/confirm/` and `/pay`).

**Token shape pre-check (before any DB call):** validate the param against the UUID regex
(`/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`) and `notFound()` on a miss —
identical to `app/stream/confirm/[token]/page.tsx`. Avoids a DB round-trip on obviously junk tokens.

**Server states (same pattern as `/stream/confirm/[token]`):**

| State | Condition | Display |
|---|---|---|
| Not found | No row with this token | 🔗 "Link not found or already used" |
| Expired | `now() > expires_at` | ⌛ "Link expired — ask [group] to send a new one" |
| Already resolved | `status IN ('confirmed', 'disputed')` | ✅ "No action needed — payment already recorded" |
| Self-reported, awaiting admin | `status IN ('self_reported', 'confirming')` | ⏳ "Got it — waiting for [admin] to confirm" (`confirming` is the sub-second admin-confirm claim; a guest is unlikely to load mid-window, but it must not fall through to the active payment form) |
| Active | `status = 'pending'` | Full UPI + confirm UI |

**Active state UI (client component `RequestClient`):**

```
┌─────────────────────────────────────────────┐
│  🏝️ Goa 2025                               │  ← context (group name)
│  You owe ₹1,200 to Arjun                   │  ← Fraunces, large (hidden when Flexi)
│  [Flexi only] How much did you pay? ₹ ___  │  ← amount input shown when amount=null
│  June contribution · via Sai's Flat Circle  │  ← description
├─────────────────────────────────────────────┤
│  [ G Pay ]  [ PhonePe ]  [ Any UPI ]       │  ← UpiPayButton (existing atom)
│  UPI ID: arjun@okaxis  [copy]              │
│                                             │
│  ┌ Return-from-UPI prompt (appears after) ┐ │
│  │ 💸 Did you pay?                        │ │
│  │ [Not yet]   [I've paid →]              │ │
│  └─────────────────────────────────────────┘ │
├─────────────────────────────────────────────┤
│  Paid in cash or bank?                      │
│  [Cash] [Bank Transfer]                     │
│  UTR / Ref (optional) [______________]      │
│  [Confirm payment]                          │
└─────────────────────────────────────────────┘

Powered by Clear — group expense tracking
Join for free →   (soft acquisition CTA)
```

> **Flexi amount input:** when `request.amount` is `null` (Flexi one-time circle), the fixed "You owe ₹X" line is replaced by a numeric input "How much did you pay? ₹ ___" (required, > 0). The UPI deep-link omits `am=` as always. The entered amount is passed to `selfReportExternalPayment` as `paidAmount` and written into the `circle_contributions.amount` column (which is `NOT NULL`). Without this field, the circle contribution row cannot be inserted for Flexi circles.

**On "I've paid" / "Confirm payment":**
1. Client calls server action `selfReportExternalPayment(token, method, utr?, paidAmount?)`
   - `paidAmount` is required (and validated > 0) when the page was loaded with `amount = null` (Flexi circle). Ignored for fixed-amount contexts.
2. Action validates: token exists, status = pending, not expired
3. Atomically flips the request: `UPDATE … SET status='self_reported', payment_method, utr_reference, self_reported_at=now() WHERE token=$1 AND status='pending'`. If 0 rows updated, someone already reported/resolved it → return the resolved state (no double-submit).
4. **Circle only:** insert a `circle_contributions` row with `is_confirmed=false`. Use `paidAmount ?? Number(request.amount)` for `amount` — the `??` handles Flexi (where `request.amount` is null). Set `currency = request.currency` (the column is `NOT NULL DEFAULT 'INR'`, so omitting it would **silently record a non-INR circle's contribution as INR** — pass it explicitly). Set `member_id = request.payerMemberId` (the ghost), and `recorded_by = request.createdByUserId` (the admin who generated the request) — there is **no** authenticated user in this path, so do **not** copy `selfReportContribution`'s `recordedBy: user.id`. `circle_contributions.recorded_by` is nullable, so `null` is also acceptable, but `createdByUserId` preserves the audit trail. Run the same dedup guards as `selfReportContribution`: (a) reject if a **confirmed** contribution already exists for this member+period; (b) reject if a **pending** (`is_confirmed=false`) contribution already exists. Both checks inside the same DB transaction as the INSERT. Stores the new row's id in `contribution_id`. **Trip/nest:** no row created here.
5. Notifies `payeeUserId` via `sendPushToUser`: `"💸 Payment reported · [Name] says they paid ₹X. Confirm →"` with deep-link to group settle/circle dashboard. **Respects `notifications_muted`** (same filter as `selfReportContribution`/`addComment`). (`sendPushToUser` takes a `groupId` to check `notifications_muted`; pass `request.groupId`.)
6. Page transitions to "self_reported" state: "✅ Got it! [Admin] will confirm shortly."

**No auth needed.** Anyone with the URL can submit once (the atomic status guard prevents double-submission).

---

## 5. New Server Actions

### `generatePaymentRequest` (`app/actions/payment-requests.ts`)

```typescript
// Called by: CircleReminderButton, settle page "Send request" button
export async function generatePaymentRequest(input: {
  contextType: "circle" | "trip" | "nest";
  groupId:     string;
  groupName:   string;
  amount:      number | null;   // null for Flexi one-time circles (no fixed amount)
  currency:    string;
  description: string;
  payerName:   string;
  payerMemberId: string;        // group_members.id of the ghost debtor (required for dedup + confirm)
  payeeUserId: string;          // MUST be a Clear user (see guard below)
  payeeName:   string;
  payeeMemberId: string;        // group_members.id of the creditor — needed for recordSettlement
  circlePeriod?: string;        // "2026-06"
}): Promise<{ ok: true; token: string; url: string } | { ok: false; error: string }>
```

- Auth: requires authenticated **admin** of `groupId` (`getMembership` + `role === "admin"`).
- **Payee must be a Clear user.** For trip/nest the suggested creditor can itself be a ghost (no `user_id`, no UPI, nobody to confirm/notify). Reject with a clear error and have the caller hide the "Send request" button when `creditor.userId === null`. `payee_user_id` is NOT NULL by design.
- **Dedup:** before insert, look up an existing **live** (`pending`/`self_reported`) request for the same `(groupId, payerMemberId, payeeMemberId, COALESCE(circlePeriod,''))`. If found, **reuse it** (return its token) rather than minting a duplicate. **`payeeMemberId` is part of the key** — a trip/nest ghost may owe multiple creditors, and each (payer→payee) pair needs its own live request; omitting it would make the second creditor's request collide with the first. The partial unique index in §3 enforces this at the DB level as a backstop.
  - **Expired-row renewal (do NOT skip — see §15 pass 6).** The reuse-lookup matches on `status IN ('pending','self_reported')` with **no expiry filter** (the partial unique index can't carry one — `now()` is not immutable, so it cannot appear in an index predicate). That means a live row whose `expires_at` has passed is *still* matched and reused. Without handling, an admin re-sending a reminder after the 7-day window would get back the **dead token** (public page shows "expired — ask for a new one"), and a fresh one can never be minted because the index/reuse keep pointing at the stale row → permanent dead link. **Fix:** when the reused row is a `pending` row whose `expires_at < now()`, **renew it in place** — `UPDATE payment_requests SET expires_at = now() + interval '7 days', created_at = now() WHERE id = $1 RETURNING token` — and return that token. Keeping the single row sidesteps the unique-index conflict entirely. (A `self_reported` row is never renewed — the ghost already paid; the admin should confirm it, not re-send. An expired `self_reported` row still surfaces in `getPendingRequestsForGroup` per pass 5, so it isn't lost.)
  - **Concurrent first-send (unique-violation handling).** Two simultaneous "Send reminder" taps both SELECT-find-nothing and both attempt the INSERT; the loser hits the partial unique index and throws. `generatePaymentRequest` MUST `try/catch` the unique-violation (`23505`), and on catch **re-run the reuse-lookup** and return the winner's existing token — never surface the constraint error to the admin. The whole purpose of dedup is graceful re-taps, so the index is not just a backstop: its violation is an expected, recoverable path.
- Fetches payee's default UPI ID via `getDefaultUpiId(payeeUserId)` (`lib/db/queries/upi.ts`). **It returns an object, not a string** — store `result?.upiId ?? null` into `payee_upi_id` (same access pattern as `/pay`, which reads `defaultUpiId?.upiId ?? null`). Null → page shows the "no UPI" state.
- Sets `expiresAt = now() + 7 days`.
- Returns the share URL: `${process.env.NEXT_PUBLIC_APP_URL}/request/${token}`.

### `selfReportExternalPayment` (`app/actions/payment-requests.ts`)

```typescript
// Called by the public /request/[token] page — NO auth check
export async function selfReportExternalPayment(
  token:         string,
  method:        "upi" | "cash" | "bank",
  utrReference?: string,
  paidAmount?:   number,   // required for Flexi circles (request.amount === null); ignored otherwise
): Promise<{ ok: true } | { ok: false; error: string }>
```

- Validates token exists + not expired (service-role read via Drizzle).
- When `request.amount` is `null` (Flexi circle), validate `paidAmount` is present and > 0 — fail with `"Please enter the amount you paid"` otherwise.
- **Atomic transition — trip/nest:** `UPDATE payment_requests SET status='self_reported', payment_method, utr_reference, self_reported_at=now() WHERE token=$1 AND status='pending'` — guards against double-tap / concurrent reports. 0 rows affected → already handled, return ok (idempotent). No contribution row is created for trip/nest contexts.
- **Single-transaction write — circle only:** For circles the status flip and the contribution INSERT **must be in the same DB transaction**. A split-transaction approach (UPDATE commits, INSERT fails) leaves `status='self_reported'` with `contribution_id = null`; when the admin confirms, `confirmContribution(null, groupId)` returns `"Contribution not found"` and the claim rolls back to `self_reported` — looping forever. The combined transaction:
  1. `UPDATE payment_requests SET status='self_reported', payment_method, utr_reference, self_reported_at=now() WHERE token=$1 AND status='pending' RETURNING *` — if 0 rows, abort the transaction and return ok (idempotent: someone already handled it).
  2. Dedup checks: (a) **only when `request.circlePeriod` is set (recurring circles)** — no existing **confirmed** contribution for this `member_id + period`. Skip check (a) entirely for one-time circles (`circlePeriod = null`) — mirroring `selfReportContribution`'s `if (input.period)` guard, because one-time circle members can legitimately make multiple contributions. (b) no existing **pending** (`is_confirmed=false`) contribution for the same member (any mode). Both checks mirror `selfReportContribution`'s dedup transaction.
  3. `INSERT INTO circle_contributions` with `is_confirmed=false`. Amount = `paidAmount ?? Number(request.amount)`. `currency = request.currency` (column is `NOT NULL DEFAULT 'INR'` — pass explicitly so a non-INR circle isn't silently recorded as INR). `member_id = request.payerMemberId`. `recorded_by = request.createdByUserId` (the request's admin — there is no authenticated user here; `recorded_by` is nullable so `null` is also acceptable, but `createdByUserId` preserves the audit trail).
  4. `UPDATE payment_requests SET contribution_id=$newId WHERE id=$req.id`.

  If any step fails, the whole transaction rolls back: the request stays at `pending` and the ghost can retry. This single-transaction write eliminates the partial-failure state entirely. Step 4's write-back is what makes the existing roster pending-badge show the report (Section 7).
  - **Edge case — dedup returns `"already_confirmed"`** (an admin manually recorded the contribution for this member+period between token generation and the ghost's self-report): within the same transaction, fetch the existing confirmed contribution's `id`, set `contribution_id` to it, and immediately update `payment_request.status = 'confirmed', confirmed_at = now()` — the payment is already done, no admin confirm step is needed. Commit and return `{ ok: true }`.
  - **Edge case — dedup returns `"already_pending"`**: this cannot arise in practice. Step 1's `WHERE status='pending'` guard prevents a second concurrent self-report from reaching this code; and ghosts have no authenticated path that could insert a pending contribution independently.
- Notifies `payeeUserId` via `sendPushToUser` (pass `request.groupId` for the `notifications_muted` check), **respecting `notifications_muted`**.

### `confirmExternalPayment` (`app/actions/payment-requests.ts`)

```typescript
// Called by admin in-app (from Circle dashboard or settle page pending badge)
export async function confirmExternalPayment(
  requestId:  string,
  groupId:    string,
): Promise<{ ok: true } | { ok: false; error: string }>
```

- Auth: `getMembership` admin check (mirrors `confirmContribution` / `recordSettlement`).
- **Why not "flip to confirmed, then write the row":** the status flip and the financial write (`recordSettlement` / `confirmContribution`) are **separate server actions with separate transactions** — they cannot be made atomic together. If we flipped the request to `confirmed` first and the financial write then failed (e.g. `recordSettlement` rejects because the group's `defaultCurrency` changed during the 7-day window), the request would read `confirmed` while **no settlement/contribution exists**. It would drop out of `getPendingRequestsForGroup` (which filters `status='self_reported'`), vanish from the admin's "Pending external payments" surface, and leave the balance silently unchanged — a §4.11-forbidden silent failure. So the write must happen **before** the request is marked confirmed. Conversely, writing the row first without any guard risks a concurrent double-confirm inserting **two** settlements (`recordSettlement` is not idempotent). The fix is a transient claim:
- **Step 1 — atomic claim:** `UPDATE payment_requests SET status='confirming' WHERE id=$1 AND status='self_reported' RETURNING *`. If 0 rows, bail — another admin is already confirming, or it's already resolved. This gives the caller exclusive ownership and prevents the double-`recordSettlement` race.
- **Step 2 — write the financial row** (only the claim-winner reaches here):
  - **Circle:** flip the contribution created at self-report time to confirmed — `confirmContribution(contributionId, groupId)` (admin-only; sets `is_confirmed=true`, notifies the member). The contribution already carries the payer's `member_id`, method, and UTR. *(Note: the real `recordContribution` signature is `{ groupId, memberId, amount, period, currency, note? }` and always inserts `is_confirmed=true` — it is NOT used here; the self-report path already inserted the unconfirmed row.)*
    - **Null `contributionId` guard (defensive):** if `request.contributionId` is null (should not arise now that `selfReportExternalPayment` uses a single transaction for circles, but kept as a defence-in-depth guard): attempt to insert the contribution row now using the same parameters as the self-report path (`payerMemberId`, `paidAmount ?? amount`, `createdByUserId`). If the insert succeeds, store its id in the request and proceed to `confirmContribution` normally. If it fails: roll back the `confirming` claim to `self_reported` and return `{ ok: false, error: "Payment data incomplete — ask the guest to retry their confirmation link" }`. Never call `confirmContribution(null, groupId)`.
    - **`"Contribution already processed"` → treat as success.** `confirmContribution` returns `{ ok: false, error: "Contribution already processed" }` when the contribution's `is_confirmed` was already `true` at the time of the UPDATE (e.g. another admin confirmed it concurrently, or the "already_confirmed" edge case in `selfReportExternalPayment` wrote it pre-confirmed). In this case: advance the `payment_request` to `confirmed` exactly as the normal success path does (step 3 success). Do **not** roll back to `self_reported` — the contribution IS confirmed and the balance IS updated; rolling back would leave the request stuck in the pending surface forever.
  - **Trip/Nest:** call `recordSettlement({ groupId, fromMemberId: payerMemberId, toMemberId: payeeMemberId, amount, currency, note, paymentMethod, utrReference })`.
    - **`payeeMemberId`**: read from `request.payeeMemberId` (stored at generation time).
    - **`currency`**: fetch `group.defaultCurrency` fresh (a single `SELECT` before the call) — do NOT pass `request.currency`. `recordSettlement` validates `currency === group.defaultCurrency` and returns an error on mismatch; using the stale stored value would fail if the group's currency was changed during the 7-day window.
    - `recordSettlement` already writes `is_confirmed=true` and calls `revalidateTag('balances-${groupId}', 'max')` internally.
- **Step 3 — finalize or roll back:**
  - On success: `UPDATE payment_requests SET status='confirmed', confirmed_at=now(), settlement_id=$2 WHERE id=$1` (store the returned `settlementId`; circle stores nothing new — `contribution_id` was set at self-report). Return `{ ok: true }`.
  - On failure (the financial write returned `{ ok: false }` or threw): `UPDATE payment_requests SET status='self_reported' WHERE id=$1 AND status='confirming'` to release the claim, then return the underlying error. The request reappears in the pending surface so the admin can retry once the cause (e.g. currency) is fixed. **No orphaned `confirmed` row is ever left behind.**
- **Note on `confirmContribution` idempotency (circle):** `confirmContribution` has its own `WHERE is_confirmed=false` guard, so even if a circle confirm is retried it won't double-fire; the claim is still used for consistency and to keep the request's own lifecycle coherent.
- **Crash-recovery caveat:** a process crash *between* the claim (step 1) and the finalize/rollback (step 3) would strand a row in `confirming`, hiding it from the `self_reported`-filtered pending surface. This is rare (the whole flow is one synchronous action) but to make it self-healing the step-1 claim also reclaims stale rows: `WHERE status='self_reported' OR (status='confirming' AND self_reported_at < now() - interval '2 minutes')`. No extra column needed — `self_reported_at` is already the last point a guest touched the row.
- Notifies payer (if they've since claimed their guest account and have a push subscription): "✓ Payment confirmed for [group]". Respects `notifications_muted`.

---

## 6. Token Delivery — Updated WhatsApp Messages

### Circle reminder message (update `CircleReminderSheet`)

Current:
```
Hey team! Sai's Flat Circle
June 2026: 4/8 paid so far ████░░░░

Still pending: Ravi, Priya, Kishore
Pay ₹5,000 → upi://pay?pa=sai@okaxis&am=5000&cu=INR&tn=Sai's%20Flat%20Circle
Track it → https://getclear.app/join/abc123
```

Updated (per-person tokens):
```
Hey team! Sai's Flat Circle
June 2026: 4/8 paid so far ████░░░░

Still pending:
• Ravi — Pay + confirm → https://getclear.app/request/[ravi-token]
• Priya — Pay + confirm → https://getclear.app/request/[priya-token]
• Kishore — Pay + confirm → https://getclear.app/request/[kishore-token]

UPI: upi://pay?pa=sai@okaxis&am=5000&cu=INR&tn=Sai's+Flat+Circle
(Or open the link above to pay and confirm in one step)

Manage circle → https://getclear.app/join/abc123
```

**Implementation change in `CircleReminderSheet`:**
- `CircleReminderButton` now calls `generatePaymentRequest` for each pending ghost member before opening the sheet
- Tokens are passed into `CircleReminderSheet` as `pendingMembers: { name: string; token: string }[]`
- For Clear members (userId != null) who haven't paid: send an in-app push instead of a token URL
- Fallback: if token generation fails, use the old bare UPI link

### Trip/Nest settle page — new "Send request ↗" button

On the settle page suggestion cards, when the debtor is a ghost (`member.userId === null`)
**AND the suggested creditor is a Clear user** (`creditor.userId !== null`):
- Show a "📤 Send request" button alongside the existing UPI and cash options.
- Tap → generates token → opens a mini share sheet (same as `CircleReminderSheet`).

**`buildSettleRequestMessage` format** (`lib/payment-requests/whatsapp.ts`):
```
Hey Ravi! 🙏

You owe Rs.1,200 to Arjun for Goa 2025.

Pay via UPI and confirm in one step:
https://getclear.app/request/[token]

(Opens a payment page — no login needed)
```
Signature: `buildSettleRequestMessage(payerName, amount, currency, payeeName, groupName, tokenUrl): string`. Pure + testable (same pattern as `buildCircleReminderMessage`). Used by `balances-section.tsx` when opening the share sheet. Use `"Rs."` not `"₹"` — the function's output appears in WhatsApp where the rupee symbol renders fine, but keeping it consistent with the OG-image restriction (§8) avoids a separate encoding class.

> **Guard:** hide the button entirely when the creditor is also a ghost — there's no one to provide UPI,
> receive the confirm notification, or be the `payee_user_id` (which is NOT NULL). `generatePaymentRequest`
> also rejects this server-side as a backstop.
>
> **Staleness caveat:** settle suggestions come from the optimizer and shift as expenses change, so a
> token's locked-in amount can drift within the 7-day window more readily than a fixed monthly circle
> contribution. Acceptable, but it's why trips lean on the admin-confirm step as the reconciliation point.

---

## 7. In-app Confirmation Surface

When `selfReportExternalPayment` fires, admin needs to be able to confirm it quickly.

### Circle dashboard: existing `RecordContributionSheet`

`CircleContributionRoster` shows the `PaymentPendingBadge` / "⏳ N awaiting confirmation" banner for any
`circle_contributions` row with `is_confirmed = false` (driven by `getCircleDashboardData` →
`pendingConfirmMembers`, `unconfirmedContributionId`). **This is exactly why `selfReportExternalPayment`
must insert the unconfirmed contribution row for circles** (Section 5) — that, and only that, is what makes the
report visible here. With the row created, **no UI change is needed**: `confirmExternalPayment` calls the
existing `confirmContribution(contributionId, groupId)`, which is already wired to the pending badge's
"Confirm" button.

> ⚠️ If the self-report instead only wrote a `payment_requests` row (the originally-specced behaviour), this
> banner would **never** show the report — the roster knows nothing about `payment_requests`. Do not defer the
> contribution row for circles.

Change: push notification deep-link should point to `/groups/[groupId]` (the circle dashboard
already shows the "⏳ N awaiting confirmation" banner whenever unconfirmed self-reports exist —
that banner, not a query param, is the confirm surface). A `?confirm=[requestId]` suffix would be
**cosmetic only**: nothing on the circle dashboard reads it (the `?confirm=` pattern is the *settle*
page's, and it keys on a `settlementId`, not a `requestId`). Add it solely as a scroll anchor if
desired, but do not rely on it to open any UI.

### Trip/Nest settle page

Add a new "Pending external payments" section above the suggestion cards when any `payment_requests` with `status = 'self_reported'` exist for this group.

Each row: `PaymentPendingBadge` with:
- `payerName` from the request
- `amount + currency`
- `paymentMethod + utrReference` (if provided by guest)
- `canConfirm = isAdmin` — creditor cannot confirm directly. `confirmExternalPayment` is admin-only (mirrors `recordSettlement`, which it calls internally, and which also enforces `role === "admin"`). Showing the button to a non-admin creditor would result in a silent rejection. The creditor receives the push notification and can ask the admin to confirm on their behalf — the same model as `recordContribution` / `confirmContribution` for circles.
- `onConfirm` → calls `confirmExternalPayment`

---

## 8. OG Image for WhatsApp Preview

`app/request/[token]/opengraph-image.tsx` — same pattern as `/pay/opengraph-image.tsx`.

Shows:
- ClearIcon (glyph)
- `amount != null` → `"Rs.1,200 payment request"`; **`amount == null` (Flexi one-time circle)** → `"Payment request"` (no figure — there is no fixed amount to show)
- "June contribution · Sai's Flat Circle"
- "Tap to pay via UPI →"

ASCII-only (no ₹ symbol in the OG image text — use "Rs." instead, same restriction as `/pay`). Branch on `request.amount === null` before composing the title line so a Flexi request never renders `"Rs.null payment request"`.

---

## 9. `proxy.ts` Update

`/request/*` is **already public** without any code change — `proxy.ts` protects routes via five explicit `pathname.startsWith()` guards (`/groups`, `/insights`, `/admin`, `/settings`, `/stream` minus `/stream/confirm`). `/request` matches none of them.

The only recommended change is adding `/request/:path*` to the `config.matcher` array so the proxy middleware runs for those routes (needed for cookie forwarding and to make the intent explicit in code):

```typescript
// config.matcher — add this entry:
"/request/:path*",
```

**Do NOT** add `/request` to the `isProtected` check. The route must remain fully public. No other proxy change is needed.

---

## 10. DB Queries: `payment-requests.ts`

```typescript
// lib/db/queries/payment-requests.ts

// ── Public page — fetch by token (no auth; use Drizzle service connection) ───

export const getPaymentRequestByToken = cache(async (token: string) => {
  const row = await db
    .select()
    .from(paymentRequests)
    .where(eq(paymentRequests.token, token))
    .limit(1)
    .then((r) => r[0] ?? null);

  if (!row) return null;

  const isExpired      = row.expiresAt < new Date();
  const isResolved     = row.status === "confirmed" || row.status === "disputed";
  // 'confirming' (transient admin-confirm claim, see §5) renders as the "waiting for admin"
  // state — it must NOT fall through to the active payment form.
  const isSelfReported = row.status === "self_reported" || row.status === "confirming";

  return { row, isExpired, isResolved, isSelfReported };
});

// ── Settle page — pending self-reports for admin confirmation surface ─────────
// Returns ALL self_reported requests for a group, newest first — intentionally no
// expiry filter. Expiry only governs whether the *public page* accepts new self-reports
// (status='pending'). Once self-reported, admin confirmation must be possible regardless
// of token age: a ghost who paid on day 6 of a 7-day token must not vanish from the
// admin surface on day 8 — that would be a silent failure with balance left uncorrected.
// Used by the Trip/Nest settle page "Pending external payments" section (§7).
// Auth check is the caller's responsibility (settle page RSC already validates membership).

export const getPendingRequestsForGroup = cache(async (groupId: string) => {
  return db
    .select()
    .from(paymentRequests)
    .where(
      and(
        eq(paymentRequests.groupId, groupId),
        eq(paymentRequests.status, "self_reported"),
      )
    )
    .orderBy(desc(paymentRequests.selfReportedAt));
});
// Return type: PaymentRequest[] (typeof paymentRequests.$inferSelect)[]
// Callers destructure: payerName, amount, currency, paymentMethod, utrReference,
//                      payeeUserId, id (for confirmExternalPayment call)
```

---

## 11. Files to Create / Modify

### New files
| File | Purpose |
|---|---|
| `drizzle/payment-requests.sql` | DB migration (run in Supabase SQL Editor) |
| `lib/db/schema/payment-requests.ts` | Drizzle schema |
| `app/actions/payment-requests.ts` | `generatePaymentRequest`, `selfReportExternalPayment`, `confirmExternalPayment` |
| `lib/db/queries/payment-requests.ts` | `getPaymentRequestByToken`, `getPendingRequestsForGroup` |
| `app/request/[token]/page.tsx` | Public RSC — 4 server states + RequestClient |
| `app/request/[token]/request-client.tsx` | UPI + confirm UI (client) |
| `app/request/[token]/opengraph-image.tsx` | WhatsApp OG card |
| `lib/payment-requests/whatsapp.ts` | `buildCircleReminderMessage`, `buildSettleRequestMessage` (pure, testable) |

### Modified files
| File | Change |
|---|---|
| `proxy.ts` | Add `/request/:path*` to public paths |
| `components/circle/circle-reminder-button.tsx` | Call `generatePaymentRequest` per ghost; pass tokens to sheet |
| `components/circle/circle-reminder-sheet.tsx` | Accept `pendingMembers: { name: string; token: string }[]`; render per-person token URLs |
| `app/(app)/groups/[id]/settle/balances-section.tsx` | Add "Pending external payments" section; "Send request" button on ghost debtor cards |
| `lib/db/schema/index.ts` | Export `paymentRequests` |

---

## 12. Test Cases

### Automated (unit)
- `lib/payment-requests/whatsapp.ts` — `buildCircleReminderMessage`: correct format with tokens, fallback without UPI ID, zero pending members message
- `getPaymentRequestByToken` — expired token returns `isExpired: true`, confirmed returns `isResolved: true`
- Token UUID validation (same `/^[0-9a-f]{8}-…/i` regex as stream confirm)

### Manual verification (one at a time, in order)

1. **Circle: token generation** — Admin goes to circle dashboard with ≥1 ghost unpaid. Taps "Send reminder". Verify sheet shows per-person URLs (`/request/[token]`), not bare `upi://` link. Each token URL is unique.

2. **Circle: payment page** — Open a `/request/[token]` URL in an incognito window. Verify: correct name, amount, group name shown. G Pay / PhonePe / Any UPI buttons present. UPI ID displayed + copy button. No login prompt.

3. **Circle: self-report** — On the payment page, tap "I've paid" (or Cash/Bank option). Verify: page transitions to "Got it — [admin] will confirm shortly". Back in the app, verify the admin received a push notification and the circle dashboard shows the pending-confirm badge for that member.

4. **Circle: admin confirm** — Admin taps "Confirm" on the pending badge. Verify: contribution row created, member marked as paid in the roster, member notified.

5. **Circle: expired token** — Manually set `expires_at = now() - 1 second` on a test token in Supabase SQL Editor. Open the URL. Verify expired state shown, not the payment form.

6. **Trip/Nest: send request button** — On the settle page, find a suggestion card where the debtor is a ghost (add a ghost member if needed). Verify a "📤 Send request" button is visible. Tap it → verify a WhatsApp-style share sheet opens with the correct message + token URL.

7. **Trip/Nest: self-report → admin confirm** — Open the token URL in incognito, self-report with Cash + a test UTR "TEST123". Verify: settle page shows "Pending external payments" section with the pending badge, UTR "TEST123" visible, admin can confirm.

8. **Token single-use** — After self-reporting, refresh the token page. Verify it shows "self_reported" state, not the payment form again. After admin confirms, verify it shows "No action needed".

9. **Dark mode** — Open the token page with system dark mode. Verify all UI readable, no light-mode bleeds.

10. **No UPI ID state** — Test with a payee who has no UPI ID set. Verify the page hides the UPI picker and shows "Ask [payee] to add their UPI ID in Clear Settings" (same as `/pay` no-VPA state).

11. **Re-send dedup** — In a circle, tap "Send reminder" for the same pending ghost twice. Verify the second tap reuses the same `/request/[token]` URL (no duplicate row; the partial unique index holds). Confirming once leaves no orphan.

12. **Ghost-creditor guard (trip/nest)** — Construct a settle suggestion where BOTH debtor and creditor are ghosts. Verify NO "📤 Send request" button appears. (Direct `generatePaymentRequest` call with a ghost payee returns `{ ok:false }`.)

13. **Flexi circle** — Generate a request in a Flexi one-time circle (`contributionAmount === null`). Verify the page shows the amount input ("How much did you pay? ₹ ___") instead of a fixed ₹ amount, the UPI link omits `am=`, and self-report with a filled amount creates a `circle_contributions` row with that amount.

14. **Concurrent confirm** — Self-report, then have two admins tap "Confirm" near-simultaneously (or double-tap). Verify exactly ONE settlement/contribution row is created (only one admin wins the `self_reported → confirming` claim; the loser's claim UPDATE affects 0 rows and bails).

15. **Failed-confirm rollback (trip/nest)** — Self-report a trip request, then change the group's `defaultCurrency` in Settings so it no longer matches the request. Tap "Confirm". Verify: `recordSettlement` rejects on the currency mismatch, the request returns to the "Pending external payments" surface (status rolled back to `self_reported`, NOT stuck on `confirmed` or `confirming`), no settlement row was created, and the balance is unchanged.

16. **Multi-creditor requests (trip/nest)** — Construct a settle state where one ghost debtor owes TWO different Clear-user creditors. Tap "Send request" on both suggestion cards. Verify TWO distinct `/request/[token]` URLs are generated (one per payee), each showing the correct creditor + amount — confirming the dedup key includes `payee_member_id`.

17. **Self-report survives token expiry (trip/nest)** — Self-report a trip request. Then in Supabase SQL Editor set `expires_at = now() - 1 second` on that row. Verify the request still appears in the settle page "Pending external payments" section and the admin can confirm it successfully. Separately verify that opening the token URL in a browser shows the expired state (not the payment form) — confirming expiry only gates new self-reports, not admin confirmation of already-reported ones.

---

## 13. Design Decisions & Rationale

| Decision | Rationale |
|---|---|
| 7-day token expiry (not 48h like Stream) | Contributions/settlements take longer to arrange — 48h is too tight for cash payments or bank transfers. 7 days matches typical monthly payment cycles. |
| Admin must confirm (not auto-confirm) | Matches existing Circle + settlement pattern. Prevents false reports. Admin is the source of truth. |
| Separate `payment_requests` table as the **token/delivery envelope** — NOT the pending-state store for circles | A `payment_request` always exists (ghosts have no other home for token + denormalized render data). But for circles the *payment* pending-state lives in `circle_contributions.is_confirmed`, so self-report writes that row immediately. For trip/nest there's no settlement half-state, so the request's own `status` carries it. See the §0 architectural rule. |
| Self-report asymmetry (circle creates unconfirmed row; trip/nest defers) | Reuses each context's native confirm surface with zero new UI for circles. For trip/nest, `settlements.is_confirmed` already exists (for authenticated `selfReportSettlement`), but the guest path creates the settlement only on admin confirm (`recordSettlement` → `is_confirmed=true` directly), keeping the two paths cleanly separate. |
| No public/anon RLS policy on `payment_requests` | `FOR SELECT USING (true)` would leak the whole table (names, amounts, UPI ids) to any anon-key holder. The page reads via the Drizzle service connection (bypasses RLS), exactly like `/stream/confirm` reads `stream_records` (which also has no public policy). |
| `amount` nullable | Flexi one-time circles have no fixed per-person amount. |
| Dedup live requests per (group, payer, **payee**, period) | Admins re-send reminders routinely; without dedup each tap mints a new token + orphan pending row. Payee is in the key because a trip/nest ghost can owe several creditors at once — keying on (group, payer) alone would block all but the first. Partial unique index enforces it. |
| Per-person tokens in group reminders | Lets Clear track which specific person confirmed, not just "someone in the group". Admin sees exactly who self-reported. |
| UPI ID denormalized at generation time | The page renders without any auth-protected DB call. Acceptable staleness: 7-day window, UPI IDs rarely change. |
| Flow B (ghost creditor confirm) deferred | Low-frequency case. Note this is also the fix for the tracked **guest-creditor settle-notify bug** (self-reporting a payment to a ghost creditor currently notifies nobody) — fold them together when Flow B is built. |
| No SMS | WhatsApp `wa.me` deep-link covers Indian users (≥95% WhatsApp penetration). SMS adds cost and another provider. Revisit if non-WhatsApp user feedback emerges. |

---

## 14. Implementation Order

```
M0 — DB + schema (no UI, no behaviour change)
  □ drizzle/payment-requests.sql
  □ lib/db/schema/payment-requests.ts
  □ lib/db/queries/payment-requests.ts
  □ Run migration in Supabase SQL Editor

M1 — Public page (testable standalone)
  □ app/request/[token]/page.tsx  (4 states)
  □ app/request/[token]/request-client.tsx  (UPI + confirm UI)
  □ app/request/[token]/opengraph-image.tsx
  □ proxy.ts update
  □ app/actions/payment-requests.ts (selfReportExternalPayment only)
  → Manual tests: 2, 5, 9, 10

M2 — Circle integration
  □ app/actions/payment-requests.ts (generatePaymentRequest + dedup; circle branch of selfReportExternalPayment that inserts the unconfirmed circle_contributions row; confirmExternalPayment circle branch → confirmContribution)
  □ lib/payment-requests/whatsapp.ts (buildCircleReminderMessage)
  □ circle-reminder-button.tsx (generate tokens before opening sheet)
  □ circle-reminder-sheet.tsx (per-person token URLs)
  → Manual tests: 1, 2, 3, 4, 11, 13, 14 (circle)

M3 — Trip/Nest integration + in-app confirm surface
  □ app/actions/payment-requests.ts (confirmExternalPayment trip/nest branch → recordSettlement; ghost-creditor guard)
  □ lib/db/queries/payment-requests.ts (getPendingRequestsForGroup)
  □ balances-section.tsx ("Send request" button gated on Clear-user creditor + "Pending external payments" section)
  → Manual tests: 6, 7, 8, 12, 14 (trip/nest)
```

Total estimated effort: **~3 days** (M0: 0.5d · M1: 1d · M2: 0.5d · M3: 1d).

---

## 15. Review Changelog (2026-06-17)

### Pass 1 — initial hardening
Code-grounded review against `stream/confirm`, `circle.ts`, `settlements.ts`, the RLS model, and `circle-contributions` schema:

1. **RLS leak fixed** — removed `FOR SELECT USING (true)`; the table now has no public policy (reads go through the Drizzle service connection, mirroring `stream_records`).
2. **Circle/settlement asymmetry resolved** (§0, §5, §7) — circle self-report creates the unconfirmed `circle_contributions` row immediately so the existing roster surfaces it; trip/nest keeps the deferred model. This corrects the original §7 "no UI change" claim, which was false as specced.
3. **API signatures corrected** — `recordContribution` is `{ groupId, memberId, amount, period, currency, note? }` (no `isConfirmed`/method/utr, no `memberUserId`); circle confirm now uses `confirmContribution`. `recordSettlement` is admin-only `{ groupId, fromMemberId, toMemberId, amount, currency, note, paymentMethod, utrReference }` with no `isConfirmed` flag.
4. **Flexi circles** — `amount` made nullable; page/UPI-link handle the no-fixed-amount case.
5. **Dedup** — partial unique index + reuse logic on re-sent reminders.
6. **Atomic guards** — conditional `UPDATE … WHERE status=…` on both self-report and confirm to prevent double-submit / duplicate financial rows.
7. **Ghost-creditor guard** — "Send request" hidden + server-rejected when the trip/nest creditor isn't a Clear user.
8. **`notifications_muted` respected** on self-report admin push.
9. **Dropped dead `pgEnum`** (status/context_type are plain `text` per codebase convention); added UUID pre-check to the page.

### Pass 2 — schema + implementation gaps
Deeper review against `group-members.ts`, `settlements.ts`, `circle-contributions.ts` actual Drizzle schemas and action code:

10. **UUID types corrected** (§3) — all FK and user-id columns changed from `text()` to `uuid()` in both the SQL migration and Drizzle schema, matching every other schema file. `text` FK columns would cause PostgreSQL to reject the `REFERENCES` constraints at migration time.
11. **`payee_member_id` added** (§3, §5) — the column was missing from the schema despite being passed to `generatePaymentRequest`. `confirmExternalPayment`'s trip/nest branch needs it to call `recordSettlement({ toMemberId })`. Added as `uuid REFERENCES group_members(id) ON DELETE SET NULL`.
12. **Flexi circle amount collection** (§4, §5) — added amount input field to the `/request/[token]` UI when `request.amount === null`. Added `paidAmount?: number` parameter to `selfReportExternalPayment`. `circle_contributions.amount` is `NOT NULL`; without this, the circle branch would throw a DB constraint error on every Flexi self-report.
13. **§0 architectural rule corrected** — settlements already have `is_confirmed` + `selfReportSettlement` / `confirmSettlement` for authenticated Clear members. The `payment_requests` guest flow is a parallel no-auth path, not a replacement for a missing concept. Reworded to prevent implementors from reaching for `selfReportSettlement` (auth-required) in the guest flow.
14. **`selfReportExternalPayment` circle dedup guard** (§5) — circle branch must run the same confirmed + pending dedup transaction as `selfReportContribution` (lines 236–283 of `circle.ts`) to prevent duplicate unconfirmed contribution rows.
15. **`getPendingRequestsForGroup` defined** (§10) — was listed in §11 as a file to create but never specced. Full signature + query body added.
16. **`confirmExternalPayment` currency freshness** (§5) — trip/nest branch must fetch `group.defaultCurrency` fresh before calling `recordSettlement`, not use `request.currency` (stale up to 7 days). `recordSettlement` validates currency server-side and returns an error on mismatch.
17. **`proxy.ts` change clarified** (§9) — `/request/*` is already public by omission; the only recommended change is adding to `config.matcher` for cookie forwarding. No change to `isProtected` logic.

### Pass 3 — concurrency & multi-debt correctness
Grounded against the actual `settlements.ts` / `circle.ts` action code and `circle-contributions.ts` / `upi.ts`:

18. **Dedup index multi-creditor collapse fixed** (§3, §5, §13) — the partial unique index keyed on `(group_id, payer_member_id, COALESCE(circle_period,''))`, which for trip/nest (where `circle_period` is null) collapsed to `(group, payer)`. A ghost debtor owing several creditors (the optimizer emits one suggestion per creditor) could then hold only **one** live request — the second silently reused the first's token (wrong payee + amount). Added `payee_member_id` to the index and to the §5 reuse-lookup key. Circles are unaffected (single organiser payee → still one-per-period).
19. **`confirmExternalPayment` orphan-confirmed gap closed** (§3, §4, §5, §10) — the spec flipped the request to `confirmed` *before* writing the financial row. Because the flip and `recordSettlement`/`confirmContribution` are separate transactions, a failed write (e.g. currency-mismatch rejection) left a `confirmed` request with no settlement — invisible to the pending surface, balance silently unchanged. Reordered behind a transient `confirming` claim: atomic `self_reported → confirming` claim, then write the row, then `confirming → confirmed` on success or `confirming → self_reported` rollback on failure. Added `confirming` to the status CHECK; folded it into the public page's `isSelfReported` ("waiting" state); added a `self_reported_at`-based stale-claim reclaim for crash recovery.
20. **Guest-path `recorded_by` / `member_id` specified** (§4, §5) — the circle self-report insert had no authenticated user, but the spec implied copying `selfReportContribution`'s `recordedBy: user.id`. Set `member_id = request.payerMemberId` and `recorded_by = request.createdByUserId` (column is nullable; `null` also valid). Prevents a `user.id`-of-undefined crash on the guest path.
21. **`getDefaultUpiId` return shape corrected** (§5) — it returns an object, not a string; store `result?.upiId ?? null` into `payee_upi_id` (matches `/pay`).
22. **Circle confirm deep-link clarified** (§7) — `/groups/[groupId]?confirm=[requestId]` is cosmetic; nothing on the circle dashboard reads the param (that's the settle page's pattern, keyed on `settlementId`). Deep-link to `/groups/[groupId]` and rely on the existing "awaiting confirmation" banner.
23. **Tests added** (§12) — #15 failed-confirm rollback (trip/nest), #16 multi-creditor distinct tokens; #14 reworded for the claim semantics.

### Pass 4 — codebase-grounded final review (2026-06-17)
Verified against actual `circle.ts`, `settlements.ts`, `lib/db/queries/upi.ts`, `lib/db/schema/circle-contributions.ts`, and `lib/notifications/send-push-notification.ts`:

24. **One-time circle confirmed-check gated on `circlePeriod`** (§4, §5 `selfReportExternalPayment`) — the confirmed-contribution dedup guard (step a) must only run when `request.circlePeriod` is set, mirroring `selfReportContribution`'s `if (input.period)` guard (`circle.ts:238`). One-time circle members can make multiple contributions; running the check unconditionally would block a ghost from self-reporting a second contribution to the same one-time circle.

25. **"Already-confirmed" edge-case handling added** (§5 `selfReportExternalPayment` + `confirmExternalPayment`) — if an admin manually records a contribution (via `recordContribution`) for the same member+period after a token was generated but before the ghost clicks "I've paid", the circle dedup INSERT returns `"already_confirmed"`. The spec previously left `payment_request.contribution_id = null` and `status = 'self_reported'`, causing `confirmExternalPayment` to call `confirmContribution(null, groupId)` → crash. Fix: two-layer defence. (a) In `selfReportExternalPayment`: on `"already_confirmed"`, fetch the existing confirmed contribution's id, set `contribution_id`, and immediately advance the request to `confirmed` — no admin action needed. (b) In `confirmExternalPayment` circle branch: if `confirmContribution` returns `"Contribution already processed"`, treat it as success and advance to `confirmed` rather than rolling back to `self_reported` — handles the concurrent-confirm race and any surviving edge cases from (a).

26. **Notification target made explicit** (§4, §5 `selfReportExternalPayment`) — changed "Pushes notification to admin(s)" to "Notifies `payeeUserId` via `sendPushToUser`". `sendPushToUser`'s `groupId` param drives the `notifications_muted` check; pass `request.groupId`. For circles payee === admin so the result is identical; for trip/nest this ensures only the creditor (the person who will actually confirm) is notified, not every group admin.

### Pass 5 — auth consistency, expiry gap, transaction atomicity (2026-06-18)
Grounded against `settlements.ts` (`recordSettlement` admin-only at line 33, `confirmSettlement` admin-OR-creditor at line 208) and the failure modes of split-transaction circle writes:

27. **`canConfirm` tightened to admin-only** (§7) — the UI had `canConfirm = isAdmin || request.payeeUserId === currentUser.id` but `confirmExternalPayment` is admin-only, and `recordSettlement` (which it calls) enforces `role === "admin"` independently. A non-admin creditor would see the Confirm button but get a silent rejection. Fixed to `canConfirm = isAdmin`. The creditor receives the push notification; admin confirms on their behalf — the same access model as `recordContribution` / `confirmContribution` for circles.

28. **`getPendingRequestsForGroup` expiry filter removed** (§10) — the `gt(expiresAt, now())` filter silently evicted self-reported payments once the 7-day token expired, hiding them from the admin's confirm surface. A ghost who self-reports on day 6 and whose admin checks on day 8 would be permanently lost — a §4.11-forbidden silent failure. Expiry only governs the public page (which rejects new self-reports on expired tokens). Once `status='self_reported'`, admin confirmation must be possible regardless of token age. Removed the filter; updated the comment. Added test #17.

29. **`selfReportExternalPayment` circle INSERT made atomic with status UPDATE** (§5) — the status UPDATE and the contribution INSERT were in separate transactions. A non-dedup INSERT failure left `status='self_reported'` committed but `contribution_id = null`. The admin's subsequent `confirmContribution(null, groupId)` returned `"Contribution not found"` → claim rolled back to `self_reported` → the confirm looped forever with no user-visible error. Fix: wrap status UPDATE + dedup checks + INSERT + contribution_id write-back in one DB transaction. Any failure rolls back entirely; the request stays at `pending` and the ghost can retry from the public page.

30. **`confirmExternalPayment` circle: null `contributionId` recovery guard added** (§5) — as defence-in-depth against any surviving partial-failure state (e.g. from code before fix #29), added an explicit null guard for `request.contributionId` before calling `confirmContribution`. If `contributionId` is null: attempt recovery (insert the contribution now), proceed on success, or roll back the `confirming` claim and return a clear error. Never call `confirmContribution(null, groupId)`.

31. **`buildSettleRequestMessage` format specced** (§6) — the WhatsApp message template for trip/nest per-person payment requests was listed in §11 as a file to create but never shown. Added a full worked example and function signature matching the style of the circle reminder message. Pure + testable.

### Pass 6 — correctness gaps surfaced by code-grounded re-verification (2026-06-18)
Re-verified the load-bearing API claims against live code (`upi.ts` `getDefaultUpiId` → object; `settlements.ts` `recordSettlement` admin-only + `Currency must be X` guard at lines 33/48; `circle.ts` `confirmContribution` + `already_confirmed`/`already_pending` sentinels; `circle-contributions.ts` schema) — all accurate. Re-verification surfaced four issues the prior five passes missed:

32. **Expired-pending re-send deadlock fixed** (§5 `generatePaymentRequest`) — the dedup reuse-lookup and the §3 partial unique index both match `status IN ('pending','self_reported')` with **no expiry filter** (and none can be added to the index — `now()` isn't immutable, so it's invalid in an index predicate). An admin re-sending a reminder after the 7-day window therefore got back the **expired** token, and a fresh one could never be minted (index/reuse kept returning the stale row) → permanent dead link. Fix: on reuse of a `pending` row past `expires_at`, **renew it in place** (`UPDATE … SET expires_at = now() + interval '7 days', created_at = now()`) and return that token. `self_reported` rows are never renewed (already paid; admin confirms). This was the only gap that would actually strand a user in production.

33. **Concurrent first-send unique-violation handling specced** (§5 `generatePaymentRequest`) — two simultaneous "Send reminder" taps both SELECT-find-nothing and both INSERT; the loser throws on the partial unique index. The spec previously called the index a "backstop" but never said to handle the violation. Now: `try/catch` the `23505` unique-violation → re-run the reuse-lookup → return the winner's token. Never surface the constraint error to the admin.

34. **Circle contribution INSERT `currency` made explicit** (§4 step 4, §5 step 3) — the circle `circle_contributions` insert listed `amount`/`member_id`/`recorded_by` but omitted `currency`. The column is `NOT NULL DEFAULT 'INR'`, so the insert wouldn't crash, but a **non-INR circle's contribution would be silently recorded as INR**. Now passes `currency = request.currency` explicitly.

35. **Flexi OG-image null-amount branch specced** (§8) — the OG card hardcoded `"Rs.1,200 payment request"` with no handling for `amount === null` (Flexi one-time circles), which would render `"Rs.null payment request"`. Added the branch: `amount == null` → `"Payment request"` (no figure).
