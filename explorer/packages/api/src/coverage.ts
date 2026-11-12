/**
 * Coverage status (#80): how the Coverage lens colours a county, from the grid cells of the date window. Never a ratio.
 *
 * The rule (also in watchdog/README.md; the spec leaves it open, so this is the documented default):
 *
 *   cells that overlap the window, by their state:
 *     good     LOADED
 *     flagged  KNOWN_GAP, POSSIBLY_INCOMPLETE (a published rule or a hand-entered reason), NOT_IN_SOURCE (the Source itself lacks it),
 *              CRAWLED_PROVISIONAL (crawled, awaiting the bulk file)
 *     missing  NOT_YET_LOADED (nothing of that quarter and kind is in the graph)
 *
 *   no cell in the window, or every cell missing  -> NOT_HARVESTED
 *   some cell missing                              -> PARTIAL
 *   else some cell flagged                         -> HARVESTED_WITH_KNOWN_GAPS
 *   else                                           -> HARVESTED
 *
 * N and M never enter the status: a county whose authorities bought nothing in the window is "harvested", not "not harvested" (the Coverage
 * lens exists to tell those apart). SEAP is harvested nationally, so every county and National share the window's status; N of M is what
 * differs per county. A Source with per-county harvests would pass its own cells per county.
 */
export type CoverageStatus = "HARVESTED" | "HARVESTED_WITH_KNOWN_GAPS" | "PARTIAL" | "NOT_HARVESTED";

const FLAGGED = new Set(["KNOWN_GAP", "POSSIBLY_INCOMPLETE", "NOT_IN_SOURCE", "CRAWLED_PROVISIONAL"]);

export function coverageStatus(cells: { state: string }[]): CoverageStatus {
  if (cells.length === 0 || cells.every((c) => c.state === "NOT_YET_LOADED")) return "NOT_HARVESTED";
  if (cells.some((c) => c.state === "NOT_YET_LOADED")) return "PARTIAL";
  return cells.some((c) => FLAGGED.has(c.state)) ? "HARVESTED_WITH_KNOWN_GAPS" : "HARVESTED";
}
