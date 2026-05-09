"use server";

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

export interface AdherenceResult {
  coveragePercent: number;
  plannedCount: number;
  coveredCount: number;
  coveredItems: string[];
  missedItems: string[];
  surprises: string[];
  summary: string;
}

const responseSchema = z.object({
  coveragePercent: z.number().min(0).max(100),
  plannedCount: z.number().int().nonnegative(),
  coveredCount: z.number().int().nonnegative(),
  coveredItems: z.array(z.string()),
  missedItems: z.array(z.string()),
  surprises: z.array(z.string()),
  summary: z.string(),
});

export async function analyzeTripAdherence(
  itinerary: string,
  expenses: { description: string; expenseDate: string }[]
): Promise<{ ok: true; result: AdherenceResult } | { ok: false; error: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { ok: false, error: "AI analysis is not configured." };

  const client = new Anthropic({ apiKey });

  const expenseLines = expenses
    .map((e) => `  ${e.expenseDate}: ${e.description}`)
    .join("\n");

  try {
    const response = await Promise.race([
      client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 512,
        system: `You compare a trip itinerary against actual recorded expenses to measure how closely the group followed the plan.

Return ONLY valid JSON — no markdown, no explanation:
{
  "coveragePercent": number (0–100, how much of the plan was followed),
  "plannedCount": number (total distinct activities planned),
  "coveredCount": number (planned activities that actually happened),
  "coveredItems": string[] (brief label for each planned activity that was completed),
  "missedItems": string[] (brief label for each planned activity that did NOT happen),
  "surprises": string[] (brief label for actual expenses not in the plan — spontaneous additions),
  "summary": string (one warm sentence describing how closely the trip followed the plan)
}

Rules:
- Match semantically, not literally ("Shore Temple entry" matches "Shore Temple & Five Rathas" in the plan)
- Keep item labels short (3–6 words)
- Surprises should only list genuinely unplanned things, not minor variations on planned items
- coveragePercent = coveredCount / plannedCount × 100, rounded to nearest integer`,
        messages: [
          {
            role: "user",
            content: `<trip_plan>${itinerary}</trip_plan>\n<actual_expenses>${expenseLines}</actual_expenses>`,
          },
        ],
      }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 10000)),
    ]);

    if (!response) return { ok: false, error: "Request timed out. Please try again." };

    const content = response.content[0];
    if (content.type !== "text") return { ok: false, error: "Unexpected response." };

    const jsonText = content.text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    const raw = JSON.parse(jsonText);
    const validated = responseSchema.safeParse(raw);
    if (!validated.success) return { ok: false, error: "Could not parse AI response." };

    return { ok: true, result: validated.data };
  } catch {
    return { ok: false, error: "Analysis failed. Please try again." };
  }
}
