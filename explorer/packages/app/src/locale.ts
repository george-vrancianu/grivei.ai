import type { Locale } from "@grivei/ui";

/** The app lives under two prefixes: `/explore/` (English, the default) and `/ro/explore/` (Romanian). */
export function localeFromPath(pathname: string): Locale {
  return pathname === "/ro/explore" || pathname.startsWith("/ro/explore/") ? "ro" : "en";
}

