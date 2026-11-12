import type { Locale } from "../../../../../theme/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";
import { formatDate } from "../../../../utils/formatDate.ts";
import type { CoveragePageLayoutCopy } from "../../coveragePageLayout.types.ts";

export interface SnapshotLineProps {
  /** MF reference list snapshot date (YYYY-MM-DD); null when no list is loaded yet. */
  date: string | null;
  locale: Locale;
  copy: CoveragePageLayoutCopy;
}

/** The date of the Ministry of Finance list of public entities, or that it is not loaded yet. */
export function SnapshotLine({ date, locale, copy }: SnapshotLineProps) {
  return (
    <Typography>
      {date === null ? copy.snapshot.notLoaded : <time dateTime={date}>{copy.snapshot.line(formatDate(date, locale, "long"))}</time>}
    </Typography>
  );
}
