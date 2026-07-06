// Round 16 fix #17: a malformed request body made req.json() throw,
// surfacing as a bare 500 instead of a normal 400. Push subscribe/unsubscribe
// run from the client's own fetch calls (usePushSubscription), so a
// corrupted payload is plausible.
import { describe, it, expect, vi } from "vitest";

const TEST_USER_ID = crypto.randomUUID();

vi.mock("@/lib/db/queries/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/db/queries/auth")>();
  return {
    ...actual,
    getCurrentUser: vi.fn(async () => ({ id: TEST_USER_ID, user_metadata: {} }) as never),
  };
});

vi.mock("@/lib/db/client", () => ({
  db: {
    insert: () => ({
      values: () => ({
        onConflictDoUpdate: vi.fn(async () => {}),
      }),
    }),
  },
}));

const { POST } = await import("./route");

describe("POST /api/push/subscribe", () => {
  it("returns 400 (not 500) for a malformed JSON body", async () => {
    const req = new Request("http://localhost/api/push/subscribe", {
      method: "POST",
      body: "{not valid json",
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
  });

  it("returns 400 when the body is valid JSON but missing subscription fields", async () => {
    const req = new Request("http://localhost/api/push/subscribe", {
      method: "POST",
      body: JSON.stringify({ endpoint: "https://example.com" }), // missing keys
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
  });

  it("returns 200 for a well-formed subscription body", async () => {
    const req = new Request("http://localhost/api/push/subscribe", {
      method: "POST",
      body: JSON.stringify({ endpoint: "https://example.com", keys: { p256dh: "abc", auth: "def" } }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req as never);
    expect(res.status).toBe(200);
  });
});
