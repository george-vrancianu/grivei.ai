/* eslint-disable @typescript-eslint/no-explicit-any, preserve-caught-error -- throwaway eval harness (#339): untyped tool arguments */
// Throwaway eval harness (wayfinder #339): the Assistant's v1 tools (#338) over the API store, in-process. NOT production code.
// Each tool returns compact rows with typed citation ids, recorded in the session ledger. Restricted content is gated here and in the
// store (`restricted`), the way the resolvers gate it: on the public tier `person` is not registered and person ids are never read.
import pg from "pg";
import { postgresStore, type Store, type RecordRow, type EntityRow, type TotalRow } from "../../../packages/api/src/store.ts";
import { cachedStore } from "../../../packages/api/src/cache.ts";
import { scopeFilter } from "../../../packages/api/src/role.ts";
import type { SignalRow } from "../../../packages/api/src/signals.ts";

export type Tier = "public" | "private";

const MAX_ROWS = 25;
const DEFAULT_ROWS = 10;
const RESULT_CHAR_BUDGET = 8000; // ~2K tokens

const ron = (bani: string | null | undefined) => (bani == null ? null : Math.round(Number(bani)) / 100);
const lim = (n: unknown) => Math.min(Math.max(Number(n) || DEFAULT_ROWS, 1), MAX_ROWS);

export class Ledger {
  ids = new Set<string>();
  add(id: string) {
    this.ids.add(id);
    return id;
  }
}

export interface ToolContext {
  store: Store;
  pool: pg.Pool;
  tier: Tier;
  ledger: Ledger;
  dataThrough: Record<string, string>;
  /** which system prompt and tool descriptions run (#349); the tools' results are the same for both */
  prompt?: "v1" | "v2";
}

export function makeStore(tier: Tier) {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 3 });
  pool.on("error", (e) => console.error("pg pool error:", e.message));
  // the production wrapping (main.ts), minus the prefix warm-up (it OOM-kills the local Postgres): the result cache dedups the same query across models
  return { pool, store: cachedStore(postgresStore(pool, { restricted: tier === "private" }), pool, { maxBytes: 300 * 1024 * 1024, autoWarm: false, log: () => {} }) };
}

const BANI_KEYS = new Set(["ceiling", "subsequent", "cap", "sum", "counted", "value", "amount", "awarded", "turnover"]);
/** A Signal's `numbers` hold money in bani as text: convert to RON and say so in the key. */
function measureRon(numbers: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(numbers ?? {}).map(([k, v]) => (BANI_KEYS.has(k) && /^-?\d+$/.test(String(v)) ? [`${k}_ron`, ron(String(v))] : [k, v])));
}

const signalId = (s: SignalRow) => `signal:${s.rule}@${s.authorityKey}${s.supplierKeys.length === 1 ? `/${s.supplierKeys[0]}` : ""}`;

function entityRef(ctx: ToolContext, e: EntityRow | null | undefined, extra: Record<string, unknown> = {}) {
  if (!e) return null;
  return { id: ctx.ledger.add(`entity:${e.key}`), name: e.displayName, identity: e.identity, cui: e.cui ?? e.foreignVatId ?? null, ...extra };
}

function total(t: TotalRow) {
  return { awarded_ron: ron(t.awarded), records: t.records, suspect_left_out: t.suspectLeftOut, no_value: t.noValue, framework_ceilings_ron: ron(t.frameworkCeilings) || undefined };
}

function recordRow(ctx: ToolContext, r: RecordRow) {
  return {
    id: ctx.ledger.add(`record:${r.code}`),
    title: r.title,
    date: r.date,
    kind: r.kind,
    value_ron: ron(r.value),
    counted_ron: ron(r.counted),
    suspect: r.suspect?.rule ?? undefined,
    badges: r.badges.length ? r.badges : undefined,
    authority: entityRef(ctx, r.authority),
    winners: r.winners.map((w) => (w.naturalPerson ? { natural_person: true, name: null } : w.entity ? entityRef(ctx, w.entity, { share_ron: ron(w.share) ?? undefined }) : { published_name: w.name })),
    signals: r.signals?.length ? r.signals.map((s) => ctx.ledger.add(signalId(s))) : undefined,
  };
}

