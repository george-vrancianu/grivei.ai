import { Box } from "../../../../../atoms/Box/index.ts";
import { Stack } from "../../../../../atoms/Stack/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";
import type { Locale } from "../../../../../theme/index.ts";
import type { RecordPageData } from "../../../../types.ts";
import { formatDate } from "../../../../utils/formatDate.ts";
import { factsSx } from "../facts.ts";

export interface RecordHeadingCopy {
  /** The Record's kind: DA, DAN, CONTRACT, AWARD_NOTICE. */
  kinds: Record<RecordPageData["kind"], string>;
  facets: { code: string; date: string; kind: string; procedure: string; contractType: string; cpv: string };
}

export interface RecordHeadingProps {
  record: RecordPageData;
  locale: Locale;
  copy: RecordHeadingCopy;
}

/** The title as the page heading, then the Record's code, date, kind, procedure, contract type and CPV. Procedure, contract type and CPV are shown as published. */
export function RecordHeading({ record, locale, copy }: RecordHeadingProps) {
  const { facets } = copy;
  return (
    <Stack component="header" spacing={1.5}>
      <Typography variant="h4" component="h1">
        {record.title}
      </Typography>
      <Box component="dl" sx={factsSx}>
        <dt>{facets.code}</dt>
        <dd>{record.code}</dd>
        {record.date && (
          <>
            <dt>{facets.date}</dt>
            <dd>
              <time dateTime={record.date}>{formatDate(record.date, locale, "long")}</time>
            </dd>
          </>
        )}
        <dt>{facets.kind}</dt>
        <dd>{copy.kinds[record.kind]}</dd>
        {record.procedure && (
          <>
            <dt>{facets.procedure}</dt>
            <dd>{record.procedure}</dd>
          </>
        )}
        {record.contractType && (
          <>
            <dt>{facets.contractType}</dt>
            <dd>{record.contractType}</dd>
          </>
        )}
        {record.cpv && (
          <>
            <dt>{facets.cpv}</dt>
            <dd>
              {record.cpv.code} {record.cpv.description}
            </dd>
          </>
        )}
      </Box>
    </Stack>
  );
}
