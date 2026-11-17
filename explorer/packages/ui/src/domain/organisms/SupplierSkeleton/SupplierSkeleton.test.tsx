import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderInUi } from "../../../testing/render.tsx";
import { sampleCopy } from "../../samples/copy.ts";
import { SupplierSkeleton } from "./index.ts";

describe.each(["en", "ro"] as const)("SupplierSkeleton (%s)", (locale) => {
  it("draws the real titles and figure labels and hides the placeholders from assistive technology", () => {
    const onrc = sampleCopy.onrcSection(locale);
    const people = sampleCopy.peopleSection(locale);
    const { container } = renderInUi(<SupplierSkeleton onrc={onrc} people={people} />, locale);
    expect(screen.getByRole("region", { name: onrc.heading, hidden: true })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: people.heading, hidden: true })).toBeInTheDocument();
    expect(screen.getByText(onrc.registrationNumber)).toBeInTheDocument();
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByRole("status")).toBeNull();
  });
});
