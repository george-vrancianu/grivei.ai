import { screen, within } from "@testing-library/react";
import { renderInUi } from "../../../../../testing/render.tsx";
import { partyCopy, recordParty, recordPartyIndependent, recordPartyVia } from "../../../../samples/leadership.ts";
import type { Locale } from "../../../../../theme/index.ts";
import type { RecordPartyData } from "../../../../types.ts";
import { PartySection } from "./index.ts";

const show = (party: RecordPartyData, locale: Locale = "en") => renderInUi(<PartySection party={party} authorityHref={(key) => `/explore/authority/${key}`} locale={locale} copy={partyCopy[locale]} />, locale);

describe("PartySection", () => {
  it("shows the list of the mandate in force with its basis and never a leader's name", () => {
    show(recordParty);
    const region = within(screen.getByRole("region", { name: "Party" }));
    expect(region.getByText("PARTIDUL NAȚIONAL LIBERAL")).toBeVisible();
    expect(region.getByText("AEP final minutes, election of 9 June 2024")).toBeVisible();
    expect(region.getByText(/may have switched party since/)).toBeVisible();
    expect(region.queryByRole("link")).toBeNull();
  });

  it("says an independent is not a party", () => {
    show(recordPartyIndependent);
    expect(screen.getByText(/Independent \(not a party\)/)).toBeVisible();
  });

  it("states how a subordinate body inherits it, with a link to the authority, in Romanian too", () => {
    show(recordPartyVia, "ro");
    const region = within(screen.getByRole("region", { name: "Partid" }));
    expect(region.getByText(/^Prin /)).toHaveTextContent("Prin MUNICIPIUL BRASOV, ordonator principal de credite, lista MF din 1 decembrie 2026; relație de finanțare, legătură actuală.");
    expect(region.getByRole("link", { name: "MUNICIPIUL BRASOV" })).toHaveAttribute("href", "/explore/authority/51000501");
  });
});
