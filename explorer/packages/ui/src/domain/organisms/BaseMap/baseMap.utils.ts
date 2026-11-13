import { geoConicConformal, geoMercator, geoPath, type GeoPermissibleObjects } from "d3-geo";
import { scaleLinear, scaleLog } from "d3-scale";
import { interpolateBlues } from "d3-scale-chromatic";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import type { Feature, FeatureCollection } from "geojson";
import { color, map } from "../../../theme/tokens.ts";
import type { ColorScaleKind, MapFeature, ProjectionKind } from "./baseMap.types.ts";

/** The colour of an area with no value (the dark ground's "none" fill). Distinct from every colour the scale can produce. */
export const NO_DATA_COLOR = map.none;

/** The outline of a "none" swatch: the fill is close to the panel by design (the handoff's drawing), so the swatch carries a line that reaches 3:1 against it. */
export const NONE_OUTLINE = color.idle;

export type AreaValues = Readonly<Record<string, number | null | undefined>>;

export type ColorScale = {
  kind: ColorScaleKind;
  /** What the scale spans; null when no area has a usable value. Linear: zero (or the minimum, if negative) up to the maximum, so colour tracks absolute size. Log: the smallest positive value up to the maximum. */
  domain: readonly [number, number] | null;
  /** True for a log scale when some value is zero or negative: those take the lowest colour, so a legend should mark its low end as "at most". */
  hasNonPositive: boolean;
  /** Colour for a value; null, undefined and non-finite values get NO_DATA_COLOR. */
  color: (value: number | null | undefined) => string;
  /** Evenly spaced colours along the scale, for a legend gradient. */
  ramp: (steps: number) => string[];
};

// On the dark ground the ramp runs from a pale blue (0.15) to a mid blue (0.75): the darkest blues of d3's scale fall below 3:1 against the panel.
export const RAMP_FROM = 0.15;
export const RAMP_TO = 0.75;
/** The blue the Coverage lens's harvested counties and the Flow lens's arcs share: a mid blue that reaches 3:1 against the panel (the old `#1b5e8c` was 2.5:1). */
export const ADJUSTED_BLUE = "#2b78b0";
const rampColor = (t: number) => interpolateBlues(RAMP_FROM + (RAMP_TO - RAMP_FROM) * t);

/**
 * A colour scale over the given values. Linear spans 0..max (or min..max when something is negative), so the palest colour means zero, not "the smallest area"; `domain` overrides the span for lenses that compare maps. Log spans the smallest positive value..max and copes with zeros:
 * a zero (or negative) value is not log-scaled, it takes the lowest colour. Missing values are never scaled: they are grey.
 */
export function createColorScale(
  kind: ColorScaleKind,
  values: readonly (number | null | undefined)[],
  fixedDomain?: readonly [number, number],
): ColorScale {
  const finite = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const candidates = kind === "log" ? finite.filter((value) => value > 0) : finite;
  const lower = kind === "linear" ? Math.min(0, ...candidates) : Math.min(...candidates);
  const derived = candidates.length > 0 ? ([lower, Math.max(...candidates)] as const) : null;
  // A log scale cannot start at zero or below: such a fixed domain is ignored and the span is derived.
  const usableFixed = fixedDomain && !(kind === "log" && fixedDomain[0] <= 0) ? fixedDomain : undefined;
  const domain = usableFixed ?? derived;

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
    hasNonPositive: kind === "log" && finite.some((value) => value <= 0),
    color: (value) => (typeof value === "number" && Number.isFinite(value) ? rampColor(position(value)) : NO_DATA_COLOR),
    ramp: (steps) => Array.from({ length: steps }, (_, i) => rampColor(steps === 1 ? 0 : i / (steps - 1))),
  };
}

/** Reads `{ code, name }` from a raw feature. */
export type AreaReader = (raw: { id?: string | number; properties?: Record<string, unknown> | null }) => { code: string; name: string };

/** Default area reader: the convention is feature properties `{ code, name }` (code = ISO 3166-2:RO or SIRUTA). */
export const readArea: AreaReader = (raw) => {
  const props = raw.properties ?? {};
  const code = props["code"] ?? raw.id;
  if (code === undefined || code === null) throw new Error("A map outline has no `code` property or id");
  return { code: String(code), name: typeof props["name"] === "string" ? props["name"] : String(code) };
};

/** The features of one TopoJSON object (the first when `object` is omitted), each reduced to `{ code, name }` properties. */
export function featuresOf(
  topology: Topology,
  options: { object?: string; readArea?: AreaReader } = {},
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
    properties: read(item as Parameters<AreaReader>[0]),
  }));
}

/** Projects a [longitude, latitude] to SVG coordinates (null when it falls outside the projection). */
export type ProjectPoint = (lonLat: [number, number]) => [number, number] | null;

/** Path strings for the features, with a projection fitted to all of them inside `width` x `height` (minus `padding`). */
export function projectFeatures(
  features: readonly MapFeature[],
  width: number,
  height: number,
  options: { projection?: ProjectionKind; padding?: number } = {},
): { paths: Map<string, string>; centroids: Map<string, [number, number]>; anchors: Map<string, [number, number]>; project: ProjectPoint } {
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
  // Where a tooltip sits: the middle of the area's box, at its top edge.
  const anchors = new Map<string, [number, number]>();
  for (const item of features) {
    paths.set(item.properties.code, path(item) ?? "");
    centroids.set(item.properties.code, path.centroid(item));
    const [[x0, y0], [x1]] = path.bounds(item);
    anchors.set(item.properties.code, [(x0 + x1) / 2, y0]);
  }
  const project: ProjectPoint = (lonLat) => projection(lonLat) ?? null;
  return { paths, centroids, anchors, project };
}