/** Cuts rows, never fields, to the budget. */
function fit(header: Record<string, unknown>, rows: unknown[], total: number) {
  let kept = rows;
  while (kept.length > 1 && JSON.stringify(kept).length > RESULT_CHAR_BUDGET) kept = kept.slice(0, Math.ceil(kept.length * 0.7));
  return { ...header, total, truncated: kept.length < total, rows: kept };
}

const seapHeader = (ctx: ToolContext) => ({
  source: "SEAP",
  measure: "awarded value (what contracts were awarded at; not paid or spent)",
  data_through: { CONTRACT: ctx.dataThrough.CONTRACT, AWARD_NOTICE: ctx.dataThrough.AWARD_NOTICE, DA: ctx.dataThrough.DA },
});

async function ensureEntity(ctx: ToolContext, key: string) {
  const e = await ctx.store.entity(String(key).replace(/^entity:/, ""));
  if (!e) throw new Error(`unknown entity key ${key}`);
  return e;
}

// --- tool implementations -------------------------------------------------------------------------------------------------------

async function search(ctx: ToolContext, a: any) {
  const source = a.source ?? "SEAP";
  const n = lim(a.limit);
  const offset = Math.max(Number(a.offset) || 0, 0);
  if (source === "ONRC") {
    const page = await ctx.store.onrcSearch({ q: a.text } as any, { limit: n, offset });
    const rows = page.rows.map((r) => ({
      id: r.entity ? ctx.ledger.add(`entity:${r.entity.key}`) : ctx.ledger.add(`onrc:${r.registrationNumber}`),
      name: r.name,
      cui: r.cui,
      registration_number: r.registrationNumber,
      registration_date: r.registrationDate,
      legal_form: r.legalForm,
      county: r.seat?.county,
      statuses: r.statuses?.map((s: any) => s.name ?? s.code),
      seap_counterparty: r.seapCounterparty,
    }));
    return fit({ source: "ONRC", data_through: ctx.dataThrough.REGISTRATION }, rows, page.count);
  }
  const filter: any = { q: a.text || null, from: a.from ?? null, to: a.to ?? null };
  if (a.channel) filter.channel = a.channel;
  if (a.authority) filter.authority = String(a.authority).replace(/^entity:/, "");
  if (a.supplier) filter.supplier = String(a.supplier).replace(/^entity:/, "");
  if (a.signal_rule) filter.signal = a.signal_rule;
  if (a.what === "records") {
    const order = a.order === "DATE_DESC" || a.order === "DATE_ASC" ? a.order : "VALUE_DESC";
    const where = !filter.q && !filter.authority && !filter.supplier && !filter.channel && !filter.from && !filter.to && !filter.signal;
    const { count, rows } = where
      ? { count: (await ctx.store.searchTotal(filter)).records, rows: await ctx.store.records({ limit: n, offset, order }) }
      : await ctx.store.searchRecords(filter, { limit: n, offset, order });
    return fit({ ...seapHeader(ctx), note: "suspect values are shown but never counted in sums" }, rows.map((r) => recordRow(ctx, r)), count);
  }
  const side = a.side === "SUPPLIER" ? "SUPPLIER" : a.side === "AUTHORITY" ? "AUTHORITY" : null;
  const sides: ("AUTHORITY" | "SUPPLIER")[] = side ? [side] : ["AUTHORITY", "SUPPLIER"];
  const out: unknown[] = [];
  let count = 0;
  const seen = new Set<string>();
  if (a.text && !offset) {
    // every entity whose name equals the text (diacritics, case and punctuation folded), whatever its size: identity is the CUI, so same-name entities all show
    const folded = String(a.text).normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const exact = await ctx.pool.query(
      `SELECT key FROM core.entity WHERE regexp_replace(lower(translate(display_name, 'ĂÂÎȘŞȚŢăâîșşțţ', 'AAISSTTaaisstt')), '[^a-z0-9]', '', 'g') = $1 LIMIT 10`,
      [folded],
    );
    for (const { key } of exact.rows) {
      const e = await ctx.store.entity(key);
      if (!e) continue;
      seen.add(key);
      out.push(entityRef(ctx, e, { exact_name_match: true, seap_roles: await ctx.store.roles(key), county: e.placement?.countyName ?? null }));
    }
  }
  for (const s of sides) {
    const page = await ctx.store.searchEntities(s, filter, { limit: n, offset });
    count += page.count;
    for (const h of page.rows) if (!seen.has(h.entity.key)) out.push(entityRef(ctx, h.entity, { side: s, county: h.entity.placement?.countyName ?? null, matched: total(h.matched) }));
  }
  return fit({ ...seapHeader(ctx), note: "all candidates (exact name matches first); identity is the CUI, never the name. Never pick one by name." }, out, count);
}

