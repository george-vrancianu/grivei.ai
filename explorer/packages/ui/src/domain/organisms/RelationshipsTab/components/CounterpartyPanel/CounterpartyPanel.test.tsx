import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { renderInUi } from "../../../../../testing/render.tsx";
import { sampleCopy } from "../../../../samples/copy.ts";
import { authorityDirectSupplierPanel } from "../../../../samples/fixtureData.ts";
import { CounterpartyPanel, type CounterpartyPanelProps } from "./index.ts";

const copy = sampleCopy.relationshipsTab("en");
const counterparty = { key: "30000001", displayName: "HACHI INVEST S.R.L.", identity: "CUI" as const };
const base: CounterpartyPanelProps = {
  picked: true, counterparty, records: authorityDirectSupplierPanel, loading: false, counterpartyRole: "supplier", allRecordsHref: "/records?all", signalsHref: "/records?signals", onClose: vi.fn(),
  entityHref: (entity, role) => `/explore/${role}/${entity.key}`, recordHref: (record) => `/explore/record/${record.code}`, locale: "en", copy,
};

const panelOf = () => screen.getByRole("region", { name: copy.panel.label });
const roCopy = sampleCopy.relationshipsTab("ro");

describe("CounterpartyPanel", () => {
  it("is a region with the same header and a hint while nothing is picked", () => {
    renderInUi(<CounterpartyPanel {...base} picked={false} counterparty={null} records={null} allRecordsHref={null} signalsHref={null} />);
    expect(within(panelOf()).getByRole("heading", { name: copy.panel.eyebrow })).toBeVisible();
    expect(screen.getByText(copy.panel.hint)).toBeVisible();
    expect(screen.queryByRole("button")).toBeNull();
  });
  it("starts with the name as a link, then Awarded and Records as figures", () => {
    renderInUi(<CounterpartyPanel {...base} />);
    const panel = within(panelOf());
    expect(panel.getByRole("heading", { name: copy.panel.eyebrow })).toBeVisible();
    expect(within(panel.getByRole("heading", { level: 4 })).getByRole("link", { name: /HACHI INVEST/ })).toHaveAttribute("href", "/explore/supplier/30000001");
    expect(panel.getByText(copy.panel.awarded).closest("p")).toHaveTextContent("RON 598,400");
    expect(panel.getByText(copy.panel.records).closest("p")).toHaveTextContent("4");
    expect(panel.getAllByRole("listitem")).toHaveLength(4);
  });
  it("labels the figures in Romanian", () => {
    renderInUi(<CounterpartyPanel {...base} locale="ro" copy={roCopy} />, "ro");
    expect(screen.getByText("Atribuit")).toBeVisible();
    expect(screen.getByText("Înregistrări")).toBeVisible();
  });
  it("shows the Signals chip as a link only when the counterparty has Signals, and the won-together sentence only when it won together", () => {
    const { rerender } = renderInUi(<CounterpartyPanel {...base} />);
    expect(screen.queryByRole("link", { name: copy.panel.signals })).toBeNull();
    expect(screen.queryByText(copy.panel.wonTogether)).toBeNull();
    rerender(<CounterpartyPanel {...base} hasSignals wonTogether />);
    expect(screen.getByRole("link", { name: copy.panel.signals })).toHaveAttribute("href", "/records?signals");
    expect(screen.getByText(copy.panel.wonTogether)).toBeVisible();
  });
  it("has \"n of m shown\" and the link to all of them in the foot", () => {
    renderInUi(<CounterpartyPanel {...base} />);
    const panel = within(panelOf());
    expect(panel.getByText("4 of 4 shown")).toBeVisible();
    expect(panel.getByRole("link", { name: "All 4 Records with HACHI INVEST S.R.L." })).toHaveAttribute("href", "/records?all");
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
  it("shows placeholder blocks, not a busy body, when nothing is held yet", () => {
    renderInUi(<CounterpartyPanel {...base} records={null} loading status={<span role="status">Loading…</span>} />);
    const panel = within(panelOf());
    expect(panel.getByText(copy.panel.awarded)).toBeVisible();
    expect(panel.getByRole("status")).toHaveTextContent("Loading…");
    expect(panelOf().querySelector("[aria-busy='true']")).toBeNull();
  });
  it("keeps the held body dimmed with aria-busy while the next loads, the header at full strength", () => {
    renderInUi(<CounterpartyPanel {...base} loading status={<span role="status">Loading…</span>} />);
    expect(panelOf().querySelector("[data-panel-part='body']")).toHaveAttribute("aria-busy", "true");
    expect(panelOf().querySelector("[data-panel-part='header']")?.closest("[aria-busy]")).toBeNull();
    expect(screen.getByRole("button", { name: "Close" })).toBeEnabled();
  });
  it("shows a failure in place of the figures and rows", () => {
    renderInUi(<CounterpartyPanel {...base} failure={<p role="alert">It failed</p>} />);
    expect(within(panelOf()).getByRole("alert")).toHaveTextContent("It failed");
    expect(within(panelOf()).queryAllByRole("listitem")).toHaveLength(0);
  });
});
