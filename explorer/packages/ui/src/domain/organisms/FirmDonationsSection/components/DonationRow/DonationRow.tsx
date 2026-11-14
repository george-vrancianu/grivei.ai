import { Link } from "../../../../../atoms/Link/index.ts";
import { TableCell } from "../../../../../atoms/TableCell/index.ts";
import { TableRow } from "../../../../../atoms/TableRow/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";
import type { Locale } from "../../../../../theme/index.ts";
import { MoneyAmount } from "../../../../atoms/MoneyAmount/index.ts";
import type { DonationSourceData, FirmDonationData } from "../../../../types.ts";
import { donationWhen } from "../../firmDonationsSection.utils.ts";

export interface DonationRowCopy {
  /** The kind of each line: "Donation", "Loan". */
  kind: { DONATION: string; LOAN: string };
  /** Shown when the row has no date cell and no year. */
  dateNotStated: string;
  /** "BaniPartide, row 12": the link text of the row a line cites, given BaniPartide's row number in our held copy of the table. */
  source: (row: number) => string;
  /** The line's underlying source, in words: the parties' publications BaniPartide's methodology names (BaniPartide gives no report per row). */
  underlying: string;
}

export interface DonationRowProps {
  donation: FirmDonationData;
  source: DonationSourceData;
  locale: Locale;
  copy: DonationRowCopy;
}

/** One donation or loan (an amount with bani shows them: a donation is never rounded): when (as far as BaniPartide's cell allows), the party exactly as published, the kind, the amount in RON, and the citation of BaniPartide and its underlying source. */
export function DonationRow({ donation, source, locale, copy }: DonationRowProps) {
  const when = donationWhen(donation, locale);
  return (
    <TableRow data-kind={donation.kind} data-source-row={donation.sourceRow}>
      <TableCell component="th" scope="row">{when ?? <Typography component="span" variant="meta" color="text.secondary">{copy.dateNotStated}</Typography>}</TableCell>
      {/* the party as BaniPartide publishes it (source data): never translated or normalised */}
      <TableCell>{donation.party}</TableCell>
      <TableCell>{copy.kind[donation.kind]}</TableCell>
      <TableCell align="right"><MoneyAmount bani={donation.amount} locale={locale} showBani={BigInt(donation.amount) % 100n !== 0n} /></TableCell>
      <TableCell>
        {source.datasetUrl ? <Link href={source.datasetUrl} target="_blank">{copy.source(donation.sourceRow)}</Link> : copy.source(donation.sourceRow)}
        <Typography component="div" variant="meta" color="text.secondary">
          {source.underlyingUrl ? <Link href={source.underlyingUrl} target="_blank">{copy.underlying}</Link> : copy.underlying}
        </Typography>
      </TableCell>
    </TableRow>
  );
}
