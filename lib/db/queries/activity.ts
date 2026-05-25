import { db } from "@/lib/db/client";
import { sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";

export type ActivityEvent =
  | {
      type: "expense";
      id: string;
      activityAt: Date;
      actorMemberId: string;
      actorName: string;
      description: string;
      amount: number;
      currency: string;
      category: string;
    }
  | {
      type: "settlement";
      id: string;
      activityAt: Date;
      actorMemberId: string;
      actorName: string;
      otherMemberId: string;
      otherName: string;
      amount: number;
      currency: string;
    }
  | {
      type: "member_joined";
      id: string;
      activityAt: Date;
      actorMemberId: string;
      actorName: string;
    }
  | {
      type: "dispute";
      id: string;
      activityAt: Date;
      actorMemberId: string;
      actorName: string;
      /** The expense description this dispute is on */
      description: string;
      /** "question" | "remove_me" | "change_share" | "split_equal" | "other" */
      category: string;
      expenseId: string;
    };

async function _fetchActivity(groupId: string, limit: number): Promise<ActivityEvent[]> {
  const rows = await db.execute<{
    type: string;
    id: string;
    activity_at: string;
    actor_member_id: string;
    actor_name: string;
    description: string | null;
    amount: string | null;
    currency: string | null;
    category: string | null;
    other_member_id: string | null;
    other_name: string | null;
  }>(sql`
    SELECT
      'expense'                                                       AS type,
      e.id,
      e.created_at                                                    AS activity_at,
      m.id                                                            AS actor_member_id,
      COALESCE(m.display_name, m.guest_name, 'Member')               AS actor_name,
      e.description,
      e.amount::text                                                  AS amount,
      e.currency,
      e.category,
      NULL::uuid                                                      AS other_member_id,
      NULL::text                                                      AS other_name
    FROM expenses e
    JOIN group_members m ON m.id = e.paid_by_member_id
    WHERE e.group_id = ${groupId} AND e.is_template = false

    UNION ALL

    SELECT
      'settlement'                                                    AS type,
      s.id,
      s.settled_at                                                    AS activity_at,
      m_from.id                                                       AS actor_member_id,
      COALESCE(m_from.display_name, m_from.guest_name, 'Member')     AS actor_name,
      NULL::text                                                      AS description,
      s.amount::text                                                  AS amount,
      s.currency,
      NULL::text                                                      AS category,
      m_to.id                                                         AS other_member_id,
      COALESCE(m_to.display_name, m_to.guest_name, 'Member')         AS other_name
    FROM settlements s
    JOIN group_members m_from ON m_from.id = s.from_member_id
    JOIN group_members m_to   ON m_to.id   = s.to_member_id
    WHERE s.group_id = ${groupId}

    UNION ALL

    SELECT
      'member_joined'                                                 AS type,
      gm.id,
      gm.joined_at                                                    AS activity_at,
      gm.id                                                           AS actor_member_id,
      COALESCE(gm.display_name, gm.guest_name, 'Member')             AS actor_name,
      NULL::text                                                      AS description,
      NULL::text                                                      AS amount,
      NULL::text                                                      AS currency,
      NULL::text                                                      AS category,
      NULL::uuid                                                      AS other_member_id,
      NULL::text                                                      AS other_name
    FROM group_members gm
    WHERE gm.group_id = ${groupId}
      AND (
        SELECT COUNT(*)
        FROM expenses e2
        WHERE e2.group_id = ${groupId} AND e2.is_template = false
      ) < 10

    UNION ALL

    SELECT
      'dispute'                                                       AS type,
      d.id,
      d.created_at                                                    AS activity_at,
      m.id                                                            AS actor_member_id,
      COALESCE(m.display_name, m.guest_name, 'Member')               AS actor_name,
      e.description,
      NULL::text                                                      AS amount,
      NULL::text                                                      AS currency,
      d.dispute_type                                                  AS category,
      e.id                                                            AS other_member_id,
      NULL::text                                                      AS other_name
    FROM expense_disputes d
    JOIN expenses e    ON e.id  = d.expense_id
    JOIN group_members m ON m.id = d.requester_member_id
    WHERE e.group_id = ${groupId}
      AND d.status   = 'pending'

    ORDER BY activity_at DESC
    LIMIT ${limit}
  `);

  return Array.from(rows).map((row): ActivityEvent => {
    const base = {
      id: row.id,
      activityAt: new Date(row.activity_at),
      actorMemberId: row.actor_member_id,
      actorName: row.actor_name,
    };

    if (row.type === "expense") {
      return {
        ...base,
        type: "expense",
        description: row.description ?? "",
        amount: Number(row.amount ?? 0),
        currency: row.currency ?? "INR",
        category: row.category ?? "other",
      };
    }

    if (row.type === "settlement") {
      return {
        ...base,
        type: "settlement",
        otherMemberId: row.other_member_id ?? "",
        otherName: row.other_name ?? "Member",
        amount: Number(row.amount ?? 0),
        currency: row.currency ?? "INR",
      };
    }

    if (row.type === "dispute") {
      return {
        ...base,
        type: "dispute",
        description: row.description ?? "",
        category: row.category ?? "other",
        expenseId: row.other_member_id ?? "",
      };
    }

    return { ...base, type: "member_joined" };
  });
}

export async function getGroupActivity(
  groupId: string,
  limit: 3 | 5 = 3
): Promise<ActivityEvent[]> {
  const fetchActivity = unstable_cache(
    async () => _fetchActivity(groupId, limit),
    ["activity", groupId, String(limit)],
    { tags: [`group-${groupId}`, `balances-${groupId}`] }
  );
  return fetchActivity();
}
