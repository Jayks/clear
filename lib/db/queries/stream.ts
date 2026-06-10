import { db } from "@/lib/db/client";
import { streamRecords } from "@/lib/db/schema/stream-records";
import { streamGuests } from "@/lib/db/schema/stream-guests";
import { streamSettlements } from "@/lib/db/schema/stream-settlements";
import { groupMembers } from "@/lib/db/schema/group-members";
import { userUpiIds } from "@/lib/db/schema/upi-ids";
import { eq, or, and, inArray, desc, asc, ne, isNotNull, sql, gte } from "drizzle-orm";
import type { StreamRecord } from "@/lib/db/schema/stream-records";
import type { StreamSettlement } from "@/lib/db/schema/stream-settlements";
// StreamGuest imported for join results — used implicitly via left join return type
import type {} from "@/lib/db/schema/stream-guests";

// ── Types ─────────────────────────────────────────────────────────────────────

/** A stream record enriched with the counterpart's resolved display name. */
export type EnrichedStreamRecord = StreamRecord & {
  counterpartName: string;
  /** personId used for routing: the counterpart's userId or guestId */
  personId: string;
  counterpartType: "user" | "guest";
  /** Net amount from the CURRENT USER's perspective.
   *  Positive = they owe the current user.
   *  Negative = current user owes them. */
  netAmount: number;
  settlements: StreamSettlement[];
};

/** Per-person summary used on the dashboard and homepage strip. */
export type PersonSummary = {
  personId: string;
  counterpartType: "user" | "guest";
  name: string;
  /** Net across all active streams with this person. + = they owe me. */
  net: number;
  currency: string;
  latestAt: Date;
  /** Most recent updatedAt across active streams — tracks status changes (confirm/dispute). */
  latestUpdatedAt: Date;
  hasPending: boolean;       // any stream still in 'pending' state
  hasDisputed: boolean;      // any stream in 'disputed' state — shows amber attention dot
  activeCount: number;       // total open streams
  /** True when this person has active streams in more than one currency. The net
   *  then sums raw amounts across currencies, so the UI must flag it (mirrors
   *  getBalances' hasMixedCurrencies). */
  hasMixedCurrencies: boolean;
};

/** A person whose streams are all settled/forgiven — shown in dashboard "Past" section. */
export type ClosedPersonSummary = {
  personId:        string;
  counterpartType: "user" | "guest";
  name:            string;
  currency:        string;
  closedAt:        Date;   // most recent settled/forgiven updatedAt
  closedCount:     number; // streams settled/forgiven in last 30 days
  hadForgiven:     boolean;
};

/** A single activity event shown in the dashboard activity feed. */
export type StreamActivityEvent = {
  id:              string;
  personId:        string;
  counterpartName: string;
  counterpartType: "user" | "guest";
  amount:          number;
  currency:        string;
  note:            string | null;
  status:          string;
  /** Positive = they owe viewer; negative = viewer owes them. */
  netAmount:       number;
  isViewerCreator: boolean;
  updatedAt:       Date;
  createdAt:       Date;
};

export type StreamDashboardData = {
  owedToMe:       PersonSummary[];
  iOwe:           PersonSummary[];
  pending:        EnrichedStreamRecord[];
  totalOwedToMe:  number;
  totalIOwe:      number;
  /** People whose streams are all settled/forgiven in the last 30 days.
   *  Shown in a muted "Past" section so history doesn't feel deleted. */
  recentlyClosed: ClosedPersonSummary[];
  /** Last 5 stream events ordered by updatedAt — for the dashboard activity feed. */
  recentActivity: StreamActivityEvent[];
};

export type StreamSummaryData = {
  topRecords: PersonSummary[];   // up to 4, sorted by |net| desc
  totalOwedToMe: number;
  totalIOwe: number;
  /** True when active streams span more than one currency — the owed/owe totals
   *  then sum across currencies and must not be shown as a single-currency figure. */
  hasMixedCurrencies: boolean;
  hasMore: boolean;
  moreCount: number;
  /** True when the user has any settled/forgiven streams — used by the homepage
   *  strip to show "all clear" state instead of the fresh-start empty state. */
  hasAnyHistory: boolean;
};

