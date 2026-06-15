export type HomeView = "active" | "archived" | "sample";

/**
 * Which tab the Home page should show on mount — the last tab the user was on
 * (persisted in sessionStorage, so create→back returns you where you were), or
 * Active by default. After seeding, the loader writes "sample" here so the user
 * lands on their fresh samples.
 *
 * A stored tab is only honoured while its content still exists (e.g. don't open
 * on Sample after the samples were removed).
 */
export function resolveHomeTab(opts: {
  storedTab: string | null;
  hasArchived: boolean;
  hasSample: boolean;
}): HomeView {
  if (opts.storedTab === "sample" && opts.hasSample) return "sample";
  if (opts.storedTab === "archived" && opts.hasArchived) return "archived";
  return "active";
}
