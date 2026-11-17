import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { sampleCopy } from "../../samples/copy.ts";
import { MoneyFlowPanel } from "./index.ts";

describe("MoneyFlowPanel", () => {
  it.each([["en", "authority", "where this authority's money goes"], ["en", "supplier", "where this supplier's money comes from"], ["ro", "authority", "încotro merg banii autorității"]] as const)(
    "is a region named by its heading with the role's meta line (%s, %s)",
    (locale, role, meta) => {
      const copy = sampleCopy.flowLensMap(locale).panel;
      render(<MoneyFlowPanel role={role} copy={copy}>body</MoneyFlowPanel>);
      const region = screen.getByRole("region", { name: copy.heading });
      expect(within(region).getByText(meta)).toBeInTheDocument();
    },
  );

  it("dims only the body while busy, with the status and the foot in the strips", () => {
    const copy = sampleCopy.flowLensMap("en").panel;
    render(<MoneyFlowPanel role="authority" busy status={<span role="status">Loading…</span>} foot={<span>the caption</span>} copy={copy}>body</MoneyFlowPanel>);
    const region = screen.getByRole("region", { name: copy.heading });
    expect(region.querySelector("[aria-busy='true']")).toHaveTextContent("body");
    expect(within(region).getByRole("status")).toHaveTextContent("Loading…");
    expect(within(region).getByText("the caption").closest("[aria-busy]")).toBeNull();
  });
});
