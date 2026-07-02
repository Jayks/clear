// Pure resolver for /settings?tab=... deep-linking. Kept separate from
// settings-layout.tsx so it's unit-testable without rendering the component.

export const SETTINGS_SECTIONS = ["profile", "appearance", "billing", "notifications"] as const;
export type SettingsSection = (typeof SETTINGS_SECTIONS)[number];

const DEFAULT_SECTION: SettingsSection = "profile";

/** Validates a raw `?tab=` query value against the known section ids.
 *  Falls back to the default ("profile") for null/missing/unknown values —
 *  never throws, safe to call directly off `searchParams.get("tab")`. */
export function resolveSettingsTab(rawTab: string | null): SettingsSection {
  if (rawTab && (SETTINGS_SECTIONS as readonly string[]).includes(rawTab)) {
    return rawTab as SettingsSection;
  }
  return DEFAULT_SECTION;
}
