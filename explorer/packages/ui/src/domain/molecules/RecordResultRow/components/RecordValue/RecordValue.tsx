import { Stack } from "../../../../../atoms/Stack/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";
import type { Locale } from "../../../../../theme/index.ts";
import { MoneyAmount } from "../../../../atoms/MoneyAmount/index.ts";
import type { RecordResult } from "../../../../types.ts";
import { isFrameworkCeiling } from "../../recordResultRow.utils.ts";

export interface RecordValueCopy {
  noValue: string;
  /** The caption under the value: a framework ceiling is not money awarded and is not summed into the Total. */
  valueCaption: { awarded: string; ceiling: string };
}

export interface RecordValueProps {
  record: RecordResult["record"];
  locale: Locale;
  copy: RecordValueCopy;
  /** Extra lines under the caption (the in-county share line of a consortium Record). */
  children?: React.ReactNode;
}

/** The right-hand column of a Record row: the full value (or "no value") over its caption. Children go under the caption. */
export function RecordValue({ record, locale, copy, children }: RecordValueProps) {
  const caption = isFrameworkCeiling(record.badges) ? copy.valueCaption.ceiling : copy.valueCaption.awarded;
  return (
    <Stack spacing={0.25} sx={{ alignItems: "flex-end", flex: "none", ml: "auto", textAlign: "right" }}>
      <Typography component="span" variant="body1" sx={{ fontWeight: 600 }}>
        {record.value === null ? copy.noValue : <MoneyAmount bani={record.value} locale={locale} />}
      </Typography>
      {record.value !== null && (
        <Typography component="span" variant="caption" color="text.secondary">
          {caption}
        </Typography>
      )}
      {children}
    </Stack>
  );
}
