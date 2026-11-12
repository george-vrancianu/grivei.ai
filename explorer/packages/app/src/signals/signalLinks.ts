import type { Locale, SignalRule } from "@grivei/ui";
import { pathFor } from "../routing/routes.ts";

/** The anchor of a rule's section on the methodology page: `#signal-over-cap`, `#signal-framework-overrun`. */
export const methodologyAnchor = (rule: SignalRule): string => `signal-${rule.toLowerCase().replaceAll("_", "-")}`;

/** The methodology page under the language's prefix, at the section of the Signal's rule. */
export function signalMethodologyHref(locale: Locale, rule: SignalRule): string {
  return `${pathFor(locale, { name: "methodology" })}#${methodologyAnchor(rule)}`;
}

/**
 * "Check in SEAP" for a Signal: the Record's SEAP link when the Signal has exactly one Record (its provenance URL, else the `/source/seap/<code>`
 * redirect), otherwise null: the card then says to check each Record, and each row of the reproducing list has its own link.
 */
export function signalSeapHref(
  signal: { recordCount: number },
  records: readonly { code: string; provenance?: { url: string | null } | null }[],
): string | null {
  const [only] = records;
  if (signal.recordCount !== 1 || records.length !== 1 || !only) return null;
  return only.provenance?.url ?? `/source/seap/${encodeURIComponent(only.code)}`;
}
