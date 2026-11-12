import { screen } from "@testing-library/react";
import { renderInUi } from "../../../testing/render.tsx";
import { sampleCopy } from "../../samples/copy.ts";
import { cuiParty, naturalPersonParty } from "../../samples/fixtureData.ts";
import { PartyName } from "./index.ts";

const copy = sampleCopy.party("ro");
const hrefOf = (entity: { key: string }) => `/explore/supplier/${entity.key}`;

describe("PartyName", () => {
  it("links a company winner to its entity page", () => {
    renderInUi(<PartyName party={cuiParty} entityHref={hrefOf} copy={copy} />);
    expect(screen.getByRole("link", { name: cuiParty.entity!.displayName })).toHaveAttribute("href", hrefOf(cuiParty.entity!));
  });
  it("renders a natural person as Persoană fizică with no link", () => {
    const { container } = renderInUi(<PartyName party={naturalPersonParty} entityHref={hrefOf} copy={copy} />);
    expect(container).toHaveTextContent("Persoană fizică");
    expect(screen.queryByRole("link")).toBeNull();
    expect(container.querySelector("a")).toBeNull();
  });
  it("never shows a published name for a natural person, even if the payload carries one", () => {
    const leaked = { ...naturalPersonParty, publishedName: "Ionescu Vasile" };
    const { container } = renderInUi(<PartyName party={leaked} entityHref={hrefOf} copy={copy} />);
    expect(container).toHaveTextContent(/^Persoană fizică$/);
    expect(screen.queryByText(/Ionescu/)).toBeNull();
  });
  it("does not even resolve an href for a natural person that carries an entity", () => {
    const odd = { ...naturalPersonParty, entity: cuiParty.entity };
    const { container } = renderInUi(<PartyName party={odd} entityHref={() => { throw new Error("linked"); }} copy={copy} />);
    expect(container).toHaveTextContent(/^Persoană fizică$/);
    expect(container.querySelector("a")).toBeNull();
  });
});
