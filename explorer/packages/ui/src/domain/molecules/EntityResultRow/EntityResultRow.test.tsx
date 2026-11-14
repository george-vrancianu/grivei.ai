import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { renderInUi } from "../../../testing/render.tsx";
import { sampleCopy } from "../../samples/copy.ts";
import type { EntityResult, EntityRow } from "../../types.ts";
import { EntityResultRow } from "./index.ts";

const placeNational: EntityRow["placement"] = { county: null, uat: null, national: true, placedBy: "ANAF" };

const row = (placement: EntityRow["placement"], records = 6): EntityResult => ({
  entity: { key: "30000001", displayName: "HACHI INVEST S.R.L.", identity: "CUI", anafStatus: "ACTIV", placement },
  matched: { awarded: "142000000", records, suspectLeftOut: 0, noValue: 0, frameworkCeilings: "0", estimated: false },
  signalCount: 0,
});
const county = { county: { code: "RO-BV", name: "Brașov" }, uat: null, national: false, placedBy: "ANAF" as const };

describe("EntityResultRow", () => {
  it("links the name to the entity page and shows the amount in its own column and reads 'n Records · county · CUI n' (EN)", () => {
    const { container } = renderInUi(<EntityResultRow row={row(county)} href="/explore/supplier/30000001" locale="en" copy={sampleCopy.entityRow("en")} />);
    expect(screen.getByRole("link", { name: "HACHI INVEST S.R.L." })).toHaveAttribute("href", "/explore/supplier/30000001");
    expect(container).toHaveTextContent("6 Records · Brașov · CUI 30000001");
    expect(screen.getByText("RON 1,420,000")).toBeVisible();
    expect(screen.getByText("matched")).toBeVisible();
  });
  it("uses the singular for one Record", () => {
    const { container } = renderInUi(<EntityResultRow row={row(county, 1)} href="/x" locale="en" copy={sampleCopy.entityRow("en")} />);
    expect(container).toHaveTextContent("1 Record ·");
  });
  it("reads in Romanian", () => {
    const { container } = renderInUi(<EntityResultRow row={row(county, 25)} href="/x" locale="ro" copy={sampleCopy.entityRow("ro")} />, "ro");
    expect(container).toHaveTextContent("25 de înregistrări · Brașov · CUI 30000001");
    expect(container).toHaveTextContent("1.420.000 RON");
    expect(screen.getByText("potrivit")).toBeVisible();
  });
  it("shows an 'n Signals' chip linking to the Overview's Signals section only when the entity has Signals", () => {
    const withSignals = renderInUi(<EntityResultRow row={{ ...row(county), signalCount: 3 }} href="/explore/supplier/30000001" locale="en" copy={sampleCopy.entityRow("en")} />);
    expect(screen.getByRole("link", { name: "3 Signals, HACHI INVEST S.R.L." })).toHaveAttribute("href", "/explore/supplier/30000001#signals");
    withSignals.unmount();
    renderInUi(<EntityResultRow row={row(county)} href="/x" locale="en" copy={sampleCopy.entityRow("en")} />);
    expect(screen.queryByRole("link", { name: /Signal/ })).toBeNull();
  });
  it("reads the chip in Romanian, and does not nest it in another link", () => {
    renderInUi(<EntityResultRow row={{ ...row(county), signalCount: 2 }} href="/explore/furnizor/1" locale="ro" copy={sampleCopy.entityRow("ro")} />, "ro");
    const chip = screen.getByRole("link", { name: "2 Semnale, HACHI INVEST S.R.L." });
    expect(chip.closest("a")).toBe(chip);
    expect(chip.parentElement?.closest("a")).toBeNull();
  });
  it("has no CUI in the meta line for an entity identified by name only", () => {
    const named = row(county);
    const { container } = renderInUi(<EntityResultRow row={{ ...named, entity: { ...named.entity, identity: "NAME_ONLY" } }} href="/x" locale="en" copy={sampleCopy.entityRow("en")} />);
    expect(container).not.toHaveTextContent("CUI");
  });
  it("falls back when the entity has no county", () => {
    const national = renderInUi(<EntityResultRow row={row(placeNational)} href="/x" locale="en" copy={sampleCopy.entityRow("en")} />);
    expect(national.container).toHaveTextContent("· national");
    national.unmount();
    const unplaced = renderInUi(<EntityResultRow row={row(null)} href="/x" locale="en" copy={sampleCopy.entityRow("en")} />);
    expect(unplaced.container).toHaveTextContent("· county unknown");
  });
  it("hands a plain click on the name and on the Signals chip to onNavigate, and leaves a modified click to the browser", async () => {
    const onNavigate = vi.fn();
    renderInUi(<EntityResultRow row={{ ...row(county), signalCount: 3 }} href="/explore/supplier/30000001" locale="en" copy={sampleCopy.entityRow("en")} onNavigate={onNavigate} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("link", { name: "HACHI INVEST S.R.L." }));
    expect(onNavigate).toHaveBeenLastCalledWith("/explore/supplier/30000001");
    await user.click(screen.getByRole("link", { name: /3 Signals/ }));
    expect(onNavigate).toHaveBeenLastCalledWith("/explore/supplier/30000001#signals");
    onNavigate.mockClear();
    await user.keyboard("{Control>}");
    await user.click(screen.getByRole("link", { name: "HACHI INVEST S.R.L." }));
    await user.keyboard("{/Control}");
    expect(onNavigate).not.toHaveBeenCalled();
  });
});
