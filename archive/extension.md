# Wayfare — App Extension Ideas

> Planning document capturing the ideation conversation about extending Wayfare beyond trips.
> This is a scratchpad for v2 thinking — the current Wayfare project is not being changed.

---

## 1. The Chat-as-Primary-Interface Idea

**Concept:** Make a conversational chat interface the primary way to add expenses, rather than a form.

**What already exists in Wayfare:**
- Quick-add bar — single natural language line parsed by AI
- Chat import — paste a WhatsApp/Telegram thread, bulk-parse into expenses
- Both use Claude Haiku for parsing

**Why chat-as-primary doesn't work:**
- Creates an ambiguity loop — "I paid 500 for dinner" immediately raises: split equally? Among who? Which date?
- App either asks clarifying questions (annoying for simple cases) or makes assumptions (risky for money)
- A form is genuinely faster for one precise expense
- Users trust forms more for financial data
- No major expense app has succeeded with chat as primary interface

**The right scope for chat:**
- Keep as a secondary fast-entry method (bulk import, end of day)
- Expand toward a persistent AI assistant per group that handles both queries ("what's my balance?", "how much did we spend on food?") and casual expense entry
- That's a defensible AI layer competitors don't have

---

## 2. Generalising Beyond Trips

### Use cases identified
- Trips (current)
- Households / flatmates / roommates
- PG (paying guest) residents
- Office colleagues
- Friend groups (casual, non-trip)
- Sports teams
- Study groups

### What's already generic in Wayfare
- Split mechanics (equal, exact, percentage, shares)
- Settlement optimiser
- Members management
- Realtime sync
- Insights / analytics
- CSV export
- QR invite
- AI expense parsing

### What's trips-specific and needs rethinking
| Feature | Status |
|---|---|
| `start_date` / `end_date` | Optional for ongoing groups |
| `itinerary` field | Irrelevant outside trips |
| AI narrative + budget adherence | Travel-only features |
| Expense categories (sightseeing, accommodation) | Need household equivalents |
| "Trip" language throughout UI | Needs to be type-aware |
| Demo trip seeding | Needs generic equivalent |
| Recurring expenses | Critical for households, absent today |

---

## 3. Competitive Landscape

- **Splitwise** — 50M+ users, owns the generic group-splitting space, built in 2012-era UX, handles recurring poorly
- **Tricount** — similar to Splitwise
- **Settle Up** — similar

**The opening:** Splitwise's UX is neglected and their recurring expense handling is poor. A beautifully designed, AI-native app could take real market share not by out-featuring them but by being dramatically better to use.

---

## 4. The Strategic Debate

### Recommendation: Don't go generic — go deeper on trips + add households as one deliberate second type

**Arguments for:**
- Splitwise owns generic — going fully generic means competing on their home turf with no structural advantage
- Wayfare's differentiation (design, AI travel features, emotional resonance) gets diluted
- "Trips" gives the app a clear identity
- Household is structurally closest to trips — minimal data model changes

**Challenges to this recommendation:**
- Trips market is small and seasonal (2-4 trips/year vs. daily household use)
- Daily active usage drives retention, word-of-mouth, monetisation
- Splitwise's weakness is design and delight, not features — a beautiful generic app could win
- "Go deeper on trips" has a ceiling — travel splitting is "good enough" in users' minds
- The rebrand is a name change, not a rebuild — the product is already mostly generic under the hood
- **Key insight:** Daily engagement beats seasonal delight every time when building a sustainable business

**Verdict:**
- If this is a passion project / indie tool → stay with trips
- If this is a real business → generic with great design is the stronger bet

---

## 5. Technical Feasibility

### Adding a second group type — ~1 day of work

1. Add `group_type: enum('trip', 'nest')` to the groups table — one Drizzle migration
2. `categories.ts` gets a second set for household: `rent`, `utilities`, `groceries`, `subscriptions`, `healthcare`, `maintenance`, `other`
3. Create/edit forms conditionally show/hide fields based on type (dates, itinerary, AI narrative hidden for non-trips)
4. UI copy becomes type-aware
5. Settlement engine, splits, members, insights — no changes needed

The hardest part is the copy pass, not the code.

### Recurring expenses — template approach (~3 days of work)

Full auto-scheduling (cron jobs, background tasks) is overengineered for v1.

**Approach: Expense templates + one-tap logging**
- Add `is_template: boolean` and `recurrence: 'monthly' | 'weekly' | null` to expenses table
- Templates appear pinned at top of expense list with a **"Log for [current month]"** button
- Tapping it creates a new real expense pre-filled with all template values (amount, split, paid by, category) dated today — user confirms and saves
- No auto-creation, no scheduler, no background jobs
- Covers 80% of household use case (monthly rent, Netflix, electricity)

**Open question:** Template expenses should not appear in insights/totals — only logged instances should count.

---

## 6. Proposed Architecture: Group Types

Rather than one undifferentiated "group", a `group_type` selector at creation drives the experience:

| | Trip | Household (or chosen name) |
|---|---|---|
| Dates | Required | Hidden |
| Itinerary | Yes | No |
| AI narrative | Yes | No |
| Budget adherence | Yes | No |
| Categories | Travel set | Household set |
| Recurring expenses | No | Yes |
| Vocabulary | "Trip" | Type-specific |

**Rule:** Two types covers 90% of real-world usage. Office, PG, sports team, friend group all collapse into either "trip-like" (event with start/end) or "household-like" (ongoing). Don't build separate types for each.

---

## 7. Naming

### Requirements
- Not travel-coded (unlike "Wayfare")
- Works for both trips and ongoing groups
- Evokes group sharing
- Memorable, brandable

### Names explored

| Name | Concept | Notes |
|---|---|---|
| Kith | Old English "friends and neighbours" | Distinctive, warm, fits all use cases |
| Kitty | "Group kitty" | Fun but might feel too informal for finance |
| Tally | Tracking and counting | Clean but slightly accounting-heavy |
| Tab | "Split the tab" | Universal but too generic to brand |
| Even | Fairness | Generic, even.com is fintech |
| Divvy | "Divvy it up" | Divvy is a corporate card company |
| Chip | "Chip in" | Natural phrase, warm, action-oriented |
| Pitch | "Pitch in" | Similar energy to Chip |
| Pool | "Pool our money" | Clean, universal |
| Round | "I'll get this round" | Implies ongoing rotation |
| Square | "Square up" | Universal settling phrase, design-friendly |
| Share | Most universal word for the action | Possibly too literal |

### Status: **Decided — Clear** ✓

**Why Clear won:**
- "We're clear" — settled up, no debt
- "Clear the tab" — universal phrase
- "Clear balance" — zero owed
- Works internationally, not British/Indian-specific like "Sorted"
- Design-friendly — suits a clean, minimal UI
- Not travel-coded

**Domain candidates to check:**
- `clear.app` — likely taken but worth checking
- `getclear.app`
- `useclear.app`
- `clearsplit.app`
- `clearapp.io`
- `tryclear.app`
- `weclear.app`

**Tagline ideas:**
- *"Split it. Clear it."*
- *"Group expenses, cleared."*
- *"Shared costs. Clear conscience."*

---

## 8. Execution Plan

- **Current Wayfare project:** Do not disturb — remains trips-focused
- **New project:** Fork Wayfare into a new project named **Clear**
- **Phase 1:** Rename + rebrand (Clear branding, remove Wayfare identity, make group type selector)
- **Phase 2:** Household-specific categories + recurring expense templates
- **Phase 3:** Persistent AI assistant (queries + conversational expense entry)
