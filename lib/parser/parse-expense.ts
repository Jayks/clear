import type { TripMember } from "@/lib/db/schema/trip-members";
import { getMemberName } from "@/lib/utils";

export type CategoryValue =
  | "food"
  | "accommodation"
  | "transport"
  | "sightseeing"
  | "shopping"
  | "activities"
  | "groceries"
  | "other";

export interface ParsedExpense {
  description: string;
  amount: number | null;
  category: CategoryValue;
  paidByMemberId: string | null;
  /** Explicit member IDs to split among (AI-resolved from names/positions). Takes priority over splitCount. */
  splitMemberIds?: string[] | null;
  /** Number of members to split among (first N). null = all members. undefined = no split keyword given. */
  splitCount: number | null | undefined;
  /** ISO date string YYYY-MM-DD — only set when AI resolves a date from the input. */
  expenseDate?: string | null;
}

const CATEGORY_KEYWORDS: Partial<Record<CategoryValue, string[]>> = {
  food: [
    "food", "dinner", "lunch", "breakfast", "restaurant", "cafe", "coffee",
    "snack", "drinks", "meal", "eat", "pizza", "biryani", "thali", "chai",
    "tea", "bar", "beverage", "brunch",
  ],
  accommodation: [
    "hotel", "hostel", "airbnb", "accommodation", "stay", "room", "resort",
    "lodge", "motel", "oyo", "checkin", "checkout",
  ],
  transport: [
    "cab", "taxi", "uber", "ola", "bus", "train", "flight", "metro", "auto",
    "ferry", "rickshaw", "transport", "travel", "petrol", "fuel", "toll",
    "parking", "bike", "scooter",
  ],
  sightseeing: [
    "museum", "ticket", "tour", "sightseeing", "monument", "fort", "palace",
    "temple", "beach", "park", "entry", "heritage",
  ],
  shopping: [
    "shopping", "mall", "clothes", "souvenir", "souvenirs", "shop", "market",
    "bazaar", "store", "buy",
  ],
  activities: [
    "activity", "activities", "adventure", "sport", "hike", "trek", "rafting",
    "diving", "surfing", "kayak", "zipline",
  ],
  groceries: [
    "grocery", "groceries", "supermarket", "vegetables", "fruits", "kirana",
    "provisions", "dairy",
  ],
};

export function parseExpenseText(text: string, members: TripMember[]): ParsedExpense {
  const raw = text.trim();
  const tokens = raw.toLowerCase().split(/\s+/).filter(Boolean);
  const origTokens = raw.split(/\s+/).filter(Boolean);

  // First numeric token is the amount
  let amountIndex = -1;
  let amount: number | null = null;
  for (let i = 0; i < tokens.length; i++) {
    const n = parseFloat(tokens[i].replace(/,/g, ""));
    if (!isNaN(n) && n > 0) {
      amount = Math.round(n * 100) / 100;
      amountIndex = i;
      break;
    }
  }

  // Description = original-case words before the amount
  const description = amountIndex > 0 ? origTokens.slice(0, amountIndex).join(" ") : "";

  // Tokens after the amount
  const afterTokens = amountIndex >= 0 ? tokens.slice(amountIndex + 1) : tokens;

  // Detect "split N" or "split all"
  let splitCount: number | null | undefined = undefined;
  const splitIdx = afterTokens.indexOf("split");
  if (splitIdx !== -1) {
    const next = afterTokens[splitIdx + 1];
    if (!next || next === "all") {
      splitCount = null; // all members
    } else {
      const n = parseInt(next, 10);
      splitCount = isNaN(n) ? null : Math.min(n, members.length);
    }
  }

  // Detect payer: member name fuzzy-match in afterTokens (skip split tokens)
  const skipIdxs = new Set<number>();
  if (splitIdx !== -1) {
    skipIdxs.add(splitIdx);
    if (afterTokens[splitIdx + 1] !== undefined) skipIdxs.add(splitIdx + 1);
  }
  let paidByMemberId: string | null = null;
  for (let i = 0; i < afterTokens.length; i++) {
    if (skipIdxs.has(i)) continue;
    const token = afterTokens[i];
    const match = members.find((m) => {
      const name = getMemberName(m).toLowerCase();
      const firstName = name.split(/\s+/)[0];
      return firstName === token || name === token;
    });
    if (match) {
      paidByMemberId = match.id;
      break;
    }
  }

  // Category from keyword scan across all tokens
  let category: CategoryValue = "other";
  outer: for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS) as [CategoryValue, string[]][]) {
    for (const word of tokens) {
      if (keywords.includes(word)) {
        category = cat;
        break outer;
      }
    }
  }

  return { description, amount, category, paidByMemberId, splitCount };
}