export type PersonDetails = {
  personId: string;
  type: "user" | "guest";
  name: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Compute the net amount for a stream record from a specific user's perspective.
 * Positive = they (the other person) owe the viewer.
 * Negative = the viewer owes them.
 */
function computeNet(record: StreamRecord, viewerUserId: string): number {
  const amount = Number(record.amount);
  const isCreator = record.creatorId === viewerUserId;

  if (isCreator) {
    return record.direction === "they_owe_me" ? amount : -amount;
  } else {
    // Viewer is the counterpart — direction inverts
    return record.direction === "they_owe_me" ? -amount : amount;
  }
}

/** Active statuses — exclude settled and forgiven from balance calculations. */
const ACTIVE_STATUSES = ["pending", "confirmed", "disputed"] as const;

/**
 * Batch-fetch the best available display name for a list of Clear user IDs.
 * Uses DISTINCT ON (user_id) picking the most recently joined group_members row.
 * Returns a Map<userId, displayName>.
 */
async function batchGetUserNames(userIds: string[]): Promise<Map<string, string>> {
  if (userIds.length === 0) return new Map();

  const rows = await db
    .selectDistinctOn([groupMembers.userId], {
      userId:      groupMembers.userId,
      displayName: groupMembers.displayName,
      guestName:   groupMembers.guestName,
    })
    .from(groupMembers)
    .where(and(
      isNotNull(groupMembers.userId),
      inArray(groupMembers.userId, userIds),
    ))
    .orderBy(groupMembers.userId, desc(groupMembers.joinedAt));

  const map = new Map<string, string>();
  for (const row of rows) {
    if (row.userId) {
      map.set(row.userId, row.displayName ?? row.guestName ?? "Unknown");
    }
  }
  return map;
}

// ── Public Query Functions ────────────────────────────────────────────────────

/**
 * Private helper — fetches all active streams for a user and builds the
 * per-person summary list (ALL people, unsorted/unsliced).
 * Both getStreamSummary and getStreamDashboard share this to avoid a double query.
 */
async function buildPersonSummaries(userId: string): Promise<{
  allPeople:     PersonSummary[];
  totalOwedToMe: number;
  totalIOwe:     number;
}> {
  const records = await db
    .select()
    .from(streamRecords)
    .leftJoin(streamGuests, eq(streamRecords.counterpartGuestId, streamGuests.id))
    .where(
      and(
        or(
          eq(streamRecords.creatorId, userId),
          eq(streamRecords.counterpartId, userId),
        ),
        inArray(streamRecords.status, [...ACTIVE_STATUSES]),
      ),
    )
    .orderBy(desc(streamRecords.createdAt));

  if (records.length === 0) {
    return { allPeople: [], totalOwedToMe: 0, totalIOwe: 0 };
  }

  // Collect Clear user IDs that are NOT the current user (for batch name lookup)
  const clearUserIds = [
    ...new Set(
      records
        .map((r) =>
          r.stream_records.creatorId !== userId
            ? r.stream_records.creatorId
            : r.stream_records.counterpartId,
        )
        .filter((id): id is string => !!id && id !== userId),
    ),
  ];

  const nameMap = await batchGetUserNames(clearUserIds);

  // Group by person — build a Map<personId, PersonSummary>
  const personMap = new Map<string, PersonSummary>();

  for (const { stream_records: sr, stream_guests: sg } of records) {
    const isCreator = sr.creatorId === userId;
    const personId  = isCreator
      ? (sr.counterpartId ?? sr.counterpartGuestId ?? "")
      : sr.creatorId;
    const personType: "user" | "guest" = isCreator
      ? (sr.counterpartId ? "user" : "guest")
      : "user"; // when viewing as counterpart the other party is always a Clear user
    const name =
      personType === "guest" && sg
        ? sg.name
        : (nameMap.get(personId) ?? "Someone");

    if (!personId) continue;

    const net  = computeNet(sr, userId);
    const prev = personMap.get(personId);
    const srUpdatedAt = new Date(sr.updatedAt);

    if (prev) {
      prev.net += net;
      prev.hasPending  = prev.hasPending  || sr.status === "pending";
      prev.hasDisputed = prev.hasDisputed || sr.status === "disputed";
      prev.hasMixedCurrencies = prev.hasMixedCurrencies || sr.currency !== prev.currency;
      prev.activeCount++;
      if (new Date(sr.createdAt) > prev.latestAt)       prev.latestAt       = new Date(sr.createdAt);
      if (srUpdatedAt             > prev.latestUpdatedAt) prev.latestUpdatedAt = srUpdatedAt;
    } else {
      personMap.set(personId, {
        personId,
        counterpartType:  personType,
        name,
        net,
        currency:         sr.currency,
        latestAt:         new Date(sr.createdAt),
        latestUpdatedAt:  srUpdatedAt,
        hasPending:       sr.status === "pending",
        hasDisputed:      sr.status === "disputed",
        hasMixedCurrencies: false,
        activeCount:      1,
      });
    }
  }

  // Exclude fully-balanced people (net ≈ 0)
  const allPeople = [...personMap.values()].filter((p) => Math.abs(p.net) >= 0.01);

  // Sort by |net| descending — most significant relationships first
  allPeople.sort((a, b) => Math.abs(b.net) - Math.abs(a.net));

  const totalOwedToMe = allPeople.filter((p) => p.net > 0).reduce((s, p) => s + p.net, 0);
  const totalIOwe     = allPeople.filter((p) => p.net < 0).reduce((s, p) => s + Math.abs(p.net), 0);

  return { allPeople, totalOwedToMe, totalIOwe };
}


/**
 * Minimal data for the Streams nav badge on the Home page.
 * Returns the latestUpdatedAt of the most recently changed stream and
 * whether any active stream is disputed — both used by StreamBadgeSync.
 */
export async function getStreamBadgeData(userId: string): Promise<{
  latestUpdatedAt: string | null;
  hasDisputed:     boolean;
}> {
  const rows = await db
    .select({ updatedAt: streamRecords.updatedAt, status: streamRecords.status })
    .from(streamRecords)
    .where(or(
      eq(streamRecords.creatorId,     userId),
      eq(streamRecords.counterpartId, userId),
    ))
    .orderBy(desc(streamRecords.updatedAt))
    .limit(10);

  if (rows.length === 0) return { latestUpdatedAt: null, hasDisputed: false };

  return {
    latestUpdatedAt: rows[0].updatedAt.toISOString(),
    hasDisputed:     rows.some((r) => r.status === "disputed"),
  };
}


/**
 * Lightweight summary for the homepage Stream strip.
 * Returns top 4 people by |net|, plus aggregate totals.
 * NOT cached — personal data, changes with every log/settle.
 */
export async function getStreamSummary(userId: string): Promise<StreamSummaryData> {
  // Run active-summary and history-check in parallel
  const [{ allPeople, totalOwedToMe, totalIOwe }, historyRows] = await Promise.all([
    buildPersonSummaries(userId),
    db
      .select({ c: sql<number>`count(*)` })
      .from(streamRecords)
      .where(
        and(
          or(
            eq(streamRecords.creatorId, userId),
            eq(streamRecords.counterpartId, userId),
          ),
          inArray(streamRecords.status, ["settled", "forgiven"]),
        ),
      ),
  ]);

  const hasAnyHistory = Number(historyRows[0]?.c ?? 0) > 0;

  if (allPeople.length === 0) {
    return { topRecords: [], totalOwedToMe: 0, totalIOwe: 0, hasMixedCurrencies: false, hasMore: false, moreCount: 0, hasAnyHistory };
  }

  // Mixed when any single person spans currencies, or different people use
  // different currencies — either way the aggregate totals are not one currency.
  const hasMixedCurrencies =
    allPeople.some((p) => p.hasMixedCurrencies) ||
    new Set(allPeople.map((p) => p.currency)).size > 1;

  const topRecords = allPeople.slice(0, 4);
  const moreCount  = Math.max(0, allPeople.length - 4);

  return { topRecords, totalOwedToMe, totalIOwe, hasMixedCurrencies, hasMore: moreCount > 0, moreCount, hasAnyHistory };
}


/**
 * Full dashboard data — ALL people, split into owed-to-me and i-owe buckets.
 * Also includes 'pending' streams waiting for counterpart confirmation.
 * Single shared query via buildPersonSummaries — no double fetch.
 */
export async function getStreamDashboard(userId: string): Promise<StreamDashboardData> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Four parallel fetches: active person summaries, pending confirmation streams,
  // recently settled/forgiven records for the "Past" section, and activity feed.
  const [{ allPeople, totalOwedToMe, totalIOwe }, pendingRaw, closedRaw, activityRaw] = await Promise.all([
    buildPersonSummaries(userId),
    db
      .select()
      .from(streamRecords)
      .leftJoin(streamGuests, eq(streamRecords.counterpartGuestId, streamGuests.id))
      .where(
        and(
          eq(streamRecords.creatorId, userId),
          eq(streamRecords.status, "pending"),
        ),
      )
      .orderBy(desc(streamRecords.createdAt)),
    // Recently settled or forgiven streams (last 30 days), both directions
    db
      .select()
      .from(streamRecords)
      .leftJoin(streamGuests, eq(streamRecords.counterpartGuestId, streamGuests.id))
      .where(
        and(
          or(
            eq(streamRecords.creatorId, userId),
            eq(streamRecords.counterpartId, userId),
          ),
          inArray(streamRecords.status, ["settled", "forgiven"]),
          gte(streamRecords.updatedAt, thirtyDaysAgo),
        ),
      )
      .orderBy(desc(streamRecords.updatedAt)),
    // Activity feed — last 5 records by updatedAt (captures status changes)
    db
      .select()
      .from(streamRecords)
      .leftJoin(streamGuests, eq(streamRecords.counterpartGuestId, streamGuests.id))
      .where(
        or(
          eq(streamRecords.creatorId, userId),
          eq(streamRecords.counterpartId, userId),
        ),
      )
      .orderBy(desc(streamRecords.updatedAt))
      .limit(5),
  ]);

  // Resolve all counterpart names for pending + recently-closed + activity in a
  // SINGLE batch query. These three sections are independent, so collecting their
  // Clear-user IDs up front avoids three sequential round-trips.
  const nameIds = new Set<string>();
  for (const { stream_records: sr } of pendingRaw) {
    if (sr.counterpartId) nameIds.add(sr.counterpartId);
  }
  for (const { stream_records: sr } of closedRaw) {
    const id = sr.creatorId !== userId ? sr.creatorId : sr.counterpartId;
    if (id) nameIds.add(id);
  }
  for (const { stream_records: sr } of activityRaw) {
    const id = sr.creatorId !== userId ? sr.creatorId : sr.counterpartId;
    if (id && id !== userId) nameIds.add(id);
  }
  const nameMap = await batchGetUserNames([...nameIds]);

  const pending: EnrichedStreamRecord[] = pendingRaw.map(({ stream_records: sr, stream_guests: sg }) => {
    const personId = sr.counterpartId ?? sr.counterpartGuestId ?? "";
    const name     = sr.counterpartId
      ? (nameMap.get(sr.counterpartId) ?? "Someone")
      : (sg?.name ?? "Guest");
    return {
      ...sr,
      counterpartName: name,
      personId,
      counterpartType: (sr.counterpartId ? "user" : "guest") as "user" | "guest",
      netAmount: computeNet(sr, userId),
      settlements: [],
    };
  });

  // Build "recently closed" person summaries from the closed raw records.
  // Exclude people who still have an active balance (they're in owedToMe / iOwe).
  const activePeopleIds = new Set(allPeople.map((p) => p.personId));

  const closedPersonMap = new Map<string, ClosedPersonSummary>();
  for (const { stream_records: sr, stream_guests: sg } of closedRaw) {
    const isCreator  = sr.creatorId === userId;
    const personId   = isCreator
      ? (sr.counterpartId ?? sr.counterpartGuestId ?? "")
      : sr.creatorId;
    const personType = (isCreator ? (sr.counterpartId ? "user" : "guest") : "user") as "user" | "guest";
    const name       = personType === "guest" && sg
      ? sg.name
      : (nameMap.get(personId) ?? "Someone");

    if (!personId || activePeopleIds.has(personId)) continue; // skip if still active

    const prev = closedPersonMap.get(personId);
    const closedAt = new Date(sr.updatedAt);
    if (prev) {
      prev.closedCount++;
      prev.hadForgiven = prev.hadForgiven || sr.status === "forgiven";
      if (closedAt > prev.closedAt) prev.closedAt = closedAt;
    } else {
      closedPersonMap.set(personId, {
        personId,
        counterpartType: personType,
        name,
        currency:    sr.currency,
        closedAt,
        closedCount: 1,
        hadForgiven: sr.status === "forgiven",
      });
    }
  }

  const recentlyClosed = [...closedPersonMap.values()]
    .sort((a, b) => b.closedAt.getTime() - a.closedAt.getTime());

  // Activity event names come from the same up-front batch (nameMap).
  const recentActivity: StreamActivityEvent[] = activityRaw.map(({ stream_records: sr, stream_guests: sg }) => {
    const isCreator = sr.creatorId === userId;
    const personId  = isCreator
      ? (sr.counterpartId ?? sr.counterpartGuestId ?? "")
      : sr.creatorId;
    const personType: "user" | "guest" = isCreator
      ? (sr.counterpartId ? "user" : "guest")
      : "user";
    const name =
      personType === "guest" && sg
        ? sg.name
        : (nameMap.get(personId) ?? "Someone");

    return {
      id:              sr.id,
      personId,
      counterpartName: name,
      counterpartType: personType,
      amount:          Number(sr.amount),
      currency:        sr.currency,
      note:            sr.note,
      status:          sr.status,
      netAmount:       computeNet(sr, userId),
      isViewerCreator: isCreator,
      updatedAt:       new Date(sr.updatedAt),
      createdAt:       new Date(sr.createdAt),
    };
  });

  return {
    owedToMe:       allPeople.filter((p) => p.net > 0),
    iOwe:           allPeople.filter((p) => p.net < 0).map((p) => ({ ...p, net: Math.abs(p.net) })),
    pending,
    totalOwedToMe,
    totalIOwe,
    recentlyClosed,
    recentActivity,
  };
}


