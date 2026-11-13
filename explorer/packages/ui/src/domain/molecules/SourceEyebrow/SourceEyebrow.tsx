import { Typography } from "../../../atoms/Typography/index.ts";
import { sourceNameOf, type SourceOption } from "./sourceEyebrow.utils.ts";

export type { SourceOption } from "./sourceEyebrow.utils.ts";

export interface SourceEyebrowCopy {
  /** The word before the Source's name: "search" / "caută". */
  search: string;
  /** What the search covers: "national" / "național". */
  scope: string;
  /** From when: "2021 onward" / "din 2021". */
  period: string;
}

export interface SourceEyebrowProps {
  /** The explorable Sources, from the API's `sources` root. Only one is searchable in Release 1, so the eyebrow only names it. */
  sources: readonly SourceOption[];
  /** The id of the Source being searched. */
  selected: string;
  copy: SourceEyebrowCopy;
}

/**
 * The line above the search bar: "search SEAP · national · 2021 onward". It is the Source picker (ADR 0005) in its read-only,
 * one-option state: it already takes the list of Sources and the chosen one, so a later Release can turn the name into a picker
 * (an `onSelect`, a menu) without changing its callers. The Source's name is the API's; the other words are the catalogue's.
 */
export function SourceEyebrow({ sources, selected, copy }: SourceEyebrowProps) {
  return (
    <Typography variant="label" component="p" color="primary" data-testid="source-eyebrow">
      {copy.search} {sourceNameOf(sources, selected)} · {copy.scope} · {copy.period}
    </Typography>
  );
}
