import { METHODOLOGY_ANCHORS, signalAnchor, type Locale, type MethodologySectionKey, type SignalRule } from "@grivei/ui";
import { pathFor } from "../routing/routes.ts";

/** The methodology page under the language's prefix; with a section, its anchor (`/explore/methodology#suspect-values`). */
export function methodologyHref(locale: Locale, section?: MethodologySectionKey | { rule: SignalRule }): string {
  const page = pathFor(locale, { name: "methodology" });
  if (section === undefined) return page;
  return `${page}#${typeof section === "string" ? METHODOLOGY_ANCHORS[section] : signalAnchor(section.rule)}`;
}
