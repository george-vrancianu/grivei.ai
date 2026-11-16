import { screen, within } from "@testing-library/react";
import { renderInUi } from "../../../testing/render.tsx";
import { LoadingStatus } from "../../molecules/LoadingStatus/index.ts";
import { sampleCopy } from "../../samples/copy.ts";
import { RecordsTabSkeleton } from "./index.ts";

describe.each(["en", "ro"] as const)("RecordsTabSkeleton (%s)", (locale) => {
  const copy = sampleCopy.recordsTab(locale);
  const setup = (role: "authority" | "supplier" = "authority") => renderInUi(<RecordsTabSkeleton role={role} copy={copy} status={<LoadingStatus label="Loading" />} />, locale);

  it("keeps the real panel titles and labels and says it is loading in one status line", () => {
    setup();
    expect(screen.getByRole("heading", { level: 2, name: copy.heading })).toBeVisible();
    expect(screen.getByRole("heading", { level: 2, name: copy.totalHeading })).toBeVisible();
    expect(within(screen.getByRole("region", { name: copy.totalHeading })).getByText(copy.total.figures.records)).toBeInTheDocument();
    for (const name of [copy.facets.groups.signal, copy.facets.groups.badge, copy.facets.groups.counterpartyOfAuthority]) expect(screen.getByText(name)).toBeInTheDocument();
    expect(screen.getAllByRole("status")).toHaveLength(1);
  });

  it("names the counterparty menu after the page's role", () => {
    setup("supplier");
    expect(screen.getByText(copy.facets.groups.counterpartyOfSupplier)).toBeInTheDocument();
  });

  it("hides the placeholder rows from assistive technology", () => {
    setup();
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });
});
