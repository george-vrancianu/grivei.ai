import { fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { renderInUi } from "../../../testing/render.tsx";
import { sampleCopy } from "../../samples/copy.ts";
import {
  authorityPickedPanel, authorityTypicalPickedTimeline, authorityTypicalRelationships, consortiumHeavyRelationships, emptyRelationships,
  naturalPersonRelationships, oneCounterpartyRelationships,
} from "../../samples/fixtureData.ts";
import { RelationshipsTab, type RelationshipsTabProps } from "./index.ts";

const copy = sampleCopy.relationshipsTab("en");
const data = authorityTypicalRelationships;

const common = {
  entity: data.entity, role: "authority" as const, counterparties: data.counterparties, timeline: data.timeline,
  entityHref: (entity: { key: string }, role: string) => `/explore/${role}/${entity.key}`,
  recordHref: (record: { code: string }) => `/explore/record/${record.code}`,
  locale: "en" as const, copy,
};

/** The caller's side of the contract: it keeps the pick and answers it with the picked counterparty's data. */
function Harness(props: Partial<RelationshipsTabProps> & { initial?: string | null }) {
  const [selected, setSelected] = useState<string | null>(props.initial ?? null);
  const picked = selected === "30000002";
  return (
    <RelationshipsTab
      {...common}
      selected={selected}
      onSelect={setSelected}
      sidePanel={picked ? authorityPickedPanel : null}
      selectedTimeline={picked ? authorityTypicalPickedTimeline : null}
      {...props}
    />
  );
}

const node = (name: RegExp) => screen.getByRole("button", { name });

describe("RelationshipsTab", () => {
  it("shows the heading, a node per counterparty and the 'more' line", () => {
    renderInUi(<Harness />);
    expect(screen.getByRole("heading", { name: "Relationships" })).toBeVisible();
    // Seven rows, six of them with an Entity: pickable buttons. The seventh is a natural person.
    expect(screen.getAllByRole("button").filter((el) => el.hasAttribute("aria-pressed"))).toHaveLength(6);
    expect(screen.getByText("5 more counterparties")).toBeVisible();
  });

  it("names a node with its money, Records, channel split and markers", () => {
    renderInUi(<Harness />);
    const drumarii = node(/DRUMARII UNIȚI S\.R\.L\./);
    expect(drumarii).toHaveAccessibleName(/RON\s3,400,000, 5 Records; RON\s3,100,000 via contracts, RON\s300,000 via direct purchases; has Signals/);
    expect(drumarii).toHaveAttribute("aria-pressed", "false");
  });

  it("sizes a node by money and colours its edge by the channel that carries more", () => {
    const { container } = renderInUi(<Harness />);
    const radius = (key: string) => Number(container.querySelector(`[data-node="${key}"] circle[data-radius]`)!.getAttribute("data-radius"));
    expect(radius("30000002")).toBeGreaterThan(radius("30000001"));
    expect(radius("30000001")).toBeGreaterThan(radius("30000013"));
    expect(container.querySelector('[data-edge="30000002"]')).toHaveAttribute("data-channel", "contract");
    expect(container.querySelector('[data-edge="30000001"]')).toHaveAttribute("data-channel", "directPurchase");
  });

  it("rings a counterparty with Signals and only that one", () => {
    const { container } = renderInUi(<Harness />);
    expect(container.querySelectorAll("[data-ring]")).toHaveLength(2);
    expect(container.querySelector('[data-node="30000002"] [data-ring]')).toBeNull();
    expect(container.querySelector('[data-node="30000001"] [data-ring]')).not.toBeNull();
  });

  it("asks nothing of the panel until something is picked", () => {
    renderInUi(<Harness />);
    expect(screen.getByText("Pick a counterparty in the graph to list every Record with it.")).toBeVisible();
  });

  it("picking a counterparty fills the side panel and highlights the timeline", async () => {
    const user = userEvent.setup();
    const { container } = renderInUi(<Harness />);
    expect(container.querySelectorAll('rect[data-series="picked"]')).toHaveLength(0);

    await user.click(node(/CONSTRUCȚII TRANSILVANIA S\.A\./));

    const panel = screen.getByRole("complementary", { name: copy.panel.label });
    expect(within(panel).getByRole("heading", { name: /Records with\s+CONSTRUCȚII TRANSILVANIA S\.A\./ })).toBeVisible();
    const heading = within(panel).getByRole("heading", { name: /Records with/ });
    expect(within(heading).getByRole("link", { name: "CONSTRUCȚII TRANSILVANIA S.A." })).toHaveAttribute("href", "/explore/supplier/30000002");
    expect(within(panel).getByText("Modernizare străzi, cartier Noua")).toBeVisible();
    expect(within(panel).getByRole("link", { name: /Modernizare străzi/ })).toHaveAttribute("href", "/explore/record/CAN1166685");
    expect(node(/CONSTRUCȚII TRANSILVANIA S\.A\./)).toHaveAttribute("aria-pressed", "true");
    // The picked months are drawn over the overall ones, only in the month the counterparty has money.
    const picked = container.querySelectorAll('rect[data-series="picked"]');
    expect(picked).toHaveLength(1);
    expect(picked[0]!.closest("[data-month]")).toHaveAttribute("data-month", "2023-11");
    expect(screen.getByRole("table")).toHaveTextContent("CONSTRUCȚII TRANSILVANIA S.A.");
  });

  it("clears the pick from the close button and by picking the same node again", async () => {
    const user = userEvent.setup();
    const { container } = renderInUi(<Harness initial="30000002" />);
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.getByText(copy.panel.hint)).toBeVisible();
    expect(container.querySelectorAll('rect[data-series="picked"]')).toHaveLength(0);
    await user.click(node(/CONSTRUCȚII TRANSILVANIA/));
    await user.click(node(/CONSTRUCȚII TRANSILVANIA/));
    expect(screen.getByText(copy.panel.hint)).toBeVisible();
  });

  it("is picked from the keyboard with Enter and with Space", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    renderInUi(<RelationshipsTab {...common} selected={null} onSelect={onSelect} sidePanel={null} />);
    const target = node(/HACHI INVEST/);
    expect(target).toHaveAttribute("tabindex", "0");
    target.focus();
    await user.keyboard("{Enter}");
    expect(onSelect).toHaveBeenLastCalledWith("30000001");
    await user.keyboard(" ");
    expect(onSelect).toHaveBeenCalledTimes(2);
  });

  it("calls onSelect with the key on a click and holds no pick of its own", () => {
    const onSelect = vi.fn();
    renderInUi(<RelationshipsTab {...common} selected={null} onSelect={onSelect} sidePanel={null} />);
    fireEvent.click(node(/CONSTRUCȚII TRANSILVANIA/));
    expect(onSelect).toHaveBeenCalledWith("30000002");
    expect(node(/CONSTRUCȚII TRANSILVANIA/)).toHaveAttribute("aria-pressed", "false");
  });

  it("shows a loading state while the picked counterparty's Records are on their way", () => {
    renderInUi(<RelationshipsTab {...common} selected="30000002" onSelect={vi.fn()} sidePanel={null} sidePanelLoading />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading Records");
    expect(within(screen.getByRole("heading", { name: /Records with/ })).getByRole("link", { name: "CONSTRUCȚII TRANSILVANIA S.A." })).toBeVisible();
  });

  it("gives a counterparty the other role's page", () => {
    renderInUi(<RelationshipsTab {...common} role="supplier" selected="30000002" onSelect={vi.fn()} sidePanel={authorityPickedPanel} />);
    const heading = screen.getByRole("heading", { name: /Records with/ });
    expect(within(heading).getByRole("link", { name: "CONSTRUCȚII TRANSILVANIA S.A." })).toHaveAttribute("href", "/explore/authority/30000002");
  });

  it("renders the Flow lens toggle slot in the toolbar", () => {
    renderInUi(<Harness flowToggle={<button type="button">Flow lens</button>} />);
    expect(screen.getByRole("button", { name: "Flow lens" })).toBeVisible();
  });

  it("explains the marks in a legend, the dashed one only when it is used", () => {
    renderInUi(<Harness />);
    const legend = screen.getByRole("region", { name: "Legend" });
    expect(within(legend).getByText("Circle area: money with the counterparty")).toBeVisible();
    expect(within(legend).getByText("Orange ring: has Signals")).toBeVisible();
    expect(within(legend).queryByText("Dashed line: won together")).toBeNull();
  });

  it("dashes the edges of counterparties won together and labels the consortium convention", () => {
    const rel = consortiumHeavyRelationships;
    const { container } = renderInUi(
      <RelationshipsTab {...common} entity={rel.entity} role="supplier" counterparties={rel.counterparties} timeline={rel.timeline} selected={null} onSelect={vi.fn()} sidePanel={null} />,
    );
    const dashed = [...container.querySelectorAll("[data-edge]")].filter((edge) => edge.getAttribute("stroke-dasharray"));
    expect(dashed).toHaveLength(7);
    expect(screen.getByText(/split equally among its members, by convention/)).toBeVisible();
    expect(screen.getByText("Dashed line: won together")).toBeVisible();
    expect(screen.getByRole("button", { name: /DRUMARII UNIȚI S\.R\.L\..*won together/ })).toBeVisible();
  });

  it("shows no consortium note and no 'more' line for one plain counterparty", () => {
    const rel = oneCounterpartyRelationships;
    renderInUi(<RelationshipsTab {...common} entity={rel.entity} counterparties={rel.counterparties} timeline={rel.timeline} selected={null} onSelect={vi.fn()} sidePanel={null} />);
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.queryByText(/more counterpart/)).toBeNull();
    expect(screen.queryByText(/by convention/)).toBeNull();
  });

  it("shows a natural person as a label only: no name, no button, no link (ADR 0003)", () => {
    const rel = naturalPersonRelationships;
    renderInUi(<RelationshipsTab {...common} entity={rel.entity} counterparties={rel.counterparties} timeline={rel.timeline} selected={null} onSelect={vi.fn()} sidePanel={null} />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByRole("img", { name: /^Persoană fizică, RON\s36,000/ })).toBeVisible();
    expect(screen.queryByText(/HACHI/)).toBeNull();
  });

  it("says so when there are no counterparties, and keeps the empty timeline sentence", () => {
    const rel = emptyRelationships;
    renderInUi(<RelationshipsTab {...common} entity={rel.entity} counterparties={rel.counterparties} timeline={rel.timeline} selected={null} onSelect={vi.fn()} sidePanel={null} />);
    expect(screen.getByText("No counterparties for the chosen filters.")).toBeVisible();
    expect(screen.getByText("No months for the chosen filters.")).toBeVisible();
    expect(screen.queryByRole("region", { name: "Legend" })).toBeNull();
  });

  it("speaks Romanian", () => {
    renderInUi(<Harness copy={sampleCopy.relationshipsTab("ro")} locale="ro" initial="30000002" />, "ro");
    expect(screen.getByRole("heading", { name: "Relații" })).toBeVisible();
    expect(screen.getByText("încă 5 contrapărți")).toBeVisible();
    expect(screen.getByRole("button", { name: "Închide" })).toBeVisible();
  });
});
