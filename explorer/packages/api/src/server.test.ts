import type { AddressInfo } from "node:net";
import { afterAll, describe, expect, it } from "vitest";
import allowlist from "@grivei/contract/persisted-queries.json" with { type: "json" };
import { loadSchema, validateResponse } from "@grivei/contract/node";
import { graphql, parse } from "graphql";
import type { MainScreenQuery } from "@grivei/contract";
import { createApi } from "./server.ts";
import { rootValue } from "./resolvers.ts";
import { coverageStatus } from "./coverage.ts";
import type { EntityRow, RecordRow, Store } from "./store.ts";

const entity = (key: string, displayName: string, over: Partial<EntityRow> = {}): EntityRow => ({
  key, displayName, identity: /^\d+$/.test(key) ? "CUI" : "NAME_ONLY", cui: /^\d+$/.test(key) ? key : null, foreignVatId: null, anafStatus: null,
  identityCurated: false, provenance: { source: "SEAP", via: null, fetchedAt: "2026-11-12T10:00:00Z" }, ...over,
});
const row = (over: Partial<RecordRow>): RecordRow => ({
  code: "DA1", title: "Hârtie", date: "2022-03-30", kind: "DA", channel: "DIRECT_PURCHASE", procedure: null, value: "120050", counted: "120050",
  authority: entity("1000009", "COMUNA EXEMPLU"), winners: [{ naturalPerson: false, name: "CURAT SRL", entity: entity("name-curat-srl", "CURAT SRL"), share: null }],
  badges: [], suspect: null, crawlStatus: null, provenance: { kind: "BULK", via: "2022 T1 DA", fetchedAt: "2026-11-12T10:00:00Z", url: null }, ...over,
});
const store: Store = {
  total: async () => ({ awarded: "420050", records: 2, suspectLeftOut: 0, noValue: 1, frameworkCeilings: "0" }),
  records: async ({ limit }) => [row({}), row({ code: "DA2", value: null, counted: null, winners: [], badges: ["NO_VALUE"] })].slice(0, limit),
  record: async () => null,
  framework: async () => null,
  subsequent: async () => [],
  sources: async () => [{ id: "SEAP", name: "SEAP", schema: "seap", recordKinds: ["DA", "DAN", "CONTRACT", "AWARD_NOTICE"], lenses: ["MONEY", "COVERAGE", "FLOW"], placementRule: "the contracting authority's seat", methodologyAnchor: "awarded-value", landingStatus: "live" }],
  dataThrough: async () => [{ kind: "DA", date: "2022-03-31" }],
  coverageGrid: async () => [],
  coverageAreas: async () => [],
  unplacedAuthorities: async () => ({ authorities: 0, total: { awarded: "0", records: 0, suspectLeftOut: 0, noValue: 0, frameworkCeilings: "0" } }),
  referenceSnapshot: async () => null,
  publicEnterprise: async () => null,
  referenceSources: async () => [{ id: "AMEPIP", name: "AMEPIP", dataThrough: null, url: null }],
  searchTotal: async (f) => (f.q ? { awarded: "0", records: 0, suspectLeftOut: 0, noValue: 0, frameworkCeilings: "0" } : { awarded: "420050", records: 2, suspectLeftOut: 0, noValue: 1, frameworkCeilings: "0" }),
  searchEntities: async () => ({ count: 0, estimated: false, rows: [] }),
  searchMap: async () => ({ counties: [], national: { awarded: "0", records: 0, suspectLeftOut: 0, noValue: 0, frameworkCeilings: "0" }, unplaced: null, unknownSupplierCounty: null }),
  searchUatMap: async () => ({ uats: [], unknownUat: null }),
  searchRecords: async () => ({ count: 0, rows: [] }),
  roleCounterparties: async () => ({ count: 0, rows: [] }),
  searchFacet: async () => [],
  searchMonths: async () => [],
  roleFrameworks: async () => ({ count: 0, ceilings: "0", subsequentReported: "0" }),
  roleConsortia: async () => [],
  roleLargest: async () => [],
  signalRules: async () => [],
  roleSignals: async () => ({ count: 0, rows: [] }),
  entitySignalCounts: async () => new Map(),
  signalRecords: async () => [],
  goTo: async () => null,
  entity: async () => null,
  aliases: async () => [],
  roles: async () => [],
  counties: async () => [],
  uats: async () => [],
};