/**
 * All stream records between the current user and one specific person,
 * sorted newest-first. Includes settlement sub-records per stream.
 * Also returns UPI IDs for both parties for the UPI payment flow.
 * Used on the per-person timeline page.
 */
export async function getStreamWithPerson(
  userId: string,
  personId: string,
): Promise<{
  records:                 EnrichedStreamRecord[];
  person:                  PersonDetails | null;
  net:                     number;
  currency:                string;
  /** Current user's default UPI VPA — used by UpiRequestButton on creditor path */
  myDefaultVpa:            string | null;
  /** Counterpart's default UPI VPA — used by UpiPayButton on debtor path */
  counterpartDefaultVpa:   string | null;
  /** All of counterpart's VPAs (for app picker label) */
  counterpartAllVpas:      string[];
}> {
  const emptyResult = {
    records: [] as EnrichedStreamRecord[],
    person: null,
    net: 0,
    currency: "INR",
    myDefaultVpa: null,
    counterpartDefaultVpa: null,
    counterpartAllVpas: [] as string[],
  };

  const person = await getPersonDetails(personId, userId);
  if (!person) return emptyResult;

  const isGuest = person.type === "guest";

  // Parallel-fetch records and UPI IDs
  const [rawRecords, myUpiRows, counterpartUpiRows] = await Promise.all([
    db
      .select()
      .from(streamRecords)
      .where(
        or(
          // Current user is creator, person is counterpart
          and(
            eq(streamRecords.creatorId, userId),
            isGuest
              ? eq(streamRecords.counterpartGuestId, personId)
              : eq(streamRecords.counterpartId, personId),
          ),
          // Current user is counterpart, person is creator (Clear user only)
          ...(!isGuest
            ? [and(
                eq(streamRecords.creatorId, personId),
                eq(streamRecords.counterpartId, userId),
              )]
            : []),
        ),
      )
      .orderBy(desc(streamRecords.createdAt)),

    // Current user's UPI IDs (always fetch — shown in request link)
    db
      .select({ upiId: userUpiIds.upiId, isDefault: userUpiIds.isDefault })
      .from(userUpiIds)
      .where(eq(userUpiIds.userId, userId))
      .orderBy(desc(userUpiIds.isDefault), desc(userUpiIds.createdAt)),

    // Counterpart UPI IDs (only for Clear users)
    isGuest
      ? Promise.resolve([] as { upiId: string; isDefault: boolean }[])
      : db
          .select({ upiId: userUpiIds.upiId, isDefault: userUpiIds.isDefault })
          .from(userUpiIds)
          .where(eq(userUpiIds.userId, personId))
          .orderBy(desc(userUpiIds.isDefault), desc(userUpiIds.createdAt)),
  ]);

  // Resolve UPI VPAs
  const myDefaultVpa          = myUpiRows.find((r) => r.isDefault)?.upiId ?? myUpiRows[0]?.upiId ?? null;
  const counterpartDefaultVpa = counterpartUpiRows.find((r) => r.isDefault)?.upiId ?? counterpartUpiRows[0]?.upiId ?? null;
  const counterpartAllVpas    = counterpartUpiRows.map((r) => r.upiId);

  if (rawRecords.length === 0) {
    return { ...emptyResult, person, myDefaultVpa, counterpartDefaultVpa, counterpartAllVpas };
  }

  // Fetch all settlements for these stream IDs
  const streamIds = rawRecords.map((r) => r.id);
  const allSettlements = await db
    .select()
    .from(streamSettlements)
    .where(inArray(streamSettlements.streamId, streamIds))
    .orderBy(asc(streamSettlements.settledAt));

  const settlementsByStream = new Map<string, StreamSettlement[]>();
  for (const s of allSettlements) {
    const existing = settlementsByStream.get(s.streamId) ?? [];
    existing.push(s);
    settlementsByStream.set(s.streamId, existing);
  }

  let totalNet = 0;
  const enriched: EnrichedStreamRecord[] = rawRecords.map((sr) => {
    const net = computeNet(sr, userId);
    // Only count active statuses toward the live balance
    if (ACTIVE_STATUSES.includes(sr.status as typeof ACTIVE_STATUSES[number])) {
      totalNet += net;
    }
    return {
      ...sr,
      counterpartName: person.name,
      personId,
      counterpartType: person.type,
      netAmount: net,
      settlements: settlementsByStream.get(sr.id) ?? [],
    };
  });

  return {
    records: enriched,
    person,
    net: totalNet,
    currency: rawRecords[0].currency,
    myDefaultVpa,
    counterpartDefaultVpa,
    counterpartAllVpas,
  };
}


