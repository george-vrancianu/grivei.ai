import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderInUi } from "../../../testing/render.tsx";
import { SourceCaption } from "./index.ts";

describe("SourceCaption", () => {
  it("links to the source when it has an address", () => {
    renderInUi(<SourceCaption label="Source: ONRC, snapshot of 6 May 2026" url="https://data.gov.ro/dataset/firme" />);
    expect(screen.getByRole("link", { name: "Source: ONRC, snapshot of 6 May 2026" })).toHaveAttribute("href", "https://data.gov.ro/dataset/firme");
  });

  it("is plain text without an address", () => {
    renderInUi(<SourceCaption label="Source: ONRC, snapshot of 6 May 2026" url={null} />);
    expect(screen.getByText("Source: ONRC, snapshot of 6 May 2026")).toBeVisible();
    expect(screen.queryByRole("link")).toBeNull();
  });
});