async function entity(ctx: ToolContext, a: any) {
  const e = await ensureEntity(ctx, a.key);
  const roles = await ctx.store.roles(e.key);
  const window = { from: a.from ?? null, to: a.to ?? null };
  const totals: Record<string, unknown> = {};
  for (const role of roles) totals[role] = total(await ctx.store.searchTotal(scopeFilter(role, e.key, window)));
  const [leadership, people, fin, don, pe, onrc] = await Promise.all([
    ctx.store.leadership(e.key),
    e.cui && roles.length ? ctx.store.people(e.cui, { personIds: ctx.tier === "private" }) : null,
    e.cui ? ctx.store.financials(e.cui, e.key) : [],
    e.cui ? ctx.store.donations(e.cui) : null,
    e.cui ? ctx.store.publicEnterprise(e.cui) : null,
    e.cui ? ctx.store.onrc(e.cui) : null,
  ]);
  return {
    header: { sources: ["SEAP", "ANAF", "ONRC", "AEP", "MF", "BaniPartide", "AMEPIP"], data_through: ctx.dataThrough, seap_measure: "awarded value; each Source's money stands alone, never summed across Sources" },
    entity: entityRef(ctx, e, { anaf_status: e.anafStatus, county: e.placement?.countyName, uat: e.placement?.uat?.name, national: e.placement?.national }),
    seap_roles: roles,
    seap_totals_by_role: totals,
    window,
    leadership: leadership && {
      via_subordinate_of: leadership.via ? entityRef(ctx, { key: leadership.via.authority, displayName: leadership.via.authorityName, identity: "CUI", cui: leadership.via.authority } as EntityRow) : null,
      mandates: leadership.mandates.map((m) => ({ leader: m.leaderName, list: m.list, independent: m.independent || undefined, start: m.startDate, end: m.endDate, election: m.electionDate })),
      gaps: leadership.gaps,
      note: "a leader may have switched party since the election",
    },
    onrc_registration: onrc && { registration_number: onrc.registrationNumber, registration_date: onrc.registrationDate, legal_form: onrc.legalForm, statuses: onrc.statuses.map((s) => s.name ?? s.code), snapshot: onrc.snapshot },
    administrators: people && {
      source: "ONRC",
      snapshot: people.snapshot,
      note: "register roles, undated; not beneficial owners",
      holders: people.holders.slice(0, 10).map((h) => ({ name: h.name, role: h.role, person_id: ctx.tier === "private" && h.personId ? ctx.ledger.add(`person:${h.personId}`) : undefined })),
    },
    financials: fin.length ? fin.slice(-4).map((y) => ({ fiscal_year: y.fiscalYear, turnover_ron: ron(y.turnover), average_employees: y.averageEmployees, awarded_in_year_ron: ron(y.awardedInYear), source: "MF" })) : undefined,
    donations: don ? { source: "BaniPartide", data_through_year: don.dataThroughYear, items: don.items.slice(0, 10).map((i) => ({ kind: i.kind, party: i.party, date: i.date ?? i.dateText, amount_ron: ron(i.amount) })) } : undefined,
    public_enterprise: pe ?? undefined,
  };
}

