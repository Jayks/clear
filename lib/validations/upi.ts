import { z } from "zod";

/** Standard UPI VPA format: localpart@provider  e.g. jayakumar@okaxis */
export const upiIdSchema = z
  .string()
  .min(1, "UPI ID is required")
  .max(100, "UPI ID too long")
  .regex(/^[\w.\-]+@[\w]+$/, "Invalid UPI ID format (e.g. name@okaxis)");

export const saveUpiIdSchema = z.object({
  upiId: upiIdSchema,
  label: z.string().max(30, "Label too long").optional(),
  setAsDefault: z.boolean().default(false),
});

export type SaveUpiIdInput = z.infer<typeof saveUpiIdSchema>;
