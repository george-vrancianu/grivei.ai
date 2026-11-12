import { Link } from "../../../atoms/Link/index.ts";
import { Stack } from "../../../atoms/Stack/index.ts";
import { Typography } from "../../../atoms/Typography/index.ts";
import type { Locale } from "../../../theme/index.ts";
import type { EntityRef, EntityRole, RecordResult } from "../../types.ts";
import { MatchedLine, type MatchedLineCopy } from "./components/MatchedLine/index.ts";
import { RecordParties, type RecordPartiesCopy } from "./components/RecordParties/index.ts";
import { RecordValueLine, type RecordValueLineCopy } from "./components/RecordValueLine/index.ts";

export type RecordResultRowCopy = RecordValueLineCopy & RecordPartiesCopy & MatchedLineCopy;

export interface RecordResultRowProps {
  row: RecordResult;
  /** The Record page's URL, built by the caller. */
  recordHref: string;
  /** The entity page's URL for an authority or a winner, built by the caller. */
  entityHref: (entity: EntityRef, role: EntityRole) => string;
  locale: Locale;
  copy: RecordResultRowCopy;
}

/**
 * A row of the Records tab: title (linked), the full value (a consortium marker when there is more than one winner),
 * date, badges, authority and winners, and "why it matched" with the matched text highlighted.
 */
export function RecordResultRow({ row, recordHref, entityHref, locale, copy }: RecordResultRowProps) {
  const { record, matchedField } = row;
  return (
    <Stack spacing={0.5} component="li" sx={{ py: 1.5 }}>
      <Typography component="div" variant="subtitle1">
        <Link href={recordHref}>{record.title}</Link>
      </Typography>
      <RecordValueLine record={record} locale={locale} copy={copy} />
      <RecordParties record={record} entityHref={entityHref} copy={copy} />
      {matchedField && <MatchedLine matchedField={matchedField} copy={copy} />}
    </Stack>
  );
}
