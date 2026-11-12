import { METHODOLOGY_ANCHORS, allMethodologyAnchors, signalAnchor, type Locale, type MethodologySectionKey, type SignalRule } from "@grivei/ui";
import { pathFor } from "../routing/routes.ts";

/** The ids of the methodology page's sections (`awardedValue` -> `awarded-value`), the same in both languages; one place, so every link agrees with the page. */
export const methodologyAnchors = METHODOLOGY_ANCHORS;
export { allMethodologyAnchors, signalAnchor };

/** The methodology page under the language's prefix; with a section, its anchor (`/explore/methodology#suspect-values`). */
export function methodologyHref(locale: Locale, section?: MethodologySectionKey | { rule: SignalRule }): string {
  const page = pathFor(locale, { name: "methodology" });
  if (section === undefined) return page;
  return `${page}#${typeof section === "string" ? METHODOLOGY_ANCHORS[section] : signalAnchor(section.rule)}`;
}
