import { Box } from "../../../../../atoms/Box/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";
import type { SourceInfo } from "../../../../types.ts";
import { NO_DATA_COLOR } from "../../../BaseMap/index.ts";
import type { CoverageLensMapCopy } from "../../coverageLensMap.types.ts";
import { COVERAGE_COLORS, COVERAGE_STATUSES, PLANNED_MARK_COLOR, coverageSource, plannedSources } from "../../coverageLensMap.utils.ts";

export interface CoverageLegendProps {
  sources: readonly SourceInfo[];
  copy: Pick<CoverageLensMapCopy, "map" | "status" | "noStatus" | "marks">;
}

const swatch = { width: 14, height: 14, borderRadius: 0.5, flex: "none" } as const;

/** The four statuses with their colours, the no-status swatch, and what the Source marks mean (harvested Source coloured by status, planned Sources greyed). */
export function CoverageLegend({ sources, copy }: CoverageLegendProps) {
  const harvested = coverageSource(sources);
  const planned = plannedSources(sources);
  return (
    <Box component="section" aria-label={copy.map.legendTitle} sx={{ minWidth: 200, maxWidth: 360, mt: 1 }}>
      <Typography variant="caption" component="h3" sx={{ fontWeight: 600 }}>{copy.map.legendTitle}</Typography>
      <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
        {COVERAGE_STATUSES.map((status) => (
          <Box component="li" key={status} data-status={status} sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}>
            <Box aria-hidden sx={{ ...swatch, backgroundColor: COVERAGE_COLORS[status] }} />
            <Typography variant="caption">{copy.status[status]}</Typography>
          </Box>
        ))}
        <Box component="li" data-status="none" sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}>
          <Box aria-hidden sx={{ ...swatch, backgroundColor: NO_DATA_COLOR }} />
          <Typography variant="caption">{copy.noStatus}</Typography>
        </Box>
      </Box>
      <Typography variant="caption" component="h3" sx={{ fontWeight: 600, display: "block", mt: 1 }}>{copy.marks.title}</Typography>
      <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
        {harvested && (
          <Box component="li" data-marks="harvested" sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}>
            <Box aria-hidden sx={{ ...swatch, width: 10, height: 10, backgroundColor: COVERAGE_COLORS.PARTIAL, border: "1.25px solid #1b2a41" }} />
            <Typography variant="caption">{copy.marks.harvested(harvested.name)}</Typography>
          </Box>
        )}
        {planned.length > 0 && (
          <Box component="li" data-marks="planned" sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}>
            <Box aria-hidden sx={{ ...swatch, width: 10, height: 10, backgroundColor: "#fff", border: `1.25px dashed ${PLANNED_MARK_COLOR}` }} />
            <Typography variant="caption">{copy.marks.plannedLegend(planned.map((source) => source.name).join(", "))}</Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}
