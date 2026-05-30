import { z } from "zod";

// ── Log a new Stream ──────────────────────────────────────────────────────────

export const logStreamSchema = z
  .object({
    // Exactly one counterpart source must be provided (enforced in superRefine):
    counterpartId:      z.string().uuid().optional(),       // existing Clear user
    counterpartGuestId: z.string().uuid().optional(),       // existing stream_guest
    // Inline guest creation — used when neither ID is available:
    guestName:  z.string().min(1).max(80).optional(),
    guestEmail: z.string().email().optional(),
    guestPhone: z.string().max(15).optional(),
    // Core fields:
    amount:    z.number().positive().max(9_999_999),
    currency:  z.string().min(1).max(10).default("INR"),
    direction: z.enum(["they_owe_me", "i_owe_them"]),
    note:      z.string().max(200).optional(),
  })
  .superRefine((data, ctx) => {
    const idSources = [data.counterpartId, data.counterpartGuestId, data.guestName].filter(Boolean);
    if (idSources.length === 0) {
      ctx.addIssue({ code: "custom", path: ["counterpartId"], message: "Pick or add a person" });
    }
    if (idSources.length > 1) {
      ctx.addIssue({ code: "custom", path: ["counterpartId"], message: "Only one counterpart allowed" });
    }
  });

export type LogStreamInput = z.infer<typeof logStreamSchema>;


// ── Settle a Stream ───────────────────────────────────────────────────────────

export const settleStreamSchema = z.object({
  streamId: z.string().uuid(),
  amount:   z.number().positive().max(9_999_999),
  note:     z.string().max(200).optional(),
});

export type SettleStreamInput = z.infer<typeof settleStreamSchema>;


// ── Dispute (from guest confirm page) ────────────────────────────────────────

export const disputeStreamSchema = z.object({
  token:  z.string().uuid(),
  reason: z.enum(["wrong_amount", "already_paid", "dont_recognize", "other"]),
  note:   z.string().max(300).optional(),
});

export type DisputeStreamInput = z.infer<typeof disputeStreamSchema>;


// ── Shared types used across actions + components ─────────────────────────────

export type StreamDirection = "they_owe_me" | "i_owe_them";
export type StreamStatus    = "pending" | "confirmed" | "disputed" | "settled" | "forgiven";

/** A resolved counterpart (Clear user or guest) for display. */
export type StreamCounterpart = {
  /** Unique key used as the URL personId param. */
  personId:  string;
  type:      "user" | "guest";
  name:      string;
};
