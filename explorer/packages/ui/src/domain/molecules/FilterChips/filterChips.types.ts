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
    /** The select's "no year" choice. */
    any: string;
  };
  channel: { group: string; options: Record<Channel, string> };
  valueBucket: { group: string; options: Record<ValueBucket, string> };
  signals: {
    group: string;
    /** The toggle chip: only Records with Signals. */
    has: string;
    /** The active chip for a filter that says `hasSignals: false`. */
    without: string;
  };
  procedure: { group: string; empty: string };
  badges: { group: string; badges: BadgeCopy };
  active: {
    group: string;
    none: string;
    /** "From 2023" / "From 15 Mar 2024": `when` is a year, or a date when the filter's date is not a year edge. */
    from: (when: string) => string;
    to: (when: string) => string;
    /** The accessible name of an active chip's remove action. */
    remove: (chip: string) => string;
    clearAll: string;
  };
}
