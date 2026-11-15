import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderInUi } from "../../../testing/render.tsx";
import { LoadingStatus } from "./index.ts";

describe.each([["Loading…"], ["Se încarcă…"]])("LoadingStatus (%s)", (label) => {
  it("is one polite status line with the label, and a decorative spinner", () => {
    renderInUi(<LoadingStatus label={label} />);
    expect(screen.getByRole("status")).toHaveTextContent(label);
    expect(screen.queryByRole("progressbar")).toBeNull(); // aria-hidden: the text carries the meaning
  });
});
