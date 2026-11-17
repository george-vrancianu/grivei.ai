import { Box } from "../../../atoms/Box/index.ts";
import { Well } from "../../../atoms/Well/index.ts";
import { Link } from "../../../atoms/Link/index.ts";
import { TableBody } from "../../../atoms/TableBody/index.ts";
import { TableCell } from "../../../atoms/TableCell/index.ts";
import { NumericCell } from "../../atoms/NumericCell/index.ts";
import { TableHead } from "../../../atoms/TableHead/index.ts";
import { TableRow } from "../../../atoms/TableRow/index.ts";
import { Typography } from "../../../atoms/Typography/index.ts";
import type { Locale } from "../../../theme/index.ts";
import { Panel } from "../../molecules/Panel/index.ts";
import { PanelTable } from "../../molecules/PanelTable/index.ts";
import { formatDate } from "../../utils/formatDate.ts";
import type { FirmDonationsData } from "../../types.ts";
import { DonationRow, type DonationRowCopy } from "./components/DonationRow/index.ts";

export interface FirmDonationsSectionCopy {
  heading: string;
  /** The header's right slot, the Source and its data-through year: "BaniPartide · data through 2024", given the year. */
  aside: (dataThroughYear: number) => string;
  /** The context line on a supplier's page: "This supplier is also a firm donor: 1 donation and 1 loan to parties." Given the two counts. Never a Signal. */
  supplierContext: (donations: number, loans: number) => string;
  /** One sentence: what the list is and where it comes from, and its data-through year: later donations may be missing. Given the newest year BaniPartide covers. */
  intro: (dataThroughYear: number) => string;
  /** The table's accessible caption. */
  caption: string;
  columns: { date: string; party: string; kind: string; amount: string; source: string };
  row: DonationRowCopy;
  /** Context, not a Signal: a firm donation is never a Party, is never added to awarded value, and says nothing by itself. */
  contextNote: string;
  /** "BaniPartide (Expert Forum), licence CC Attribution 4.0; table fetched 14 November 2026.", given the publisher and the licence as BaniPartide gives them (null when absent) and the formatted fetch day. */
  attribution: (publisher: string | null, license: string | null, fetched: string) => string;
  /** The link text to BaniPartide's methodology, where it names its underlying sources. */
  methodologyLink: string;
}

export interface FirmDonationsSectionProps {
  /** `FirmDonationsFields` of the entity query. */
  donations: FirmDonationsData;
  /** True on a supplier's page: the section then opens with "this supplier is also a firm donor" as context. */
  supplier: boolean;
  locale: Locale;
  copy: FirmDonationsSectionCopy;
  /** The panel shows its last answer while the next loads: its body is dimmed with `aria-busy="true"`; the header and the foot stay at full strength. */
  busy?: boolean | undefined;
}

/**
 * A company's firm donations and loans to parties (BaniPartide, a Reference source), newest first: when, the party exactly as published, the kind, the amount, and per
 * line a citation of BaniPartide and its underlying source. The data-through year is stated. On a supplier's page it opens with "this supplier is also a firm
 * donor", as context only: never a Signal, never a Party, and its amounts are never summed or added to awarded value (ADR 0014). No individual donor is ever here (ADR 0009).
 */
export function FirmDonationsSection({ donations, supplier, locale, copy, busy }: FirmDonationsSectionProps) {
  const { source } = donations;
  const { columns } = copy;
  return (
    <Panel
      heading={copy.heading}
      level="h2"
      flush
      busy={busy}
      aside={copy.aside(donations.dataThroughYear)}
      foot={
        <>
          <Typography component="span" variant="inherit">{copy.attribution(source.publisher, source.license, formatDate(source.fetchedAt, locale, "long"))}</Typography>
          {source.underlyingUrl ? <Link href={source.underlyingUrl} target="_blank">{copy.methodologyLink}</Link> : null}
        </>
      }
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, px: 2, py: 1.5 }}>
        {supplier && (
          <Well sx={{ px: 2, py: 1.5 }}>
            <Typography>{copy.supplierContext(donations.donationCount, donations.loanCount)}</Typography>
          </Well>
        )}
        <Typography>{copy.intro(donations.dataThroughYear)}</Typography>
      </Box>
      <PanelTable label={copy.caption} aria-label={copy.caption} minWidth={720}>
        <TableHead>
          <TableRow>
            <TableCell>{columns.date}</TableCell>
            <TableCell>{columns.party}</TableCell>
            <TableCell>{columns.kind}</TableCell>
            <NumericCell>{columns.amount}</NumericCell>
            <TableCell>{columns.source}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {donations.items.map((donation) => <DonationRow key={donation.sourceRow} donation={donation} source={source} locale={locale} copy={copy.row} />)}
        </TableBody>
      </PanelTable>
      <Box sx={{ px: 2, py: 1.5 }}>
        <Typography variant="caption" color="text.secondary">{copy.contextNote}</Typography>
      </Box>
    </Panel>
  );
}
