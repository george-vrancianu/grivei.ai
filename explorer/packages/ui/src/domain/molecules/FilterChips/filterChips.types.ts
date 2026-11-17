import type { Channel, ValueBucket } from "@grivei/contract";
import type { BadgeCopy } from "../../atoms/BadgeChip/index.ts";

/** Every string the chips show. The app's catalogue satisfies it; procedure names are source data and never appear here. */
export interface FilterChipsCopy {
  /** The accessible name of the whole bar. */
  label: string;
  year: {
    group: string;
    from: string;
    to: string;
    /** Each column's "no year" choice. */
    any: string;
    /** The button's value text; the years come as text. A single year (both ends equal) shows as the bare year. */
    range: {
      from: (year: string) => string;
      until: (year: string) => string;
      between: (from: string, to: string) => string;
    };
  };
  /** A multi-select menu's button once more than one value is chosen: "3 picked". */
  picked: (n: number) => string;
  /** A filter menu's button while nothing is chosen: "Any". */
  menuAny: string;
  channel: { group: string; options: Record<Channel, string> };
  valueBucket: { group: string; options: Record<ValueBucket, string> };
  signals: {
    /** The switch: only Records with Signals. */
    has: string;
    /** The active chip for a filter that says `hasSignals: false`. */
    without: string;
  };
  procedure: { group: string; empty: string };
  /** The Party filter (#181): the menu's name. The lists themselves are source data. */
  party: { group: string };
  /** `menu` is the Badges menu's name ("Badges"). */
  badges: { menu: string; badges: BadgeCopy };
  active: {
    group: string;
    /** "From 2023" / "From 15 Mar 2024": `when` is a year, or a date when the filter's date is not a year edge. */
    from: (when: string) => string;
    to: (when: string) => string;
    /** The active chip of the Party filter: "Party: PARTIDUL SOCIAL DEMOCRAT"; gets the list as registered. */
    party: (list: string) => string;
    /** The active chip of the county picked on the map: "County: Brașov"; gets the name the page shows for the area. */
    county: (area: string) => string;
    /** The same chip when the county is the suppliers' side: "Supplier county: Brașov". */
    supplierCounty: (area: string) => string;
    /** The active chip of the UAT picked on the zoomed county map: "UAT: Sânpetru"; gets the name the page shows, else the SIRUTA. */
    uat: (name: string) => string;
    /** The accessible name of an active chip's remove action. */
    remove: (chip: string) => string;
    clearAll: string;
  };
}
