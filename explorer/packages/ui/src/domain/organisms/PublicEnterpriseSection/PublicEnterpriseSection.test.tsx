import { screen, within } from "@testing-library/react";
import { renderInUi } from "../../../testing/render.tsx";
import { publicEnterprise, publicEnterpriseBare, publicEnterpriseCopy } from "../../samples/publicEnterprise.ts";
import type { Locale } from "../../../theme/index.ts";
import type { PublicEnterpriseData } from "../../types.ts";
import { PublicEnterpriseSection } from "./index.ts";

const show = (enterprise: PublicEnterpriseData, locale: Locale = "en") =>
  renderInUi(<PublicEnterpriseSection enterprise={enterprise} cui="2000007" locale={locale} copy={publicEnterpriseCopy[locale]} />, locale);

describe("PublicEnterpriseSection", () => {
  it("names the mark and its basis: the CUI, the day AMEPIP published the list, AMEPIP's row and where it came from", () => {
    show(publicEnterprise);
    const region = within(screen.getByRole("region", { name: "Public enterprise (AMEPIP)" }));
    expect(region.getByRole("heading", { name: "Public enterprise (AMEPIP)" })).toBeVisible();
    expect(region.getByText("CUI 2000007 appears in AMEPIP's indicator tables of public enterprises under OUG 109/2011, published 13 January 2026, for the financial years shown below. The match is by CUI.")).toBeVisible();
    expect(region.getByText("ALFA DEMO SRL")).toBeVisible();
    expect(region.getByText("J40/1/2005")).toBeVisible();
    expect(region.getByText("funcţiune")).toBeVisible(); // AMEPIP's wording, as published
    expect(region.getByText("Financial years 2022–2023")).toBeVisible();
    expect(region.getByRole("link", { name: "AMEPIP's indicator tables on data.gov.ro" })).toHaveAttribute("href", "https://data.gov.ro/dataset/amepip-indicatori-financiari-demo");
    expect(region.getByText(/Fetched 14 November 2026 from data.gov.ro, licence CC-BY-4.0/)).toBeVisible();
  });

  it("is the same in Romanian, with AMEPIP's own words left as they are", () => {
    show(publicEnterprise, "ro");
    expect(screen.getByRole("heading", { name: "Întreprindere publică (AMEPIP)" })).toBeVisible();
    expect(screen.getByText("CUI 2000007 apare în tabelele de indicatori AMEPIP ale întreprinderilor publice din OUG 109/2011, publicate la 13 ianuarie 2026, pentru anii financiari afișați mai jos. Potrivirea se face după CUI.")).toBeVisible();
    expect(screen.getByText("funcţiune")).toBeVisible();
    expect(screen.getByText("Anii financiari 2022–2023")).toBeVisible();
  });

  it("leaves out what AMEPIP's row does not give", () => {
    show(publicEnterpriseBare);
    expect(screen.queryByText("Registration number")).not.toBeInTheDocument();
    expect(screen.queryByText(/ONRC status/)).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText("Financial year 2023")).toBeVisible();
    expect(screen.getByText(/Fetched 14 November 2026 from data.gov.ro$/)).toBeVisible();
  });
});
