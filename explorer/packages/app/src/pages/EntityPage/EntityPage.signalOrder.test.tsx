// Seam 3: the Overview's Signals order toggle, bound to the `signalOrder` URL key. EN and /ro/.
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "../../App.tsx";
import { createClient } from "../../graphql/client.ts";
import { loadTestCountyTopology } from "../../testing/countyTopology.ts";
import { openAt } from "../../testing/openAt.ts";
import { overviewNamed } from "../../testing/signalRecordings.ts";
import allowlist from "@grivei/contract/persisted-queries.json";

// The recorded answers for the hospital's Signals in each order (8 Signals: no archive has more than 20 for one entity); the count is raised to 45
// so there is a second page to start from. Which recording comes back follows the order the page asked for.
function signalsClient() {
  const byDate = overviewNamed("authority-with-signals");
  const byValue = overviewNamed("authority-with-signals-by-value");
  const sent: { variables: Record<string, unknown> }[] = [];
  const client = createClient({
    fetch: async (_url, init) => {
      const { id, variables } = JSON.parse(String(init?.body)) as { id: string; variables: Record<string, unknown> };
      expect(allowlist.operations.find((o) => o.sha256 === id)?.name).toBe("EntityOverview");
      sent.push({ variables });
      const recorded = variables["signalOrder"] === "VALUE_DESC" ? byValue : byDate;
      const entity = recorded.data.entity!;
      const role = entity.seap.role!;
      return Response.json({ data: { entity: { ...entity, seap: { ...entity.seap, role: { ...role, signals: { ...role.signals, count: 45 } } } } } });
    },
  });
  return { client, sent };
}

const cards = () => screen.getAllByRole("article");
const headings = () => cards().map((c) => within(c).getByRole("heading").textContent);

const words = {
  en: { base: "/explore/authority/1000017", group: "Order Signals", date: "by date", ron: "by RON", heading: "Signals (45)", byDate: ["No publication", "No publication", "No publication", "Over cap", "Over cap", "Over cap", "Over cap", "No publication"], byRon: ["Over cap", "No publication", "No publication", "Over cap", "Over cap", "Over cap", "No publication", "No publication"] },
  ro: { base: "/ro/explore/authority/1000017", group: "Ordinea Semnalelor", date: "după dată", ron: "după RON", heading: "Semnale (45)", byDate: ["Fără publicare", "Fără publicare", "Fără publicare", "Peste plafon", "Peste plafon", "Peste plafon", "Peste plafon", "Fără publicare"], byRon: ["Peste plafon", "Fără publicare", "Fără publicare", "Peste plafon", "Peste plafon", "Peste plafon", "Fără publicare", "Fără publicare"] },
} as const;

describe.each(["en", "ro"] as const)("the Signals order toggle (%s)", (lang) => {
  const w = words[lang];
  const open = async (path: string) => {
    openAt(path);
    const { client, sent } = signalsClient();
    render(<App client={client} loadCountyTopology={loadTestCountyTopology} />);
    await screen.findByRole("heading", { name: w.heading });
    return sent;
  };
  const group = () => within(screen.getByRole("group", { name: w.group }));

  it("shows by date selected by default", async () => {
    await open(w.base);
    expect(group().getByRole("button", { name: w.date, pressed: true })).toBeVisible();
    expect(group().getByRole("button", { name: w.ron, pressed: false })).toBeVisible();
    expect(headings()).toEqual(w.byDate);
  });

  it("opens on by RON when the URL says VALUE_DESC", async () => {
    const sent = await open(`${w.base}?signalOrder=value-desc`);
    expect(group().getByRole("button", { name: w.ron, pressed: true })).toBeVisible();
    expect(group().getByRole("button", { name: w.date, pressed: false })).toBeVisible();
    expect(sent[0]!.variables).toMatchObject({ signalOrder: "VALUE_DESC" });
    expect(headings()).toEqual(w.byRon);
  });

  it("choosing by RON puts it in the URL, reorders the cards and returns to page 1", async () => {
    const sent = await open(`${w.base}?page=2`);
    expect(sent[0]!.variables).toMatchObject({ signalOffset: 20 });
    expect(headings()).toEqual(w.byDate);
    await userEvent.setup().click(group().getByRole("button", { name: w.ron }));
    await waitFor(() => expect(headings()).toEqual(w.byRon));
    expect(window.location.search).toBe("?signalOrder=value-desc");
    expect(sent.at(-1)!.variables).toMatchObject({ signalOrder: "VALUE_DESC" });
    expect(sent.at(-1)!.variables).not.toHaveProperty("signalOffset");
    expect(group().getByRole("button", { name: w.ron, pressed: true })).toBeVisible();
    expect(group().getByRole("button", { name: w.date, pressed: false })).toBeVisible();
  });

  it("keeps keyboard focus on the pressed toggle, and the Overview on screen, while the new order loads", async () => {
    await open(w.base);
    const user = userEvent.setup();
    await user.click(group().getByRole("button", { name: w.ron }));
    expect(screen.getByRole("heading", { name: w.heading })).toBeVisible();
    await waitFor(() => expect(headings()).toEqual(w.byRon));
    expect(document.activeElement).toBe(group().getByRole("button", { name: w.ron }));
  });

  it("choosing by date again leaves the order out of the URL (the default) and restores the order", async () => {
    await open(`${w.base}?signalOrder=value-desc`);
    await userEvent.setup().click(group().getByRole("button", { name: w.date }));
    await waitFor(() => expect(headings()).toEqual(w.byDate));
    expect(window.location.search).toBe("");
  });
});
