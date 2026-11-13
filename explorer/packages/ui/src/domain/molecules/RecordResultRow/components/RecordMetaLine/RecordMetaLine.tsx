import { Chip } from "../../../../../atoms/Chip/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";
import type { Locale } from "../../../../../theme/index.ts";
import type { RecordResult } from "../../../../types.ts";
import { formatDate } from "../../../../utils/formatDate.ts";

export interface RecordMetaLineCopy {
  /** The tag before the code: how the Record was awarded. */
  channel: Record<RecordResult["record"]["channel"], string>;
}

export interface RecordMetaLineProps {
  record: RecordResult["record"];
  locale: Locale;
  copy: RecordMetaLineCopy;
}

/** The mono line above a Record's title: the channel tag, the code, the date and the procedure exactly as SEAP publishes it. */
export function RecordMetaLine({ record, locale, copy }: RecordMetaLineProps) {
  return (
    <Typography
      component="div"
      variant="caption"
      color="text.secondary"
      sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", columnGap: 1.5, rowGap: 0.5, fontFamily: "monospace" }}
    >
      <Chip size="small" variant="outlined" label={copy.channel[record.channel]} />
      <span>{record.code}</span>
      {record.date && <time dateTime={record.date}>{formatDate(record.date, locale)}</time>}
      {record.procedure && <span>{record.procedure}</span>}
    </Typography>
  );
}
