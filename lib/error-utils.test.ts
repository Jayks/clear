import { describe, it, expect } from "vitest";
import { classifyError, MAX_QUICK_RETRIES, type ClassifiedError } from "./error-utils";

const err = (digest?: string): Error & { digest?: string } => {
  const e = new Error("boom") as Error & { digest?: string };
  if (digest) e.digest = digest;
  return e;
};

function expectShape(c: ClassifiedError) {
  expect(c.title.length).toBeGreaterThan(0);
  expect(c.message.length).toBeGreaterThan(0);
}

describe("classifyError", () => {
  it("offline when isOnline=false (no error object)", () => {
    const c = classifyError(null, false);
    expect(c.kind).toBe("offline");
    expectShape(c);
  });

  it("offline even when an error object is present", () => {
    const c = classifyError(err(), false);
    expect(c.kind).toBe("offline");
  });

  it("offline takes priority over a high retry count", () => {
    const c = classifyError(err(), false, 99);
    expect(c.kind).toBe("offline");
  });

  it("generic when online with zero attempts", () => {
    const c = classifyError(err(), true, 0);
    expect(c.kind).toBe("generic");
    expectShape(c);
  });

  it("generic when online and attempts below the quick-retry cap", () => {
    const c = classifyError(err(), true, MAX_QUICK_RETRIES - 1);
    expect(c.kind).toBe("generic");
  });

  it("persistent once attempts reach the quick-retry cap", () => {
    const c = classifyError(err(), true, MAX_QUICK_RETRIES);
    expect(c.kind).toBe("persistent");
    expectShape(c);
  });

  it("persistent for attempts well past the cap", () => {
    const c = classifyError(err(), true, MAX_QUICK_RETRIES + 5);
    expect(c.kind).toBe("persistent");
  });

  it("does NOT over-classify: a digest (prod server error) is still generic, not a special kind", () => {
    const c = classifyError(err("a1b2c3"), true, 0);
    expect(c.kind).toBe("generic");
  });

  it("defaults attemptCount to 0 when omitted", () => {
    const c = classifyError(err(), true);
    expect(c.kind).toBe("generic");
  });

  it("handles undefined error defensively", () => {
    const c = classifyError(undefined, true, 0);
    expect(c.kind).toBe("generic");
    expectShape(c);
  });

  it("every kind produces non-empty title and message", () => {
    expectShape(classifyError(err(), false));            // offline
    expectShape(classifyError(err(), true, 0));           // generic
    expectShape(classifyError(err(), true, 9));           // persistent
  });
});
