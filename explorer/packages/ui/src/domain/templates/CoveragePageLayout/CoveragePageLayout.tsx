import type { ReactNode } from "react";
import type { Locale } from "../../../theme/index.ts";
import { Box } from "../../../atoms/Box/index.ts";
import { Link } from "../../../atoms/Link/index.ts";
import { Stack } from "../../../atoms/Stack/index.ts";
import { Table } from "../../../atoms/Table/index.ts";
import { TableBody } from "../../../atoms/TableBody/index.ts";
import { TableCell } from "../../../atoms/TableCell/index.ts";
import { TableContainer } from "../../../atoms/TableContainer/index.ts";
import { TableHead } from "../../../atoms/TableHead/index.ts";
import { TableRow } from "../../../atoms/TableRow/index.ts";
import { Typography } from "../../../atoms/Typography/index.ts";
import { DataThroughDate } from "../../atoms/DataThroughDate/index.ts";
import { CoverageGrid, GAP_STATES, crawlOnlyCells, explainedCells, formatCellCount, kindLabel, reasonOf } from "../../organisms/CoverageGrid/index.ts";
import { formatDate } from "../../utils/formatDate.ts";
import { followLink } from "../../utils/followLink.ts";
import type { GapRule } from "../../types.ts";
import type { CoveragePageContent, CoveragePageLayoutCopy } from "./coveragePageLayout.types.ts";

export interface CoveragePageLayoutProps {
  status: "loading" | "error" | "ready";
  /** Required when `status` is "ready". */
  content?: CoveragePageContent | undefined;
  locale: Locale;
  /** Where the methodology page lives (the app supplies the locale path). */
  methodologyHref: string;
  onNavigate?: (href: string) => void;
  copy: CoveragePageLayoutCopy;
}

const RULES: readonly GapRule[] = ["HAND_ENTERED", "COUNT_BELOW_NEIGHBOURS", "NO_PRIOR_CALL_BEFORE_BACKFILL", "AWAITING_BULK_FILE"];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box component="section" aria-label={title}>
      <Typography variant="h5" component="h2" gutterBottom>{title}</Typography>
      {children}
    </Box>
  );
}

/**
 * The Coverage page (`/explore/coverage`): title and intro, the quarter x kind grid with the date range highlighted, data-through per record kind,
 * crawl-only counts, the list of known gaps with the reason or the rule for each, the rules in words, and the MF reference-list snapshot date.
 * It fetches nothing; loading, error and an empty window are states of the same page.
 */
