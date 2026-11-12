import { screen } from "@testing-library/react";
import { vi } from "vitest";
import { renderInUi } from "../../../../../testing/render.tsx";
import { sampleCopy } from "../../../../samples/copy.ts";
import { authorityTypicalRelationships } from "../../../../samples/fixtureData.ts";
import { CounterpartyGraph } from "./index.ts";

const copy = sampleCopy.relationshipsTab("en");
const { entity, counterparties } = authorityTypicalRelationships;

describe("CounterpartyGraph", () => {
  it("marks the picked node pressed and no other", () => {
    renderInUi(<CounterpartyGraph entity={entity} counterparties={counterparties} selected="30000001" onSelect={vi.fn()} locale="en" copy={copy} />);
    const pressed = screen.getAllByRole("button").filter((el) => el.getAttribute("aria-pressed") === "true");
    expect(pressed).toHaveLength(1);
    expect(pressed[0]).toHaveAccessibleName(/^HACHI INVEST S\.R\.L\./);
  });
  it("writes the entity in the centre", () => {
    renderInUi(<CounterpartyGraph entity={entity} counterparties={counterparties} selected={null} onSelect={vi.fn()} locale="en" copy={copy} />);
    expect(screen.getByText("MUNICIPIUL BRAȘOV")).toBeInTheDocument();
  });
});
