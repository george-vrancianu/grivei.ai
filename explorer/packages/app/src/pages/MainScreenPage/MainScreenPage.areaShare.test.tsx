// Seam 3 for ticket #103: after a supplier-county click the Record rows reconcile with the Total: a multi-winner Record shows its
// in-county share under the full value, labelled as the consortium share; a single-winner row, or any row on the authority side, shows none.
// The supplier-side Brașov answer is the recorded one (CAN9800001~1: two winners, one in Brașov: 500.01 of 1,000.01 RON).
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "../../App.tsx";
import { loadTestCountyTopology } from "../../testing/countyTopology.ts";
import { loadTestUatTopology } from "../../testing/uatTopology.ts";
import { fixtureClient } from "../../testing/fixtureClient.ts";
import { openAt } from "../../testing/openAt.ts";
import { plain, readTotal as total } from "../../testing/total.ts";
import { catalogue } from "../../copy/index.ts";

afterEach(() => window.history.replaceState(null, "", "/"));

const open = (url: string) => {
  openAt(url);
  return render(<App client={fixtureClient().client} loadCountyTopology={loadTestCountyTopology} loadUatTopology={loadTestUatTopology} />);
};
const shareLines = () => Array.from(document.querySelectorAll("[data-area-share]")).map((e) => plain(e.textContent));

describe.each([
  { locale: "en", base: "/explore/", suppliers: "Suppliers", authorities: "Authorities", amount: "RON 500.01" },
  { locale: "ro", base: "/ro/explore/", suppliers: "Furnizori", authorities: "Autorități", amount: "500,01 RON" },
] as const)("the in-county share line at $base", ({ locale, base, suppliers, authorities, amount }) => {
  const label = catalogue[locale].results.recordRow.areaShare(amount);

  it("shows on the consortium Record only, after a supplier-county click, and goes with the side", async () => {
    open(`${base}?tab=records`);
    const user = userEvent.setup();
    await waitFor(() => expect(total().records).toMatch(/^18/));
    expect(shareLines()).toEqual([]); // no county yet

    await user.click(screen.getByRole("button", { name: suppliers }));
    await user.click(screen.getByRole("button", { name: /^Brașov:/ }));
    await waitFor(() => expect(total().records).toMatch(/^16/));
    expect(shareLines()).toEqual([label]); // one multi-winner Record of sixteen
    const row = screen.getByRole("tabpanel").querySelector("[data-area-share]")!.closest("li")!;
    expect(row).toHaveTextContent("CAN9800001~1");

    await user.click(screen.getByRole("button", { name: authorities })); // the authority side: the county stays, the shares go
    await waitFor(() => expect(total().records).toMatch(/^8/));
    expect(shareLines()).toEqual([]);
  });
});

describe.each([
  { locale: "en", base: "/explore/", share: "RON 15,000,000.00", single: "RON 12,800,000", awarded: "RON 27,800,000", records: "2 Records" },
  { locale: "ro", base: "/ro/explore/", share: "15.000.000,00 RON", single: "12.800.000", awarded: "27.800.000", records: "2 înregistrări" },
] as const)("a consortium across two supplier counties (hand fixture) at $base", ({ locale, base, share, single, awarded, records }) => {
  it("shows the Cluj share on the consortium Record and none on the single-winner Record; the two add up to the Total", async () => {
    open(`${base}?county=RO-CJ&countySide=supplier&tab=records`);
    await waitFor(() => expect(total()).toEqual({ awarded: expect.stringContaining(awarded), records }));
    const rows = within(screen.getByRole("tabpanel")).getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    expect(shareLines()).toEqual([catalogue[locale].results.recordRow.areaShare(share)]); // 15,000,000 of the consortium Record
    expect(within(rows[0]!).getByText(/CAN1170001/)).toBeTruthy();
    expect(rows[1]!.querySelector("[data-area-share]")).toBeNull(); // the contract has one winner: its full value is the share
    expect(plain(rows[1]!.textContent)).toContain(single); // 15,000,000 + 12,800,000 = the 27,800,000 Total
  });
});