/**
 * Resolve a URL personId param to a named person.
 * Tries stream_guests first (created by this user), then Clear users
 * who have appeared in shared stream records.
 */
export async function getPersonDetails(
  personId: string,
  currentUserId: string,
): Promise<PersonDetails | null> {
  // 1. Try as a guest
  const [guest] = await db
    .select()
    .from(streamGuests)
    .where(
      and(
        eq(streamGuests.id, personId),
        eq(streamGuests.createdBy, currentUserId),
      ),
    )
    .limit(1);

  if (guest) return { personId: guest.id, type: "guest", name: guest.name };

  // 2. Try as a Clear user — look them up via shared stream records
  const [sharedRecord] = await db
    .select({ counterpartId: streamRecords.counterpartId, creatorId: streamRecords.creatorId })
    .from(streamRecords)
    .where(
      and(
        or(
          and(eq(streamRecords.creatorId, currentUserId), eq(streamRecords.counterpartId, personId)),
          and(eq(streamRecords.creatorId, personId), eq(streamRecords.counterpartId, currentUserId)),
        ),
      ),
    )
    .limit(1);

  if (!sharedRecord) return null;

  const nameMap = await batchGetUserNames([personId]);
  const name = nameMap.get(personId);
  if (!name) return null;

  return { personId, type: "user", name };
}


