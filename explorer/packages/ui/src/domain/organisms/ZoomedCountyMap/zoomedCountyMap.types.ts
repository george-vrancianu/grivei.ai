import type { OffMapTilesCopy } from "../MoneyLensMap/index.ts";
import type { BaseMapCopy } from "../BaseMap/index.ts";

/** Every user-facing string of the zoomed county map. The app passes its catalogue; stories pass sample copy. */
export type ZoomedCountyMapCopy = {
  /** The base map's strings. `noData` must say no authority bought anything (the UAT has no Records), not "no data". */
  map: BaseMapCopy;
  /** The Records and suspect-left-out lines of a Total; the same functions the Total figure uses. */
  figures: Pick<OffMapTilesCopy, "records" | "suspectLeftOut">;
  /** "31 authorities": the count behind a UAT's Total (shown in the tooltip when circles are on). */
  authorities: (count: number, formatted: string) => string;
  /** The key of the circles, e.g. "Circle size: number of authorities". */
  circleKey: string;
  /** Heading of the row for authorities whose county is known but whose UAT is not, e.g. "County known, UAT unknown". */
  unknownUat: string;
};
