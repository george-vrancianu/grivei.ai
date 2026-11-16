// Seam 3: a framework's subsequent contracts panel on the Record page, over the API's recorded framework-count cases (51, 50 and 49 subsequent
// contracts; ticket #254): five by value, "Show all" expanding in place, and over the fetch limit the foot and the link to the authority's Records tab. EN and /ro/.
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { recordedRecordPage } from "@grivei/contract/fixtures";
import { describe, expect, it, vi } from "vitest";

// 50 Record rows render and re-render on each click: more than the default 5 s on a loaded machine
vi.setConfig({ testTimeout: 30000 });
import { App } from "../../App.tsx";
import { catalogue } from "../../copy/index.ts";
import { fixtureClient } from "../../testing/fixtureClient.ts";
import { openAt } from "../../testing/openAt.ts";
import { sentence } from "../../testing/sentence.ts";

const recorded = (name: string) => {
  const found = recordedRecordPage.find((f) => f.name === name)?.data.seap.record;
  if (!found) throw new Error(`no recorded RecordPage ${name}`);
  return found;
};

async function openCase(name: string, base: string) {
  const record = recorded(name);
  openAt(`${base}/record/${encodeURIComponent(record.code)}`);
  render(<App client={fixtureClient().client} />);
  await screen.findByRole("heading", { level: 1, name: record.title });
  return record;
}

describe.each([
  { locale: "en", base: "/explore" },
  { locale: "ro", base: "/ro/explore" },
] as const)("the subsequent contracts panel at $base", ({ locale, base }) => {
  const t = catalogue[locale].recordPage.framework;
  const panel = () => within(screen.getByRole("region", { name: t.subsequentHeading }));
  const rows = () => panel().getAllByRole("listitem");
  const f = (n: number) => String(n);

  it("over 50: the count and sum in the header, five rows, then 50 on request, the foot saying how many are cut and the link to the Records tab", async () => {
    const record = await openCase("framework-count-over-50", base);
    const subsequent = record.framework!.subsequent;
    expect(record.framework!.subsequentCount).toBe(51);
    expect(subsequent).toHaveLength(50);
    expect(panel().getByText(sentence(new RegExp(`^${locale === "en" ? "51 contracts" : "51 de contracte"} · `)))).toBeVisible();
    expect(rows()).toHaveLength(5);
    for (const row of subsequent.slice(0, 5)) expect(panel().getByRole("link", { name: row.title })).toHaveAttribute("href", `${base}/record/${encodeURIComponent(row.code)}`);
    expect(panel().getByText(t.shown(f(5), f(51)))).toBeVisible();

    await userEvent.setup().click(panel().getByRole("button", { name: t.showFirst(50, f(50)) }));
    expect(rows()).toHaveLength(50);
    expect(panel().getByText(t.shown(f(50), f(51)))).toBeVisible();
    expect(panel().getByText(locale === "en" ? "50 of 51 shown, by value" : "50 din 51 afișate, după valoare")).toBeVisible();

    // the authority's Records tab, narrowed to the subsequent contracts of this framework: the badge and the notice code as the search
    const link = panel().getByRole("link", { name: t.moreLink });
    const url = new URL(link.getAttribute("href")!, "http://x");
    expect(url.pathname).toBe(`${base}/authority/${record.authority.key}/records`);
    expect(url.searchParams.get("q")).toBe("CAN9830001");
    expect(url.searchParams.getAll("badges")).toHaveLength(1);
    expect(url.searchParams.get("badges")).toMatch(/subsequent/i);
  });

  it("the framework's own subsequent contract shows the same list and the same link", async () => {
    await openCase("framework-count-over-50-subsequent", base);
    expect(panel().getByText(t.shown(f(5), f(51)))).toBeVisible();
    expect(new URL(panel().getByRole("link", { name: t.moreLink }).getAttribute("href")!, "http://x").searchParams.get("q")).toBe("CAN9830001");
  });

  it("exactly 50: every contract is in the list, so there is no link to the Records tab", async () => {
    await openCase("framework-count-50", base);
    await userEvent.setup().click(panel().getByRole("button", { name: t.showAll(50, f(50)) }));
    expect(rows()).toHaveLength(50);
    expect(panel().getByText(t.shown(f(50), f(50)))).toBeVisible();
    expect(panel().queryByRole("link", { name: t.moreLink })).toBeNull();
  });

  it("49: 'Show all' expands in place to 49 and 'Show fewer' folds it back", async () => {
    await openCase("framework-count-49", base);
    const user = userEvent.setup();
    expect(rows()).toHaveLength(5);
    expect(panel().queryByRole("link", { name: t.moreLink })).toBeNull();
    const button = panel().getByRole("button", { name: t.showAll(49, f(49)) });
    expect(button).toHaveAttribute("aria-expanded", "false");
    await user.click(button);
    expect(rows()).toHaveLength(49);
    expect(panel().getByRole("button", { name: t.showFewer })).toHaveAttribute("aria-expanded", "true");
    await user.click(panel().getByRole("button", { name: t.showFewer }));
    expect(rows()).toHaveLength(5);
  });

  it("five rows or fewer: no foot at all", async () => {
    await openCase("framework-agreement", base);
    expect(rows()).toHaveLength(2);
    expect(panel().queryByRole("button")).toBeNull();
    expect(panel().queryByText(t.shown(f(2), f(2)))).toBeNull();
  });

  it("a Record that is not a framework has no subsequent contracts panel", async () => {
    await openCase("direct-purchase-counted", base);
    expect(screen.queryByRole("region", { name: t.subsequentHeading })).toBeNull();
  });
});
