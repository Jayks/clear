import { describe, it, expect } from "vitest";
import { CONTEXT_THEME, getContextTheme, type ContextKey } from "./context-theme";

const KEYS: ContextKey[] = ["trip", "nest", "stream", "circle_recurring", "circle_onetime"];

describe("CONTEXT_THEME", () => {
  it("every entry has all non-empty class fields", () => {
    for (const key of KEYS) {
      const t = CONTEXT_THEME[key];
      expect(t.key).toBe(key);
      for (const field of ["gradient", "headerBadgeBg", "headerIcon", "rule", "tint", "accentText"] as const) {
        expect(t[field].length).toBeGreaterThan(0);
      }
    }
  });

  it("the five identities use five distinct hues", () => {
    const hues = KEYS.map((k) => CONTEXT_THEME[k].gradient.match(/from-(\w+)-/)?.[1]);
    expect(new Set(hues).size).toBe(5);
    expect(hues).toEqual(["cyan", "emerald", "blue", "violet", "amber"]);
  });
});

describe("getContextTheme", () => {
  it("maps the group types", () => {
    expect(getContextTheme("trip").key).toBe("trip");
    expect(getContextTheme("nest").key).toBe("nest");
    expect(getContextTheme("stream").key).toBe("stream");
  });

  it("splits circles by mode", () => {
    expect(getContextTheme("circle", "recurring").key).toBe("circle_recurring");
    expect(getContextTheme("circle", "one_time").key).toBe("circle_onetime");
    expect(getContextTheme("circle", null).key).toBe("circle_recurring"); // default
    expect(getContextTheme("circle").key).toBe("circle_recurring");
  });

  it("falls back to trip for anything unknown", () => {
    expect(getContextTheme("wat").key).toBe("trip");
  });
});