const mainScreen = allowlist.operations.find((o) => o.name === "MainScreen")!;
const schema = loadSchema();
const api = createApi(store, schema);
const EMPTY = { filter: {} };

describe("the API answers persisted queries only", () => {
  it("refuses query text, even text identical to a persisted document", async () => {
    const r = await api.respond({ query: mainScreen.document, variables: EMPTY });
    expect(r.status).toBe(400);
    expect(r.body.errors?.[0]?.extensions?.code).toBe("PERSISTED_QUERY_ONLY");
    expect(r.body.data).toBeUndefined();
  });

  it("refuses a query text even when it comes with a valid id", async () => {
    expect((await api.respond({ id: mainScreen.sha256, query: "{ sources { id } }" })).status).toBe(400);
  });

  it("refuses an id that is not on the allowlist", async () => {
    const r = await api.respond({ id: "0".repeat(64), variables: EMPTY });
    expect(r.status).toBe(400);
    expect(r.body.errors?.[0]?.extensions?.code).toBe("PERSISTED_QUERY_NOT_FOUND");
  });

  it("refuses a body without an id", async () => {
    expect((await api.respond({ variables: EMPTY })).body.errors?.[0]?.extensions?.code).toBe("PERSISTED_QUERY_REQUIRED");
    expect((await api.respond([])).status).toBe(400);
  });
});

describe("MainScreen for the empty filter", () => {
  it("returns the Total and the Records list, and the response is valid for the contract", async () => {
    const r = await api.respond({ id: mainScreen.sha256, variables: EMPTY });
    expect(r.status).toBe(200);
    expect(r.body.errors).toBeUndefined();
    expect(validateResponse(schema, parse(mainScreen.document), r.body.data, EMPTY)).toEqual([]);
    const data = r.body.data as MainScreenQuery;
    const search = data.seap.search;
    expect(search.total).toEqual({ awarded: "420050", records: 2, suspectLeftOut: 0, noValue: 1, frameworkCeilings: "0", estimated: false });
    expect(search.records.count).toBe(2);
    expect(search.records.rows.map((x) => [x.record.code, x.record.value, x.record.badges, x.record.winners.length])).toEqual([
      ["DA1", "120050", [], 1],
      ["DA2", null, ["NO_VALUE"], 0],
    ]);
    expect(data.sources[0]).toEqual({ id: "SEAP", name: "SEAP", harvested: true, dataThrough: [{ kind: "DA", date: "2022-03-31" }] });
    expect(data.sources.slice(1).map((s) => [s.id, s.harvested, s.dataThrough])).toEqual([["ONRC", false, []], ["ANI", false, []], ["MFINANTE", false, []], ["JUST", false, []]]); // the planned Sources (#90)
  });

  it("badges crawled Records: provisional until the bulk has the quarter, crawl-only after (#77), next to NO_VALUE", async () => {
    const crawled = createApi({
      ...store,
      records: async () => [
        row({ code: "CAN1~1", kind: "CONTRACT", crawlStatus: "PROVISIONAL" }),
        row({ code: "CAN2~1", kind: "CONTRACT", crawlStatus: "CRAWL_ONLY", value: null, counted: null, badges: ["NO_VALUE"] }),
      ],
    }, schema);
    const r = await crawled.respond({ id: mainScreen.sha256, variables: EMPTY });
    expect(r.body.errors).toBeUndefined();
    const rows = (r.body.data as MainScreenQuery).seap.search.records.rows;
    expect(rows.map((x) => [x.record.code, x.record.badges])).toEqual([
      ["CAN1~1", ["CRAWLED_PROVISIONAL"]],
      ["CAN2~1", ["NO_VALUE", "CRAWL_ONLY"]],
    ]);
  });

  it("runs a text filter on the search store, echoing the folded query, and passes the client's abort signal down", async () => {
    const seen: (AbortSignal | undefined)[] = [];
    const searching = createApi({
      ...store,
      searchTotal: async (_f, o) => (seen.push(o?.signal), { awarded: "5", records: 1, suspectLeftOut: 0, noValue: 0, frameworkCeilings: "0" }),
      searchEntities: async (_s, _f, _p, o) => (seen.push(o?.signal), { count: 1, estimated: true, rows: [{ entity: entity("1000009", "COMUNA"), matched: { awarded: "5", records: 1, suspectLeftOut: 0, noValue: 0, frameworkCeilings: "0" } }] }),
    }, schema);
    const gone = new AbortController();
    const r = await searching.respond({ id: mainScreen.sha256, variables: { filter: { q: "Ștefan S.R.L." } } }, { signal: gone.signal });
    expect(r.body.errors).toBeUndefined();
    const search = (r.body.data as MainScreenQuery).seap.search;
    expect(search.filter.qFolded).toBe("stefan");
    expect(search.total.awarded).toBe("5");
    expect(search.suppliers).toMatchObject({ count: 1, countEstimated: true });
    expect(seen.length).toBe(3);
    expect(seen.every((x) => x === gone.signal)).toBe(true);
  });

  it("does not leak a database failure to the client", async () => {
    const broken = createApi({ ...store, searchTotal: async () => { throw new Error("password authentication failed for user x"); } }, schema);
    const r = await broken.respond({ id: mainScreen.sha256, variables: EMPTY });
    expect(JSON.stringify(r.body)).not.toContain("password");
    expect(r.body.errors?.[0]?.extensions?.code).toBe("INTERNAL");
  });
});