/**
 * Look up a stream record by its confirmation token.
 * Returns null if the token doesn't exist, is expired, or is already resolved.
 * Used by the public guest confirmation page — no auth required.
 */
export async function getStreamByConfirmToken(token: string): Promise<{
  record: StreamRecord;
  creatorName: string;
} | null> {
  const [row] = await db
    .select()
    .from(streamRecords)
    .where(eq(streamRecords.confirmToken, token))
    .limit(1);

  if (!row) return null;

  // Expired check
  if (row.confirmTokenExpiresAt && new Date(row.confirmTokenExpiresAt) < new Date()) {
    return null; // let the page show "link expired" state
  }

  const nameMap = await batchGetUserNames([row.creatorId]);
  const creatorName = nameMap.get(row.creatorId) ?? "Someone";

  return { record: row, creatorName };
}


/**
 * Look up a stream record by confirmation token for the PUBLIC confirm page.
 * Returns the record regardless of expiry so the page can show the right state.
 * No auth required — token is the access mechanism.
 */
export async function getStreamForConfirmPage(token: string): Promise<{
  record: StreamRecord;
  creatorName: string;
  isExpired: boolean;
  isAlreadyResolved: boolean;
} | null> {
  const [row] = await db
    .select()
    .from(streamRecords)
    .where(eq(streamRecords.confirmToken, token))
    .limit(1);

  if (!row) return null;

  const isExpired = !!(
    row.confirmTokenExpiresAt &&
    new Date(row.confirmTokenExpiresAt) < new Date()
  );
  const isAlreadyResolved = row.status !== "pending";

  const nameMap   = await batchGetUserNames([row.creatorId]);
  const creatorName = nameMap.get(row.creatorId) ?? "Someone";

  return { record: row, creatorName, isExpired, isAlreadyResolved };
}


