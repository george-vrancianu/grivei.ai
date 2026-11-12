import { screen } from "@testing-library/react";
import { renderInUi } from "../../../testing/render.tsx";
import { sampleCopy } from "../../samples/copy.ts";
import { EntityLink } from "./index.ts";

const copy = sampleCopy.entityLink("en");
const company = { key: "30000001", displayName: "HACHI INVEST S.R.L.", identity: "CUI" as const };

describe("EntityLink", () => {
  it("links the display name to the caller's href", () => {
    renderInUi(<EntityLink entity={company} href="/explore/supplier/30000001" copy={copy} />);
    expect(screen.getByRole("link", { name: "HACHI INVEST S.R.L." })).toHaveAttribute("href", "/explore/supplier/30000001");
  });
  it("has no markers for a CUI entity", () => {
    renderInUi(<EntityLink entity={company} href="/x" copy={copy} />);
    expect(screen.queryByText(copy.nameOnly.label)).toBeNull();
    expect(screen.queryByText(copy.identityCurated.label)).toBeNull();
  });
  it("marks a name-only identity", () => {
    renderInUi(<EntityLink entity={{ ...company, identity: "NAME_ONLY" }} href="/x" copy={copy} />);
    expect(screen.getByText(copy.nameOnly.label)).toBeVisible();
    expect(screen.queryByText(copy.identityCurated.label)).toBeNull();
  });
  it("marks a curated identity, with both markers when it is also name-only", () => {
    renderInUi(<EntityLink entity={{ ...company, identity: "NAME_ONLY" }} identityCurated href="/x" copy={copy} />);
    expect(screen.getByText(copy.nameOnly.label)).toBeVisible();
    expect(screen.getByText(copy.identityCurated.label)).toBeVisible();
  });
  it("keeps the markers out of the link's name", () => {
    renderInUi(<EntityLink entity={{ ...company, identity: "NAME_ONLY" }} identityCurated href="/x" copy={copy} />);
    expect(screen.getByRole("link")).toHaveAccessibleName("HACHI INVEST S.R.L.");
  });
});
