import type { SignalData } from "@grivei/ui";
import { describe, expect, it } from "vitest";
import { decodeUrlState } from "../urlState/codec.ts";
import { parsePath } from "../routing/routes.ts";
import { reproduceFilter, signalReproduceHref } from "./reproduceHref.ts";
import { signalAnchor } from "@grivei/ui";
import { signalMethodologyHref, signalSeapHref } from "./signalLinks.ts";

const authority = { key: "4000001", displayName: "MUNICIPIUL BRAȘOV", identity: "CUI" } as const;
const base = { date: "2024-07-19", firstDate: "2024-07-01", recordCount: 2, dataThrough: "2024-11-30", authority, suppliers: [] };

/** One Signal per rule, with the reproduce shape the pipeline writes for it. */
const SIGNALS: Record<string, { signal: SignalData; en: string; ro: string }> = {
  OVER_CAP: {
    signal: {
      ...base, rule: "OVER_CAP", recordCount: 1, numbers: { __typename: "OverCapNumbers", value: "30000000", cap: "27012000", multiple: 1.11 },
      reproduce: { authority: "4000001", supplier: null, signal: "OVER_CAP", cpv: null, from: "2024-01-19", to: "2024-01-19" },
    },
    en: "/explore/authority/4000001/records?from=2024-01-19&to=2024-01-19&signal=over-cap",
    ro: "/ro/explore/authority/4000001/records?from=2024-01-19&to=2024-01-19&signal=over-cap",
  },
  SPLITTING: {
    signal: {
      ...base, rule: "SPLITTING", numbers: { __typename: "SplittingNumbers", purchases: 2, sum: "29000000", cap: "27012000", cpvGroup: "770", from: "2024-07-01", to: "2024-07-19" },
      reproduce: { authority: "4000001", supplier: "30000001", signal: "SPLITTING", cpv: "770", from: "2024-07-01", to: "2024-07-19" },
    },
    en: "/explore/authority/4000001/records?from=2024-07-01&to=2024-07-19&supplier=30000001&cpv=770&signal=splitting",
    ro: "/ro/explore/authority/4000001/records?from=2024-07-01&to=2024-07-19&supplier=30000001&cpv=770&signal=splitting",
  },
  FRAMEWORK_OVERRUN: {
    signal: {
      ...base, rule: "FRAMEWORK_OVERRUN", recordCount: 13, numbers: { __typename: "FrameworkOverrunNumbers", ceiling: "10000000000", subsequent: "11240000000", ratio: 1.124 },
      reproduce: { authority: "4000001", supplier: "30000003", signal: "FRAMEWORK_OVERRUN", cpv: null, from: null, to: null },
    },
    en: "/explore/authority/4000001/records?supplier=30000003&signal=framework-overrun",
    ro: "/ro/explore/authority/4000001/records?supplier=30000003&signal=framework-overrun",
  },
  NO_PUBLICATION: {
    signal: {
      ...base, rule: "NO_PUBLICATION", recordCount: 1, numbers: { __typename: "NoPublicationNumbers", procedure: "Negociere fără publicare prealabilă" },
      reproduce: { authority: "4000001", supplier: null, signal: "NO_PUBLICATION", cpv: null, from: "2023-12-01", to: "2023-12-01" },
    },
    en: "/explore/authority/4000001/records?from=2023-12-01&to=2023-12-01&signal=no-publication",
    ro: "/ro/explore/authority/4000001/records?from=2023-12-01&to=2023-12-01&signal=no-publication",
  },
};

describe("a Signal's reproducing link", () => {
  describe.each(Object.entries(SIGNALS))("%s", (_rule, { signal, en, ro }) => {
    it("is the authority's Records tab with the Signal's filter, in English and in Romanian", () => {
      expect(signalReproduceHref("en", signal)).toBe(en);
      expect(signalReproduceHref("ro", signal)).toBe(ro);
    });

    it("decodes back to exactly `reproduce` (authority from the path, the rest from the query)", () => {
      for (const locale of ["en", "ro"] as const) {
        const [path = "", query = ""] = signalReproduceHref(locale, signal).split("?");
        expect(parsePath(path)).toEqual({ locale, route: { name: "entity", entity: "authority", key: signal.reproduce.authority, view: "records" } });
        const { filter, tab } = decodeUrlState(query);
        expect(tab).toBeUndefined();
        expect(filter).toEqual(reproduceFilter(signal.reproduce));
        const { authority: key, ...rest } = signal.reproduce;
        expect(key).toBe("4000001");
        expect({ ...rest }).toEqual({ supplier: null, cpv: null, from: null, to: null, ...filter });
      }
    });
  });

  it("falls back to the Signal's own authority when `reproduce` names none", () => {
    const { signal } = SIGNALS["OVER_CAP"]!;
    expect(signalReproduceHref("en", { ...signal, reproduce: { ...signal.reproduce, authority: null } })).toContain("/explore/authority/4000001/records");
  });
});

describe("a Signal's methodology and SEAP links", () => {
  it("points at the rule's section of the methodology page under the language's prefix", () => {
    expect(signalAnchor("FRAMEWORK_OVERRUN")).toBe("signal-framework-overrun");
    expect(signalMethodologyHref("en", "OVER_CAP")).toBe("/explore/methodology#signal-over-cap");
    expect(signalMethodologyHref("ro", "NO_PUBLICATION")).toBe("/ro/explore/methodology#signal-no-publication");
  });

  it("links the one Record to SEAP (its provenance URL, else the redirect) and nothing for several", () => {
    expect(signalSeapHref({ recordCount: 1 }, [{ code: "DA12345678" }])).toBe("/source/seap/DA12345678");
    expect(signalSeapHref({ recordCount: 1 }, [{ code: "DA1", provenance: { url: "/source/seap/DA1" } }])).toBe("/source/seap/DA1");
    expect(signalSeapHref({ recordCount: 2 }, [{ code: "A" }, { code: "B" }])).toBeNull();
    expect(signalSeapHref({ recordCount: 1 }, [])).toBeNull();
  });
});
