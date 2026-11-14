import { Link } from "../../../atoms/Link/index.ts";
import { Stack } from "../../../atoms/Stack/index.ts";
import { Typography } from "../../../atoms/Typography/index.ts";
import type { Locale } from "../../../theme/index.ts";
import { neutralLinkSx } from "../../utils/neutralLinkSx.ts";
import { withNodes } from "../../utils/withNodes.tsx";
import { formatCount } from "../../atoms/ApproxCount/index.ts";
import { MoneyAmount } from "../../atoms/MoneyAmount/index.ts";
import type { PartyCoverageData } from "../../types.ts";
import { unattributedShare } from "./partyCoverage.utils.ts";

/** One slice's sentence: gets the Record count (for plural rules), its locale-formatted text and the amount, which the component places as a money node. */
export type SliceCopy = (count: number, formatted: string, amount: string) => string;

export interface PartyCoverageCopy {
  /** "Party coverage: PARTIDUL SOCIAL DEMOCRAT": the list is source data, as registered. */
  heading: (list: string) => string;
  /** The matched Records, split by how the Party reached them. */
  direct: SliceCopy;
  subordinate: SliceCopy;
  /** What the filter leaves out of the set. */
  otherParties: SliceCopy;
  independent: SliceCopy;
  unattributed: SliceCopy;
  /** "58% of the value in this set is not attributed to any party"; gets the formatted share. */
  unattributedShare: (percent: string) => string;
  /** Who sits in the unattributed part, so a reader does not take the filter for all public money. */
  unattributedNote: string;
  /** The link to how a Party is attributed. */
  methodology: string;
}

export interface PartyCoverageProps {
  coverage: PartyCoverageData;
  locale: Locale;
  copy: PartyCoverageCopy;
  /** The methodology section on Party and Leadership. */
  methodologyHref: string;
}

/**
 * What a Party-filtered Total covers (#181): the matched Records split into direct and subordinate (derived through a subordinate body's principal credit holder),
 * what the filter leaves out (other lists, independent leaders, no Party at all) and the share of the set's value no Party is attributed to. It sits under the Total.
 */
export function PartyCoverage({ coverage, locale, copy, methodologyHref }: PartyCoverageProps) {
  const share = unattributedShare(coverage, locale);
  const line = (key: "direct" | "subordinate" | "otherParties" | "independent" | "unattributed") => (
    <Typography key={key} variant="label" component="li" color={key === "direct" || key === "subordinate" ? "text.primary" : "text.secondary"} data-slice={key}>
      {withNodes((amount) => copy[key](coverage[key].records, formatCount(coverage[key].records, false, locale), amount), [<MoneyAmount bani={coverage[key].awarded} locale={locale} />])}
    </Typography>
  );
  return (
    <Stack component="section" spacing={0.75} aria-label={copy.heading(coverage.party)} data-testid="party-coverage">
      <Typography variant="meta" component="h3">
        {copy.heading(coverage.party)}
      </Typography>
      <Stack component="ul" spacing={0.25} sx={{ listStyle: "none", m: 0, p: 0 }}>
        {line("direct")}
        {line("subordinate")}
        {line("otherParties")}
        {line("independent")}
        {line("unattributed")}
      </Stack>
      <Typography variant="label" component="p" color="text.secondary">
        {share !== null && `${copy.unattributedShare(share)} `}
        {copy.unattributedNote}{" "}
        <Link href={methodologyHref} sx={neutralLinkSx}>
          {copy.methodology}
        </Link>
      </Typography>
    </Stack>
  );
}
