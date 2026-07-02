// Verifies the audit fix: this route now uses the shared getCurrentUser()
// (React cache()-wrapped, validated) instead of a raw supabase.auth.getUser()
// call, matching CLAUDE.md's single-trust-boundary rule. A behavioural
// regression test: an unauthenticated caller must still get 401.
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db/queries/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/db/queries/auth")>();
  return {
    ...actual,
    getCurrentUser: vi.fn(async () => null),
  };
});

const { GET } = await import("./route");

describe("GET /api/groups/[id]/export", () => {
  it("returns 401 when there is no authenticated user", async () => {
    const res = await GET(new Request("http://localhost/api/groups/abc/export"), {
      params: Promise.resolve({ id: crypto.randomUUID() }),
    });
    expect(res.status).toBe(401);
  });
});
