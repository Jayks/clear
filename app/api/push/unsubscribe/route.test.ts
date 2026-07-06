// Round 16 fix #17: same malformed-body guard as the subscribe route.
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
    delete: () => ({
      where: vi.fn(async () => {}),
    }),
  },
}));

const { DELETE } = await import("./route");

describe("DELETE /api/push/unsubscribe", () => {
  it("returns 400 (not 500) for a malformed JSON body", async () => {
    const req = new Request("http://localhost/api/push/unsubscribe", {
      method: "DELETE",
      body: "{not valid json",
      headers: { "Content-Type": "application/json" },
    });
    const res = await DELETE(req as never);
    expect(res.status).toBe(400);
  });

  it("returns 400 when the body is valid JSON but missing endpoint", async () => {
    const req = new Request("http://localhost/api/push/unsubscribe", {
      method: "DELETE",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });
    const res = await DELETE(req as never);
    expect(res.status).toBe(400);
  });

  it("returns 200 for a well-formed body", async () => {
    const req = new Request("http://localhost/api/push/unsubscribe", {
      method: "DELETE",
      body: JSON.stringify({ endpoint: "https://example.com" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await DELETE(req as never);
    expect(res.status).toBe(200);
  });
});
