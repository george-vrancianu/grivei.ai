import type { Locale } from "@grivei/ui";

/** The app lives under two prefixes: `/explore/` (English, the default) and `/ro/explore/` (Romanian). */
export const BASE: Record<Locale, string> = { en: "/explore", ro: "/ro/explore" };

export type EntityRoute = "authority" | "supplier";
/** The three tabs of an Entity page, which are three routes. */
export type EntityView = "overview" | "records" | "relationships";

export type Route =
  | { name: "main" }
  | { name: "search" }
  | { name: "entity"; entity: EntityRoute; key: string; view: EntityView }
  | { name: "record"; code: string }
  | { name: "person"; id: string }
  | { name: "coverage" }
  | { name: "methodology" }
  | { name: "not-found" };

export const ENTITY_VIEWS: readonly EntityView[] = ["overview", "records", "relationships"];
const ENTITY_SEGMENTS: readonly EntityRoute[] = ["authority", "supplier"];

export interface ParsedLocation {
  locale: Locale;
  route: Route;
}

/** The language of a pathname, from its prefix. */
export function localeFromPath(pathname: string): Locale {
  return pathname === "/ro/explore" || pathname.startsWith("/ro/explore/") ? "ro" : "en";
}

function decode(segment: string): string | null {
  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
}

/** Reads a pathname into its language and route; anything the app does not know is `not-found`. */
export function parsePath(pathname: string): ParsedLocation {
  const locale = localeFromPath(pathname);
  const rest = pathname.startsWith(BASE[locale]) ? pathname.slice(BASE[locale].length) : "";
  const segments = rest.split("/").filter((s) => s !== "");
  const notFound: ParsedLocation = { locale, route: { name: "not-found" } };
  const [first, second, third, ...more] = segments;
  if (first === undefined) return { locale, route: { name: "main" } };
  if (more.length > 0) return notFound;
  if (first === "search" && second === undefined) return { locale, route: { name: "search" } };
  if (first === "coverage" && second === undefined) return { locale, route: { name: "coverage" } };
  if (first === "methodology" && second === undefined) return { locale, route: { name: "methodology" } };
  if (first === "record" && second !== undefined && third === undefined) {
    const code = decode(second);
    return code === null ? notFound : { locale, route: { name: "record", code } };
  }
  if (first === "person" && second !== undefined && third === undefined) {
    const id = decode(second);
    return id === null ? notFound : { locale, route: { name: "person", id } };
  }
  const entity = ENTITY_SEGMENTS.find((e) => e === first);
  if (entity && second !== undefined) {
    const key = decode(second);
    if (key === null) return notFound;
    if (third === undefined) return { locale, route: { name: "entity", entity, key, view: "overview" } };
    const view = ENTITY_VIEWS.find((v) => v === third && v !== "overview");
    if (view) return { locale, route: { name: "entity", entity, key, view } };
  }
  return notFound;
}

/** The pathname of a route in a language; the inverse of `parsePath` for every route but `not-found`. */
export function pathFor(locale: Locale, route: Route): string {
  const base = BASE[locale];
  switch (route.name) {
    case "main":
      return `${base}/`;
    case "search":
      return `${base}/search`;
    case "coverage":
      return `${base}/coverage`;
    case "methodology":
      return `${base}/methodology`;
    case "record":
      return `${base}/record/${encodeURIComponent(route.code)}`;
    case "person":
      return `${base}/person/${encodeURIComponent(route.id)}`;
    case "entity": {
      const root = `${base}/${route.entity}/${encodeURIComponent(route.key)}`;
      return route.view === "overview" ? root : `${root}/${route.view}`;
    }
    case "not-found":
      return `${base}/`;
  }
}

/** The same page in the other language, query string and fragment kept: what the EN/RO switch links to. */
export function switchLocalePath(pathname: string, search: string, to: Locale, hash = ""): string {
  const { route } = parsePath(pathname);
  const target = route.name === "not-found" ? `${BASE[to]}${pathname.slice(BASE[localeFromPath(pathname)].length)}` : pathFor(to, route);
  return `${target}${search}${hash}`;
}
