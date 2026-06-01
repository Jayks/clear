import { z } from "zod";

// ── Member entry (Phase 1: name only stored in DB; phone used client-side for WhatsApp) ──
export const circleMemberSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  phone: z.string().max(20).optional(), // not persisted — WhatsApp link only
});

export type CircleMember = z.infer<typeof circleMemberSchema>;

// ── Base schema (no superRefine — allows .extend()) ──────────────────────────
const createCircleBaseSchema = z.object({
  circleMode: z.enum(["recurring", "one_time"]),
  name: z.string().min(1, "Name is required").max(100),
  defaultCurrency: z.string().length(3).default("INR"),

  // Recurring-specific — preprocess empty string → undefined so optional fields don't fail .positive()
  contributionAmount: z.preprocess(
    (v) => (!v || v === "" ? undefined : Number(v)),
    z.number().positive().optional(),
  ),
  contributionDay: z.coerce.number().int().min(1).max(28).default(1),

  // One-time-specific
  targetAmount: z.preprocess(
    (v) => (!v || v === "" ? undefined : Number(v)),
    z.number().positive().optional(),
  ),
  eventDate: z.string().optional(),
  contributionPrivacy: z.enum(["public", "admin_only"]).default("public"),

  // Common optional
  upiId: z.string().max(100).optional(),
  walletExpensesEnabled: z.boolean().default(true),
});

// ── Cross-field validation for the client form ────────────────────────────────
// contributionSubType is UI-only: drives Fixed vs Flexi UX, stripped before calling action
export const createCircleSchema = createCircleBaseSchema
  .extend({
    contributionSubType: z.enum(["fixed", "flexi"]).default("fixed"),
  })
  .superRefine((data, ctx) => {
    if (data.circleMode === "recurring") {
      if (!data.contributionAmount) {
        ctx.addIssue({ code: "custom", message: "Monthly contribution amount is required", path: ["contributionAmount"] });
      }
    }
    if (data.circleMode === "one_time" && data.contributionSubType === "fixed") {
      if (!data.contributionAmount) {
        ctx.addIssue({ code: "custom", message: "Amount per person is required", path: ["contributionAmount"] });
      }
    }
    // One-time: targetAmount and eventDate are optional for both Fixed and Flexi
  });

export type CreateCircleInput = z.infer<typeof createCircleSchema>;

// ── Server-action schema — extends base, includes ghost members ───────────────
const createCircleActionBaseSchema = createCircleBaseSchema.extend({
  members: z.array(circleMemberSchema).max(50).default([]),
});

export const createCircleActionSchema = createCircleActionBaseSchema.superRefine((data, ctx) => {
  if (data.circleMode === "recurring") {
    if (!data.contributionAmount) {
      ctx.addIssue({ code: "custom", message: "Monthly contribution amount is required", path: ["contributionAmount"] });
    }
  }
  // One-time: targetAmount and eventDate are optional (Fixed/Flexi both support no target/deadline)
  // Fixed vs Flexi distinction is enforced client-side via contributionSubType; server just stores what it gets
});

export type CreateCircleActionInput = z.infer<typeof createCircleActionSchema>;
