import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { groups, groupTypeEnum } from "./schema/groups";
import { groupMembers, memberRoleEnum } from "./schema/group-members";
import { expenses } from "./schema/expenses";
import { expenseSplits, splitTypeEnum } from "./schema/expense-splits";
import { settlements } from "./schema/settlements";

declare global {
  // eslint-disable-next-line no-var
  var _pgClient: postgres.Sql | undefined;
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

// Reuse a single postgres client across Next.js HMR reloads in development.
// Without this, each hot-reload spawns a new pool and exhausts Supabase's
// connection slots on the free tier.
// idle_timeout releases unused connections quickly — critical in dev where
// Turbopack may spin up multiple module instances each with their own pool.
const client =
  globalThis._pgClient ??
  postgres(connectionString, {
    prepare: false,
    max: process.env.NODE_ENV === "production" ? 3 : 1,
    idle_timeout: 20,    // seconds — release idle connections back to the pool
    connect_timeout: 10, // seconds — fail fast rather than queue indefinitely
  });

if (process.env.NODE_ENV !== "production") {
  globalThis._pgClient = client;
}

export const db = drizzle(client, {
  schema: { groups, groupTypeEnum, groupMembers, memberRoleEnum, expenses, expenseSplits, splitTypeEnum, settlements },
});
