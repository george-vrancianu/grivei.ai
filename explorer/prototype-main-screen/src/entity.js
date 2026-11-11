// PROTOTYPE, throwaway. Everything an authority or supplier page shows, derived in memory from data.json.
// Signals mirror watchdog/sql/003_views.sql; they are things to verify, never conclusions.
import { authorities, suppliers, records } from "./data";

export const THRESHOLD = { works: 900400, goods: 270120 }; // Law 98/2016 art. 7(5), RON excl. VAT
const thresholdOf = (r) => (r.cpv.startsWith("45") ? THRESHOLD.works : THRESHOLD.goods);
const cpvCode = (r) => r.cpv.split(" ")[0];
const fold = (s) => (s || "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();

export const SIGNALS = {
  over: {
    label: "Direct purchase above the legal threshold",
    short: "Over threshold",
    view: "v_da_over_threshold",
    help: "A direct purchase whose value exceeds 270,120 RON (goods/services) or 900,400 RON (works). Either a data-entry error or a real problem.",
  },
  split: {
    label: "Possible splitting of direct purchases",
    short: "Possible splitting",
    view: "v_da_possible_splitting",
    help: "Same supplier, same CPV code, same calendar month: several direct purchases each under the threshold, together above it.",
  },
  noncomp: {
    label: "Negotiation without prior publication",
    short: "No publication",
    view: "v_noncompetitive_awards",
    help: "Awarded without a public call for tenders. Lawful in narrow cases (urgency, sole supplier); worth checking which one applies.",
  },
};

/** Groups of records that trip the splitting rule, keyed per authority+supplier+CPV+month. */
function splittingGroups(recs) {
  const g = new Map();
  for (const r of recs) {
    if (r.kind !== "direct") continue;
    const k = [r.authority, r.suppliers[0], cpvCode(r), r.date.slice(0, 7)].join("|");
    (g.get(k) || g.set(k, []).get(k)).push(r);
  }
  return [...g.values()].filter((rs) => {
    const t = thresholdOf(rs[0]), sum = rs.reduce((s, r) => s + r.value, 0);
    return rs.length >= 2 && sum > t && Math.max(...rs.map((r) => r.value)) <= t;
  }).map((rs) => ({ recs: rs, total: rs.reduce((s, r) => s + r.value, 0), threshold: thresholdOf(rs[0]),
    month: rs[0].date.slice(0, 7), cpv: rs[0].cpv, supplier: rs[0].suppliers[0], authority: rs[0].authority }));
}

/** Flags per record index, for badges in tables. */
export function flagsOf(r, splitSet) {
  const f = [];
  if (r.kind === "direct" && r.value > thresholdOf(r)) f.push("over");
  if (splitSet.has(r.i)) f.push("split");
  if (/negociere fara|fara publicare/.test(fold(r.proc))) f.push("noncomp");
  return f;
}

/** The full profile of one entity: type "authority" or "supplier". */
export function profile(type, id) {
  const isSup = type === "supplier";
  const ent = isSup ? suppliers.get(id) : authorities.get(id);
  const recs = records.filter((r) => (isSup ? r.suppliers.includes(id) : r.authority === id));
  const share = (r) => (isSup ? r.value / r.suppliers.length : r.value); // consortium value split equally
  const total = recs.reduce((s, r) => s + share(r), 0);

  // counterparties: suppliers of an authority, or authorities paying a supplier
  const cp = new Map();
  for (const r of recs) for (const c of isSup ? [r.authority] : r.suppliers) {
    const v = isSup ? share(r) : r.value / r.suppliers.length;
    const e = cp.get(c) || { id: c, value: 0, n: 0, direct: 0, contract: 0, recs: [] };
    e.value += v; e.n += 1; e[r.kind] += v; e.recs.push(r); cp.set(c, e);
  }
  const counterparties = [...cp.values()].sort((a, b) => b.value - a.value);
  for (const c of counterparties) c.name = (isSup ? authorities.get(c.id) : suppliers.get(c.id))?.name || c.id;

  // channels and procedure types
  const byProc = new Map();
  for (const r of recs) { const e = byProc.get(r.proc) || { proc: r.proc, value: 0, n: 0 }; e.value += share(r); e.n++; byProc.set(r.proc, e); }
  const channels = { direct: recs.filter((r) => r.kind === "direct"), contract: recs.filter((r) => r.kind === "contract") };

  // concentration: share of top 1 / 5 / 10 counterparties
  const top = (k) => counterparties.slice(0, k).reduce((s, c) => s + c.value, 0) / (total || 1);

  // consortia: records won together with other suppliers (and with whom)
  const consortia = recs.filter((r) => r.suppliers.length > 1);
  const partners = new Map();
  if (isSup) for (const r of consortia) for (const c of r.suppliers) if (c !== id) {
    const e = partners.get(c) || { id: c, name: suppliers.get(c)?.name || c, n: 0, recs: [] }; e.n++; e.recs.push(r); partners.set(c, e);
  }

  // signals
  const split = splittingGroups(recs);
  const splitSet = new Set(split.flatMap((g) => g.recs.map((r) => r.i)));
  const flags = new Map(recs.map((r) => [r.i, flagsOf(r, splitSet)]));
  const signals = {
    over: recs.filter((r) => flags.get(r.i).includes("over")),
    split,
    noncomp: recs.filter((r) => flags.get(r.i).includes("noncomp")),
  };

  const years = [...new Set(recs.map((r) => r.date.slice(0, 4)))].sort();
  return { type, id, ent, recs: recs.sort((a, b) => b.value - a.value), share, total, counterparties, byProc: [...byProc.values()].sort((a, b) => b.value - a.value),
    channels, top, consortia, partners: [...partners.values()].sort((a, b) => b.n - a.n), signals, flags, years };
}

export const href = {
  authority: (id) => `#/authority/${id}`,
  supplier: (id) => `#/supplier/${id}`,
  record: (i) => `#/record/${i}`,
};
