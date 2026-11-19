import { vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderInUi } from "../../../testing/render.tsx";
import { leadership, leadershipCopy, leadershipVia, leadershipWithGaps } from "../../samples/leadership.ts";
import type { Locale } from "../../../theme/index.ts";
import type { LeadershipData } from "../../types.ts";
import { LeadershipSection } from "./index.ts";

const show = (data: LeadershipData, locale: Locale = "en", onNavigate?: (href: string) => void, busy?: boolean) =>
  renderInUi(<LeadershipSection leadership={data} authorityHref={(key) => `/explore/authority/${key}`} onNavigate={onNavigate} locale={locale} copy={leadershipCopy[locale]} busy={busy} />, locale);

describe("LeadershipSection", () => {
  it("marks its body aria-busy while the held answer refreshes, the header at full strength", () => {
    show(leadership, "en", undefined, true);
    const region = screen.getByRole("region", { name: "Leadership list" });
    expect(region.querySelector("[aria-busy='true']")).not.toBeNull();
    expect(region.querySelector("[data-panel-part='header']")).not.toHaveAttribute("aria-busy");
  });

  it("lists each mandate with the leader, the list as registered, the dates and the basis, under the caveat that the leader may have switched party", () => {
    show(leadership);
    const region = within(screen.getByRole("region", { name: "Leadership list" }));
    expect(region.getByText(/may have switched party since/)).toBeVisible();
    const table = within(region.getByRole("table", { name: "Mandates" }));
    expect(table.getAllByRole("columnheader").map((h) => h.textContent)).toEqual(["Leader", "List (as registered)", "Period", "Basis"]);
    const rows = table.getAllByRole("row").slice(1);
    expect(within(rows[0]!).getAllByRole("cell").map((c) => c.textContent)).toEqual(["POPESCU ION", "PARTIDUL SOCIAL DEMOCRAT", "27 October 2020 – 27 September 2024", "AEP final minutes, election of 27 September 2020"]);
    expect(within(rows[1]!).getAllByRole("cell").map((c) => c.textContent)).toEqual(["POPESCU ION", "PARTIDUL NAȚIONAL LIBERAL", "27 October 2024 – in force", "AEP final minutes, election of 9 June 2024"]);
    expect(region.queryByRole("link")).toBeNull(); // leaders are never linked
  });

  it("sets an open mandate's \"in force\" as a Tag after the start date, not as part of the period text", () => {
    show(leadership);
    const region = within(screen.getByRole("region", { name: "Leadership list" }));
    const tag = region.getByText("in force");
    expect(tag.tagName).toBe("SPAN");
    expect(tag).toHaveStyle({ borderStyle: "solid" });
    expect(tag.parentElement).toHaveTextContent("27 October 2024 – in force");
    expect(region.getAllByText("in force")).toHaveLength(1);
  });

  it("shows the gaps as gaps, and an independent, an alliance's members and a partial election with their wording", () => {
    show(leadershipWithGaps);
    const region = within(screen.getByRole("region", { name: "Leadership list" }));
    expect(region.getByText(/alliance; member parties: PARTIDUL USR, PARTIDUL LIBERTATE/)).toBeVisible();
    expect(region.getByText(/Independent \(not a party\) · AEP final minutes/)).toBeVisible();
    expect(region.getByText(/partial counts from a one-off file.*data through 9 December 2025/)).toBeVisible();
    expect(region.getByText("Gaps (no Mandate, never guessed)")).toBeVisible();
    // the gaps are the panel's foot, after the table
    expect(region.getByRole("table", { name: "Mandates" }).compareDocumentPosition(region.getByText("Gaps (no Mandate, never guessed)")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(region.getByText(/Handover window: the previous mandates ended and/)).toBeVisible();
    expect(region.getByText(/Interim leader after a vacancy/)).toBeVisible();
    expect(region.getByText(/Mandate without results/)).toBeVisible();
  });

  it("shows a subordinate body its authority's list with the basis of the tie and a link to the authority", async () => {
    const onNavigate = vi.fn();
    show(leadershipVia, "en", onNavigate);
    const region = within(screen.getByRole("region", { name: "Leadership list" }));
    expect(region.getByText(/Shown through/)).toHaveTextContent("Shown through MUNICIPIUL BRASOV, principal credit holder, MF list snapshot 1 December 2026; funding relation, current tie.");
    await userEvent.click(region.getByRole("link", { name: "MUNICIPIUL BRASOV" }));
    expect(onNavigate).toHaveBeenCalledWith("/explore/authority/51000501");
  });

  it("is the same in Romanian", () => {
    show(leadershipVia, "ro");
    const region = within(screen.getByRole("region", { name: "Lista conducerii" }));
    expect(region.getByText(/și-a schimbat partidul|schimbat partidul/)).toBeVisible();
    expect(region.getByText(/Afișată prin/)).toHaveTextContent("Afișată prin MUNICIPIUL BRASOV, ordonator principal de credite, lista MF din 1 decembrie 2026; relație de finanțare, legătură actuală.");
    expect(region.getByText(/Fereastra de predare/)).toBeVisible();
    expect(region.getByText("în funcție")).toBeVisible();
    expect(region.getByText("în funcție").parentElement).toHaveTextContent("27 octombrie 2024 – în funcție");
  });
});
