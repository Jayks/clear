import { describe, it, expect } from "vitest";
import { buildStreamConfirmMessage } from "./share-message";

const base = {
  creatorFirstName: "Priya",
  amount:           650,
  currency:         "INR",
  note:             null as string | null,
  confirmUrl:       "https://clearoff.in/stream/confirm/abc-123",
};

describe("buildStreamConfirmMessage", () => {
  it("they_owe_me — message addresses the guest as the one who owes", () => {
    const msg = buildStreamConfirmMessage({ ...base, direction: "they_owe_me" });
    expect(msg).toContain("You owe");
    expect(msg).not.toContain("owes you");
  });

  it("i_owe_them — message says the creator owes the guest, NOT 'You owe'", () => {
    const msg = buildStreamConfirmMessage({ ...base, direction: "i_owe_them" });
    expect(msg).toContain("Priya owes you");
    expect(msg).not.toContain("You owe");
  });

  it("note: null — no dangling 'for' clause", () => {
    const msg = buildStreamConfirmMessage({ ...base, direction: "they_owe_me", note: null });
    expect(msg).not.toMatch(/\bfor\b/);
  });

  it("note set — included in the owed line", () => {
    const msg = buildStreamConfirmMessage({ ...base, direction: "they_owe_me", note: "lunch" });
    expect(msg).toContain("for lunch");
  });

  it("confirmUrl appears verbatim in the output", () => {
    const msg = buildStreamConfirmMessage({ ...base, direction: "they_owe_me" });
    expect(msg).toContain(base.confirmUrl);
  });

  it("amount renders via formatCurrency, not a raw float", () => {
    const msg = buildStreamConfirmMessage({ ...base, amount: 1234, direction: "they_owe_me" });
    expect(msg).not.toContain("1234.00");
    expect(msg).toMatch(/1,234|1234/); // formatCurrency output, locale-dependent grouping
  });
});
