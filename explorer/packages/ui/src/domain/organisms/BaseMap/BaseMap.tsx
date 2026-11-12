import { useId, useMemo, type ReactNode } from "react";
import type { Topology } from "topojson-specification";
import { Box } from "../../../atoms/Box/index.ts";
import type { AreaInfo, BaseMapCopy, ColorScaleKind, ProjectionKind } from "./baseMap.types.ts";
import { createColorScale, type AreaValues, type readArea } from "./baseMap.utils.ts";
import { Legend } from "./components/Legend/index.ts";
import { MapCanvas } from "./components/MapCanvas/index.ts";
import { MapTooltip } from "./components/MapTooltip/index.ts";
import { useActiveArea } from "./hooks/useActiveArea.ts";
import { useBaseMapGeometry } from "./hooks/useBaseMapGeometry.ts";

export type BaseMapProps = {
  /** Static outlines, built at load time and passed in; never fetched through GraphQL. */
  topology: Topology;
  /** Which TopoJSON object to draw; the first one when omitted. */
  object?: string;
  /** Reads `{ code, name }` from a feature. Default convention: properties `code` (ISO 3166-2:RO county code or SIRUTA) and `name`. */
  readArea?: typeof readArea;
  /** One number per area code. Missing, null and non-finite values render grey. The map has no lens logic: the lens decides what the number means. */
  values: AreaValues;
  /** Colour scale: `linear`, or `log` (zeros are not log-scaled: they take the lowest colour). */
  scale?: ColorScaleKind;
  /** Formats a value for the tooltip, the area's accessible name and the legend ends (e.g. `formatMoney` for the Money lens). */
  formatValue: (value: number) => string;
  /** Replaces the tooltip's default content (name and formatted value). */
  renderTooltip?: (area: AreaInfo) => ReactNode;
  /** Emits the code of the clicked area (or of the focused one on Enter or Space). Without it, areas are not clickable. */
  onSelect?: (code: string) => void;
  /** The highlighted area. */
  selected?: string;
  /** Off-map tiles (National, Unplaced, unknown supplier county ...), laid out beside the map. */
  tiles?: ReactNode;
  copy: BaseMapCopy;
  /** The SVG's coordinate space; it scales to the width of its container. */
  width?: number;
  height?: number;
  projection?: ProjectionKind;
};

/**
 * The base map every lens builds on: outlines coloured by one value per area, a legend with a grey no-data swatch,
 * a hover and focus tooltip, click and keyboard selection, and a slot beside the map for off-map tiles.
 */
export function BaseMap({
  topology, object, readArea: reader, values, scale: scaleKind = "linear", formatValue, renderTooltip, onSelect, selected, tiles, copy,
  width = 640, height = 420, projection = "conic",
}: BaseMapProps) {
  const tooltipId = useId();
  const [activeCode, setActiveCode] = useActiveArea();
  const { features, paths, centroids } = useBaseMapGeometry(topology, { object, readArea: reader, width, height, projection });
  const scale = useMemo(() => createColorScale(scaleKind, features.map((f) => values[f.properties.code])), [scaleKind, features, values]);

  const valueOf = (code: string): number | null => {
    const value = values[code];
    return typeof value === "number" && Number.isFinite(value) ? value : null;
  };
  const textOf = (code: string) => {
    const value = valueOf(code);
    return value === null ? copy.noData : formatValue(value);
  };
  const active = features.find((f) => f.properties.code === activeCode);
  const anchor = active ? centroids.get(active.properties.code) : undefined;

  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "flex-start" }}>
      <Box sx={{ flex: "1 1 360px", minWidth: 0 }}>
        <Box sx={{ position: "relative" }}>
          <MapCanvas
            features={features}
            paths={paths}
            width={width}
            height={height}
            label={copy.mapLabel}
            fillOf={(code) => scale.color(valueOf(code))}
            labelOf={(area) => copy.areaLabel(area.properties.name, textOf(area.properties.code))}
            selected={selected}
            activeCode={activeCode}
            tooltipId={tooltipId}
            onSelect={onSelect}
            onActivate={setActiveCode}
          />
          {active && anchor && (
            <MapTooltip id={tooltipId} left={(anchor[0] / width) * 100} top={(anchor[1] / height) * 100}>
              {renderTooltip
                ? renderTooltip({ code: active.properties.code, name: active.properties.name, value: valueOf(active.properties.code) })
                : `${active.properties.name}: ${textOf(active.properties.code)}`}
            </MapTooltip>
          )}
        </Box>
        <Legend title={copy.legendTitle} noDataLabel={copy.noData} scale={scale} formatValue={formatValue} />
      </Box>
      {tiles && <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>{tiles}</Box>}
    </Box>
  );
}
