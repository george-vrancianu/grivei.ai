import { useMemo } from "react";
import type { Topology } from "topojson-specification";
import type { Locale } from "../../../theme/index.ts";
import type { CoverageLens } from "../../types.ts";
import { BaseMap, type AreaInfo } from "../BaseMap/index.ts";
import type { MapArea } from "../MoneyLensMap/index.ts";
import { CoverageLegend } from "./components/CoverageLegend/index.ts";
import { CoverageTiles } from "./components/CoverageTiles/index.ts";
import { CoverageTooltip } from "./components/CoverageTooltip/index.ts";
import { SourceMarks } from "./components/SourceMarks/index.ts";
import type { CoverageLensMapCopy } from "./coverageLensMap.types.ts";
import { COVERAGE_COLORS, COVERAGE_SOURCE_ID, NO_STATUS_COLOR, coverageByCounty, coverageSource, sinceText, summaryParts } from "./coverageLensMap.utils.ts";

export type CoverageLensMapProps = {
  /** The Coverage lens's data (`CoverageLens` query): the Sources and the SEAP coverage of the date window. */
  lens: CoverageLens;
  /** County outlines (properties `{ code, name }`, ISO 3166-2:RO codes), built at load time. */
  topology: Topology;
  /** The selected area: a county code, `NATIONAL` or `UNPLACED`. */
  selected?: MapArea;
  /** Emits the clicked county's code, or the clicked tile's area. */
  onSelect: (area: MapArea) => void;
  locale: Locale;
  copy: CoverageLensMapCopy;
};

const NO_VALUES = {};

/**
 * The Coverage lens at county level: counties filled by coverage status (a category, never a ratio), one mark per Source on every county
 * (the harvested Source coloured by status, planned Sources greyed), and the National and Unplaced tiles. Presentational: data in, clicks out.
 */
export function CoverageLensMap({ lens, topology, selected, onSelect, locale, copy }: CoverageLensMapProps) {
  const rows = useMemo(() => coverageByCounty(lens.coverage), [lens]);
  const since = sinceText(lens.coverage.window, locale);
  const source = coverageSource(lens.sources)?.name ?? COVERAGE_SOURCE_ID;
  // The accessible name carries the status and the N of M sentence: the tooltip is not linked to the area for assistive tech.
  const describeArea = ({ code }: AreaInfo) => {
    const row = rows.get(code);
    return row ? `${copy.status[row.status]}. ${copy.tooltip.summary(summaryParts(row, source, since, locale))}` : copy.noStatus;
  };
  return (
    <BaseMap
      topology={topology}
      // The fill is categorical: no number per area, so nothing can read as a ratio.
      values={NO_VALUES}
      formatValue={() => ""}
      colorOf={(code) => {
        const row = rows.get(code);
        return row ? COVERAGE_COLORS[row.status] : NO_STATUS_COLOR;
      }}
      describeArea={describeArea}
      legend={<CoverageLegend sources={lens.sources} copy={copy} />}
      renderOverlay={({ centroids }) => <SourceMarks centroids={centroids} sources={lens.sources} coverage={rows} copy={copy} />}
      renderTooltip={({ code, name }) => <CoverageTooltip name={name} row={rows.get(code)} lens={lens} locale={locale} copy={copy} />}
      onSelect={onSelect}
      selected={selected}
      tiles={<CoverageTiles lens={lens} coverage={rows} selected={selected} onSelect={onSelect} locale={locale} copy={copy} />}
      copy={copy.map}
    />
  );
}
