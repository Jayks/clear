import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { trips } from "./schema/trips";
import { tripMembers, memberRoleEnum } from "./schema/trip-members";
import { expenses, categoryEnum } from "./schema/expenses";
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
const client =
  globalThis._pgClient ??
  postgres(connectionString, {
    prepare: false,
    max: 3, // keep well within Supabase free-tier limits
  });

if (process.env.NODE_ENV !== "production") {
  globalThis._pgClient = client;
}

export const db = drizzle(client, {
  schema: { trips, tripMembers, memberRoleEnum, expenses, categoryEnum, expenseSplits, splitTypeEnum, settlements },
});