/**
 * Returns the 5 most recent unique people the user has Streamed with.
 * Used in the log sheet "Recents" section.
 */
export async function getRecentStreamCounterparts(
  userId: string,
): Promise<{ personId: string; type: "user" | "guest"; name: string }[]> {
  const recent = await db
    .select()
    .from(streamRecords)
    .leftJoin(streamGuests, eq(streamRecords.counterpartGuestId, streamGuests.id))
    .where(
      or(
        eq(streamRecords.creatorId, userId),
        eq(streamRecords.counterpartId, userId),
      ),
    )
    .orderBy(desc(streamRecords.createdAt))
    .limit(30); // fetch more than needed to deduplicate

  const seen   = new Set<string>();
  const result: { personId: string; type: "user" | "guest"; name: string }[] = [];

  const clearUserIds: string[] = [];

  for (const { stream_records: sr, stream_guests: sg } of recent) {
    const isCreator  = sr.creatorId === userId;
    const personId   = isCreator ? (sr.counterpartId ?? sr.counterpartGuestId ?? "") : sr.creatorId;
    const personType = isCreator ? (sr.counterpartId ? "user" : "guest") : "user";

    if (!personId || seen.has(personId)) continue;
    seen.add(personId);

    if (personType === "guest" && sg) {
      result.push({ personId, type: "guest", name: sg.name });
    } else if (personType === "user") {
      clearUserIds.push(personId);
      result.push({ personId, type: "user", name: "" }); // name filled below
    }

    if (result.length >= 5) break;
  }

  if (clearUserIds.length > 0) {
    const nameMap = await batchGetUserNames(clearUserIds);
    for (const item of result) {
      if (item.type === "user" && !item.name) {
        item.name = nameMap.get(item.personId) ?? "Someone";
      }
    }
  }

  return result.filter((r) => r.name);
}


