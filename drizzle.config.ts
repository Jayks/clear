import { config } from "dotenv";
config({ path: ".env.local" });

import type { Config } from "drizzle-kit";

export default {
  schema: "./lib/db/schema",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
