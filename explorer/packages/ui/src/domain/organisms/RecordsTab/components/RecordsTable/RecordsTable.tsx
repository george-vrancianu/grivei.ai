import { Link } from "../../../../../atoms/Link/index.ts";
import { Table } from "../../../../../atoms/Table/index.ts";
import { TableBody } from "../../../../../atoms/TableBody/index.ts";
import { TableCell } from "../../../../../atoms/TableCell/index.ts";
import { TableContainer } from "../../../../../atoms/TableContainer/index.ts";
import { TableHead } from "../../../../../atoms/TableHead/index.ts";
import { TableRow } from "../../../../../atoms/TableRow/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";
import type { Locale } from "../../../../../theme/index.ts";
import { EntityLink } from "../../../../atoms/EntityLink/index.ts";
import { PartyName } from "../../../../atoms/PartyName/index.ts";
import { MatchedLine } from "../../../../molecules/MatchedLine/index.ts";
import { RecordBadges } from "../../../../molecules/RecordBadges/index.ts";
import type { RecordResultRowCopy, RecordSignalBadges } from "../../../../molecules/RecordResultRow/index.ts";
import { RecordValue } from "../../../../molecules/RecordValue/index.ts";
import { SignalBadge } from "../../../../molecules/SignalBadge/index.ts";
import type { EntityRef, EntityRole, RecordResult } from "../../../../types.ts";
import { formatDate } from "../../../../utils/formatDate.ts";
import { signalKeys } from "../../../../utils/signalKey.ts";

export interface RecordsTableCopy {
  /** The accessible name of the table. */
  label: string;
  columns: { record: string; title: string; value: string };
}

export interface RecordsTableProps {
  rows: readonly RecordResult[];
  /** The page's role: the counterparty column shows the winners on an authority's page and the authority on a supplier's. */
  role: EntityRole;
  entityHref: (entity: EntityRef, role: EntityRole) => string;
  recordHref: (record: RecordResult["record"]) => string;
  locale: Locale;
  copy: RecordsTableCopy & { recordRow: RecordResultRowCopy };
  signalBadges?: RecordSignalBadges | undefined;
}

/**
 * The Records of the page as a table: the code and date, the title with the matched field (when the filter has a search text), its badges and Signals, the counterparty and the full value.
 * It scrolls sideways inside its own box on a narrow screen, so the page never does.
 */
export function RecordsTable({ rows, role, entityHref, recordHref, locale, copy, signalBadges }: RecordsTableProps) {
  const row = copy.recordRow;
  return (
    <TableContainer>
      <Table aria-label={copy.label} sx={{ minWidth: 760, "& td": { verticalAlign: "top", py: 1.5 } }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: 150 }}>{copy.columns.record}</TableCell>
            <TableCell>{copy.columns.title}</TableCell>
            <TableCell sx={{ width: 230 }}>{role === "authority" ? row.winners : row.authority}</TableCell>
            <TableCell align="right" sx={{ width: 140 }}>
              {copy.columns.value}
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map(({ record, matchedField }) => {
            const keys = signalKeys(record.signals);
            const signals = signalBadges
              ? record.signals.map((signal, i) => (
                  <SignalBadge key={keys[i]} signal={signal} href={signalBadges.href(signal)} onNavigate={signalBadges.onNavigate} locale={locale} copy={signalBadges.copy} />
                ))
              : [];
            return (
              <TableRow key={record.code}>
                <TableCell>
                  <Typography variant="meta" component="div" color="text.primary">
                    {record.code}
                  </Typography>
                  {record.date && (
                    <Typography variant="meta" component="time" dateTime={record.date}>
                      {formatDate(record.date, locale)}
                    </Typography>
                  )}
                </TableCell>
                <TableCell sx={{ minWidth: 0, overflowWrap: "anywhere" }}>
                  <Link href={recordHref(record)} color="text.primary" underline="hover" sx={{ fontWeight: 500, lineHeight: 1.4, textWrap: "pretty" }}>
                    {record.title}
                  </Link>
                  {matchedField && <MatchedLine matchedField={matchedField} copy={row} />}
                  <RecordBadges record={record} copy={row}>
                    {signals.length > 0 ? signals : null}
                  </RecordBadges>
                </TableCell>
                <TableCell sx={{ overflowWrap: "anywhere" }}>
                  {role === "authority" ? (
                    record.winners.map((party, index) => (
                      <div key={index}>
                        <PartyName party={party} entityHref={(entity) => entityHref(entity, "supplier")} copy={row.party} />
                      </div>
                    ))
                  ) : (
                    <EntityLink entity={record.authority} href={entityHref(record.authority, "authority")} copy={row.party.entityLink} />
                  )}
                </TableCell>
                <TableCell align="right">
                  <RecordValue record={record} locale={locale} copy={row} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
