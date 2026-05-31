import { z } from "zod";

// ── Member entry (Phase 1: name only stored in DB; phone used client-side for WhatsApp) ──
export const circleMemberSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  phone: z.string().max(20).optional(), // not persisted — WhatsApp link only
});

export type CircleMember = z.infer<typeof circleMemberSchema>;

// ── Base schema (no superRefine — allows .extend()) ──────────────────────────
const createCircleBaseSchema = z.object({
  circleMode: z.enum(["recurring", "goal"]),
  name: z.string().min(1, "Name is required").max(100),
  defaultCurrency: z.string().length(3).default("INR"),

  // Recurring-specific (coerce handles string → number from form inputs)
  contributionAmount: z.coerce.number().positive().optional(),
  contributionDay: z.coerce.number().int().min(1).max(28).default(1),

  // Goal-specific
  targetAmount: z.coerce.number().positive().optional(),
  eventDate: z.string().optional(),
  contributionPrivacy: z.enum(["public", "admin_only"]).default("public"),

  // Common optional
  upiId: z.string().max(100).optional(),
});

// ── Cross-field validation for the client form ────────────────────────────────
export const createCircleSchema = createCircleBaseSchema.superRefine((data, ctx) => {
  if (data.circleMode === "recurring") {
    if (!data.contributionAmount) {
      ctx.addIssue({ code: "custom", message: "Monthly contribution amount is required", path: ["contributionAmount"] });
    }
  }
  if (data.circleMode === "goal") {
    if (!data.targetAmount) {
      ctx.addIssue({ code: "custom", message: "Target amount is required", path: ["targetAmount"] });
    }
    if (!data.eventDate) {
      ctx.addIssue({ code: "custom", message: "Deadline date is required", path: ["eventDate"] });
    }
  }
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
  if (data.circleMode === "goal") {
    if (!data.targetAmount) {
      ctx.addIssue({ code: "custom", message: "Target amount is required", path: ["targetAmount"] });
    }
    if (!data.eventDate) {
      ctx.addIssue({ code: "custom", message: "Deadline date is required", path: ["eventDate"] });
    }
  }
});

export type CreateCircleActionInput = z.infer<typeof createCircleActionSchema>;
