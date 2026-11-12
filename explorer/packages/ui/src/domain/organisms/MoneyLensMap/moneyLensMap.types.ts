import type { MoneyMap } from "../../types.ts";
import type { TotalFigureCopy } from "../../molecules/TotalFigure/index.ts";
import type { BaseMapCopy } from "../BaseMap/index.ts";

/** Which side of the money the counties show: where authorities are, or where suppliers are. */
export type CountySide = MoneyMap["side"];
/** A county code ("RO-BV") or one of the off-map areas: the `RecordFilter.county` values. */
export type MapArea = string;

/** The off-map areas. Each is a tile beside the map; the filter takes these exact strings. */
export const OFF_MAP_AREAS = { national: "NATIONAL", unplaced: "UNPLACED", unknownSupplierCounty: "UNKNOWN_SUPPLIER_COUNTY" } as const;

export type SideToggleCopy = {
  /** Accessible name of the toggle group, e.g. "Show counties by". */
  label: string;
  authority: string;
  supplier: string;
};

export type OffMapTilesCopy = {
  /** Heading above the tiles, e.g. "Off the map". */
  heading: string;
  national: string;
  unplaced: string;
  unknownSupplierCounty: string;
  /** "3 authorities without a county"; gets the count and its locale-formatted text. */
  unplacedAuthorities: (count: number, formatted: string) => string;
  /** "9 Records"; the same function the Total figure uses. */
  records: TotalFigureCopy["records"];
};

/** Every user-facing string of the Money lens map. The app passes its catalogue; stories pass sample copy. */
export type MoneyLensMapCopy = {
  /** The base map's strings; `legendTitle` names the measure ("Awarded value"). */
  map: BaseMapCopy;
  side: SideToggleCopy;
  tiles: OffMapTilesCopy;
};