async function counterparties(ctx: ToolContext, a: any) {
  const e = await ensureEntity(ctx, a.key);
  const roles = await ctx.store.roles(e.key);
  const role = a.role === "SUPPLIER" || a.role === "AUTHORITY" ? a.role : roles[0];
  if (!role || !roles.includes(role)) return { rows: [], total: 0, note: `entity has no ${a.role ?? "SEAP"} role`, roles };
  const window = { from: a.from ?? null, to: a.to ?? null };
  const f = scopeFilter(role, e.key, window);
  if (a.other_key) {
    const other = await ensureEntity(ctx, a.other_key);
    const pair = role === "AUTHORITY" ? { ...f, supplier: other.key } : { ...f, authority: other.key };
    const [t, consortia, largest] = await Promise.all([ctx.store.searchTotal(pair), ctx.store.roleConsortia(pair, { limit: 5 }), ctx.store.roleLargest(pair, { limit: lim(a.limit) })]);
    const dates = await ctx.store.searchRecords(pair, { limit: 1, offset: 0, order: "DATE_ASC" });
    const last = await ctx.store.searchRecords(pair, { limit: 1, offset: 0, order: "DATE_DESC" });
    return {
      ...seapHeader(ctx),
      pair: { [role]: entityRef(ctx, e), other: entityRef(ctx, other) },
      direct_link_total: total(t),
      first_award: dates.rows[0]?.date ?? null,
      last_award: last.rows[0]?.date ?? null,
      consortia: consortia.map((c) => ({ members: c.members.map((m) => (m.entity ? entityRef(ctx, m.entity, { share_ron: ron(m.share) }) : { name: m.naturalPerson ? null : m.name })), total: total(c.total) })),
      largest_records: largest.map((r) => recordRow(ctx, r)),
      note: "only direct links; no multi-hop paths",
    };
  }
  const page = await ctx.store.roleCounterparties(role, f, { limit: lim(a.limit) });
  const t = await ctx.store.searchTotal(f);
  const rows = page.rows.map((c) =>
    c.naturalPerson ? { natural_person: true, total: total(c.total) } : { ...entityRef(ctx, c.entity), total: total(c.total), won_together: c.wonTogether || undefined, shares_signal: c.hasSignals || undefined },
  );
  return fit({ ...seapHeader(ctx), entity: entityRef(ctx, e), role, window, entity_total: total(t), note: "ranked by awarded value; a joint award is split in equal shares by convention" }, rows, page.count);
}

