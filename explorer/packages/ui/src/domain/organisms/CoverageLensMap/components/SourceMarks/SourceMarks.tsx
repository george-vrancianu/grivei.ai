import type { CountyCoverage, SourceInfo } from "../../../../types.ts";
import { COVERAGE_COLORS, COVERAGE_SOURCE_ID, MARK_FILL, MARK_OUTLINE, NO_STATUS_COLOR, OTHER_HARVESTED_MARK_COLOR, PLANNED_MARK_COLOR } from "../../coverageLensMap.utils.ts";
import type { CoverageLensMapCopy } from "../../coverageLensMap.types.ts";

const SIZE = 8;
const GAP = 3;

export interface SourceMarksProps {
  /** The projected centre of each county, by code (the base map's overlay context). */
  centroids: ReadonlyMap<string, readonly [number, number]>;
  /** Every Source the contract lists, harvested or not: one mark each, on every county. */
  sources: readonly SourceInfo[];
  /** Each county's coverage row; a county without one gets the no-status colour on the harvested Source's mark. */
  coverage: ReadonlyMap<string, CountyCoverage>;
  copy: Pick<CoverageLensMapCopy, "status" | "noStatus" | "marks">;
}

/**
 * One small square per Source at each county's centre. The coverage Source's square is filled with the county's status colour
 * (outlined dark, so it reads on any fill); a planned Source's (`harvested: false`) is an empty grey dashed square, the same on every county.
 * Each mark carries a title; the group is decorative for assistive tech (the legend and the area names say the same).
 */
export function SourceMarks({ centroids, sources, coverage, copy }: SourceMarksProps) {
  const width = sources.length * SIZE + (sources.length - 1) * GAP;
  return (
    <g data-source-marks aria-hidden="true" pointerEvents="none">
      {[...centroids].map(([code, at]) => {
        const status = coverage.get(code)?.status;
        return (
          <g key={code} data-county={code} transform={`translate(${at[0] - width / 2} ${at[1] - SIZE / 2})`}>
            {sources.map((source, i) => {
              const planned = !source.harvested;
              const coverageMark = source.id === COVERAGE_SOURCE_ID;
              const label = planned
                ? copy.marks.notHarvested(source.name)
                : coverageMark
                  ? `${source.name}: ${status ? copy.status[status] : copy.noStatus}`
                  : source.name;
              const fill = planned ? MARK_FILL : coverageMark ? (status ? COVERAGE_COLORS[status] : NO_STATUS_COLOR) : OTHER_HARVESTED_MARK_COLOR;
              return (
                <rect
                  key={source.id}
                  data-source={source.id}
                  data-state={planned ? "planned" : coverageMark ? (status ?? "none") : "harvested"}
                  x={i * (SIZE + GAP)}
                  width={SIZE}
                  height={SIZE}
                  rx={1}
                  fill={fill}
                  stroke={planned ? PLANNED_MARK_COLOR : MARK_OUTLINE}
                  strokeWidth={1.25}
                  strokeDasharray={planned ? "2 1.5" : undefined}
                >
                  <title>{label}</title>
                </rect>
              );
            })}
          </g>
        );
      })}
    </g>
  );
}

