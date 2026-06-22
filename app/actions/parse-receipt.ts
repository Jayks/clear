"use server";

import Anthropic from "@anthropic-ai/sdk";
import { getCurrentUser } from "@/lib/db/queries/auth";
import { canUseLoggingAI, incrementLoggingAiUsage } from "@/lib/subscription/ai-quota";
import { checkAiRateLimit, checkReceiptScanLimit } from "@/lib/rate-limit";
import { reverseGeocode } from "@/lib/geocoding";
import { receiptResponseSchema, computeConfidence, isEmptyReceiptResponse } from "@/lib/receipt/parse-helpers";
import type { ParsedReceipt } from "@/lib/receipt/types";

export interface ScanReceiptInput {
  base64Images: string[];         // one full data URL per image; >1 = vertical tiles of one long receipt
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
  "currency": "INR" | "USD" | "EUR" | "GBP" | "SGD" | "AED" | "THB" | "MYR" | null,
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

  // Logging-AI is free for everyone; canUseLoggingAI enforces a silent monthly
  // abuse ceiling on the free tier (Plus is uncapped).
  if (!(await canUseLoggingAI(user.id))) return null;      // 1. Free monthly ceiling
  await incrementLoggingAiUsage(user.id);                  //    count this call (no-op for Plus)
  if (!checkAiRateLimit(user.id)) return null;             // 2. Hourly AI limit (20/hr)
  if (!checkReceiptScanLimit(user.id))                     // 3. Daily scan limit (20/day)
    return { ok: false, error: "You've scanned 20 receipts today — limit resets at midnight." };

  // 4. Server-side size guard: reject if empty or aggregate base64 > 8 MB
  //    (a long receipt is sent as up to 4 tiles — see prepareReceiptImages)
  const totalBytes = input.base64Images.reduce((n, b) => n + b.length, 0);
  if (input.base64Images.length === 0 || totalBytes > 8 * 1024 * 1024) return null;

  // Instantiate inside the function — module-level eval before env vars load fails
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // Strip the data URL prefix — Anthropic API expects raw base64 only
  const imageBlocks = input.base64Images.map((b64) => ({
    type:   "image" as const,
    source: {
      type:       "base64" as const,
      media_type: input.mimeType,
      data:       b64.replace(/^data:image\/\w+;base64,/, ""),
    },
  }));

  // When the receipt was tiled, tell the model the images are one receipt so it
  // merges items and reads the grand total from the segment that has it.
  const multiTile = input.base64Images.length > 1;
  const userText  = multiTile
    ? `Today is ${input.dateContext.today}. Group type: ${input.groupType}. The ${input.base64Images.length} images are vertical top-to-bottom segments of ONE long receipt (consecutive segments overlap slightly). Treat them as a single receipt: return one description, one amount (the grand total — usually printed in the last segment), one expenseDate, and a single combined receiptItems list. Do NOT double-count line items that appear in the overlap between two segments.`
    : `Today is ${input.dateContext.today}. Group type: ${input.groupType}.`;

  // Run AI vision + reverse geocoding concurrently (GPS is from EXIF, not AI)
  const [response, geoResult] = await Promise.all([
    Promise.race([
      client.messages.create({
        model:      "claude-haiku-4-5-20251001",
        max_tokens: 3072, // long itemised bills (and merged multi-tile receipts) overflow 1024
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
              ...imageBlocks,
              {
                type: "text",
                text: userText,
              },
            ],
          },
        ],
      }),
      // Race timeout — prevents the action from hanging; longer for multi-tile receipts
      new Promise<null>((r) => setTimeout(() => r(null), multiTile ? 18000 : 12000)),
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