export function CoveragePageLayout({ status, content, locale, methodologyHref, onNavigate, copy }: CoveragePageLayoutProps) {
  const head = (
    <>
      <Typography variant="h4" component="h1">{copy.title}</Typography>
      <Typography>{copy.intro}</Typography>
    </>
  );
  if (status === "loading" || status === "error" || !content) {
    return (
      <Stack component="main" spacing={2} sx={{ p: 3, maxWidth: 1200, mx: "auto" }}>
        {head}
        {status === "error" ? <Typography role="alert">{copy.error}</Typography> : <Typography role="status">{copy.loading}</Typography>}
      </Stack>
    );
  }
  const { cells, sources, referenceSnapshot, window } = content;
  const gaps = explainedCells(cells);
  const crawlOnly = crawlOnlyCells(cells);
  const harvested = sources.filter((source) => source.harvested && source.dataThrough.length > 0);
  return (
    <Stack component="main" spacing={4} sx={{ p: 3, maxWidth: 1200, mx: "auto" }}>
      <Stack spacing={1}>{head}</Stack>

      <Section title={copy.gridHeading}>
        {cells.length === 0 ? <Typography role="status">{copy.empty}</Typography> : <CoverageGrid cells={cells} window={window} locale={locale} copy={copy.grid} />}
      </Section>

      <Section title={copy.dataThrough.heading}>
        <Typography variant="body2" gutterBottom>{copy.dataThrough.intro}</Typography>
        {harvested.length === 0 ? (
          <Typography>{copy.dataThrough.none}</Typography>
        ) : (
          harvested.map((source) => (
            <Box component="ul" key={source.id} aria-label={source.name} sx={{ m: 0, pl: 3 }}>
              {source.dataThrough.map((entry) => (
                <li key={entry.kind}>
                  <DataThroughDate dataThrough={entry} locale={locale} copy={copy.dataThrough.copy} kindLabel={kindLabel(entry.kind, copy.grid)} />
                </li>
              ))}
            </Box>
          ))
        )}
      </Section>

      {crawlOnly.length > 0 && (
        <Section title={copy.crawlOnly.heading}>
          <Typography variant="body2" gutterBottom>{copy.crawlOnly.intro}</Typography>
          <Box component="ul" sx={{ m: 0, pl: 3 }}>
            {crawlOnly.map((cell) => (
              <li key={`${cell.quarter}/${cell.kind}`}>
                {copy.crawlOnly.line(kindLabel(cell.kind, copy.grid), copy.grid.quarterName(cell.quarter), cell.crawlOnly ?? 0, formatCellCount(cell.crawlOnly ?? 0, locale))}
              </li>
            ))}
          </Box>
        </Section>
      )}

      <Section title={copy.knownGaps.heading}>
        <Typography variant="body2" gutterBottom>{copy.knownGaps.intro}</Typography>
        {gaps.length === 0 ? (
          <Typography>{copy.knownGaps.empty}</Typography>
        ) : (
          <TableContainer>
            <Table size="small" aria-label={copy.knownGaps.heading}>
              <TableHead>
                <TableRow>
                  <TableCell>{copy.knownGaps.columns.quarter}</TableCell>
                  <TableCell>{copy.knownGaps.columns.kind}</TableCell>
                  <TableCell>{copy.knownGaps.columns.state}</TableCell>
                  <TableCell>{copy.knownGaps.columns.reason}</TableCell>
                  <TableCell align="right">{copy.knownGaps.columns.records}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {gaps.map((cell) => (
                  <TableRow key={`${cell.quarter}/${cell.kind}`} data-state={cell.state}>
                    <TableCell>{copy.grid.quarterName(cell.quarter)}</TableCell>
                    <TableCell>{kindLabel(cell.kind, copy.grid)}</TableCell>
                    <TableCell>{copy.grid.states[cell.state]}</TableCell>
                    <TableCell>{reasonOf(cell, copy.grid)}</TableCell>
                    <TableCell align="right">{formatCellCount(cell.records, locale)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Section>

      <Section title={copy.rules.heading}>
        <Typography variant="body2" gutterBottom>{copy.rules.intro}</Typography>
        <Box component="dl" sx={{ m: 0 }}>
          {RULES.map((rule) => (
            <Box key={rule} data-rule={rule} sx={{ mb: 1 }}>
              <Typography component="dt" sx={{ fontWeight: 600 }}>{copy.rules.names[rule]}</Typography>
              <Typography component="dd" sx={{ m: 0 }}>{copy.grid.rules[rule]}</Typography>
            </Box>
          ))}
        </Box>
        <Typography variant="h6" component="h3" gutterBottom>{copy.rules.statesHeading}</Typography>
        <Box component="dl" sx={{ m: 0 }}>
          {GAP_STATES.map((state) => (
            <Box key={state} data-state-meaning={state} sx={{ mb: 1 }}>
              <Typography component="dt" sx={{ fontWeight: 600 }}>{copy.grid.states[state]}</Typography>
              <Typography component="dd" sx={{ m: 0 }}>{copy.rules.states[state]}</Typography>
            </Box>
          ))}
        </Box>
        <Link href={methodologyHref} onClick={followLink(methodologyHref, onNavigate)}>{copy.rules.methodology}</Link>
      </Section>

      <Section title={copy.snapshot.heading}>
        <Typography>
          {referenceSnapshot === null ? copy.snapshot.notLoaded : <SnapshotLine date={referenceSnapshot} locale={locale} copy={copy} />}
        </Typography>
      </Section>
    </Stack>
  );
}

function SnapshotLine({ date, locale, copy }: { date: string; locale: Locale; copy: CoveragePageLayoutCopy }) {
  return <time dateTime={date}>{copy.snapshot.line(formatDate(date, locale, "long"))}</time>;
}