/**
 * Search for people the user can log a Stream with.
 * Returns Clear users who share at least one group with the current user,
 * plus guests created by the current user — filtered by name query.
 */
export async function searchStreamableUsers(
  userId: string,
  query: string,
): Promise<{ personId: string; type: "user" | "guest"; name: string }[]> {
  const q = `%${query.toLowerCase()}%`;

  // Group members who share a group with the user (Clear users only)
  const groupUserRows = await db
    .selectDistinctOn([groupMembers.userId], {
      userId:      groupMembers.userId,
      displayName: groupMembers.displayName,
      guestName:   groupMembers.guestName,
    })
    .from(groupMembers)
    .where(
      and(
        isNotNull(groupMembers.userId),
        ne(groupMembers.userId, userId),
        sql`lower(coalesce(${groupMembers.displayName}, ${groupMembers.guestName}, '')) LIKE ${q}`,
        // Must share a group with the current user
        sql`${groupMembers.groupId} IN (
          SELECT group_id FROM group_members WHERE user_id = ${userId}
        )`,
      ),
    )
    .orderBy(groupMembers.userId, desc(groupMembers.joinedAt))
    .limit(8);

  // Guests created by this user
  const guestRows = await db
    .select()
    .from(streamGuests)
    .where(
      and(
        eq(streamGuests.createdBy, userId),
        sql`lower(${streamGuests.name}) LIKE ${q}`,
      ),
    )
    .orderBy(desc(streamGuests.createdAt))
    .limit(5);

  const users = groupUserRows
    .filter((r) => r.userId)
    .map((r) => ({
      personId: r.userId!,
      type: "user" as const,
      name: r.displayName ?? r.guestName ?? "Unknown",
    }));

  const guests = guestRows.map((g) => ({
    personId: g.id,
    type: "guest" as const,
    name: g.name,
  }));

  return [...users, ...guests].slice(0, 10);
}