describe("areaShare on Record rows (#103)", () => {
  // a small world: each winner has a supplier county; the Total and the rows are both made from these Record x winner rows, as the search store does
  const winner = (key: string, county: string, share: string) => ({ key, county, share });
  const world = [
    { code: "CAN1", value: "3000", winners: [winner("2000001", "RO-CJ", "1500"), winner("2000002", "RO-MS", "1500")] }, // a consortium across two counties
    { code: "CAN2", value: "1001", winners: [winner("2000001", "RO-CJ", "501"), winner("2000003", "RO-CJ", "500")] }, // a consortium wholly in Cluj
    { code: "DA3", value: "700", winners: [winner("2000001", "RO-CJ", "700")] }, // a single winner in Cluj
    { code: "DA4", value: "900", winners: [winner("2000002", "RO-MS", "900")] }, // elsewhere
  ];
  type Filter = { county?: string | null; countySide?: string | null };
  const matching = (f: Filter) => {
    const supplierArea = f.county && f.countySide === "SUPPLIER";
    return world
      .map((r) => ({ ...r, hit: r.winners.filter((w) => (supplierArea ? w.county === f.county : true)) }))
      .filter((r) => (f.county && f.countySide !== "SUPPLIER" ? true : r.hit.length > 0));
  };
  const sum = (xs: string[]) => xs.reduce((a, x) => a + BigInt(x), 0n);
  const modelStore: Store = {
    ...store,
    searchTotal: async (f) => ({ awarded: sum(matching(f).flatMap((r) => r.hit.map((w) => w.share))).toString(), records: matching(f).length, suspectLeftOut: 0, noValue: 0, frameworkCeilings: "0" }),
    searchRecords: async (f) => {
      const hits = matching(f);
      return {
        count: hits.length,
        rows: hits.map((r) => row({
          code: r.code, value: r.value, counted: r.value,
          winners: r.winners.map((w) => ({ naturalPerson: false, name: w.key, entity: entity(w.key, w.key), share: w.share })),
          areaShare: sum(r.hit.map((w) => w.share)).toString(), // a store that always fills it: the API decides when it is shown
        })),
      };
    },
  };
  const modelApi = createApi(modelStore, schema);
  const ask = async (filter: Filter) => {
    const r = await modelApi.respond({ id: mainScreen.sha256, variables: { filter } });
    expect(r.body.errors).toBeUndefined();
    expect(validateResponse(schema, parse(mainScreen.document), r.body.data, { filter })).toEqual([]);
    const search = (r.body.data as MainScreenQuery).seap.search;
    return { total: search.total, rows: search.records.rows.map((x) => [x.record.code, x.areaShare] as const) };
  };

  it("gives a multi-winner Record the summed shares of its winners in the clicked supplier county", async () => {
    const { rows } = await ask({ county: "RO-CJ", countySide: "SUPPLIER" });
    expect(rows).toEqual([["CAN1", "1500"], ["CAN2", "1001"], ["DA3", null]]);
  });

  it("sums, over all matching Records, to the Total", async () => {
    for (const county of ["RO-CJ", "RO-MS"]) {
      const { total, rows } = await ask({ county, countySide: "SUPPLIER" });
      const shares = rows.map(([code, share]) => share ?? world.find((r) => r.code === code)!.winners.filter((w) => w.county === county).map((w) => w.share)[0]!);
      expect(sum(shares).toString()).toBe(total.awarded);
    }
  });

  it("is null for every row on the authority side, and with no county", async () => {
    for (const filter of [{ county: "RO-CJ", countySide: "AUTHORITY" }, { county: "RO-CJ" }, { countySide: "SUPPLIER" }, {}]) {
      const { rows } = await ask(filter);
      expect(rows.length).toBeGreaterThan(0);
      expect(rows.every(([, share]) => share === null), JSON.stringify(filter)).toBe(true);
    }
  });

  it("is null for a Record with one winner, and where no search filter applies", async () => {
    const { rows } = await ask({ county: "RO-MS", countySide: "SUPPLIER" });
    expect(rows).toEqual([["CAN1", "1500"], ["DA4", null]]);
    const plain = await api.respond({ id: mainScreen.sha256, variables: EMPTY });
    expect((plain.body.data as MainScreenQuery).seap.search.records.rows.map((x) => x.areaShare)).toEqual([null, null]);
  });
});

