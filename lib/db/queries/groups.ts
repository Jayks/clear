import { db } from "@/lib/db/client";
import { groups } from "@/lib/db/schema/groups";
import type { Group } from "@/lib/db/schema/groups";
import { groupMembers } from "@/lib/db/schema/group-members";
import { eq, and, count, inArray, sql, getTableColumns } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { getCurrentUser, getMembership } from "@/lib/db/queries/auth";

const { itinerary: _itinerary, ...groupCoreColumns } = getTableColumns(groups);

async function getUserGroupIds(userId: string): Promise<string[]> {
  const rows = await db
    .select({ groupId: groupMembers.groupId })
    .from(groupMembers)
    .where(eq(groupMembers.userId, userId));
  return rows.map((r) => r.groupId);
}

async function getMemberCounts(groupIds: string[]): Promise<Map<string, number>> {
  const rows = await db
    .select({ groupId: groupMembers.groupId, cnt: count() })
    .from(groupMembers)
    .where(inArray(groupMembers.groupId, groupIds))
    .groupBy(groupMembers.groupId);
  return new Map(rows.map((r) => [r.groupId, Number(r.cnt)]));
}

export async function getGroups() {
  const user = await getCurrentUser();
  if (!user) return [];

  const groupIds = await getUserGroupIds(user.id);
  if (groupIds.length === 0) return [];

  const [groupRows, countMap] = await Promise.all([
    db.select().from(groups)
      .where(and(inArray(groups.id, groupIds), eq(groups.isArchived, false)))
      .orderBy(
        sql`case when ${groups.isDemo} then 0 else 1 end`,
        sql`case when ${groups.startDate} >= current_date then 0 else 1 end`,
        sql`case when ${groups.startDate} >= current_date then ${groups.startDate} end asc`,
        sql`case when ${groups.startDate} < current_date or ${groups.startDate} is null then ${groups.createdAt} end desc`
      ),
    getMemberCounts(groupIds),
  ]);

  return groupRows.map((group) => ({ group, memberCount: countMap.get(group.id) ?? 0 }));
}

export async function getArchivedGroups() {
  const user = await getCurrentUser();
  if (!user) return [];

  const groupIds = await getUserGroupIds(user.id);
  if (groupIds.length === 0) return [];

  const [groupRows, countMap] = await Promise.all([
    db.select().from(groups)
      .where(and(inArray(groups.id, groupIds), eq(groups.isArchived, true)))
      .orderBy(sql`${groups.createdAt} desc`),
    getMemberCounts(groupIds),
  ]);

  return groupRows.map((group) => ({ group, memberCount: countMap.get(group.id) ?? 0 }));
}

export async function getAllGroups() {
  const user = await getCurrentUser();
  if (!user) return { active: [], archived: [] };

  const groupIds = await getUserGroupIds(user.id);
  if (groupIds.length === 0) return { active: [], archived: [] };

  const [groupRows, countMap] = await Promise.all([
    db.select().from(groups)
      .where(inArray(groups.id, groupIds))
      .orderBy(
        sql`case when ${groups.isDemo} then 0 else 1 end`,
        sql`case when ${groups.startDate} >= current_date then 0 else 1 end`,
        sql`case when ${groups.startDate} >= current_date then ${groups.startDate} end asc`,
        sql`case when ${groups.startDate} < current_date or ${groups.startDate} is null then ${groups.createdAt} end desc`
      ),
    getMemberCounts(groupIds),
  ]);

  const active: { group: Group; memberCount: number }[] = [];
  const archived: { group: Group; memberCount: number }[] = [];
  for (const group of groupRows) {
    const item = { group, memberCount: countMap.get(group.id) ?? 0 };
    if (group.isArchived) archived.push(item);
    else active.push(item);
  }
  archived.sort((a, b) => new Date(b.group.createdAt).getTime() - new Date(a.group.createdAt).getTime());
  return { active, archived };
}

export async function getGroupWithMembers(groupId: string, opts: { full?: boolean } = {}) {
  const user = await getCurrentUser();
  if (!user) return null;

  const membership = await getMembership(groupId, user.id);
  if (!membership) return null;

  const full = opts.full ?? false;
  const fetchGroupData = unstable_cache(
    async () => {
      const groupQuery = full
        ? db.select().from(groups).where(eq(groups.id, groupId))
        : db.select({ ...groupCoreColumns, itinerary: sql<string | null>`null` }).from(groups).where(eq(groups.id, groupId));

      const [groupRows, rawMembers] = await Promise.all([
        groupQuery,
        db.select().from(groupMembers).where(eq(groupMembers.groupId, groupId)).orderBy(groupMembers.joinedAt),
      ]);
      return { groupRows: groupRows as unknown as Group[], rawMembers };
    },
    ['group-with-members', groupId, full ? 'full' : 'basic'],
    { tags: [`group-${groupId}`] }
  );

  const { groupRows, rawMembers } = await fetchGroupData();
  const group = groupRows[0];

  if (!group) return null;

  const sessionName =
    (user.user_metadata?.full_name as string | undefined) ??
    user.email?.split("@")[0] ??
    null;

  const members = rawMembers.map((m) =>
    m.userId === user.id && !m.displayName
      ? { ...m, displayName: sessionName }
      : m
  );

  return { group, members, currentMember: { ...membership, displayName: membership.displayName ?? sessionName }, currentUser: user };
}

export async function getGroupByToken(token: string) {
  const [group] = await db
    .select()
    .from(groups)
    .where(eq(groups.shareToken, token));

  if (!group) return null;

  const [{ memberCount }] = await db
    .select({ memberCount: count(groupMembers.id) })
    .from(groupMembers)
    .where(eq(groupMembers.groupId, group.id));

  return { group, memberCount };
}
