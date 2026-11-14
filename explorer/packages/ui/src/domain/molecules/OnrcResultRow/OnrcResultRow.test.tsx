import { fixtures } from "@grivei/contract/fixtures";
import { screen, within } from "@testing-library/react";
import { renderInUi } from "../../../testing/render.tsx";
import { sampleOnrcCopy } from "../../samples/onrcCopy.ts";
import type { OnrcResultData } from "../../types.ts";
import { OnrcResultRow } from "./index.ts";

const [alfa, beta] = fixtures.OnrcSearch[0]!.data.onrc.search.organisations.rows as [OnrcResultData, OnrcResultData];
const [zeta, , legacy] = fixtures.OnrcSearch[1]!.data.onrc.search.organisations.rows as [OnrcResultData, OnrcResultData, OnrcResultData];

const renderRow = (row: OnrcResultData, locale: "en" | "ro" = "en", href?: string) =>
  renderInUi(<ul><OnrcResultRow row={row} {...(href ? { href } : {})} locale={locale} copy={sampleOnrcCopy.row(locale)} /></ul>, locale);

describe("OnrcResultRow", () => {
  it("shows the name as a link to the entity page, the meta line, every status as published, CAEN codes and the SEAP counterparty chip", () => {
    renderRow(alfa, "en", "/explore/supplier/3100020");
    const item = screen.getByRole("listitem");
    expect(within(item).getByRole("link")).toHaveAttribute("href", "/explore/supplier/3100020");
    expect(item).toHaveTextContent("Reg. no. J40/1001/2015 · CUI 3100020 · SRL · registered 10 March 2015 · Cluj-Napoca, Cluj");
    expect(within(item).getByText("funcțiune")).toBeVisible();
    expect(within(item).getByText("insolvență")).toBeVisible();
    expect(item).toHaveTextContent("CAEN 4120, 4211");
    expect(within(item).getByText("SEAP counterparty")).toBeVisible();
    expect(item.querySelector("mark")).toHaveTextContent("ALFA");
  });

  it("names the field of an earlier-name hit and highlights it", () => {
    renderRow(beta, "en");
    expect(screen.getByRole("listitem")).toHaveTextContent("Matched in earlier name: BETA VECHI SRL");
    expect(screen.getByRole("listitem").querySelector("mark")).toHaveTextContent("VECHI");
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("says so for a registration with no date, in Romanian", () => {
    renderRow(legacy, "ro");
    expect(screen.getByRole("listitem")).toHaveTextContent("data înmatriculării nu apare în extrasul citit");
  });

  it("says so for a registration with no county, and names a status the nomenclature does not", () => {
    renderRow(zeta, "ro");
    expect(screen.getByRole("listitem")).toHaveTextContent("fără județ");
    expect(screen.getByRole("listitem")).toHaveTextContent("bilanțul anual nedepus la registrul comerțului");
  });
});
