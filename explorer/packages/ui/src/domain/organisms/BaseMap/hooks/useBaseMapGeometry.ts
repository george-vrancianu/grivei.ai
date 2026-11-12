import { useMemo } from "react";
import type { Topology } from "topojson-specification";
import type { ProjectionKind } from "../baseMap.types.ts";
import { featuresOf, projectFeatures, type readArea } from "../baseMap.utils.ts";

/** Features and projected paths, recomputed only when the outlines, size or projection change. */
export function useBaseMapGeometry(
  topology: Topology,
  options: { object?: string | undefined; readArea?: typeof readArea | undefined; width: number; height: number; projection: ProjectionKind },
) {
  const { object, readArea: reader, width, height, projection } = options;
  return useMemo(() => {
    const features = featuresOf(topology, { ...(object !== undefined && { object }), ...(reader && { readArea: reader }) });
    return { features, ...projectFeatures(features, width, height, { projection }) };
  }, [topology, object, reader, width, height, projection]);
}
