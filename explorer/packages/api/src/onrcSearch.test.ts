import { describe, expect, it } from "vitest";
import { buildOnrcWhere } from "./onrcSearch.ts";

describe("the OnrcFilter as a WHERE over onrc.search", () => {
  it("is the whole index for an empty filter, a blank query or a legal form alone", () => {
    for (const filter of [{}, { q: "" }, { q: "SRL" }, { q: "S.C. ... S.R.L." }]) {
      expect(buildOnrcWhere(filter)).toEqual({ sql: "id @@@ pdb.all()", params: [], text: false, qFolded: null });
    }
  });

  it("makes every word but the last an exact match and the last a prefix that also scores as an exact word", () => {
    const w = buildOnrcWhere({ q: "Alfa Șantier RO3100020" });
    expect(w).toEqual({
      sql: "doc &&& $1::text AND (doc @@@ pdb.regex($2::text) OR doc ||| $3::text)",
      params: ["alfa santier", "3100020.*", "3100020"], text: true, qFolded: "alfa santier 3100020",
    });
  });

  it("escapes regular-expression characters and never splices an input into SQL", () => {
    const w = buildOnrcWhere({ q: "a+b", caen: "42.*; DROP TABLE x" });
    expect(w.sql).not.toMatch(/DROP|42/);
    expect(w.params).toContain("42\\.\\*; DROP TABLE x.*");
  });

  it("adds one predicate per chip, in the contract's order, each on a bound parameter", () => {
    const w = buildOnrcWhere({ status: [1107, 1084], caen: "42", county: "RO-CJ", registeredFrom: "2020-01-01", registeredTo: "2024-12-31", seapCounterparty: false });
    expect(w.sql).toBe(
      "id @@@ pdb.all() AND statuses @@@ pdb.term_set($1::text[]) AND caen @@@ pdb.regex($2::text) AND area = $3 AND registration_date >= $4::date AND registration_date <= $5::date AND seap_counterparty = $6",
    );
    expect(w.params).toEqual([["1107", "1084"], "42.*", "RO-CJ", "2020-01-01", "2024-12-31", false]);
  });

  it("treats an empty status list, a blank CAEN and a null chip as no chip", () => {
    expect(buildOnrcWhere({ status: [], caen: "", county: null, registeredFrom: null, seapCounterparty: null }).sql).toBe("id @@@ pdb.all()");
  });
});
