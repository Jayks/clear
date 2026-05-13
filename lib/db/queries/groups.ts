import { db } from "@/lib/db/client";
import { groups } from "@/lib/db/schema/groups";
import { groupMembers } from "@/lib/db/schema/group-members";
import { eq, and, count, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/db/queries/auth";

export async function getGroups() {
  const user = await getCurrentUser();
  if (!user) return [];

  const rows = await db
    .select({
      group: groups,
      memberCount: sql<number>`(select count(*) from group_members where group_members.group_id = ${groups.id})`,
    })
    .from(groups)
    .innerJoin(groupMembers, eq(groups.id, groupMembers.groupId))
    .where(and(eq(groupMembers.userId, user.id), eq(groups.isArchived, false)))
    .groupBy(groups.id)
    .orderBy(
      sql`case when ${groups.isDemo} then 0 else 1 end`,
      sql`case when ${groups.startDate} >= current_date then 0 else 1 end`,
      sql`case when ${groups.startDate} >= current_date then ${groups.startDate} end asc`,
      sql`case when ${groups.startDate} < current_date or ${groups.startDate} is null then ${groups.createdAt} end desc`
    );

  return rows;
}

export async function getArchivedGroups() {
  const user = await getCurrentUser();
  if (!user) return [];

  return db
    .select({
      group: groups,
      memberCount: sql<number>`(select count(*) from group_members where group_members.group_id = ${groups.id})`,
    })
    .from(groups)
    .innerJoin(groupMembers, eq(groups.id, groupMembers.groupId))
    .where(and(eq(groupMembers.userId, user.id), eq(groups.isArchived, true)))
    .groupBy(groups.id)
    .orderBy(sql`${groups.createdAt} desc`);
}

export async function getGroupWithMembers(groupId: string) {
  const user = await getCurrentUser();
  if (!user) return null;

  const [membership] = await db
    .select()
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, user.id)));

  if (!membership) return null;

  const [[group], rawMembers] = await Promise.all([
    db.select().from(groups).where(eq(groups.id, groupId)),
    db.select().from(groupMembers).where(eq(groupMembers.groupId, groupId)).orderBy(groupMembers.joinedAt),
  ]);

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
