import type { Feature, Geometry } from "geojson";

/** One outlined area as the map sees it: its code (ISO 3166-2:RO county code or SIRUTA), its name as published, its GeoJSON feature. */
export type MapFeature = Feature<Geometry, { code: string; name: string }>;

/** What a lens knows about one area when it formats a tooltip. `value` is null when the area has none. */
export type AreaInfo = { code: string; name: string; value: number | null };

/** Every user-facing string of the base map. The app passes its catalogue; stories pass `samples` copy. */
export type BaseMapCopy = {
  /** Accessible name of the whole map. */
  mapLabel: string;
  /** Title above the legend. The lens names its own measure. */
  legendTitle: string;
  /** Label of the grey no-data swatch, also the tooltip text of an area without a value. */
  noData: string;
  /** Accessible name of one area, from its name and its formatted value (or the no-data label). */
  areaLabel: (name: string, valueText: string) => string;
  /** The legend's low end on a log scale that holds zeros, from the formatted smallest positive value (e.g. "up to 120K RON"). */
  atMost: (valueText: string) => string;
};

/** What a lens gets to draw marks over the map (e.g. a circle per UAT, a mark per Source): positions in the SVG's coordinate space. */
export type MapOverlayContext = {
  /** The projected centre of each area, by code. */
  centroids: ReadonlyMap<string, readonly [number, number]>;
  /** Projects a [longitude, latitude] (e.g. a county seat) to SVG coordinates; null when outside the projection. */
  project: (lonLat: [number, number]) => [number, number] | null;
  width: number;
  height: number;
};

export type ColorScaleKind = "linear" | "log";

export type ProjectionKind = "conic" | "mercator";
