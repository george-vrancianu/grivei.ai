import type { RecordBadge } from "../../types.ts";

/** What a reader needs to see for one badge. Supplied by the copy catalogue, never written here. */
export interface BadgeText {
  label: string;
  /** The caveat: what this badge means for how the Record is counted or trusted. */
  explanation: string;
}

/** One entry per `RecordBadge`: a missing badge is a type error, so a new enum value cannot ship without copy. */
export type BadgeCopy = Record<RecordBadge, BadgeText>;

type Tone = "default" | "warning" | "info";

/** How loud each badge is. Exhaustive over the enum for the same reason as `BadgeCopy`. */
const TONES: Record<RecordBadge, Tone> = {
  FRAMEWORK_CEILING: "info",
  SUBSEQUENT_CONTRACT: "info",
  CONSORTIUM_SHARE: "info",
  SUSPECT_VALUE: "warning",
  NO_VALUE: "default",
  CUI_MISMATCH: "warning",
  NAME_DIFFERS_FROM_ANAF: "warning",
  IDENTITY_CURATED: "info",
  CRAWLED_PROVISIONAL: "default",
  CRAWL_ONLY: "default",
};

export const RECORD_BADGES = Object.keys(TONES) as RecordBadge[];

export const toneOf = (badge: RecordBadge): Tone => TONES[badge];
