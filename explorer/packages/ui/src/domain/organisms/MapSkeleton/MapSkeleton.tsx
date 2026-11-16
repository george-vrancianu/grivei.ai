import type { Topology } from "topojson-specification";
import { Box } from "../../../atoms/Box/index.ts";
import { CircularProgress } from "../../../atoms/CircularProgress/index.ts";
import { Skeleton } from "../../../atoms/Skeleton/index.ts";
import { Typography } from "../../../atoms/Typography/index.ts";
import { Well } from "../../../atoms/Well/index.ts";
import { pulse } from "../../../theme/motion.ts";
import { color, map, radius, shadow } from "../../../theme/tokens.ts";
import { useBaseMapGeometry } from "../BaseMap/index.ts";

export interface MapSkeletonProps {
  /** The outlines, once loaded: the areas are drawn in a neutral, pulsing fill. Absent while the outlines load: a block the size of the map. */
  topology?: Topology | undefined;
  /** "Loading…", from the catalogue: the floating chip's text and the line a screen reader announces. */
  label: string;
}

/** The `BaseMap` coordinate space (its defaults), so the skeleton takes the room the map will. */
const WIDTH = 640;
const HEIGHT = 420;

/** The areas of the outlines, no figures yet: the same geometry as the map, a neutral fill that pulses (1.8 s; still at mid-strength under reduced motion). */
function PendingAreas({ topology }: { topology: Topology }) {
  const { features, paths } = useBaseMapGeometry(topology, { width: WIDTH, height: HEIGHT, projection: "conic" });
  return (
    <Box
      component="svg"
      aria-hidden="true"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      sx={{
        display: "block",
        width: "100%",
        height: "auto",
        fill: color.muted,
        "& path": { stroke: map.gap, strokeWidth: 0.75, strokeLinejoin: "round" },
        animation: `${pulse} 1.8s ease-in-out infinite`,
        "@media (prefers-reduced-motion: reduce)": { animation: "none", opacity: 0.45 },
      }}
    >
      {features.map((area) => (
        <path key={area.properties.code} d={paths.get(area.properties.code) ?? ""} />
      ))}
    </Box>
  );
}

/**
 * A map on first load, before its figures are in. With the outlines loaded, the areas in a neutral pulsing fill (never the choropleth's colours, which would read
 * as data); without them, a block the size of the map. A floating chip, centred on the well, carries the `role="status"` text; the drawing under it is `aria-hidden`.
 */
export function MapSkeleton({ topology, label }: MapSkeletonProps) {
  return (
    <Well sx={{ position: "relative", p: 1.5 }}>
      {topology ? <PendingAreas topology={topology} /> : <Skeleton aria-hidden="true" variant="rounded" width="100%" sx={{ height: "auto", aspectRatio: `${WIDTH} / ${HEIGHT}` }} />}
      <Box
        sx={{
          position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", display: "flex", alignItems: "center", gap: 1.25, px: 1.75, py: 1.25, whiteSpace: "nowrap",
          backgroundColor: color.overlay, border: `1px solid ${color.lineStrong}`, borderRadius: `${radius.card}px`, boxShadow: shadow.overlay,
        }}
      >
        <CircularProgress size={16} aria-hidden="true" />
        <Typography variant="meta" role="status" sx={{ color: "text.primary" }}>
          {label}
        </Typography>
      </Box>
    </Well>
  );
}
