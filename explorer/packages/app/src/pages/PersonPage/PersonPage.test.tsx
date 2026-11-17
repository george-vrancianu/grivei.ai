// Seam 3 for the person page (#177, Restricted): the page rendered from the contract's PersonPage fixtures. A host that hides Restricted content answers null.
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "../../App.tsx";
import { catalogue } from "../../copy/index.ts";
import type { GraphqlClient } from "../../graphql/client.ts";
import { fixtureClient } from "../../testing/fixtureClient.ts";
import { openAt } from "../../testing/openAt.ts";

const PERSON = "0123456789abcdef0123456789abcdef";

function open(url: string) {
  openAt(url);
  const { client, sent } = fixtureClient();
  render(<App client={client} />);
  return sent;
}

afterEach(() => openAt("/"));

/** The fixture network where the first PersonPage request fails and every later one is answered. */
function failFirst() {
  const real = fixtureClient();
  let calls = 0;
  const client: GraphqlClient = {
    query: async (op, variables, options) => {
      if (++calls === 1) throw new Error("HTTP 500");
      return real.client.query(op, variables, options);
    },
  };
  return client;
}

/** The fixture network where the first request waits for `release()`. */
function holdFirst() {
  const real = fixtureClient();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  let calls = 0;
  const client: GraphqlClient = {
    query: async (op, variables, options) => {
      if (++calls === 1) await gate;
      return real.client.query(op, variables, options);
    },
  };
  return { client, release: () => release() };
}

describe.each([
  { locale: "en", base: "/explore" },
  { locale: "ro", base: "/ro/explore" },
] as const)("the person page at $base", ({ locale, base }) => {
  const t = catalogue[locale].personPage;
  const path = `${base}/person/${PERSON}`;
  const date = locale === "en" ? "6 May 2026" : "6 mai 2026";
  const supplierHref = `${locale === "en" ? "" : "/ro"}/explore/supplier/30000002`;
  const authorityHref = `${locale === "en" ? "" : "/ro"}/explore/authority/30000003`;

  it("shows the notice, the breadcrumb, the name and the three figures", async () => {
    openAt(path);
    const { client, sent } = fixtureClient();
    render(<App client={client} />);
    expect(await screen.findByRole("heading", { level: 1, name: "POPESCU ION" })).toBeVisible();
    expect(sent.at(0)).toMatchObject({ operation: "PersonPage", variables: { id: PERSON } });
    expect(screen.getAllByRole("note")).toHaveLength(1);
    expect(screen.getByRole("note")).toHaveTextContent(t.privateView.lead);
    const crumb = screen.getByRole("navigation", { name: t.breadcrumb.label });
    expect(within(crumb).getByRole("link", { name: t.breadcrumb.home })).toHaveAttribute("href", locale === "en" ? "/explore/" : "/ro/explore/");
    expect(crumb).toHaveTextContent(t.breadcrumb.current);
    const header = within(within(screen.getByRole("main")).getByRole("banner"));
    expect(header.getByText(t.figures.born).parentElement).toHaveTextContent(`${t.figures.born} 1975`);
    expect(header.getByText(t.figures.roles).parentElement).toHaveTextContent(`${t.figures.roles} 3`);
    expect(header.getByText(t.figures.source).parentElement).toHaveTextContent(`${t.figures.source} ONRC ${t.figures.snapshot(date)}`);
  });

  it("lists the roles: links with their key line, the role as a tag, a plain row with no page, the basis and the source", async () => {
    openAt(path);
    render(<App client={fixtureClient().client} />);
    await screen.findByRole("heading", { level: 1, name: "POPESCU ION" });
    const roles = within(screen.getByRole("region", { name: t.rolesHeading }));
    expect(roles.getByText(t.roleCount(3))).toBeVisible();
    expect(roles.getByRole("link", { name: "ALFA SRL" })).toHaveAttribute("href", supplierHref);
    expect(roles.getByRole("link", { name: "BETA SRL" })).toHaveAttribute("href", authorityHref);
    expect(roles.getByText(t.keyLine("30000002", "SUPPLIER"))).toBeVisible();
    expect(roles.getByText(t.keyLine("30000003", "AUTHORITY"))).toBeVisible();
    const rows = roles.getAllByRole("listitem");
    expect(rows).toHaveLength(3);
    expect(within(rows[0]!).getByText("administrator")).toBeVisible();
    expect(within(rows[1]!).getByText("reprezentant legal")).toBeVisible();
    expect(within(rows[2]!).getByText("FARA CUI SRL")).toBeVisible();
    expect(within(rows[2]!).getByText(t.noPage)).toBeVisible();
    expect(within(rows[2]!).queryByRole("link")).toBeNull();
    expect(roles.getByText(t.basis)).toBeVisible();
    expect(roles.getByText(t.source(date), { exact: false })).toBeVisible();
  });

  it("first load: the notice, breadcrumb and labels are real, the values are blocks, one status line", async () => {
    openAt(path);
    const { client, release } = holdFirst();
    const { container } = render(<App client={client} />);
    expect(screen.getAllByRole("note")).toHaveLength(1);
    expect(screen.getByRole("navigation", { name: t.breadcrumb.label })).toBeVisible();
    for (const label of [t.figures.born, t.figures.roles, t.figures.source]) expect(screen.getByText(label, { selector: "span" })).toBeVisible();
    const roles = screen.getByRole("region", { name: t.rolesHeading });
    expect(within(roles).getByRole("status")).toHaveTextContent(catalogue[locale].status.loading);
    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(container.querySelectorAll(".MuiSkeleton-root").length).toBeGreaterThan(5);
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
    expect(container.querySelector("[aria-busy]")).toBeNull();

    act(() => release());
    expect(await screen.findByRole("heading", { level: 1, name: "POPESCU ION" })).toBeVisible();
    expect(container.querySelector(".MuiSkeleton-root")).toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("a failed request is one error note with a retry in the person panel, under the notice; pressing it shows the person", async () => {
    openAt(path);
    render(<App client={failFirst()} />);
    const alert = await screen.findByRole("alert");
    expect(within(within(screen.getByRole("main")).getByRole("banner")).getByRole("alert")).toBe(alert);
    expect(alert).toHaveTextContent(catalogue[locale].status.failed);
    expect(screen.getAllByRole("note")).toHaveLength(1);
    expect(screen.getByRole("navigation", { name: t.breadcrumb.label })).toBeVisible();
    expect(screen.getAllByRole("button", { name: catalogue[locale].status.retry })).toHaveLength(1);

    await userEvent.setup().click(screen.getByRole("button", { name: catalogue[locale].status.retry }));
    expect(await screen.findByRole("heading", { level: 1, name: "POPESCU ION" })).toBeVisible();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("follows an organisation's link without a page load", async () => {
    openAt(path);
    render(<App client={fixtureClient().client} />);
    await userEvent.setup().click(await screen.findByRole("link", { name: "ALFA SRL" }));
    expect(window.location.pathname).toBe(supplierHref);
  });
});

describe("the person page, not available", () => {
  it("says the page is not available when the host answers null (the switch is not `show`, or no person has the id), the same for both", async () => {
    open("/explore/person/ffffffffffffffffffffffffffffffff");
    expect(await screen.findByRole("heading", { level: 1, name: "Person page not available" })).toBeVisible();
    expect(screen.getByText(/shown only in a Private view/)).toBeVisible();
    expect(screen.getByRole("link", { name: "Back to the main screen" })).toBeVisible();
  });
});
