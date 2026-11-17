import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderInUi } from "../../../../../testing/render.tsx";
import { LoadingStatus } from "../../../../molecules/LoadingStatus/index.ts";
import { sampleCopy } from "../../../../samples/copy.ts";
import { PersonDetailSkeleton } from "./index.ts";

describe.each(["en", "ro"] as const)("PersonDetailSkeleton (%s)", (locale) => {
  const copy = sampleCopy.personDetail(locale);
  const setup = () => renderInUi(<PersonDetailSkeleton copy={copy} homeHref="/" status={<LoadingStatus label="Loading" />} />, locale);

  it("keeps the real notice, breadcrumb, figure labels and Roles title", () => {
    setup();
    expect(screen.getAllByRole("note")).toHaveLength(1);
    expect(screen.getByRole("navigation", { name: copy.breadcrumb.label })).toBeVisible();
    for (const label of [copy.figures.born, copy.figures.roles, copy.figures.source]) expect(screen.getAllByText(label, { selector: "span" }).length).toBeGreaterThan(0);
    expect(screen.getByRole("region", { name: copy.rolesHeading })).toBeVisible();
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
  });

  it("says it is loading once, in the Roles header strip, and hides every block", () => {
    const { container } = setup();
    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(within(screen.getByRole("region", { name: copy.rolesHeading })).getByRole("status")).toHaveTextContent("Loading");
    const blocks = container.querySelectorAll(".MuiSkeleton-root");
    expect(blocks.length).toBeGreaterThan(5);
    for (const block of blocks) expect(block.closest("[aria-hidden=true]")).not.toBeNull();
    expect(container.querySelector("[aria-busy]")).toBeNull();
  });
});

