import type { AddressInfo } from "node:net";
import { afterAll, describe, expect, it } from "vitest";
import allowlist from "@grivei/contract/persisted-queries.json" with { type: "json" };
import { loadSchema, validateResponse } from "@grivei/contract/node";
import { parse } from "graphql";
import type { MainScreenQuery } from "@grivei/contract";
import { createApi } from "./server.ts";
import type { EntityRow, RecordRow, Store } from "./store.ts";

const entity = (key: string, displayName: string, over: Partial<EntityRow> = {}): EntityRow => ({
  key, displayName, identity: /^\d+$/.test(key) ? "CUI" : "NAME_ONLY", cui: /^\d+$/.test(key) ? key : null, foreignVatId: null, anafStatus: null,
  identityCurated: false, provenance: { source: "SEAP", via: null, fetchedAt: "2026-11-12T10:00:00Z" }, ...over,
});
const row = (over: Partial<RecordRow>): RecordRow => ({
  code: "DA1", title: "Hârtie", date: "2022-03-30", kind: "DA", channel: "DIRECT_PURCHASE", procedure: null, value: "120050", counted: "120050",
  authority: entity("1000009", "COMUNA EXEMPLU"), winners: [{ naturalPerson: false, name: "CURAT SRL", entity: entity("name-curat-srl", "CURAT SRL"), share: null }],
  badges: [], suspect: null, crawlStatus: null, ...over,
});
const store: Store = {
  total: async () => ({ awarded: "420050", records: 2, suspectLeftOut: 0, noValue: 1, frameworkCeilings: "0" }),
  records: async ({ limit }) => [row({}), row({ code: "DA2", value: null, counted: null, winners: [], badges: ["NO_VALUE"] })].slice(0, limit),
  record: async () => null,
  framework: async () => null,
  subsequent: async () => [],
  dataThrough: async () => [{ kind: "DA", date: "2022-03-31" }],
  searchTotal: async () => ({ awarded: "0", records: 0, suspectLeftOut: 0, noValue: 0, frameworkCeilings: "0" }),
  searchEntities: async () => ({ count: 0, estimated: false, rows: [] }),
  searchRecords: async () => ({ count: 0, rows: [] }),
  entity: async () => null,
  aliases: async () => [],
  roles: async () => [],
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
    expect(data.sources).toEqual([{ id: "SEAP", name: "SEAP", harvested: true, dataThrough: [{ kind: "DA", date: "2022-03-31" }] }]);
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

  it("says plainly that a filter waiting for another ticket is not served yet, instead of ignoring it", async () => {
    const r = await api.respond({ id: mainScreen.sha256, variables: { filter: { hasSignals: true } } });
    expect(r.status).toBe(200);
    expect(r.body.errors?.[0]).toMatchObject({ message: expect.stringContaining("not served yet"), extensions: { code: "NOT_IMPLEMENTED" } });
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
    const broken = createApi({ ...store, total: async () => { throw new Error("password authentication failed for user x"); } }, schema);
    const r = await broken.respond({ id: mainScreen.sha256, variables: EMPTY });
    expect(JSON.stringify(r.body)).not.toContain("password");
    expect(r.body.errors?.[0]?.extensions?.code).toBe("INTERNAL");
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
