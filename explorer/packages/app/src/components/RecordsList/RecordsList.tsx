import type { RecordResultFieldsFragment } from "@grivei/contract";
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, type Locale,
} from "@grivei/ui";
import type { Copy } from "../../copy.ts";
import { formatBani } from "../../money.ts";

export interface RecordsListProps {
  page: RecordResultFieldsFragment;
  copy: Pick<Copy, "recordsList" | "empty" | "noValue" | "columns">;
  locale: Locale;
}

/** The Records of the matching set: source data (titles, names) is shown as published, in both languages. */
export function RecordsList({ page, copy, locale }: RecordsListProps) {
  return (
    <section>
      <Typography variant="h6" component="h2" gutterBottom>
        {copy.recordsList}
      </Typography>
      {page.rows.length === 0 ? (
        <Typography>{copy.empty}</Typography>
      ) : (
        <TableContainer>
          <Table aria-label={copy.recordsList}>
            <TableHead>
              <TableRow>
                <TableCell>{copy.columns.code}</TableCell>
                <TableCell>{copy.columns.title}</TableCell>
                <TableCell>{copy.columns.authority}</TableCell>
                <TableCell>{copy.columns.supplier}</TableCell>
                <TableCell>{copy.columns.date}</TableCell>
                <TableCell align="right">{copy.columns.value}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {page.rows.map(({ record }) => (
                <TableRow key={record.code}>
                  <TableCell>{record.code}</TableCell>
                  <TableCell>{record.title}</TableCell>
                  <TableCell>{record.authority.displayName}</TableCell>
                  <TableCell>{record.winners.map((w) => w.publishedName).filter(Boolean).join(", ")}</TableCell>
                  <TableCell>{record.date}</TableCell>
                  <TableCell align="right">{record.value === null ? copy.noValue : formatBani(record.value, locale)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </section>
  );
}
