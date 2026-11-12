import { geoConicConformal, geoMercator, geoPath, type GeoPermissibleObjects } from "d3-geo";
import { scaleLinear, scaleLog } from "d3-scale";
import { interpolateBlues } from "d3-scale-chromatic";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import type { Feature, FeatureCollection } from "geojson";
import type { ColorScaleKind, MapFeature, ProjectionKind } from "./baseMap.types.ts";

/** The colour of an area with no value. Distinct from every colour the scale can produce (blues never reach grey). */
export const NO_DATA_COLOR = "#bdbdbd";

export type AreaValues = Readonly<Record<string, number | null | undefined>>;

export type ColorScale = {
  kind: ColorScaleKind;
  /** Smallest and largest value the scale spans (for a log scale, the smallest positive value); null when no area has a usable value. */
  domain: readonly [number, number] | null;
  /** Colour for a value; null, undefined and non-finite values get NO_DATA_COLOR. */
  color: (value: number | null | undefined) => string;
  /** Evenly spaced colours along the scale, for a legend gradient. */
  ramp: (steps: number) => string[];
};

// Start the ramp a little darker than white so the lowest value stays visible against the page.
const rampColor = (t: number) => interpolateBlues(0.15 + 0.85 * t);

/**
 * A colour scale over the given values. Linear spans min..max. Log spans the smallest positive value..max and copes with zeros:
 * a zero (or negative) value is not log-scaled, it takes the lowest colour. Missing values are never scaled: they are grey.
 */
export function createColorScale(kind: ColorScaleKind, values: readonly (number | null | undefined)[]): ColorScale {
  const finite = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const candidates = kind === "log" ? finite.filter((value) => value > 0) : finite;
  const domain = candidates.length > 0 ? ([Math.min(...candidates), Math.max(...candidates)] as const) : null;

  const position = (value: number): number => {
    if (!domain) return 0;
    const [min, max] = domain;
    if (min === max) return value > 0 || kind === "linear" ? 0.5 : 0;
    if (kind === "log") return value <= 0 ? 0 : scaleLog().domain([min, max]).range([0, 1]).clamp(true)(value);
    return scaleLinear().domain([min, max]).range([0, 1]).clamp(true)(value);
  };

  return {
    kind,
    domain,
    color: (value) => (typeof value === "number" && Number.isFinite(value) ? rampColor(position(value)) : NO_DATA_COLOR),
    ramp: (steps) => Array.from({ length: steps }, (_, i) => rampColor(steps === 1 ? 0 : i / (steps - 1))),
  };
}

/** Default area reader: the convention is feature properties `{ code, name }` (code = ISO 3166-2:RO or SIRUTA). */
export function readArea(raw: { id?: string | number; properties?: Record<string, unknown> | null }): { code: string; name: string } {
  const props = raw.properties ?? {};
  const code = props["code"] ?? raw.id;
  if (code === undefined || code === null) throw new Error("A map outline has no `code` property or id");
  return { code: String(code), name: typeof props["name"] === "string" ? props["name"] : String(code) };
}

/** The features of one TopoJSON object (the first when `object` is omitted), each reduced to `{ code, name }` properties. */
export function featuresOf(
  topology: Topology,
  options: { object?: string; readArea?: typeof readArea } = {},
): MapFeature[] {
  const name = options.object ?? Object.keys(topology.objects)[0];
  const object = name === undefined ? undefined : topology.objects[name];
  if (!object) throw new Error(`TopoJSON has no object ${name ?? "(none)"}`);
  const converted: Feature | FeatureCollection = feature(topology, object as GeometryCollection) as Feature | FeatureCollection;
  const raw: Feature[] = converted.type === "FeatureCollection" ? converted.features : [converted];
  const read = options.readArea ?? readArea;
  return raw.map((item) => ({
    type: "Feature",
    id: item.id,
    geometry: item.geometry,
    properties: read(item as Parameters<typeof readArea>[0]),
  }));
}

/** Path strings for the features, with a projection fitted to all of them inside `width` x `height` (minus `padding`). */
export function projectFeatures(
  features: readonly MapFeature[],
  width: number,
  height: number,
  options: { projection?: ProjectionKind; padding?: number } = {},
): { paths: Map<string, string>; centroids: Map<string, [number, number]> } {
  const padding = options.padding ?? 4;
  const projection = options.projection === "mercator" ? geoMercator() : geoConicConformal().parallels([44, 48]).rotate([-25, 0]);
  const collection: GeoPermissibleObjects = { type: "FeatureCollection", features: [...features] };
  projection.fitExtent(
    [
      [padding, padding],
      [width - padding, height - padding],
    ],
    collection,
  );
  const path = geoPath(projection);
  const paths = new Map<string, string>();
  const centroids = new Map<string, [number, number]>();
  for (const item of features) {
    paths.set(item.properties.code, path(item) ?? "");
    centroids.set(item.properties.code, path.centroid(item));
  }
  return { paths, centroids };
}