async function signals(ctx: ToolContext, a: any) {
  if (!a.entity && !(a.rule && a.supplier)) throw new Error("give `entity`, or `rule` and `supplier`");
  const rules = await ctx.store.signalRules();
  const window = { from: a.from ?? null, to: a.to ?? null };
  const n = lim(a.limit);
  const filters: { role: "AUTHORITY" | "SUPPLIER"; key: string }[] = [];
  if (a.entity) {
    const e = await ensureEntity(ctx, a.entity);
    for (const role of await ctx.store.roles(e.key)) filters.push({ role, key: e.key });
  } else filters.push({ role: "SUPPLIER", key: String(a.supplier).replace(/^entity:/, "") });
  const out: unknown[] = [];
  let count = 0;
  const countsByRule: Record<string, number> = {};
  for (const { role, key } of filters) {
    const f = scopeFilter(role, key, { ...window, signal: a.rule ?? null });
    const page = await ctx.store.roleSignals(f, { limit: n, offset: 0, order: "DATE_DESC" });
    count += page.count;
    for (const r of a.rule ? [{ slug: a.rule }] : rules) {
      const c = (await ctx.store.roleSignals(scopeFilter(role, key, { ...window, signal: r.slug }), { limit: 1, offset: 0, order: "DATE_DESC" })).count;
      if (c) countsByRule[`${role}:${r.slug}`] = c;
    }
    for (const s of page.rows.slice(0, n)) {
      const recs = await ctx.store.signalRecords(s.ordinal, { limit: 5, offset: 0 });
      out.push({
        id: ctx.ledger.add(signalId(s)),
        rule: s.rule,
        side: role,
        first_date: s.firstDate,
        last_date: s.date,
        authority: entityRef(ctx, s.authority),
        suppliers: s.suppliers.slice(0, 6).map((x) => entityRef(ctx, x)),
        record_count: s.recordCount,
        counted_ron: ron(s.value),
        measure: measureRon(s.numbers),
        records: recs.map((r) => ({ id: ctx.ledger.add(`record:${r.code}`), title: r.title, date: r.date, counted_ron: ron(r.counted) })),
      });
    }
  }
  const usedRules = new Set(Object.keys(countsByRule).map((k) => k.split(":")[1]));
  return fit(
    {
      source: "SEAP + reference sources",
      note: "Signals are counted per rule, never scored or ranked; each is a set of Records worth verifying, with lawful explanations",
      counts_by_side_and_rule: countsByRule,
      rules: rules.filter((r) => usedRules.has(r.slug)).map((r) => ({ rule: r.slug, national_base_rate: r.baseRate, base_rate_year: r.baseRateYear, window: r.window, data_through: r.dataThrough })),
    },
    out,
    count,
  );
}

