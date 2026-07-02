import { config } from "dotenv";
config({ path: ".env.local" }); // same pattern as drizzle.config.ts — drizzle-kit/vitest don't auto-load .env.local

import { defineConfig } from "vitest/config";
import path from "path";

// Minimal config — the project has no build-time bundler config for tests
// otherwise. Adds `@/*` alias resolution (matches tsconfig.json's "paths") so
// action/lib files that import via "@/..." can be exercised directly from
// Vitest, not just pure-relative-import unit tests.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      // See lib/testing/server-only-stub.ts for why this alias exists.
      "server-only": path.resolve(__dirname, "lib/testing/server-only-stub.ts"),
    },
  },
  test: {
    // jsdom is a superset of node for our purposes — plain lib/*.test.ts logic
    // tests are unaffected, and it unlocks React Testing Library component
    // tests (mark-paid-button, circle-contribute-action, the lightbox, hooks)
    // in the same suite without a second Vitest project/config.
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
  },
});
