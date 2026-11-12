import type { Locale } from "../theme/index.ts";

/** Per-locale sample content for a story: one value per language. */
export type Localized<T> = Record<Locale, T>;

/**
 * Pick the sample for the workbench's current language.
 * Use it with the story's `globals`: `pick(globals.locale, { en: "Export", ro: "Exportă" })`.
 * Falls back to English when the global is unset.
 */
export function pick<T>(locale: unknown, samples: Localized<T>): T {
  return locale === "ro" ? samples.ro : samples.en;
}
