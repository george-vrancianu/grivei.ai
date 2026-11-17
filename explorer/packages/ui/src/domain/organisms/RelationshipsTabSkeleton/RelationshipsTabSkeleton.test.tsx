import { screen, within } from "@testing-library/react";
import { renderInUi } from "../../../testing/render.tsx";
import { LoadingStatus } from "../../molecules/LoadingStatus/index.ts";
import { sampleCopy } from "../../samples/copy.ts";
import { RelationshipsTabSkeleton } from "./index.ts";

describe.each(["en", "ro"] as const)("RelationshipsTabSkeleton (%s)", (locale) => {
  const copy = { ...sampleCopy.relationshipsTab(locale), flow: sampleCopy.flowLensMap(locale).panel };
  const setup = (props: { view?: "graph" | "flow"; picked?: boolean } = {}) =>
    renderInUi(<RelationshipsTabSkeleton role="authority" toggle={<button type="button">toggle</button>} status={<LoadingStatus label="Loading" />} copy={copy} {...props} />, locale);

  it("keeps the real heading, toggle and panel titles and says it is loading in one status line", () => {
    setup();
    expect(screen.getByRole("heading", { name: copy.heading })).toBeVisible();
    expect(screen.getByRole("button", { name: "toggle" })).toBeVisible();
    for (const title of [copy.graph.heading, copy.panel.eyebrow, copy.timeline.heading]) expect(screen.getByRole("heading", { name: title })).toBeVisible();
    expect(screen.getByText(copy.panel.hint)).toBeVisible();
    expect(screen.getAllByRole("status")).toHaveLength(1);
  });

  it("shows the picked panel's real figure labels when a counterparty is in the URL", () => {
    setup({ picked: true });
    const panel = within(screen.getByRole("region", { name: copy.panel.label }));
    expect(panel.getByText(copy.panel.awarded)).toBeVisible();
    expect(panel.getByText(copy.panel.records)).toBeVisible();
  });

  it("puts the Money flow panel in the graph's place in the flow view, the picked panel and By month staying", () => {
    setup({ view: "flow" });
    expect(screen.getByRole("region", { name: copy.flow.heading })).toBeVisible();
    expect(screen.queryByRole("region", { name: copy.graph.heading })).toBeNull();
    expect(screen.getByRole("region", { name: copy.panel.label })).toBeVisible();
    expect(screen.getByRole("heading", { name: copy.timeline.heading })).toBeVisible();
    expect(screen.getAllByRole("status")).toHaveLength(1);
  });
});
