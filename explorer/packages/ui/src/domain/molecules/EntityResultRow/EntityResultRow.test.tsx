import { screen } from "@testing-library/react";
import { renderInUi } from "../../../testing/render.tsx";
import { sampleCopy } from "../../samples/copy.ts";
import type { EntityResult, EntityRow } from "../../types.ts";
import { EntityResultRow } from "./index.ts";

const placeNational: EntityRow["placement"] = { county: null, uat: null, national: true, placedBy: "ANAF" };

const row = (placement: EntityRow["placement"], records = 6): EntityResult => ({
  entity: { key: "30000001", displayName: "HACHI INVEST S.R.L.", identity: "CUI", anafStatus: "ACTIV", placement },
  matched: { awarded: "142000000", records, suspectLeftOut: 0, noValue: 0, frameworkCeilings: "0", estimated: false },
});
const county = { county: { code: "RO-BV", name: "Brașov" }, uat: null, national: false, placedBy: "ANAF" as const };

describe("EntityResultRow", () => {
  it("links the name to the entity page and reads 'RON matched · n Records · county' (EN)", () => {
    const { container } = renderInUi(<EntityResultRow row={row(county)} href="/explore/supplier/30000001" locale="en" copy={sampleCopy.entityRow("en")} />);
    expect(screen.getByRole("link", { name: "HACHI INVEST S.R.L." })).toHaveAttribute("href", "/explore/supplier/30000001");
    expect(container).toHaveTextContent("RON 1,420,000 matched · 6 Records · Brașov");
  });
  it("uses the singular for one Record", () => {
    const { container } = renderInUi(<EntityResultRow row={row(county, 1)} href="/x" locale="en" copy={sampleCopy.entityRow("en")} />);
    expect(container).toHaveTextContent("1 Record ·");
  });
  it("reads in Romanian", () => {
    const { container } = renderInUi(<EntityResultRow row={row(county, 25)} href="/x" locale="ro" copy={sampleCopy.entityRow("ro")} />, "ro");
    expect(container).toHaveTextContent("1.420.000 RON potrivit · 25 de înregistrări · Brașov");
  });
  it("falls back when the entity has no county", () => {
    const national = renderInUi(<EntityResultRow row={row(placeNational)} href="/x" locale="en" copy={sampleCopy.entityRow("en")} />);
    expect(national.container).toHaveTextContent("· national");
    national.unmount();
    const unplaced = renderInUi(<EntityResultRow row={row(null)} href="/x" locale="en" copy={sampleCopy.entityRow("en")} />);
    expect(unplaced.container).toHaveTextContent("· county unknown");
  });
});