describe("signalCount on entity rows (#104)", () => {
  // a small world of Signals: each has an authority and the winners of its Records (consortium members included); both the chip's count and
  // the Overview's Signals are made from it, as the signal store makes both from the same Signal tables
  const signals = [
    { id: 1, authority: "1000001", suppliers: ["2000001"] },
    { id: 2, authority: "1000001", suppliers: ["2000001", "2000002"] }, // a consortium
    { id: 3, authority: "1000002", suppliers: ["2000002"] },
  ];
  const authorities = ["1000001", "1000002", "1000003"]; // the last has none
  const suppliers = ["2000001", "2000002", "2000003"]; // the last has none
  type Filter = { authority?: string | null; supplier?: string | null };
  const inScope = (f: Filter) => signals.filter((g) => (!f.authority || g.authority === f.authority) && (!f.supplier || g.suppliers.includes(f.supplier)));
  const total0 = { awarded: "5", records: 1, suspectLeftOut: 0, noValue: 0, frameworkCeilings: "0" };
  const asked: { side: string; keys: string[] }[] = [];
  const modelStore: Store = {
    ...store,
    searchEntities: async (side) => ({
      count: 3, estimated: false,
      rows: (side === "AUTHORITY" ? authorities : suppliers).map((k) => ({ entity: entity(k, `E ${k}`), matched: total0 })),
    }),
    entitySignalCounts: async (side, _f, keys) => {
      asked.push({ side, keys });
      return new Map(keys.map((k) => [k, inScope(side === "AUTHORITY" ? { authority: k } : { supplier: k }).length]).filter(([, n]) => (n as number) > 0) as [string, number][]);
    },
    roleSignals: async (f) => ({ count: inScope(f).length, rows: [] }),
    entity: async (k) => entity(k, `E ${k}`),
    roles: async (k) => (k.startsWith("1") ? ["AUTHORITY"] : ["SUPPLIER"]),
  };
  const modelApi = createApi(modelStore, schema);
  const overview = allowlist.operations.find((o) => o.name === "EntityOverview")!;
  const counts = async () => {
    const r = await modelApi.respond({ id: mainScreen.sha256, variables: EMPTY });
    expect(r.body.errors).toBeUndefined();
    expect(validateResponse(schema, parse(mainScreen.document), r.body.data, EMPTY)).toEqual([]);
    const search = (r.body.data as MainScreenQuery).seap.search;
    const by = (rows: typeof search.authorities.rows) => rows.map((x) => [x.entity.key, x.signalCount] as const);
    return { authorities: by(search.authorities.rows), suppliers: by(search.suppliers.rows) };
  };

  it("counts an authority's Signals on the Authorities tab and a supplier's on the Suppliers tab, 0 for an entity with none", async () => {
    const { authorities: a, suppliers: s } = await counts();
    expect(a).toEqual([["1000001", 2], ["1000002", 1], ["1000003", 0]]);
    expect(s).toEqual([["2000001", 2], ["2000002", 2], ["2000003", 0]]); // 2000002 is a consortium member of Signal 2
  });

  it("asks the store once per tab, for the page's keys only", async () => {
    asked.length = 0;
    await counts();
    expect(asked).toEqual([{ side: "AUTHORITY", keys: authorities }, { side: "SUPPLIER", keys: suppliers }]);
  });

  it("is not asked for when the query does not select it", async () => {
    asked.length = 0;
    const r = await graphql({ schema, rootValue: rootValue(modelStore), source: "{ seap { search(filter: {}) { authorities(limit: 3) { rows { entity { key } } } } } }" });
    expect(r.errors).toBeUndefined();
    expect(asked).toEqual([]);
  });

  it("agrees with the Signals count the entity's Overview shows for the same role and an empty filter", async () => {
    const { authorities: a, suppliers: s } = await counts();
    for (const [key, n] of [...a.map(([k, n]) => [k, n, "AUTHORITY"] as const), ...s.map(([k, n]) => [k, n, "SUPPLIER"] as const)].map(([k, n, role]) => [[k, role], n] as const)) {
      const variables = { key: key[0], role: key[1], filter: null };
      const r = await modelApi.respond({ id: overview.sha256, variables });
      expect(r.body.errors, key.join()).toBeUndefined();
      const role = (r.body.data as { entity: { seap: { role: { signals: { count: number } } } } }).entity.seap.role;
      expect(role.signals.count, key.join()).toBe(n);
    }
  });

  it("is served for the counterparty facet's entities too", async () => {
    const r = await graphql({
      schema, rootValue: rootValue(modelStore),
      source: "{ seap { search(filter: { authority: \"1000001\" }) { facets { counterparty { entity { key } signalCount } } } } }",
    });
    expect(r.errors).toBeUndefined();
    const rows = (r.data as { seap: { search: { facets: { counterparty: { entity: { key: string }; signalCount: number }[] } } } }).seap.search.facets.counterparty;
    expect(rows.map((x) => [x.entity.key, x.signalCount])).toEqual([["2000001", 2], ["2000002", 2], ["2000003", 0]]); // the suppliers of the authority, counted on their side
  });
});

