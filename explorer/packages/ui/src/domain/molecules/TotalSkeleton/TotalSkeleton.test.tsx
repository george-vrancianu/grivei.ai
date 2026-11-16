import { screen } from "@testing-library/react";
import { renderInUi } from "../../../testing/render.tsx";
import { sampleCopy } from "../../samples/copy.ts";
import { TotalSkeleton } from "./index.ts";

describe.each(["en", "ro"] as const)("TotalSkeleton (%s)", (locale) => {
  const { figures } = sampleCopy.total(locale);

  it("shows the real heading and figure labels, with a hidden block for every value", () => {
    const { container } = renderInUi(<TotalSkeleton heading={<h2>Total</h2>} labels={figures} />, locale);
    expect(screen.getByRole("heading", { name: "Total" })).toBeInTheDocument();
    expect(screen.getByText(figures.records)).toBeInTheDocument();
    expect(screen.getByText(figures.ceilings)).toBeInTheDocument();
    const blocks = container.querySelectorAll(".MuiSkeleton-root");
    expect(blocks).toHaveLength(3);
    blocks.forEach((block) => expect(block).toHaveAttribute("aria-hidden", "true"));
  });
});
