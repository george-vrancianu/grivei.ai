import type { EntityRole } from "../../types.ts";
import type { BaseMapCopy } from "../BaseMap/index.ts";
import type { OffMapTilesCopy } from "../MoneyLensMap/index.ts";

/** Direction-dependent strings: the page's entity is a supplier (money flows in) or an authority (money flows out). */
export type ByRole<T> = Record<EntityRole, T>;

export type FlowLegendCopy = {
  /** Heading and accessible name of the legend, e.g. "Flow". */
  title: string;
  /** "Bubble area: money in the county" */
  bubbleSize: string;
  /** "Arc width: money between the two counties" */
  arcWidth: string;
  /** "Arrow: money flows in" / "Arrow: money flows out". */
  arrow: ByRole<string>;
  /** Swatch label of the entity's own county. */
  homeCounty: string;
  /** Swatch label of the other counties that have money. */
  otherCounty: string;
};

export type FlowCaptionCopy = {
  /** "Where this supplier's money comes from: authorities across Romania, flowing in to Brașov." Gets the home county's name. */
  direction: ByRole<(home: string) => string>;
  /** Everything is in the home county: a single bubble and no arcs. Gets the home county's name. */
  localOnly: ByRole<(home: string) => string>;
  /** No home county is known: bubbles only, no arcs. */
  noHome: ByRole<string>;
  /** Points to the tiles: money that no county holds is beside the map. */
  offMap: string;
};

export type FlowTooltipCopy = {
  /** Marks the entity's own county. */
  homeCounty: string;
  /** "Money flows in to Brașov" / "Money flows out from Brașov"; gets the home county's name. */
  direction: ByRole<(home: string) => string>;
};

/** Every user-facing string of the Flow lens map. The app passes its catalogue; stories pass sample copy. */
export type FlowLensMapCopy = {
  /** The base map's strings; `areaLabel` builds the accessible name, `noData` says a county has no money. */
  map: BaseMapCopy;
  tiles: OffMapTilesCopy;
  legend: FlowLegendCopy;
  caption: FlowCaptionCopy;
  tooltip: FlowTooltipCopy;
  /** Shown instead of the map when the flow has no money anywhere. */
  empty: string;
};
