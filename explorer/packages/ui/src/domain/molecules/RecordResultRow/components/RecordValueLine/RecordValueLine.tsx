import { Chip } from "../../../../../atoms/Chip/index.ts";
import { Stack } from "../../../../../atoms/Stack/index.ts";
import { Tooltip } from "../../../../../atoms/Tooltip/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";
import type { Locale } from "../../../../../theme/index.ts";
import { BadgeChip, type BadgeCopy } from "../../../../atoms/BadgeChip/index.ts";
import { MoneyAmount } from "../../../../atoms/MoneyAmount/index.ts";
import type { RecordResult } from "../../../../types.ts";
import { formatDate } from "../../../../utils/formatDate.ts";
import { isConsortium } from "../../recordResultRow.utils.ts";

export interface RecordValueLineCopy {
  noValue: string;
  /** The consortium marker next to the value: the label, and the explanation that the full value is shown. */
  consortium: { label: string; explanation: string };
  badges: BadgeCopy;
}

export interface RecordValueLineProps {
  record: RecordResult["record"];
  locale: Locale;
  copy: RecordValueLineCopy;
}

/** The full value (a consortium marker when there is more than one winner), the date and every badge of a Record. */
export function RecordValueLine({ record, locale, copy }: RecordValueLineProps) {
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
      <Typography component="span" variant="body2">
        {record.value === null ? copy.noValue : <MoneyAmount bani={record.value} locale={locale} />}
      </Typography>
      {isConsortium(record.winners) && (
        <Tooltip title={copy.consortium.explanation} describeChild>
          <Chip size="small" variant="outlined" label={copy.consortium.label} tabIndex={0} />
        </Tooltip>
      )}
      {record.date && (
        <Typography component="time" variant="body2" color="text.secondary" dateTime={record.date}>
          {formatDate(record.date, locale)}
        </Typography>
      )}
      {record.badges.map((badge) => (
        <BadgeChip key={badge} badge={badge} copy={copy.badges} />
      ))}
    </Stack>
  );
}