describe("over HTTP", () => {
  const started = api.listen(0, "127.0.0.1");
  afterAll(async () => (await started).close());
  const url = async () => `http://127.0.0.1:${((await started).address() as AddressInfo).port}`;

  it("answers a persisted query on POST /graphql, refuses text with 400, and has a health check", async () => {
    const post = async (body: string) => fetch(`${await url()}/graphql`, { method: "POST", headers: { "content-type": "application/json" }, body });
    const ok = await post(JSON.stringify({ id: mainScreen.sha256, variables: EMPTY }));
    expect(ok.status).toBe(200);
    expect(((await ok.json()) as { data: MainScreenQuery }).data.seap.search.total.records).toBe(2);
    expect((await post(JSON.stringify({ query: "{ sources { id } }" }))).status).toBe(400);
    expect((await post("not json")).status).toBe(400);
    expect((await fetch(`${await url()}/graphql`)).status).toBe(404);
    expect((await fetch(`${await url()}/healthz`)).status).toBe(200);
  });
});

describe("Coverage grid (#79)", () => {
  const cell = (quarter: string, kind = "DA", crawlOnly = 0) => ({ quarter, kind, state: "LOADED", rule: null, note: null, records: 1, crawlOnly, dataThrough: null });
  const grid = [cell("2021-Q1"), cell("2021-Q4"), cell("2022-Q1", "CONTRACT", 1), cell("2022-Q2", "DAN")];
  const ask = async (variables: Record<string, unknown>, source = "SEAP") => {
    const r = await graphql({
      schema, rootValue: rootValue({ ...store, coverageGrid: async () => grid }), variableValues: variables,
      source: `query($w: DateRange) { coverage(source: ${source}, window: $w) { source { id } window { from to } grid { quarter kind state rule note records crawlOnly dataThrough } } }`,
    });
    return r;
  };
  const quarters = (r: Awaited<ReturnType<typeof ask>>) => (r.data as { coverage: { grid: { quarter: string }[] } }).coverage.grid.map((c) => c.quarter);

  it("serves the whole grid when there is no window", async () => {
    const r = await ask({});
    expect(r.errors).toBeUndefined();
    expect(quarters(r)).toEqual(["2021-Q1", "2021-Q4", "2022-Q1", "2022-Q2"]);
    expect((r.data as { coverage: { source: { id: string }; window: object } }).coverage).toMatchObject({ source: { id: "SEAP" }, window: { from: null, to: null } });
  });

  it("serves each cell's crawl-only count (#60/#90)", async () => {
    const r = await ask({});
    expect((r.data as { coverage: { grid: { quarter: string; crawlOnly: number }[] } }).coverage.grid.map((c) => [c.quarter, c.crawlOnly])).toEqual([
      ["2021-Q1", 0], ["2021-Q4", 0], ["2022-Q1", 1], ["2022-Q2", 0],
    ]);
  });

  it("keeps the quarters that overlap the window, ends included", async () => {
    expect(quarters(await ask({ w: { from: "2021-12-31", to: "2022-04-01" } }))).toEqual(["2021-Q4", "2022-Q1", "2022-Q2"]);
    expect(quarters(await ask({ w: { from: "2021-04-01", to: "2021-09-30" } }))).toEqual([]);
    expect(quarters(await ask({ w: { from: "2022-01-01" } }))).toEqual(["2022-Q1", "2022-Q2"]);
    expect(quarters(await ask({ w: { to: "2021-03-31" } }))).toEqual(["2021-Q1"]);
  });

  // The Date scalar rejects "" over GraphQL, so this goes straight at the resolver (the store cache treats "" as no bound too).
  it("treats empty-string bounds as no bound", async () => {
    const seen: unknown[] = [];
    const custom = { ...store, coverageGrid: async () => grid, unplacedAuthorities: async (w: unknown) => (seen.push(w), { authorities: 0, total: { awarded: "0", records: 0, suspectLeftOut: 0, noValue: 0, frameworkCeilings: "0" } }), coverageAreas: async (w: unknown) => (seen.push(w), []) };
    const coverage = (w: { from?: string; to?: string }) => rootValue(custom).coverage({ source: "SEAP", window: w });
    const empty = coverage({ from: "", to: "" });
    expect(empty.window).toEqual({ from: null, to: null });
    expect((await empty.grid()).map((c) => c.quarter)).toEqual(["2021-Q1", "2021-Q4", "2022-Q1", "2022-Q2"]);
    expect((await coverage({ from: "", to: "2021-03-31" }).grid()).map((c) => c.quarter)).toEqual(["2021-Q1"]);
    await empty.counties();
    await empty.unplacedAuthorities();
    expect(seen).toEqual([{ from: null, to: null }, { from: null, to: null }]);
  });

  it("serves the counties with N, M and the other authorities, the unplaced tile and the snapshot date, one status for the window (#80)", async () => {
    const areas = [{ area: "RO-BV", withRecords: 4, publicEntities: 6, otherAuthorities: 3 }, { area: "NATIONAL", withRecords: 2, publicEntities: 3, otherAuthorities: 0 }];
    const total = { awarded: "100000", records: 1, suspectLeftOut: 0, noValue: 0, frameworkCeilings: "0" };
    const seen: unknown[] = [];
    const custom = { ...store, coverageGrid: async () => grid, referenceSnapshot: async () => "2026-11-01", unplacedAuthorities: async (w: unknown) => (seen.push(w), { authorities: 1, total }),
      coverageAreas: async (w: unknown) => (seen.push(w), areas) };
    const r = await graphql({
      schema, rootValue: rootValue(custom), variableValues: { w: { from: "2021-12-31", to: "2022-04-01" } },
      source: `query($w: DateRange) { coverage(source: SEAP, window: $w) { counties { county status withRecords publicEntities otherAuthorities }
        unplacedAuthorities { authorities total { awarded records estimated } } referenceSnapshot } }`,
    });
    expect(r.errors).toBeUndefined();
    expect(r.data).toEqual({ coverage: {
      counties: [{ county: "RO-BV", status: "HARVESTED", withRecords: 4, publicEntities: 6, otherAuthorities: 3 }, { county: "NATIONAL", status: "HARVESTED", withRecords: 2, publicEntities: 3, otherAuthorities: 0 }],
      unplacedAuthorities: { authorities: 1, total: { awarded: "100000", records: 1, estimated: false } }, referenceSnapshot: "2026-11-01" } });
    expect(seen).toEqual([{ from: "2021-12-31", to: "2022-04-01" }, { from: "2021-12-31", to: "2022-04-01" }]); // the window reaches the store as given
  });
});

