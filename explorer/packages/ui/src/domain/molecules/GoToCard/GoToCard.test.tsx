import { screen } from "@testing-library/react";
import { renderInUi } from "../../../testing/render.tsx";
import { sampleCopy } from "../../samples/copy.ts";
import { GoToCard } from "./index.ts";

describe("GoToCard", () => {
  it("shows the entity, its CUI and a link to its page", () => {
    renderInUi(
      <GoToCard entity={{ key: "30000001", displayName: "HACHI INVEST S.R.L.", identity: "CUI" }} href="/explore/supplier/30000001" copy={sampleCopy.goTo("en")} />,
    );
    expect(screen.getByRole("region", { name: "Go to page" })).toHaveTextContent("HACHI INVEST S.R.L.");
    expect(screen.getByText("CUI 30000001")).toBeVisible();
    expect(screen.getByRole("link", { name: "Open the page: HACHI INVEST S.R.L." })).toHaveAttribute("href", "/explore/supplier/30000001");
  });
  it("says so for a name-only entity, in Romanian", () => {
    renderInUi(
      <GoToCard entity={{ key: "name-x", displayName: "MEDTECH GMBH", identity: "NAME_ONLY" }} href="/ro/explore/supplier/name-x" copy={sampleCopy.goTo("ro")} />,
      "ro",
    );
    expect(screen.getByRole("region", { name: "Mergi la pagină" })).toHaveTextContent("identificat doar după denumire");
    expect(screen.getByRole("link", { name: /Deschide pagina/ })).toHaveAttribute("href", "/ro/explore/supplier/name-x");
  });
});
