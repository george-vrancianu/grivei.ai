import type { ReactNode } from "react";
import { Box } from "../../../../../atoms/Box/index.ts";
import type { MapFeature } from "../../baseMap.types.ts";
import { AreaPath } from "./components/AreaPath/index.ts";

export type MapCanvasProps = {
  features: readonly MapFeature[];
  paths: ReadonlyMap<string, string>;
  width: number;
  height: number;
  label: string;
  fillOf: (code: string) => string;
  labelOf: (feature: MapFeature) => string;
  selected: string | undefined;
  activeCode: string | null;
  tooltipId: string;
  onSelect: ((code: string) => void) | undefined;
  onActivate: (code: string | null) => void;
  /** Marks drawn over the areas, in the SVG's coordinate space; they never take pointer events. */
  overlay?: ReactNode;
};

/** The responsive SVG: one focusable path per area, the selected one drawn last so its outline is not hidden by neighbours. */
export function MapCanvas({ features, paths, width, height, label, fillOf, labelOf, selected, activeCode, tooltipId, onSelect, onActivate, overlay }: MapCanvasProps) {
  const ordered = [...features].sort((a, b) => Number(a.properties.code === selected) - Number(b.properties.code === selected));
  return (
    <Box
      component="svg"
      viewBox={`0 0 ${width} ${height}`}
      role="group"
      aria-label={label}
      sx={(theme) => ({
        display: "block",
        width: "100%",
        height: "auto",
        "& path": { stroke: theme.palette.background.paper, strokeWidth: 0.75, strokeLinejoin: "round", outline: "none" },
        "& path[data-clickable='true']": { cursor: "pointer" },
        "& path[data-active='true']": { stroke: theme.palette.text.primary, strokeWidth: 1.5 },
        "& path[aria-pressed='true']": { stroke: theme.palette.secondary.main, strokeWidth: 2.5 },
        "& path:focus-visible": { stroke: theme.palette.primary.dark, strokeWidth: 2.5 },
      })}
    >
      {ordered.map((area) => {
        const code = area.properties.code;
        return (
          <AreaPath
            key={code}
            code={code}
            d={paths.get(code) ?? ""}
            fill={fillOf(code)}
            label={labelOf(area)}
            selected={code === selected}
            active={code === activeCode}
            describedBy={code === activeCode ? tooltipId : undefined}
            onSelect={onSelect}
            onActivate={onActivate}
          />
        );
      })}
      {overlay && <g pointerEvents="none">{overlay}</g>}
    </Box>
  );
}
