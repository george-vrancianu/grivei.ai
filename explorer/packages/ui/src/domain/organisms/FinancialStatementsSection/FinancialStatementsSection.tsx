import { Box } from "../../../atoms/Box/index.ts";
import { TableBody } from "../../../atoms/TableBody/index.ts";
import { TableCell } from "../../../atoms/TableCell/index.ts";
import { NumericCell } from "../../atoms/NumericCell/index.ts";
import { TableHead } from "../../../atoms/TableHead/index.ts";
import { TableRow } from "../../../atoms/TableRow/index.ts";
import { Typography } from "../../../atoms/Typography/index.ts";
import type { Locale } from "../../../theme/index.ts";
import { Panel } from "../../molecules/Panel/index.ts";
import { PanelTable } from "../../molecules/PanelTable/index.ts";
import type { FinancialStatementsData } from "../../types.ts";
import { FinancialYearRow, type FinancialYearRowCopy } from "./components/FinancialYearRow/index.ts";

export interface FinancialStatementsSectionCopy {
  heading: string;
  /** The header's right slot, the Source and the unit: "MF · RON". */
  aside: string;
  /** One sentence: the figures are the company's statements as the Ministry of Finance (MF) publishes them, in RON, and the awards beside them are a different thing. */
  intro: string;
  /** The table's accessible caption. */
  caption: string;
  columns: { year: string; turnover: string; profitOrLoss: string; debts: string; equity: string; employees: string; awarded: string; share: string; source: string };
  row: FinancialYearRowCopy;
  /** Shown once when the newest year is a first release: MF may revise it, so read it with care. */
  mayBeRevisedNote: string;
  /** Context, not a Signal: the awards and their share of turnover are never added to awarded value, and a share can exceed 100%. */
  contextNote: string;
}

export interface FinancialStatementsSectionProps {
  /** `FinancialStatementsFields` of the entity query. */
  financials: FinancialStatementsData;
  locale: Locale;
  copy: FinancialStatementsSectionCopy;
  /** The panel shows its last answer while the next loads: its body is dimmed with `aria-busy="true"`; the header stays at full strength. */
  busy?: boolean | undefined;
}

/**
 * A supplier's annual financial statements by year (MF, a Reference source): turnover, profit or loss, debts, equity and average employees, each blank cell
 * "not reported" and never zero, each year marked first release or revised, with the file it cites. Beside them the awards of the same calendar year and their share
 * of turnover, as context only: never a Signal, never added to awarded value (ADR 0014).
 */
export function FinancialStatementsSection({ financials, locale, copy, busy }: FinancialStatementsSectionProps) {
  const { columns } = copy;
  const heads = [columns.turnover, columns.profitOrLoss, columns.debts, columns.equity, columns.employees, columns.awarded, columns.share];
  return (
    <Panel heading={copy.heading} level="h2" flush busy={busy} aside={copy.aside}>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, px: 2, py: 1.5 }}>
        <Typography>{copy.intro}</Typography>
      </Box>
      <PanelTable label={copy.caption} aria-label={copy.caption} minWidth={960}>
        <TableHead>
          <TableRow>
            <TableCell>{columns.year}</TableCell>
            {heads.map((head) => <NumericCell key={head}>{head}</NumericCell>)}
            <TableCell>{columns.source}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {financials.years.map((year) => <FinancialYearRow key={year.fiscalYear} year={year} locale={locale} copy={copy.row} />)}
        </TableBody>
      </PanelTable>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1, px: 2, py: 1.5 }}>
        {financials.years.some((y) => y.mayBeRevised) && <Typography variant="caption" color="text.secondary">{copy.mayBeRevisedNote}</Typography>}
        <Typography variant="caption" color="text.secondary">{copy.contextNote}</Typography>
      </Box>
    </Panel>
  );
}
