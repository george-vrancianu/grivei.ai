import { Box } from "../../../../../atoms/Box/index.ts";
import { Table } from "../../../../../atoms/Table/index.ts";
import { TableBody } from "../../../../../atoms/TableBody/index.ts";
import { TableCell } from "../../../../../atoms/TableCell/index.ts";
import { TableHead } from "../../../../../atoms/TableHead/index.ts";
import { TableRow } from "../../../../../atoms/TableRow/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";
import type { Locale } from "../../../../../theme/index.ts";
import { MoneyAmount } from "../../../../atoms/MoneyAmount/index.ts";
import type { RelationshipsTimeline } from "../../../../types.ts";
import type { MonthlyTimelineCopy } from "../../relationshipsTab.types.ts";
import { TIMELINE_COLOR, TIMELINE_PICKED_COLOR, timelineBars } from "../../relationshipsTab.utils.ts";
import { formatMonth } from "../../../../utils/formatDate.ts";

export interface MonthlyTimelineProps {
  /** The entity's months in the filter. */
  timeline: RelationshipsTimeline;
  /** The picked counterparty's months (`timeline(counterparty:)`), drawn over the overall bars; null when nothing is picked or it has not arrived. */
  pickedTimeline: RelationshipsTimeline | null;
  /** The picked counterparty's name, for the legend and the table; null while it is not known (the series is still drawn, under a neutral label). */
  pickedName: string | null;
  locale: Locale;
  copy: MonthlyTimelineCopy;
}

const WIDTH = 640;
const HEIGHT = 120;
const AXIS = 22;

const visuallyHidden = { position: "absolute", width: "1px", height: "1px", overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" } as const;
const swatch = { width: 12, height: 12, borderRadius: 0.5, flex: "none" } as const;

/**
 * Money per month as bars (D3 band and linear scales). With a counterparty picked its own months are drawn over the overall bars on the same
 * scale, so the highlighted part reads as that counterparty's share of each month. A table of the same figures is the text alternative.
 */
export function MonthlyTimeline({ timeline, pickedTimeline, pickedName, locale, copy }: MonthlyTimelineProps) {
  const bars = timelineBars(timeline, pickedTimeline, WIDTH, HEIGHT);
  const picked = pickedTimeline !== null;
  const pickedByMonth = new Map((pickedTimeline ?? []).map((point) => [point.month, point.total.awarded]));
  const overallByMonth = new Map(timeline.map((point) => [point.month, point.total.awarded]));
  // Label about a dozen months however many there are.
  const every = Math.max(1, Math.ceil(bars.length / 12));
  return (
    <Box component="section" aria-label={copy.heading}>
      <Typography variant="h6" component="h3">{copy.heading}</Typography>
      {bars.length === 0 ? (
        <Typography color="text.secondary">{copy.empty}</Typography>
      ) : (
        <>
          <Box component="svg" role="img" aria-label={copy.label} viewBox={`0 0 ${WIDTH} ${HEIGHT + AXIS}`} sx={{ width: "100%", height: "auto", display: "block" }}>
            {bars.map((bar) => (
              <g key={bar.month} data-month={bar.month}>
                <rect data-series="overall" x={bar.x} y={bar.y} width={bar.width} height={bar.height} fill={TIMELINE_COLOR} />
                {picked && bar.pickedHeight > 0 && (
                  <rect data-series="picked" x={bar.x} y={bar.pickedY} width={bar.width} height={bar.pickedHeight} fill={TIMELINE_PICKED_COLOR} />
                )}
              </g>
            ))}
            {bars.map((bar, i) =>
              i % every === 0 ? (
                <text key={`label-${bar.month}`} x={bar.x + bar.width / 2} y={HEIGHT + 14} textAnchor="middle" fontSize={10} fill="currentColor" aria-hidden="true">
                  {formatMonth(bar.month, locale)}
                </text>
              ) : null,
            )}
          </Box>
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }} data-legend="timeline">
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <Box aria-hidden sx={{ ...swatch, backgroundColor: TIMELINE_COLOR }} />
              <Typography variant="caption">{copy.overall}</Typography>
            </Box>
            {picked && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <Box aria-hidden sx={{ ...swatch, backgroundColor: TIMELINE_PICKED_COLOR }} />
                <Typography variant="caption">{copy.picked(pickedName)}</Typography>
              </Box>
            )}
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
    </Box>
  );
}
