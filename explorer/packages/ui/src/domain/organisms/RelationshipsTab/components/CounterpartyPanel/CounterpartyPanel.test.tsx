import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { renderInUi } from "../../../../../testing/render.tsx";
import { sampleCopy } from "../../../../samples/copy.ts";
import { authorityDirectSupplierPanel } from "../../../../samples/fixtureData.ts";
import { CounterpartyPanel, type CounterpartyPanelProps } from "./index.ts";
import { sentence } from "../../../../../testing/sentence.ts";

const copy = sampleCopy.relationshipsTab("en");
const counterparty = { key: "30000001", displayName: "HACHI INVEST S.R.L.", identity: "CUI" as const };
const base: CounterpartyPanelProps = {
  picked: true, counterparty, records: authorityDirectSupplierPanel, loading: false, counterpartyRole: "supplier", onClose: vi.fn(),
  entityHref: (entity, role) => `/explore/${role}/${entity.key}`, recordHref: (record) => `/explore/record/${record.code}`, locale: "en", copy,
};

describe("CounterpartyPanel", () => {
  it("is a hint while nothing is picked", () => {
    renderInUi(<CounterpartyPanel {...base} picked={false} counterparty={null} records={null} />);
    expect(screen.getByText(copy.panel.hint)).toBeVisible();
    expect(screen.queryByRole("button")).toBeNull();
  });
  it("lists every Record with the counterparty, with its total", () => {
    renderInUi(<CounterpartyPanel {...base} />);
    expect(screen.getByText(sentence(/RON 598,400 across 4 Records/))).toBeVisible();
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
  });
  it("closes", async () => {
    const onClose = vi.fn();
    renderInUi(<CounterpartyPanel {...base} onClose={onClose} />);
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledOnce();
  });
  it("says so when the counterparty has no Record in the filter", () => {
    renderInUi(<CounterpartyPanel {...base} records={{ ...authorityDirectSupplierPanel, records: { count: 0, rows: [] } }} />);
    expect(screen.getByText(copy.panel.empty)).toBeVisible();
  });
  it("pages when the Records span several pages", () => {
    renderInUi(
      <CounterpartyPanel {...base} records={{ ...authorityDirectSupplierPanel, records: { ...authorityDirectSupplierPanel.records, count: 250 } }} paging={{ page: 2, pageSize: 100, pageHref: (n) => `?panelPage=${n}` }} />,
    );
    expect(screen.getByRole("link", { name: "Page 3" })).toHaveAttribute("href", "?panelPage=3");
  });
  it("shows the loading state before the Records arrive", () => {
    renderInUi(<CounterpartyPanel {...base} records={null} loading />);
    expect(screen.getByRole("status")).toHaveTextContent(copy.panel.loading);
  });
});
