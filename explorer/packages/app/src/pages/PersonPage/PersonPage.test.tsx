// Seam 3 for the person page (#177, Restricted): the page rendered from the contract's PersonPage fixtures. A host that hides Restricted content answers null.
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "../../App.tsx";
import { fixtureClient } from "../../testing/fixtureClient.ts";
import { openAt } from "../../testing/openAt.ts";

const PERSON = "0123456789abcdef0123456789abcdef";

function open(url: string) {
  openAt(url);
  const { client, sent } = fixtureClient();
  render(<App client={client} />);
  return sent;
}

describe("the person page", () => {
  it("shows the name, the birth year and the roles across organisations, and says it is a Private view", async () => {
    const sent = open(`/explore/person/${PERSON}`);
    expect(await screen.findByRole("heading", { level: 1, name: "POPESCU ION" })).toBeVisible();
    expect(sent.at(0)).toMatchObject({ operation: "PersonPage", variables: { id: PERSON } });
    expect(screen.getByText("born 1975")).toBeVisible();
    expect(screen.getByRole("note")).toHaveTextContent(/Private view/);
    const roles = within(screen.getByRole("region", { name: "Roles" }));
    expect(roles.getByText("Roles · 3 roles")).toBeVisible();
    expect(roles.getByRole("link", { name: "ALFA SRL" })).toHaveAttribute("href", "/explore/supplier/30000002");
    expect(roles.getByRole("link", { name: "BETA SRL" })).toHaveAttribute("href", "/explore/authority/30000003");
    expect(roles.getByText("administrator · no organisation page")).toBeVisible();
  });

  it("follows an organisation's link without a page load", async () => {
    open(`/explore/person/${PERSON}`);
    await userEvent.click(await screen.findByRole("link", { name: "ALFA SRL" }));
    expect(window.location.pathname).toBe("/explore/supplier/30000002");
  });

  it("says the page is not available when the host answers null (the switch is not `show`, or no person has the id), the same for both", async () => {
    open("/explore/person/ffffffffffffffffffffffffffffffff");
    expect(await screen.findByRole("heading", { level: 1, name: "Person page not available" })).toBeVisible();
    expect(screen.getByText(/shown only in a Private view/)).toBeVisible();
    expect(screen.getByRole("link", { name: "Back to the main screen" })).toBeVisible();
  });

  it("is in Romanian under /ro/", async () => {
    open(`/ro/explore/person/${PERSON}`);
    expect(await screen.findByRole("heading", { level: 1, name: "POPESCU ION" })).toBeVisible();
    expect(screen.getByText("născut în 1975")).toBeVisible();
    expect(screen.getByText("Roluri · 3 roluri")).toBeVisible();
  });

  it("shows the error state when the request fails", async () => {
    openAt(`/explore/person/${PERSON}`);
    render(<App client={fixtureClient({ failing: ["PersonPage"] }).client} />);
    expect(await screen.findByRole("alert")).toBeVisible();
  });
});
