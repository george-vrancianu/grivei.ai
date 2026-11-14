import { Link } from "../../../../../atoms/Link/index.ts";
import { TableCell } from "../../../../../atoms/TableCell/index.ts";
import { TableRow } from "../../../../../atoms/TableRow/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";
import type { Locale } from "../../../../../theme/index.ts";
import { MoneyAmount } from "../../../../atoms/MoneyAmount/index.ts";
import type { FinancialYearData } from "../../../../types.ts";
import { formatDate } from "../../../../utils/formatDate.ts";
import { formatShare } from "../../financialStatementsSection.utils.ts";

export interface FinancialYearRowCopy {
  /** Shown for every blank cell of MF's file (a blank is never read as zero): "not reported". */
  notReported: string;
  /** The year's release, under the fiscal year. */
  revision: { firstRelease: string; revised: string; firstReleaseMayBeRevised: string };
  /** "MF, WEB_BL_BS_SL_AN2024.txt": the link text of the file a figure cites, given the file name. */
  source: (file: string) => string;
  /** "Published 30 June 2025", given the formatted day (the file's own publication date). */
  published: (published: string) => string;
}

export interface FinancialYearRowProps {
  year: FinancialYearData;
  locale: Locale;
  copy: FinancialYearRowCopy;
}

/** One fiscal year: the figures MF's file gives (blank cells say "not reported"), the awards of the same calendar year beside them as context, and the file the figures cite. */
export function FinancialYearRow({ year, locale, copy }: FinancialYearRowProps) {
  const release = year.revision === "REVISED" ? copy.revision.revised : year.mayBeRevised ? copy.revision.firstReleaseMayBeRevised : copy.revision.firstRelease;
  const blank = <Typography component="span" variant="meta" color="text.secondary">{copy.notReported}</Typography>;
  const money = (bani: string | null) => (bani === null ? blank : <MoneyAmount bani={bani} locale={locale} />);
  return (
    <TableRow data-fiscal-year={year.fiscalYear} data-revision={year.revision}>
      <TableCell component="th" scope="row">
        <Typography component="span" variant="body2">{year.fiscalYear}</Typography>
        <Typography component="div" variant="meta" color="text.secondary">{release}</Typography>
      </TableCell>
      <TableCell align="right">{money(year.turnover)}</TableCell>
      <TableCell align="right">{money(year.profitOrLoss)}</TableCell>
      <TableCell align="right">{money(year.debts)}</TableCell>
      <TableCell align="right">{money(year.equity)}</TableCell>
      <TableCell align="right">{year.averageEmployees === null ? blank : new Intl.NumberFormat(locale).format(year.averageEmployees)}</TableCell>
      <TableCell align="right">{<MoneyAmount bani={year.awardedInYear} locale={locale} />}</TableCell>
      <TableCell align="right">{year.awardShareOfTurnover === null ? blank : formatShare(year.awardShareOfTurnover, locale)}</TableCell>
      <TableCell>
        {year.source.datasetUrl ? <Link href={year.source.datasetUrl} target="_blank">{copy.source(year.source.file)}</Link> : copy.source(year.source.file)}
        {year.source.published && <Typography component="div" variant="meta" color="text.secondary">{copy.published(formatDate(year.source.published, locale, "long"))}</Typography>}
      </TableCell>
    </TableRow>
  );
}
