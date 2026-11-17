import type { ReactNode } from "react";
import { Box } from "../../../../../atoms/Box/index.ts";
import { Table } from "../../../../../atoms/Table/index.ts";
import { TableBody } from "../../../../../atoms/TableBody/index.ts";
import { TableCell } from "../../../../../atoms/TableCell/index.ts";
import { TableHead } from "../../../../../atoms/TableHead/index.ts";
import { TableRow } from "../../../../../atoms/TableRow/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";
import { Well } from "../../../../../atoms/Well/index.ts";
import type { Locale } from "../../../../../theme/index.ts";
import { color, font, radius } from "../../../../../theme/tokens.ts";
import { MoneyAmount, formatMoney } from "../../../../atoms/MoneyAmount/index.ts";
import type { RelationshipsTimeline } from "../../../../types.ts";
import type { MonthlyTimelineCopy } from "../../relationshipsTab.types.ts";
import { TIMELINE_COLOR, TIMELINE_DIMMED_COLOR, TIMELINE_PICKED_COLOR, periodOf, tallestMonth, timelineBars } from "../../relationshipsTab.utils.ts";
import { formatMonth } from "../../../../utils/formatDate.ts";
import { Panel } from "../../../../molecules/Panel/index.ts";
import { visuallyHidden } from "../../../../utils/visuallyHidden.ts";

export interface MonthlyTimelineProps {
  /** The entity's months in the filter. */
  timeline: RelationshipsTimeline;
  /** The picked counterparty's months (`timeline(counterparty:)`), drawn over the overall bars; null when nothing is picked or it has not arrived. */
  pickedTimeline: RelationshipsTimeline | null;
  /** The picked counterparty's name, for the legend and the table; null while it is not known (the series is still drawn, under a neutral label). */
  pickedName: string | null;
  /** The panel shows its last answer while the next loads: the body is dimmed with `aria-busy="true"`; the header strip stays at full strength. */
  busy?: boolean | undefined;
  /** The header's right slot, after the period: the page's `LoadingStatus` while a request is in flight. */
  status?: ReactNode;
  locale: Locale;
  copy: MonthlyTimelineCopy;
}

const WIDTH = 640;
const HEIGHT = 120;
const AXIS = 22;

const swatch = { width: 12, height: 12, borderRadius: 0.5, flex: "none" } as const;

/**
 * Money per month as bars (D3 band and linear scales). With a counterparty picked its own months are drawn over the overall bars on the same
 * scale, so the highlighted part reads as that counterparty's share of each month. A table of the same figures is the text alternative.
 */
export function MonthlyTimeline({ timeline, pickedTimeline, pickedName, busy, status, locale, copy }: MonthlyTimelineProps) {
  const bars = timelineBars(timeline, pickedTimeline, WIDTH, HEIGHT);
  const picked = pickedTimeline !== null;
  const pickedByMonth = new Map((pickedTimeline ?? []).map((point) => [point.month, point.total.awarded]));
  const overallByMonth = new Map(timeline.map((point) => [point.month, point.total.awarded]));
  // Label about a dozen months however many there are.
  const every = Math.max(1, Math.ceil(bars.length / 12));
  const period = periodOf(timeline);
  const tallest = tallestMonth(timeline);
  const aside = (
    <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", columnGap: 2, rowGap: 0.5 }}>
      {period && <span>{copy.period(formatMonth(period.from, locale), formatMonth(period.to, locale))}</span>}
      {status}
    </Box>
  );
  return (
    <Panel heading={copy.heading} aside={aside} busy={busy}>
      {bars.length === 0 ? (
        <Typography color="text.secondary">{copy.empty}</Typography>
      ) : (
        <>
          <Well sx={{ p: 1.5 }}>
          <Box component="svg" role="img" aria-label={copy.label} viewBox={`0 0 ${WIDTH} ${HEIGHT + AXIS}`} sx={{ width: "100%", height: "auto", display: "block", color: color.muted, fontFamily: font.mono }}>
            {bars.map((bar) => (
              <g key={bar.month} data-month={bar.month}>
                <rect data-series="overall" x={bar.x} y={bar.y} width={bar.width} height={bar.height} fill={picked ? TIMELINE_DIMMED_COLOR : TIMELINE_COLOR} rx={radius.cell} />
                {picked && bar.pickedHeight > 0 && (
                  <rect data-series="picked" x={bar.x} y={bar.pickedY} width={bar.width} height={bar.pickedHeight} fill={TIMELINE_PICKED_COLOR} rx={radius.cell} />
                )}
              </g>
            ))}
            <line x1={0} x2={WIDTH} y1={HEIGHT} y2={HEIGHT} stroke={color.lineStrong} strokeWidth={1} />
            {bars.map((bar, i) =>
              i % every === 0 ? (
                <text key={`label-${bar.month}`} x={bar.x + bar.width / 2} y={HEIGHT + 14} textAnchor="middle" fontSize={10} fill="currentColor" aria-hidden="true">
                  {formatMonth(bar.month, locale)}
                </text>
              ) : null,
            )}
          </Box>
          </Well>
          <Box sx={{ display: "flex", columnGap: 2, rowGap: 0.5, flexWrap: "wrap", alignItems: "center" }} data-legend="timeline">
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <Box aria-hidden sx={{ ...swatch, backgroundColor: picked ? TIMELINE_DIMMED_COLOR : TIMELINE_COLOR }} />
              <Typography variant="meta">{copy.overall}</Typography>
            </Box>
            {picked && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <Box aria-hidden sx={{ ...swatch, backgroundColor: TIMELINE_PICKED_COLOR }} />
                <Typography variant="meta">{copy.picked(pickedName)}</Typography>
              </Box>
            )}
            {tallest && <Typography variant="meta" sx={{ ml: "auto" }} data-timeline="tallest">{copy.tallest(formatMonth(tallest.month, locale), formatMoney(tallest.total.awarded, locale))}</Typography>}
          </Box>
          <Box sx={visuallyHidden}>
            <Table>
              <caption>{copy.table.caption}</caption>
              <TableHead>
                <TableRow>
                  <TableCell>{copy.table.month}</TableCell>
                  <TableCell>{copy.table.amount}</TableCell>
                  {picked && <TableCell>{copy.table.picked(pickedName)}</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {bars.map((bar) => (
                  <TableRow key={bar.month}>
                    <TableCell>{formatMonth(bar.month, locale)}</TableCell>
                    <TableCell>{<MoneyAmount bani={overallByMonth.get(bar.month) ?? "0"} locale={locale} />}</TableCell>
                    {picked && <TableCell>{<MoneyAmount bani={pickedByMonth.get(bar.month) ?? "0"} locale={locale} />}</TableCell>}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </>
      )}
    </Panel>
  );
}
