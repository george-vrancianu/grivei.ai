import { Box } from "../../../../../atoms/Box/index.ts";
import { Link } from "../../../../../atoms/Link/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";
import type { Locale } from "../../../../../theme/index.ts";
import { MoneyAmount } from "../../../../atoms/MoneyAmount/index.ts";
import { ShareBar } from "../../../../atoms/ShareBar/index.ts";
import type { RecordPageData } from "../../../../types.ts";
import { followLink } from "../../../../utils/followLink.ts";
import { withNodes } from "../../../../utils/withNodes.tsx";
import { formatRatio } from "../../recordDetail.utils.ts";

type FrameworkLink = NonNullable<RecordPageData["framework"]>;

export interface FrameworkLineCopy {
  /** "Ceiling RON 100,000,000; subsequent contracts reported so far RON 112,400,000 (112.4%)", given the formatted amounts and ratio. */
  line: (ceiling: string, reported: string, percent: string) => string;
  /** The same line for a blank ceiling: no ratio can be told. */
  lineBlankCeiling: (reported: string) => string;
  /** On a subsequent contract: "Awarded under the framework agreement" before the link. */
  agreement: string;
}

export interface FrameworkLineProps {
  framework: FrameworkLink;
  recordHref: (code: string) => string;
  onNavigate?: ((href: string) => void) | undefined;
  locale: Locale;
  copy: FrameworkLineCopy;
}

/**
 * The framework line (ceiling, subsequent contracts reported so far and their share of the ceiling) with a bar for that share, and on a
 * subsequent contract the link to its agreement. A blank ceiling has no share and no bar. The bar is decoration: the share is written in the line.
 */
export function FrameworkLine({ framework, recordHref, onNavigate, locale, copy }: FrameworkLineProps) {
  const reported = <MoneyAmount key="reported" bani={framework.subsequentReported} locale={locale} showBani />;
  const { ceiling, ratio, agreement } = framework;
  const line =
    ceiling === null || ratio === null
      ? withNodes(copy.lineBlankCeiling, [reported])
      : withNodes((ceilingText, sum) => copy.line(ceilingText, sum, formatRatio(ratio, locale)), [<MoneyAmount key="ceiling" bani={ceiling} locale={locale} showBani />, reported]);
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <Typography>{line}</Typography>
      {ceiling !== null && ratio !== null && <ShareBar share={ratio} />}
      {agreement && (
        <Typography>
          {copy.agreement}:{" "}
          <Link href={recordHref(agreement.code)} onClick={followLink(recordHref(agreement.code), onNavigate)}>
            {agreement.title}
          </Link>
        </Typography>
      )}
    </Box>
  );
}
