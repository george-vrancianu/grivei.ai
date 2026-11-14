// Seam 3 for ONRC's people (#177): the entity pages rendered from the API's recorded answers over `archive-onrc-people` (a public host: Restricted content hidden)
// and from the hand fixtures that carry a Private view's person links (the host's switch is `show`).
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "../../App.tsx";
import { fixtureClient } from "../../testing/fixtureClient.ts";
import { openAt } from "../../testing/openAt.ts";

async function opened(url: string) {
  openAt(url);
  render(<App client={fixtureClient().client} />);
  await screen.findByRole("heading", { level: 1 });
}
const people = () => screen.findByRole("region", { name: /^(Administrators and legal representatives|Administratori și reprezentanți legali)$/ }).then(within);

describe("the administrators of a SEAP counterparty (public tier)", () => {
  it("lists name, role and birth year with the snapshot as basis, and links no one to a person page", async () => {
    await opened("/explore/supplier/3100020?signalOrder=value-desc");
    const section = await people();
    expect(section.getByText("POPESCU ION")).toBeVisible();
    expect(section.getByText("administrator · born 1975")).toBeVisible();
    expect(section.getByText("administrator · born 1980")).toBeVisible();
    expect(section.queryByText(/RADU/)).toBeNull(); // a possible match is never served
    expect(section.getByRole("link", { name: "Source: ONRC, snapshot of 6 May 2026" })).toBeVisible();
    expect(section.queryAllByRole("link").filter((l) => /person/.test(l.getAttribute("href") ?? ""))).toEqual([]);
  });

  it("shows a holder with no birth date as an unlinked role holder", async () => {
    await opened("/explore/supplier/3100055?signalOrder=value-desc");
    expect((await people()).getByText(/administrator · no birth date in ONRC: listed on this page only, linked to no one/)).toBeVisible();
  });

  it("names no one for an organisation that exists only in ONRC", async () => {
    await opened("/explore/supplier/3100071?signalOrder=value-desc");
    expect(screen.queryByRole("region", { name: "Administrators and legal representatives" })).toBeNull();
    expect(screen.getByText(/No person of it is shown/)).toBeVisible();
  });

  it.each([["a PFA", "3100110"], ["an IF", "3100128"]])("lists no holder of %s", async (_name, key) => {
    await opened(`/explore/supplier/${key}?signalOrder=value-desc`);
    expect((await people()).getByText("ONRC lists no administrator or legal representative for this organisation.")).toBeVisible();
  });

  it("is in Romanian under /ro/", async () => {
    await opened("/ro/explore/supplier/3100020?signalOrder=value-desc");
    expect((await people()).getByText("administrator · anul nașterii 1975")).toBeVisible();
  });
});

describe("in a Private view", () => {
  it("links each linked administrator to a person page, and never an unlinked role holder", async () => {
    await opened("/explore/supplier/30000001?from=2019-01-01");
    const section = await people();
    expect(section.getByRole("link", { name: "POPESCU ION: person page" })).toHaveAttribute("href", "/explore/person/0123456789abcdef0123456789abcdef");
    expect(section.getByRole("link", { name: "IONESCU MARIA: person page" })).toBeVisible();
    expect(section.queryByRole("link", { name: /NEGRU TUDOR/ })).toBeNull();
  });

  it("and links none of them on a public host's answer", async () => {
    await opened("/explore/supplier/30000001?from=2020-01-01");
    expect((await people()).queryByRole("link", { name: /person page/ })).toBeNull();
  });
});
