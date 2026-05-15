import { z } from "zod";

export const createGroupSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
  coverPhotoUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
  defaultCurrency: z.string().length(3),
  groupType: z.enum(["trip", "nest"]).default("trip"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  budget: z.number().positive().optional(),
  itinerary: z.string().max(10000).optional(),
}).refine(
  (data) => !data.startDate || !data.endDate || data.endDate >= data.startDate,
  { message: "End date must be on or after start date", path: ["endDate"] }
);

export type CreateGroupInput = z.input<typeof createGroupSchema>;

export const addGuestSchema = z.object({
  groupId: z.string().uuid(),
  guestName: z.string().min(1, "Name is required").max(100),
});

export type AddGuestInput = z.infer<typeof addGuestSchema>;
