// The Signal recordings the seam 3 tests walk (@grivei/contract recorded/signals/ and the Overview #86 recorded for archive-signals): every
// Overview that shows Signals, the URL a reader opens it at, and the Records each Signal reproduces.
import { fixtures, recordedEntityOverview, recordedSignalsEntityOverview } from "@grivei/contract/fixtures";
import type { RecordFilter, SignalFieldsFragment } from "@grivei/contract";
import type { Locale } from "@grivei/ui";
import { pathFor } from "../routing/routes.ts";
import { encodeUrlState } from "../urlState/codec.ts";

export type OverviewSignal = SignalFieldsFragment & { records: { code: string; provenance: { url: string | null } }[] };

const canonical = (value: unknown): string =>
  JSON.stringify(value, (_k, v: unknown) => (v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b))) : v));

/** Every recorded Overview of an entity whose page lists at least one Signal. */
export const overviewsWithSignals = [...recordedEntityOverview, ...recordedSignalsEntityOverview].filter((f) => (f.data.entity?.seap.role?.signals.count ?? 0) > 0);
export const overviewNamed = (name: string) => {
  const found = [...recordedEntityOverview, ...recordedSignalsEntityOverview].find((f) => f.name === name);
  if (!found) throw new Error(`no recorded EntityOverview ${name}`);
  return found;
};

/** The URL an Overview case is opened at: the entity page with the case's filter and Signal order in the query. */
export function overviewUrl(v: { key: string | number; role: string; filter?: RecordFilter | null; signalOrder?: string | null }, locale: Locale = "en"): string {
  const entity = v.role === "AUTHORITY" ? "authority" : "supplier";
  const state = { filter: v.filter ?? {}, ...(v.signalOrder ? { signalOrder: v.signalOrder as "DATE_DESC" | "VALUE_DESC" } : {}) };
  return `${pathFor(locale, { name: "entity", entity, key: String(v.key), view: "overview" })}${encodeUrlState(state)}`;
}

/** The authority's Records tab as the recorded EntityRecords answer for a Signal's reproducing filter (the very variables the page sends). */
export function recordsOfSignal(signal: SignalFieldsFragment) {
  const { authority, ...filter } = signal.reproduce;
  const asked = { key: String(authority), role: "AUTHORITY", filter: Object.fromEntries(Object.entries(filter).filter(([, v]) => v !== null)), limit: 100, offset: 0 };
  const hit = fixtures.EntityRecords.find((f) => canonical(f.variables) === canonical(asked));
  if (!hit) throw new Error(`no recorded EntityRecords for ${canonical(asked)}`);
  return hit.data.entity!.seap.role!.records;
}

/** The distinct Signals of every recorded Overview (the same Signal is on the authority's and its suppliers' pages). */
export function recordedSignals(): OverviewSignal[] {
  const seen = new Map<string, OverviewSignal>();
  for (const f of overviewsWithSignals) for (const s of f.data.entity!.seap.role!.signals.rows) seen.set(canonical(s.reproduce), s as OverviewSignal);
  return [...seen.values()];
}
