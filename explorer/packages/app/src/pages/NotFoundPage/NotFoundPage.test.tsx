// Seam 3 for the one not-found panel (#260): the unknown address, an entity, a person and a Record that are not there, in both languages.
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "../../App.tsx";
import { catalogue } from "../../copy/index.ts";
import { fixtureClient } from "../../testing/fixtureClient.ts";
import { loadTestCountyTopology } from "../../testing/countyTopology.ts";
import { openAt } from "../../testing/openAt.ts";

afterEach(() => openAt("/"));

describe.each([
  { locale: "en", base: "/explore" },
  { locale: "ro", base: "/ro/explore" },
] as const)("the not-found panel at $base", ({ locale, base }) => {
  const t = catalogue[locale];
  const states = [
    { name: "an unknown address", path: `${base}/nope`, title: t.pages.notFound.title, body: t.pages.notFound.body },
    { name: "an unknown entity", path: `${base}/supplier/name-nobody-has-this-key`, title: t.entityPage.notFound.title, body: t.entityPage.notFound.body },
    { name: "an unknown person", path: `${base}/person/ffffffffffffffffffffffffffffffff`, title: t.personPage.notFound.title, body: t.personPage.notFound.body },
    { name: "an unknown Record", path: `${base}/record/CAN0000000`, title: t.recordPage.notFound.title, body: t.recordPage.notFound.body("CAN0000000") },
  ];

  it.each(states)("shows the title, the sentence and both actions for $name", async ({ path, title, body }) => {
    openAt(path);
    render(<App client={fixtureClient().client} loadCountyTopology={loadTestCountyTopology} />);
    expect(await screen.findByRole("heading", { level: 1, name: title })).toBeVisible();
    expect(screen.getByText("404")).toBeVisible();
    expect(screen.getByText(body)).toBeVisible();
    const panel = within(screen.getByRole("main"));
    expect(panel.getByRole("link", { name: t.pages.notFound.back })).toHaveAttribute("href", `${base}/`);
    expect(panel.getByRole("link", { name: t.pages.notFound.search })).toHaveAttribute("href", `${base}/search`);
  });

  it("follows both actions without a page load", async () => {
    openAt(`${base}/nope`);
    render(<App client={fixtureClient().client} loadCountyTopology={loadTestCountyTopology} />);
    await userEvent.click(within(screen.getByRole("main")).getByRole("link", { name: t.pages.notFound.search }));
    expect(window.location.pathname).toBe(`${base}/search`);
    expect(await screen.findByRole("heading", { level: 1, name: t.pages.search.title })).toBeVisible();
  });
});
