import { Typography } from "../../../../../atoms/Typography/index.ts";
import type { Locale } from "../../../../../theme/index.ts";
import type { CountCopy } from "../../../../molecules/TotalFigure/index.ts";
import type { EntityHeaderData } from "../../../../types.ts";
import { formatCount } from "../../../../atoms/ApproxCount/index.ts";
import { formatDate } from "../../../../utils/formatDate.ts";
import { seapNamesSummary } from "../../entityHeader.utils.ts";

export interface SeapNamesLineCopy {
  /** "Appears in SEAP as" */
  label: string;
  /** "1,817 Records" */
  records: CountCopy;
  /** "10 Aug 2020 to 23 Oct 2026", given the formatted dates. */
  range: (first: string, last: string) => string;
  /** "and 3 more names", given the count of the others. */
  more: CountCopy;
}

export interface SeapNamesLineProps {
  aliases: EntityHeaderData["aliases"];
  locale: Locale;
  copy: SeapNamesLineCopy;
}

/** "Appears in SEAP as" under the name: the main spellings SEAP published, how many Records carry them and from when to when. The Overview lists every spelling. */
export function SeapNamesLine({ aliases, locale, copy }: SeapNamesLineProps) {
  const summary = seapNamesSummary(aliases);
  if (!summary) return null;
  return (
    <Typography variant="body2" color="text.disabled" sx={{ textWrap: "pretty" }}>
      {copy.label}{" "}
      <Typography component="span" variant="body2" color="text.secondary">
        {summary.names.join(", ")}
      </Typography>
      {summary.more > 0 && <> · {copy.more(summary.more, formatCount(summary.more, false, locale))}</>}
      {" · "}
      {copy.records(summary.records, formatCount(summary.records, false, locale))} · {copy.range(formatDate(summary.first, locale), formatDate(summary.last, locale))}
    </Typography>
  );
}
