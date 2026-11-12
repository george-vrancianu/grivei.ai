import { describe, expect, expectTypeOf, it } from "vitest";
import { RECORD_FILTER_URL, URL_ONLY_KEYS, type RecordFilter } from "@grivei/contract";
import { decodeUrlState, encodeUrlState } from "./codec.ts";

/** One citable query string per RecordFilter field, written in the codec's canonical form. A new field makes this fail to compile. */
const QUERY_OF_FIELD: Record<keyof RecordFilter, string> = {
  q: "q=Reabilitare+pod+%C8%99i+%C8%9Bar%C4%83+%26+co",
  from: "from=2024-01-01",
  to: "to=2024-12-31",
  channel: "channel=direct-purchase",
  valueBucket: "valueBucket=up-to-135k",
  hasSignals: "hasSignals=true",
  badges: "badges=suspect-value&badges=framework-ceiling",
  procedure: "procedure=Cerere+de+oferte&procedure=Licita%C8%9Bie+deschis%C4%83",
  county: "county=RO-BV",
  uat: "uat=40198",
  countySide: "countySide=supplier",
  authority: "authority=4305857",
  supplier: "supplier=name-popescu-srl",
  cpv: "cpv=301",
  signal: "signal=no-publication",
};

const roundTrip = (query: string) => encodeUrlState(decodeUrlState(`?${query}`));

describe("the URL <-> RecordFilter codec", () => {
  it("covers exactly the contract's fields", () => {
    expect(Object.keys(QUERY_OF_FIELD).sort()).toEqual(Object.keys(RECORD_FILTER_URL).sort());
    expectTypeOf<keyof typeof RECORD_FILTER_URL>().toEqualTypeOf<keyof RecordFilter>();
  });

  it.each(Object.entries(QUERY_OF_FIELD))("round-trips %s (URL -> filter -> URL unchanged)", (field, query) => {
    const state = decodeUrlState(`?${query}`);
    expect(Object.keys(state.filter)).toEqual([field]); // and it really read the field
    expect(encodeUrlState(state)).toBe(`?${query}`);
  });

  it("decodes each field to the type the API takes", () => {
    const { filter } = decodeUrlState(`?${Object.values(QUERY_OF_FIELD).join("&")}`);
    expect(filter).toEqual({
      q: "Reabilitare pod și țară & co",
      from: "2024-01-01",
      to: "2024-12-31",
      channel: "DIRECT_PURCHASE",
      valueBucket: "UP_TO_135K",
      hasSignals: true,
      badges: ["SUSPECT_VALUE", "FRAMEWORK_CEILING"],
      procedure: ["Cerere de oferte", "Licitație deschisă"],
      county: "RO-BV",
      uat: "40198",
      countySide: "SUPPLIER",
      authority: "4305857",
      supplier: "name-popescu-srl",
      cpv: "301",
      signal: "NO_PUBLICATION",
    });
  });

  it("round-trips every field at once, in canonical order", () => {
    const all = Object.values(QUERY_OF_FIELD).join("&");
    expect(roundTrip(all)).toBe(`?${all}`);
  });

  it("round-trips the tab, the page and both orders, with the whole filter", () => {
    const query = `${Object.values(QUERY_OF_FIELD).join("&")}&tab=${"records"}&page=3&order=value-desc&signalOrder=date-desc`;
    const state = decodeUrlState(`?${query}`);
    expect(state).toMatchObject({ tab: "records", page: 3, order: "VALUE_DESC", signalOrder: "DATE_DESC" });
    expect(encodeUrlState(state)).toBe(`?${query}`);
  });

  it("covers exactly the contract's URL-only keys", () => {
    const state = decodeUrlState("?tab=suppliers&page=2&order=date-asc&signalOrder=value-desc");
    expect(Object.keys(state).filter((k) => k !== "filter").sort()).toEqual(Object.keys(URL_ONLY_KEYS).sort());
  });

  it("leaves out what is at its default: page 1, the authority county side, nothing", () => {
    expect(encodeUrlState({ filter: { countySide: "AUTHORITY", q: "" }, page: 1 })).toBe("");
    expect(encodeUrlState({ filter: {} })).toBe("");
    expect(decodeUrlState("").filter).toEqual({});
  });

  it("ignores unknown keys and malformed values instead of passing them on", () => {
    const state = decodeUrlState("?utm=1&from=yesterday&cpv=abc&uat=x&county=ro-bv&channel=Direct%20Purchase&page=0&page=-1&tab=A%20B&hasSignals=yes");
    expect(state).toEqual({ filter: {} });
  });

  it("keeps hasSignals=false distinct from unset", () => {
    expect(roundTrip("hasSignals=false")).toBe("?hasSignals=false");
  });

  it("clamps nothing it was not asked to: a repeated single-valued key keeps the first value", () => {
    expect(decodeUrlState("?channel=contract&channel=direct-purchase").filter).toEqual({ channel: "CONTRACT" });
  });

  it("accepts a query string with or without the leading ?", () => {
    expect(decodeUrlState("cpv=301")).toEqual(decodeUrlState("?cpv=301"));
  });
});
