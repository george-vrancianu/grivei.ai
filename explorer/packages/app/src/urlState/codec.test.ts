import { describe, expect, expectTypeOf, it } from "vitest";
import { ONRC_FILTER_URL, RECORD_FILTER_URL, URL_ONLY_KEYS, type OnrcFilter, type RecordFilter } from "@grivei/contract";
import { decodeOnrcUrlState, decodeUrlState, encodeOnrcUrlState, encodeUrlState, sourceOf } from "./codec.ts";

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
  party: "party=PARTIDUL+NA%C8%9AIONAL+LIBERAL", // the list as registered (source data, diacritics kept)
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
      party: "PARTIDUL NAȚIONAL LIBERAL",
    });
  });

  it("round-trips every field at once, in canonical order", () => {
    const all = Object.values(QUERY_OF_FIELD).join("&");
    expect(roundTrip(all)).toBe(`?${all}`);
  });

  it("round-trips the tab, the page and both orders, with the whole filter", () => {
    const query = `${Object.values(QUERY_OF_FIELD).join("&")}&tab=${"records"}&page=3&order=value-desc&signalOrder=date-desc&lens=coverage`;
    const state = decodeUrlState(`?${query}`);
    expect(state).toMatchObject({ tab: "records", page: 3, order: "VALUE_DESC", signalOrder: "DATE_DESC", lens: "coverage" });
    expect(encodeUrlState(state)).toBe(`?${query}`);
  });

  it("covers exactly the contract's URL-only keys", () => {
    const state = decodeUrlState("?tab=suppliers&page=2&order=date-asc&signalOrder=value-desc&lens=coverage&counterparty=30000002&search=q%3Dx");
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

  it("round-trips the picked counterparty after the lens, and ignores a malformed key", () => {
    expect(roundTrip("lens=flow&counterparty=30000002")).toBe("?lens=flow&counterparty=30000002");
    expect(decodeUrlState("?counterparty=30000002")).toEqual({ filter: {}, counterparty: "30000002" });
    expect(decodeUrlState("?counterparty=a%20b")).toEqual({ filter: {} });
  });

  it("round-trips the map lens, and leaves out the Money default", () => {
    expect(roundTrip("lens=coverage")).toBe("?lens=coverage");
    expect(decodeUrlState("?lens=coverage")).toEqual({ filter: {}, lens: "coverage" });
    expect(decodeUrlState("?lens=money")).toEqual({ filter: {} });
    expect(encodeUrlState({ filter: {}, lens: "money" })).toBe("");
    expect(decodeUrlState("?lens=Not%20A%20Lens")).toEqual({ filter: {} }); // malformed: ignored
  });

  it("round-trips the county and the county side through the URL, in canonical order after the other filter fields", () => {
    expect(roundTrip("q=comuna&county=RO-BV&countySide=supplier")).toBe("?q=comuna&county=RO-BV&countySide=supplier");
    expect(roundTrip("county=UNPLACED")).toBe("?county=UNPLACED");
    expect(roundTrip("countySide=authority")).toBe(""); // the default is left out
  });

  it("carries the Party filter as the list as registered, after the Signal, and never decodes an empty one (#181)", () => {
    expect(roundTrip("party=ALIAN%C8%9AA+USR+PLUS&signal=splitting")).toBe("?signal=splitting&party=ALIAN%C8%9AA+USR+PLUS");
    expect(decodeUrlState("?party=").filter).toEqual({});
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

  it("round-trips the zoomed county and its UAT (#84): the county zooms, the SIRUTA filters, both replace history and survive a reload", () => {
    expect(roundTrip("county=RO-BV&uat=880010")).toBe("?county=RO-BV&uat=880010");
    expect(roundTrip("uat=880010&county=RO-BV")).toBe("?county=RO-BV&uat=880010"); // canonical order
    expect(roundTrip("county=RO-B&uat=179169&tab=authorities")).toBe("?county=RO-B&uat=179169&tab=authorities"); // Bucharest by sector
    expect(decodeUrlState("?county=RO-BV&uat=880010").filter).toEqual({ county: "RO-BV", uat: "880010" });
    expect(roundTrip("county=RO-BV&uat=")).toBe("?county=RO-BV"); // an empty UAT is no UAT
    expect(roundTrip("county=RO-BV&uat=Sanpetru")).toBe("?county=RO-BV"); // malformed: a SIRUTA is digits
  });

  describe("the carried search (#106)", () => {
    const own = (search: string) => decodeUrlState(`?${search}`);

    it("round-trips a query only, chips only, and both, diacritics and special characters included", () => {
      for (const filter of [
        { q: "Reabilitare pod și țară & co=1?#" },
        { channel: "DIRECT_PURCHASE", badges: ["SUSPECT_VALUE"], from: "2024-01-01" },
        { q: "străzi", procedure: ["Licitație deschisă"], to: "2024-12-31" },
      ] as RecordFilter[]) {
        const query = encodeUrlState({ filter: {}, carried: filter });
        expect(query).toMatch(/^\?search=[^&=]+$/); // one parameter, its value escaped as a whole
        expect(decodeUrlState(query)).toEqual({ filter: {}, carried: filter });
        expect(encodeUrlState(decodeUrlState(query))).toBe(query);
      }
    });

    it("never leaks into the entity's own filter, in either direction", () => {
      const carried = { q: "strazi", channel: "CONTRACT" } as RecordFilter;
      const url = encodeUrlState({ filter: {}, tab: "records", carried });
      expect(url).toBe("?tab=records&search=q%3Dstrazi%26channel%3Dcontract");
      expect(decodeUrlState(url).filter).toEqual({});
      expect(decodeUrlState(url).carried).toEqual(carried);
      // the entity's own filter encodes without the parameter, and a carried one next to it stays apart
      expect(encodeUrlState({ filter: { q: "own" } })).toBe("?q=own");
      const both = decodeUrlState(`?q=own&${url.slice(1)}`);
      expect(both.filter).toEqual({ q: "own" });
      expect(both.carried).toEqual(carried);
      expect(encodeUrlState({ filter: both.filter })).toBe("?q=own");
    });

    it("is left out when there is nothing to carry, and ignores a value that holds no filter", () => {
      expect(encodeUrlState({ filter: {}, carried: {} })).toBe("");
      expect(own("search=").carried).toBeUndefined();
      expect(own("search=nonsense").carried).toBeUndefined();
      expect(own("search=channel%3DNot+a+slug").carried).toBeUndefined();
    });

    it("does not nest: a carried search holds the filter only", () => {
      const nested = own("search=q%3Dx%26search%3Dq%253Dy%26tab%3Drecords%26page%3D3");
      expect(nested.carried).toEqual({ q: "x" });
    });

    it("sits after the counterparty in the canonical order", () => {
      expect(encodeUrlState({ filter: { cpv: "301" }, counterparty: "123", carried: { q: "a" } })).toBe("?cpv=301&counterparty=123&search=q%3Da");
    });
  });
});

/** ONRC's chips (#176): one citable query string per OnrcFilter field, in the canonical form. A new field makes this fail to compile. */
const ONRC_QUERY_OF_FIELD: Record<keyof OnrcFilter, string> = {
  q: "q=Alfa+%C8%98antier",
  status: "status=1107&status=1084",
  caen: "caen=4211",
  county: "county=RO-CJ",
  registeredFrom: "registeredFrom=2020-01-01",
  registeredTo: "registeredTo=2024-12-31",
  seapCounterparty: "seapCounterparty=true",
};

describe("the URL <-> OnrcFilter codec (#176)", () => {
  const roundTripOnrc = (query: string) => encodeOnrcUrlState(decodeOnrcUrlState(`?${query}`));

  it("covers exactly the contract's ONRC fields", () => {
    expect(Object.keys(ONRC_QUERY_OF_FIELD).sort()).toEqual(Object.keys(ONRC_FILTER_URL).sort());
  });

  it.each(Object.entries(ONRC_QUERY_OF_FIELD))("round-trips %s (URL -> filter -> URL unchanged)", (field, query) => {
    const state = decodeOnrcUrlState(`?${query}`);
    expect(Object.keys(state.filter)).toEqual([field]);
    expect(encodeOnrcUrlState(state)).toBe(`?${query}`);
  });

  it("decodes each chip to the type the API takes: status codes are numbers, the dates stay text", () => {
    const { filter } = decodeOnrcUrlState(`?${Object.values(ONRC_QUERY_OF_FIELD).join("&")}`);
    expect(filter).toEqual({ q: "Alfa Șantier", status: [1107, 1084], caen: "4211", county: "RO-CJ", registeredFrom: "2020-01-01", registeredTo: "2024-12-31", seapCounterparty: true });
  });

  it("round-trips every chip at once with the tab and the page, in canonical order", () => {
    const query = `${Object.values(ONRC_QUERY_OF_FIELD).join("&")}&tab=organisations&page=2`;
    expect(roundTripOnrc(query)).toBe(`?${query}`);
  });

  it("keeps seapCounterparty=false distinct from unset, and leaves out page 1 and an empty state", () => {
    expect(roundTripOnrc("seapCounterparty=false")).toBe("?seapCounterparty=false");
    expect(encodeOnrcUrlState({ filter: {}, page: 1 })).toBe("");
    expect(decodeOnrcUrlState("")).toEqual({ filter: {} });
  });

  it("ignores unknown keys and malformed values instead of passing them on", () => {
    expect(decodeOnrcUrlState("?utm=1&status=abc&status=-1&caen=4a&county=ro-cj&registeredFrom=yesterday&seapCounterparty=yes&page=0")).toEqual({ filter: {} });
    expect(decodeOnrcUrlState("?status=1048&status=x&status=1084").filter).toEqual({ status: [1048, 1084] });
  });

  it("a SEAP-only key is ignored, so an ONRC URL never carries a SEAP chip", () => {
    expect(decodeOnrcUrlState("?channel=contract&supplier=123&q=alfa")).toEqual({ filter: { q: "alfa" } });
  });
});

describe("the Source in the URL (#178)", () => {
  it("leaves SEAP out: every link from before the picker means SEAP, whatever other keys it has", () => {
    for (const query of ["", "q=deszapezire&from=2024-01-01&county=RO-BV&tab=suppliers&page=2", "lens=coverage&from=2023-01-01", "source=seap&q=a"]) {
      expect(decodeUrlState(`?${query}`).source).toBeUndefined();
      expect(sourceOf(`?${query}`)).toBe("SEAP");
    }
    expect(roundTrip("q=deszapezire&county=RO-BV&tab=suppliers")).toBe("?q=deszapezire&county=RO-BV&tab=suppliers");
    expect(roundTrip("source=seap&q=a")).toBe("?q=a"); // the default is not spelled out
  });

  it("reads source=onrc and writes it last, after every other key, and an unknown Source is SEAP", () => {
    expect(decodeUrlState("?source=onrc&tab=records").source).toBe("ONRC");
    expect(roundTrip("tab=records&source=onrc")).toBe("?tab=records&source=onrc");
    expect(encodeUrlState({ filter: { q: "a" }, lens: "coverage", source: "ONRC" })).toBe("?q=a&lens=coverage&source=onrc");
    expect(sourceOf("?source=ONRC")).toBe("SEAP");
    expect(sourceOf("?source=pnrr")).toBe("SEAP");
  });
});
