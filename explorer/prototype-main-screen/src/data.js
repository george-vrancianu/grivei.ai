// PROTOTYPE, throwaway. In-memory data and search for the main-screen variants.
import raw from "./data.json";
import counties from "./counties.json";
import * as d3 from "d3";

export { counties };
export const SOURCES = ["SEAP", "ANI", "ONRC", "MFinanțe", "just.ro"];
export const authorities = new Map(raw.authorities.map((a) => [a.cui, a]));
export const suppliers = new Map(raw.suppliers.map((s) => [s.cui, s]));
export const records = raw.records.map((r, i) => ({ ...r, i }));
export const countyName = new Map(counties.features.map((f) => [f.properties.iso, f.properties.name]));

const fold = (s) => (s || "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();
const hay = records.map((r) =>
  fold([r.title, r.cpv, r.code, authorities.get(r.authority)?.name, ...r.suppliers.flatMap((c) => [c, suppliers.get(c)?.name])].join(" ")));

/** All records matching every token of the query (and the optional county filter). */
export function search(q, { county, mode = "authority" } = {}) {
  const toks = fold(q).split(/\s+/).filter(Boolean);
  return records.filter((r, i) =>
    toks.every((t) => hay[i].includes(t)) && (!county || countyOf(r, mode).includes(county)));
}

/** County ISO codes a record lands in: the authority's, or each supplier's ("?" = unknown, "NAT" = national). */
export function countyOf(r, mode) {
  if (mode === "authority") {
    const a = authorities.get(r.authority);
    return [a.scope === "national" ? "NAT" : a.county || "?"];
  }
  return r.suppliers.map((c) => suppliers.get(c)?.county || "?");
}

/** Sum of RON per county bucket; consortium value split equally among winners. */
export function byCounty(recs, mode) {
  const m = new Map();
  for (const r of recs) {
    const cs = countyOf(r, mode);
    for (const c of cs) {
      const e = m.get(c) || { value: 0, n: 0 };
      e.value += r.value / cs.length; e.n += 1; m.set(c, e);
    }
  }
  return m;
}

/** What each county holds, per Source, with no query. */
export function coverage(iso) {
  const auths = [...authorities.values()].filter((a) => a.county === iso);
  return { SEAP: auths.length, ANI: 0, ONRC: 0, "MFinanțe": 0, "just.ro": 0, authorities: auths };
}

export function aggregateSuppliers(recs) {
  const m = new Map();
  for (const r of recs) for (const c of r.suppliers) {
    const e = m.get(c) || { cui: c, value: 0, n: 0, recs: [] };
    e.value += r.value / r.suppliers.length; e.n += 1; e.recs.push(r); m.set(c, e);
  }
  return [...m.values()].sort((a, b) => b.value - a.value);
}

export const ron = (v) => v >= 1e6 ? `${d3.format(",.1f")(v / 1e6)}M RON` : `${d3.format(",.0f")(v)} RON`;
export const kindLabel = { contract: "Contract", direct: "Direct purchase" };
