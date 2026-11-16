// Seam 3: the Record page's first load (skeletons with real labels), its refetch (the last Record kept, dimmed, `aria-busy`) and its failure (one error note
// with its retry in a panel in the body). EN and /ro/. The held request waits on a promise so the pending state can be read.
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { recordedRecordPage } from "@grivei/contract/fixtures";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "../../App.tsx";
import { catalogue } from "../../copy/index.ts";
import type { GraphqlClient } from "../../graphql/client.ts";
import { navigate } from "../../routing/location.tsx";
import { fixtureClient } from "../../testing/fixtureClient.ts";
import { openAt } from "../../testing/openAt.ts";

afterEach(() => openAt("/"));

const recorded = (name: string) => {
  const found = recordedRecordPage.find((f) => f.name === name)?.data.seap.record;
  if (!found) throw new Error(`no recorded RecordPage ${name}`);
  return found;
};

/** The fixture network where the first RecordPage request fails and every later one is answered. */
function failFirst() {
  const real = fixtureClient();
  let calls = 0;
  const client: GraphqlClient = {
    query: async (op, variables, options) => {
      if (++calls === 1) throw new Error("HTTP 500");
      return real.client.query(op, variables, options);
    },
  };
  return { client, sent: real.sent };
}

/** The fixture network where the request number `n` (1-based) waits for `release()`. */
function holdNth(n: number) {
  const real = fixtureClient();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  let calls = 0;
  const client: GraphqlClient = {
    query: async (op, variables, options) => {
      if (++calls === n) await gate;
      return real.client.query(op, variables, options);
    },
  };
  return { client, release: () => release() };
}

describe.each([
  { locale: "en", base: "/explore" },
  { locale: "ro", base: "/ro/explore" },
] as const)("the Record page's states at $base", ({ locale, base }) => {
  const t = catalogue[locale];
  const path = (code: string) => `${base}/record/${encodeURIComponent(code)}`;
  const record = recorded("contract-single-winner");

  it("first load: skeletons shaped like the page, the panel titles and figure labels real, one status line", async () => {
    openAt(path(record.code));
    const { client, release } = holdNth(1);
    const { container } = render(<App client={client} />);
    const value = screen.getByRole("region", { name: t.recordPage.value.heading });
    expect(within(value).getByText(t.recordPage.value.published)).toBeVisible();
    expect(within(value).getByText(t.recordPage.value.counted)).toBeVisible();
    expect(screen.getByRole("region", { name: t.recordPage.parties.winners })).toBeVisible();
    expect(screen.getByRole("region", { name: t.recordPage.heading.panel })).toBeVisible();
    expect(within(value).getByRole("status")).toHaveTextContent(t.status.loading);
    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(container.querySelectorAll(".MuiSkeleton-root").length).toBeGreaterThan(5);
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
    expect(container.querySelector("[aria-busy]")).toBeNull(); // nothing held yet: this is not a refetch

    act(() => release());
    expect(await screen.findByRole("heading", { level: 1, name: record.title })).toBeVisible();
    expect(screen.queryByText(t.status.loading)).toBeNull();
    expect(container.querySelector(".MuiSkeleton-root")).toBeNull();
  });

  it("a failed request is one error note with Try again in a panel in the body, and pressing it shows the Record", async () => {
    openAt(path(record.code));
    const { client, sent } = failFirst();
    render(<App client={client} />);
    const alert = await screen.findByRole("alert");
    const panel = screen.getByRole("region", { name: t.recordPage.heading.panel });
    expect(within(panel).getByRole("alert")).toBe(alert);
    expect(alert).toHaveTextContent(t.status.failed);
    expect(screen.getAllByRole("button", { name: t.status.retry })).toHaveLength(1);

    await userEvent.setup().click(within(panel).getByRole("button", { name: t.status.retry }));
    expect(await screen.findByRole("heading", { level: 1, name: record.title })).toBeVisible();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(sent.map((s) => s.variables)).toEqual([{ code: record.code }]);
  });

  it("a click to another Record keeps the last one, dimmed and aria-busy, with the status line, until the next lands", async () => {
    openAt(path("CAN9800001~1"));
    const { client, release } = holdNth(2);
    const { container } = render(<App client={client} />);
    const first = recorded("framework-agreement");
    await screen.findByRole("heading", { level: 1, name: first.title });
    expect(container.querySelector("[aria-busy]")).toBeNull();

    act(() => navigate(path("CAN9800001~2"), "push"));
    // the held Record stays: its title, its panels' bodies dimmed, the header strips and the status line at full strength
    expect(screen.getByRole("heading", { level: 1, name: first.title })).toBeVisible();
    const headingBlock = screen.getByRole("heading", { level: 1, name: first.title }).closest("header")!;
    expect(headingBlock).toHaveAttribute("aria-busy", "true");
    expect(headingBlock).toHaveStyle({ opacity: "0.6" });
    const value = screen.getByRole("region", { name: t.recordPage.value.heading });
    const body = value.querySelector("[data-panel-part=body]")!;
    expect(body).toHaveAttribute("aria-busy", "true");
    expect(body).toHaveStyle({ opacity: "0.6" });
    expect(value.querySelector("[data-panel-part=header]")).toHaveStyle({ opacity: "1" });
    expect(within(value).getByRole("status")).toHaveTextContent(t.status.loading);
    expect(within(value.querySelector("[data-panel-part=header]") as HTMLElement).getByRole("status")).toBeVisible();
    expect(container.querySelector(".MuiSkeleton-root")).toBeNull();

    act(() => release());
    const next = recorded("subsequent-contract");
    expect(await screen.findByRole("heading", { level: 1, name: next.title })).toBeVisible();
    await waitFor(() => expect(container.querySelector("[aria-busy]")).toBeNull());
    expect(screen.queryByText(t.status.loading)).toBeNull();
  });
});
