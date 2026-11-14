import { Box } from "../../../atoms/Box/index.ts";
import { Link } from "../../../atoms/Link/index.ts";
import { Table } from "../../../atoms/Table/index.ts";
import { TableBody } from "../../../atoms/TableBody/index.ts";
import { TableCell } from "../../../atoms/TableCell/index.ts";
import { TableContainer } from "../../../atoms/TableContainer/index.ts";
import { TableHead } from "../../../atoms/TableHead/index.ts";
import { TableRow } from "../../../atoms/TableRow/index.ts";
import { Typography } from "../../../atoms/Typography/index.ts";
import type { Locale } from "../../../theme/index.ts";
import { Panel } from "../../molecules/Panel/index.ts";
import { visuallyHidden } from "../../utils/visuallyHidden.ts";
import { formatDate } from "../../utils/formatDate.ts";
import type { FirmDonationsData } from "../../types.ts";
import { DonationRow, type DonationRowCopy } from "./components/DonationRow/index.ts";

export interface FirmDonationsSectionCopy {
  heading: string;
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
}

/**
 * A company's firm donations and loans to parties (BaniPartide, a Reference source), newest first: when, the party exactly as published, the kind, the amount, and per
 * line a citation of BaniPartide and its underlying source. The data-through year is stated. On a supplier's page it opens with "this supplier is also a firm
 * donor", as context only: never a Signal, never a Party, and its amounts are never summed or added to awarded value (ADR 0014). No individual donor is ever here (ADR 0009).
 */
export function FirmDonationsSection({ donations, supplier, locale, copy }: FirmDonationsSectionProps) {
  const { source } = donations;
  const { columns } = copy;
  return (
    <Panel heading={copy.heading} level="h2">
      {supplier && <Typography>{copy.supplierContext(donations.donationCount, donations.loanCount)}</Typography>}
      <Typography>{copy.intro(donations.dataThroughYear)}</Typography>
      <TableContainer>
        <Table size="small">
          <Box component="caption" sx={visuallyHidden}>{copy.caption}</Box>
          <TableHead>
            <TableRow>
              <TableCell>{columns.date}</TableCell>
              <TableCell>{columns.party}</TableCell>
              <TableCell>{columns.kind}</TableCell>
              <TableCell align="right">{columns.amount}</TableCell>
              <TableCell>{columns.source}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {donations.items.map((donation) => <DonationRow key={donation.sourceRow} donation={donation} source={source} locale={locale} copy={copy.row} />)}
          </TableBody>
        </Table>
      </TableContainer>
      <Typography variant="caption" color="text.secondary">{copy.contextNote}</Typography>
      <Typography variant="caption" color="text.secondary">
        {copy.attribution(source.publisher, source.license, formatDate(source.fetchedAt, locale, "long"))}
        {source.underlyingUrl ? <> <Link href={source.underlyingUrl} target="_blank">{copy.methodologyLink}</Link></> : null}
      </Typography>
    </Panel>
  );
}
