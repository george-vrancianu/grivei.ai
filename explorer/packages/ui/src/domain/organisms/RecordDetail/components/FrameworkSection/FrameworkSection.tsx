import { Link } from "../../../../../atoms/Link/index.ts";
import { Stack } from "../../../../../atoms/Stack/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";
import type { Locale } from "../../../../../theme/index.ts";
import { MoneyAmount } from "../../../../atoms/MoneyAmount/index.ts";
import { withNodes } from "../../../../utils/withNodes.tsx";
import { RecordResultList } from "../../../../molecules/RecordResultList/index.ts";
import type { RecordResultRowCopy } from "../../../../molecules/RecordResultRow/index.ts";
import type { EntityRef, EntityRole, RecordPageData } from "../../../../types.ts";
import { followLink } from "../../../../utils/followLink.ts";
import { formatRatio } from "../../recordDetail.utils.ts";

type FrameworkLink = NonNullable<RecordPageData["framework"]>;

export interface FrameworkSectionCopy {
  heading: string;
  /** "Ceiling RON 100,000,000; subsequent contracts reported so far RON 112,400,000 (112.4%)", given the formatted amounts and ratio. */
  line: (ceiling: string, reported: string, percent: string) => string;
  /** The same line for a blank ceiling: no ratio can be told. */
  lineBlankCeiling: (reported: string) => string;
  /** On a subsequent contract: "Awarded under the framework agreement" before the link. */
  agreement: string;
  subsequentHeading: string;
}

export interface FrameworkSectionProps {
  framework: FrameworkLink;
  entityHref: (entity: EntityRef, role: EntityRole) => string;
  recordHref: (code: string) => string;
  onNavigate?: (href: string) => void;
  locale: Locale;
  copy: FrameworkSectionCopy & { recordRow: RecordResultRowCopy };
}

/**
 * The framework line (ceiling, subsequent contracts reported so far and their share of the ceiling; a blank ceiling has no share),
 * the link to the agreement on a subsequent contract, and the list of subsequent contracts on the agreement.
 */
export function FrameworkSection({ framework, entityHref, recordHref, onNavigate, locale, copy }: FrameworkSectionProps) {
  const reported = <MoneyAmount key="reported" bani={framework.subsequentReported} locale={locale} showBani />;
  const { ceiling, ratio } = framework;
  const line =
    ceiling === null || ratio === null
      ? withNodes(copy.lineBlankCeiling, [reported])
      : withNodes((ceilingText, sum) => copy.line(ceilingText, sum, formatRatio(ratio, locale)), [<MoneyAmount key="ceiling" bani={ceiling} locale={locale} showBani />, reported]);
  const { agreement } = framework;
  return (
    <Stack component="section" spacing={1} aria-label={copy.heading}>
      <Typography variant="h6" component="h2">
        {copy.heading}
      </Typography>
      <Typography>{line}</Typography>
      {agreement && (
        <Typography>
          {copy.agreement}:{" "}
          <Link href={recordHref(agreement.code)} onClick={followLink(recordHref(agreement.code), onNavigate)}>
            {agreement.title}
          </Link>
        </Typography>
      )}
      {framework.subsequent.length > 0 && (
        <Stack spacing={0.5}>
          <Typography variant="subtitle1" component="h3">
            {copy.subsequentHeading}
          </Typography>
          <RecordResultList
            rows={framework.subsequent.map((record) => ({ record, matchedField: null }))}
            entityHref={entityHref}
            recordHref={(record) => recordHref(record.code)}
            locale={locale}
            copy={copy.recordRow}
          />
        </Stack>
      )}
    </Stack>
  );
}
