"use server";

import Anthropic from "@anthropic-ai/sdk";
import { getCurrentUser } from "@/lib/db/queries/auth";
import { canUseAI } from "@/lib/subscription/gates";
import { checkAiRateLimit, checkReceiptScanLimit } from "@/lib/rate-limit";
import { reverseGeocode } from "@/lib/geocoding";
import { receiptResponseSchema, computeConfidence, isEmptyReceiptResponse } from "@/lib/receipt/parse-helpers";
import type { ParsedReceipt } from "@/lib/receipt/types";

export interface ScanReceiptInput {
  base64Image: string;            // full data URL ("data:image/jpeg;base64,...")
  mimeType:    "image/jpeg" | "image/png" | "image/webp";
  gpsCoords?:  { lat: number; lng: number } | null;
  groupType:   string;            // for AI context ("trip" | "nest" | "circle")
  dateContext: { today: string }; // YYYY-MM-DD
}

// Cached server-side by next: { cache: "force-cache" } — prompt is identical on
// every call so prompt caching + ephemeral cache_control saves ~60% on tokens.
const RECEIPT_SYSTEM_PROMPT = `You are a receipt parsing assistant. Extract information from the receipt image.

Return ONLY valid JSON with no markdown, no code fences, no explanation — just the raw JSON object.

Required shape:
{
  "description": string (merchant name or what was purchased — concise, max 60 chars),
  "amount": number or null (grand total after tax/GST/tip; null if unclear),
  "currency": "INR" | "USD" | "EUR" | "GBP" | "SGD" | "AED" | "THB" | null,
  "category": string (one of: food, accommodation, transport, sightseeing, shopping, activities, groceries, supplies, utilities, rent, healthcare, maintenance, venue, equipment, gift, tour_package, other),
  "expenseDate": "YYYY-MM-DD" or null (use the date printed on the receipt, not today),
  "receiptItems": array of { "description": string, "amount": number, "quantity": number (optional) } or []
}

Rules:
- amount must be the GRAND TOTAL (after all taxes, service charges, GST, and discounts)
- If a bill shows subtotal + GST separately, sum them for the grand total
- description: use the merchant/restaurant/store name when clearly visible
- category: pick the single best match from the allowed values
- receiptItems: include only individual line items with a clear price; skip subtotal/tax/total rows
- If the image is clearly not a receipt, return: {"description":"","amount":null,"currency":null,"category":"other","expenseDate":null,"receiptItems":[]}`;

export async function parseReceiptWithAI(
  input: ScanReceiptInput,
): Promise<ParsedReceipt | { ok: false; error: string } | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  // Guard order matters — check Plus gate FIRST to skip rate-limit DB ops for free users
  if (!(await canUseAI(user.id))) return null;             // 1. Plus gate (fast)
  if (!checkAiRateLimit(user.id)) return null;             // 2. Hourly AI limit (20/hr)
  if (!checkReceiptScanLimit(user.id))                     // 3. Daily scan limit (20/day)
    return { ok: false, error: "You've scanned 20 receipts today — limit resets at midnight." };

  // 4. Server-side size guard: reject if base64 > 2 MB
  if (input.base64Image.length > 2 * 1024 * 1024) return null;

  // Instantiate inside the function — module-level eval before env vars load fails
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // Strip the data URL prefix — Anthropic API expects raw base64 only
  const base64Data = input.base64Image.replace(/^data:image\/\w+;base64,/, "");

  // Run AI vision + reverse geocoding concurrently (GPS is from EXIF, not AI)
  const [response, geoResult] = await Promise.all([
    Promise.race([
      client.messages.create({
        model:      "claude-haiku-4-5-20251001",
        max_tokens: 1024, // NOT 600 — 10-item bills need ~400 tokens for items alone
        system: [
          {
            type:          "text",
            text:          RECEIPT_SYSTEM_PROMPT,
            cache_control: { type: "ephemeral" }, // saves ~60% on repeated calls
          },
        ],
        messages: [
          {
            role: "user",
            content: [
              {
                type:   "image",
                source: { type: "base64", media_type: input.mimeType, data: base64Data },
              },
              {
                type: "text",
                text: `Today is ${input.dateContext.today}. Group type: ${input.groupType}.`,
              },
            ],
          },
        ],
      }),
      // 9-second race timeout — prevents the action from hanging on slow responses
      new Promise<null>((r) => setTimeout(() => r(null), 9000)),
    ]),
    // Reverse geocode GPS coords concurrently — returns null on any error (non-fatal)
    input.gpsCoords
      ? reverseGeocode(input.gpsCoords.lat, input.gpsCoords.lng).catch(() => null)
      : Promise.resolve(null),
  ]);

  if (!response) return null; // timeout
  const content = response.content[0];
  if (content.type !== "text") return null;

  // Strip any markdown fences Haiku might add despite the prompt
  const cleaned = content.text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");

  // ⚠️  JSON.parse throws SyntaxError — Zod safeParse does NOT catch it
  let raw: unknown;
  try {
    raw = JSON.parse(cleaned);
  } catch {
    console.error("[parse-receipt] JSON.parse failed:", cleaned.slice(0, 200));
    return null;
  }

  const parsed = receiptResponseSchema.safeParse(raw);
  if (!parsed.success) return null;
  const d = parsed.data;

  if (isEmptyReceiptResponse(d))
    return { ok: false, error: "This doesn't look like a receipt" };

  const confidence = computeConfidence(d);

  return {
    description:  d.description ?? "",
    amount:       d.amount ?? null,
    currency:     d.currency ?? null,
    category:     d.category ?? "other",
    expenseDate:  d.expenseDate ?? null,
    receiptItems: d.receiptItems ?? [],
    location:     geoResult && input.gpsCoords
      ? { lat: input.gpsCoords.lat, lng: input.gpsCoords.lng, ...geoResult }
      : null,
    confidence,
  };
}
