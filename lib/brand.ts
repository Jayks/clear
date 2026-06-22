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
  /**
   * Wordmark split for two-tone icon+text lockups — "Off" gets the brand
   * accent colour to echo the glyph's checkmark ("this part = resolved").
   * `namePrefix + nameAccent === name`. Only use this split in a standalone
   * logo lockup (icon beside text); sentence-embedded mentions of `name`
   * (taglines, CTAs) should render as one plain string.
   */
  namePrefix: "Clear",
  nameAccent: "Off",
  /** Marketing tagline. The "Clear" here is the verb/pun, kept literal. */
  tagline: "Split it. Clear it off.",
  /** Paid plan name. */
  plus: "ClearOff Plus",
} as const;

/** `"ClearOff — Split it. Clear it off."` — for <title> + PWA manifest name. */
export const BRAND_TITLE = `${BRAND.name} — ${BRAND.tagline}`;