async function record(ctx: ToolContext, a: any) {
  const code = String(a.code).replace(/^record:/, "");
  const r = await ctx.store.record(code);
  if (!r) throw new Error(`unknown record ${code}`);
  const [fw, party] = await Promise.all([ctx.store.framework(code), ctx.store.recordParty(code)]);
  let subsequent: unknown[] | undefined;
  if (fw) subsequent = (await ctx.store.subsequent(fw.noticeCode, { limit: 10, offset: 0 })).map((s) => recordRow(ctx, s));
  return {
    ...seapHeader(ctx),
    record: { ...recordRow(ctx, r), framework_role: r.frameworkRole, contract_type: r.contractType, cpv: r.cpv, procedure: r.procedure, source_url: ctx.ledger.add(`source:${r.provenance.url ?? `https://e-licitatie.ro/source/seap/${r.code}`}`) },
    party_at_award: party ?? undefined,
    framework: fw && { notice: fw.noticeCode, agreement: fw.agreement && ctx.ledger.add(`record:${fw.agreement.code}`), ceiling_ron: ron(fw.ceiling), subsequent_reported_ron: ron(fw.subsequentReported), ratio: fw.ratio, subsequent_count: fw.subsequentCount, first_subsequent: subsequent },
  };
}

async function coverage(ctx: ToolContext, a: any) {
  if ((a.source ?? "SEAP") === "ONRC") return { source: "ONRC", data_through: await ctx.store.onrcDataThrough() };
  const grid = await ctx.store.coverageGrid();
  return {
    source: "SEAP",
    data_through: await ctx.store.dataThrough(),
    not_fully_loaded: grid.filter((c) => c.state !== "LOADED").map((c) => ({ quarter: c.quarter, kind: c.kind, state: c.state, rule: c.rule, note: c.note })),
    note: "every quarter not listed is LOADED",
  };
}

async function person(ctx: ToolContext, a: any) {
  const id = String(a.id).replace(/^person:/, "");
  if (!ctx.ledger.ids.has(`person:${id}`)) throw new Error("person id is not in this conversation (take it from an `entity` result)");
  const p = await ctx.store.person(id);
  if (!p) throw new Error("unknown person");
  return {
    source: "ONRC",
    restricted: true,
    note: "joined by ONRC's person key (same name and full birth date), never by name alone; roles are undated; register roles only",
    person: { id: `person:${p.id}`, name: p.name, birth_year: p.birthYear },
    roles: p.roles.slice(0, 10).map((r) => ({ organisation: r.organisationName, entity: r.entityKey ? ctx.ledger.add(`entity:${r.entityKey}`) : null, role: r.role })),
    snapshot: p.snapshot,
  };
}

async function webSearch(ctx: ToolContext, a: any) {
  const anchor = String(a.entity ?? "");
  if (!ctx.ledger.ids.has(anchor.startsWith("entity:") ? anchor : `entity:${anchor}`)) throw new Error("web_search must be anchored to an entity id already in this conversation");
  // No search provider wired in this harness: we test only when the model calls it and how it treats an empty result.
  return { kind: "OUTSIDE_SOURCE", query: a.query, anchored_to: anchor, rows: [], total: 0, note: "web search returned no results (Outside sources are cited by URL, never joined to an entity by name)" };
}

// --- definitions -----------------------------------------------------------------------------------------------------------------

const dateProps = { from: { type: "string", description: "YYYY-MM-DD, award date from" }, to: { type: "string", description: "YYYY-MM-DD, award date to" } };

const defs: Record<string, { description: string; parameters: object; run: (ctx: ToolContext, a: any) => Promise<unknown>; tier?: Tier }> = {
  search: {
    description:
      "Find entities (contracting authorities, suppliers) or Records. source=SEAP (default) or ONRC (company register). what=entities (default) returns every candidate with its CUI and never picks one; what=records lists SEAP Records (contracts, award notices, direct purchases) with order VALUE_DESC|DATE_DESC|DATE_ASC.",
    parameters: {
      type: "object",
      properties: {
        source: { type: "string", enum: ["SEAP", "ONRC"] },
        what: { type: "string", enum: ["entities", "records"] },
        text: { type: "string", description: "name, CUI, record code or CPV words" },
        side: { type: "string", enum: ["AUTHORITY", "SUPPLIER"] },
        authority: { type: "string", description: "entity key to restrict records to" },
        supplier: { type: "string", description: "entity key to restrict records to" },
        channel: { type: "string", enum: ["DIRECT_PURCHASE", "CONTRACT"] },
        signal_rule: { type: "string" },
        order: { type: "string", enum: ["VALUE_DESC", "DATE_DESC", "DATE_ASC"] },
        ...dateProps,
        limit: { type: "integer" },
        offset: { type: "integer" },
      },
    },
    run: search,
  },
  entity: {
    description:
      "One entity by key: identity, SEAP totals per role (awarded value, optional date window), Leadership (Mandates with party and dates; for a subordinate body, its authority's), ONRC registration, administrators (public names), MF financials, BaniPartide donations.",
    parameters: { type: "object", properties: { key: { type: "string" }, ...dateProps }, required: ["key"] },
    run: entity,
  },
  counterparties: {
    description:
      "An entity's top counterparties by awarded value in a role (AUTHORITY: its suppliers; SUPPLIER: its buyers), optional window. With other_key: that pair's direct link only (total, first/last award, consortia, largest Records).",
    parameters: { type: "object", properties: { key: { type: "string" }, role: { type: "string", enum: ["AUTHORITY", "SUPPLIER"] }, other_key: { type: "string" }, ...dateProps, limit: { type: "integer" } }, required: ["key"] },
    run: counterparties,
  },
  signals: {
    description: "Signals (rule-based flags worth verifying, never scores) of an entity, or of a rule+supplier. Returns each Signal's measure, Records, and the rule's national base rate and window.",
    parameters: { type: "object", properties: { entity: { type: "string" }, rule: { type: "string" }, supplier: { type: "string" }, ...dateProps, limit: { type: "integer" } } },
    run: signals,
  },
  record: {
    description: "One SEAP Record by code: winners with shares, CPV, value, source URL, party at award, Signals; for a framework, its ceiling, subsequent contracts reported and the first 10 of them.",
    parameters: { type: "object", properties: { code: { type: "string" } }, required: ["code"] },
    run: record,
  },
  coverage: {
    description: "A Source's Data-through dates and the quarters not fully loaded (gaps, possibly incomplete).",
    parameters: { type: "object", properties: { source: { type: "string", enum: ["SEAP", "ONRC"] } } },
    run: coverage,
  },
  web_search: {
    description: "Search the web for Outside sources about an entity already in this conversation. Only when the user explicitly asks. Results are cited by URL and never joined to entities by name.",
    parameters: { type: "object", properties: { entity: { type: "string", description: "entity id already in the conversation" }, query: { type: "string" } }, required: ["entity", "query"] },
    run: webSearch,
    tier: "private",
  },
  person: {
    description: "RESTRICTED. A person's roles across organisations (ONRC person key), from a person id returned by `entity`.",
    parameters: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
    run: person,
    tier: "private",
  },
};

// --- v2 descriptions (#349): what each tool lets the model cite, and the Signal rules (from the methodology copy) -----------------

/** One line per rule: what it tests, with its threshold, then its possible lawful explanations (packages/app/src/copy/methodologyEn.ts). */
const RULES: Record<string, string> = {
  OVER_CAP: "a direct purchase strictly above the statutory cap for its date and type (and below 10x it). Lawful: a call-off under a framework, an exception in the law, a data-entry error in the value or type.",
  SPLITTING: "two or more direct purchases from the same authority to the same supplier in the same CPV group, within 30 days, each at or under the cap but together above it. Lawful: separate needs, separate budget lines, unrelated items sharing a CPV group.",
  FRAMEWORK_OVERRUN: "the subsequent contracts reported under a framework agreement add up to strictly more than 110% of its ceiling (frameworks from 2021). Lawful: price indexation, modifications the law allows.",
  NO_PUBLICATION: "a contract awarded by negotiation without prior publication, whatever its value. Lawful: an emergency, a single possible supplier, another legal ground.",
  YOUNG_FIRM: "a supplier whose first Record comes within 90 days of its ONRC registration, or that wins a Record of at least 1,000,000 RON within 180 days of it. Lawful: a company set up for one contract, an established business re-registered after a restructuring.",
  NO_CONSTRUCTION_CAEN: "a works Record of at least 1,000,000 RON won by a firm with no construction CAEN code among its authorised codes. Lawful: a subcontractor or partner does the building, an out-of-date register, a code not listed.",
  AFTER_STRIKE_OFF: "a Record dated after the day ANAF shows the supplier struck off. Lawful: a delay between award and publication, a successor company, a strike-off later reversed.",
  INSOLVENCY: "the supplier is now (ONRC's newest snapshot; the status is undated) in insolvency or reorganisation and has Records in the last six months: never 'won while insolvent'. Lawful: awarded before the proceedings, a reorganisation plan lets the business go on.",
  FEW_EMPLOYEES: "a supplier awarded at least 5,000,000 RON in a calendar year that reported at most one average employee to MF for that fiscal year. Lawful: subcontracted work, staff employed through another company, a yearly average understating a seasonal workforce, a mistaken figure on the statement.",
  NO_FINANCIAL_STATEMENT: "an SRL or SA awarded at least 1,000,000 RON in a year with no MF financial statement for that year or the year before. Lawful: filed late or under another CUI, newly registered, incomplete MF files.",
  DONOR_TO_PARTY: "a firm won a Record from an authority whose Mandate's Party had received a donation or loan from that firm (matched by CUI) in the 365 days before the award; a subordinate body's Party is derived, a weaker link. The amount is never shown or added. Lawful: donations within legal limits are lawful and public, a donor can win in open competition, the local branch may have had no say.",
  SOE_BOARD_IN_SUPPLIER: "a confirmed person holds a role both in a public enterprise and in a private supplier the enterprise awarded a Record; roles are undated. Lawful: sitting on several boards is lawful, the roles may not overlap the award, an open competition.",
};

const CITE = "Cite with the ids in the result, copied exactly.";
const V2: Record<string, (tier: Tier) => string> = {
  search: () =>
    `Find entities (contracting authorities, suppliers) or Records. source=SEAP (default) or ONRC (company register). what=entities (default) returns every candidate with its CUI, exact name matches first, and never picks one: if several share a name, they are different entities. what=records lists SEAP Records (contracts, award notices, direct purchases), filtered by authority/supplier key, channel, signal_rule and date window, ordered VALUE_DESC (use it to find the Record that dominates a total), DATE_DESC or DATE_ASC. ${CITE} Each row's id is [entity:…] or [record:…].`,
  entity: () =>
    `One entity by key: identity and CUI, SEAP totals per role (awarded value, Record count, Records with no value, suspect values left out; optional date window), Leadership (Mandates with Party and dates; for a subordinate body, the authority it reports to), ONRC registration and administrators (register roles, not beneficial owners), MF financials (turnover, average employees), BaniPartide donations, and every Source's Data-through date. ${CITE} Cite its facts with [entity:<key>].`,
  counterparties: () =>
    `An entity's top counterparties by awarded value in a role (AUTHORITY: its suppliers; SUPPLIER: its buyers), with totals and Record counts, optional window; a joint award is split in equal shares. With other_key: that pair's direct link only (total, first and last award dates, consortia, largest Records). ${CITE} There is no counterparties id: cite each counterparty [entity:…] and each Record [record:…].`,
  signals: (tier) =>
    `Signals (rule-based flags worth verifying in the documents, never scores) of an entity, or of a rule+supplier: each Signal's measure in RON, its Records, counts per rule, and each rule's national base rate and window. ${CITE} Cite a Signal with its id exactly as given ([signal:RULE@authority/supplier] or [signal:RULE@authority]) and its Records with [record:…].
Rules (what each tests; possible lawful explanations to give with it):
${Object.entries(RULES).filter(([r]) => tier === "private" || r !== "SOE_BOARD_IN_SUPPLIER").map(([r, t]) => `- ${r}: ${t}`).join("\n")}`,
  record: () =>
    `One SEAP Record by code: title, date, winners with shares, CPV, procedure, value (suspect values flagged and never counted), source URL, party at award, Signals; for a framework, its ceiling, subsequent contracts reported and the first 10 of them. ${CITE} [record:<code>], and [source:<url>] for the SEAP page.`,
  coverage: () =>
    "A Source's Data-through dates and the quarters not fully loaded (gaps, possibly incomplete: totals and counts touching them may be understated). Call it when an answer covers recent quarters or a whole period. Its facts need no citation id: state the dates and quarters in the sentence.",
  web_search: () =>
    "Search the web for Outside sources about an entity already in this conversation. Only when the user explicitly asks. Results are cited by URL as [outside:<url>], kept apart from graph facts and never joined to entities by name.",
  person: () =>
    "RESTRICTED. A person's roles across organisations (ONRC person key: same name and full birth date), from a person id returned by `entity`. Roles are register roles, undated. Cite [person:<id>] and each organisation's [entity:…].",
};

export function toolsFor(tier: Tier, version: "v1" | "v2" = "v2") {
  return Object.entries(defs)
    .filter(([, d]) => !d.tier || d.tier === tier)
    .map(([name, d]) => ({ type: "function" as const, function: { name, description: version === "v2" ? V2[name]!(tier) : d.description, parameters: d.parameters } }));
}

export async function runTool(ctx: ToolContext, name: string, args: unknown): Promise<string> {
  const d = defs[name];
  if (!d || (d.tier && d.tier !== ctx.tier)) return JSON.stringify({ error: `no tool ${name} on this tier` });
  try {
    return JSON.stringify(await d.run(ctx, args ?? {}));
  } catch (e) {
    const m = (e as Error).message;
    // a database failure is the harness's, not the model's: fail the turn so a resume reruns it
    if (/recovery mode|terminat|ECONNREFUSED|Connection|starting up|shutting down/i.test(m)) throw new Error(`database: ${m}`);
    return JSON.stringify({ error: m });
  }
}
