// Single source of truth for the product's brand strings.
// Renaming the app (or tweaking the tagline / plan name) should be a one-line
// change here — never hardcode "ClearOff" in functional copy again. Legal/marketing
// long-form prose (terms, privacy, about) keeps the literal name for readability.
//
// This is a plain TS constant, NOT an env var: the brand is not environment-specific
// (same in dev/preview/prod), and a constant is type-safe + usable everywhere
// (RSC, client, edge/OG-image routes, metadata exports) with no runtime footprint.
export const BRAND = {
  /** Product name. */
  name: "ClearOff",
  /** Marketing tagline. The "Clear" here is the verb/pun, kept literal. */
  tagline: "Split it. Clear it off.",
  /** Paid plan name. */
  plus: "ClearOff Plus",
} as const;

/** `"ClearOff — Split it. Clear it off."` — for <title> + PWA manifest name. */
export const BRAND_TITLE = `${BRAND.name} — ${BRAND.tagline}`;