describe("Coverage status (#80): derived from the grid cells of the window", () => {
  const cells = (...states: string[]) => states.map((state) => ({ state }));
  const awaiting = { state: "NOT_YET_LOADED", rule: "AWAITING_BULK_FILE" };
  it("is not harvested when the window holds no cell, or every cell is not yet loaded", () => {
    expect(coverageStatus([])).toBe("NOT_HARVESTED");
    expect(coverageStatus(cells("NOT_YET_LOADED", "NOT_YET_LOADED"))).toBe("NOT_HARVESTED");
  });
  it("is partial when any cell is not yet loaded beside cells that are", () => {
    expect(coverageStatus(cells("LOADED", "NOT_YET_LOADED"))).toBe("PARTIAL");
    expect(coverageStatus(cells("KNOWN_GAP", "LOADED", "NOT_YET_LOADED"))).toBe("PARTIAL"); // missing wins over flagged
  });
  it("counts the expected lag (not yet loaded, awaiting the bulk file) as a known gap, not as a hole: the current quarter does not make every county partial", () => {
    expect(coverageStatus([{ state: "LOADED" }, awaiting])).toBe("HARVESTED_WITH_KNOWN_GAPS");
    expect(coverageStatus([{ state: "LOADED" }, awaiting, { state: "NOT_YET_LOADED", rule: null }])).toBe("PARTIAL"); // a quarantined or unknown hole still is
    expect(coverageStatus([awaiting, awaiting])).toBe("NOT_HARVESTED"); // nothing loaded at all
  });
  it("is harvested with known gaps when every cell has data but one is flagged, whatever the flag", () => {
    for (const state of ["KNOWN_GAP", "POSSIBLY_INCOMPLETE", "NOT_IN_SOURCE", "CRAWLED_PROVISIONAL"]) expect(coverageStatus(cells("LOADED", state))).toBe("HARVESTED_WITH_KNOWN_GAPS");
  });
  it("is harvested when every cell is loaded", () => {
    expect(coverageStatus(cells("LOADED", "LOADED"))).toBe("HARVESTED");
  });
});
