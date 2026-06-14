export type HomeView = "active" | "archived" | "sample";

/**
 * Which tab the Home page should show on mount.
 *
 *  - Right after loading a sample (`justSeeded`), land on **Sample** so the user
 *    sees what they just created.
 *  - Otherwise restore the last tab they were on (survives create→back nav).
 *  - Fall back to **Active**.
 *
 * A stored tab is only honoured while its content still exists (e.g. don't open
 * on Sample after the samples were removed).
 */
export function resolveHomeTab(opts: {
  justSeeded: boolean;
  storedTab: string | null;
  hasArchived: boolean;
  hasSample: boolean;
}): HomeView {
  if (opts.justSeeded && opts.hasSample) return "sample";
  if (opts.storedTab === "sample" && opts.hasSample) return "sample";
  if (opts.storedTab === "archived" && opts.hasArchived) return "archived";
  if (opts.storedTab === "active") return "active";
  return "active";
}
