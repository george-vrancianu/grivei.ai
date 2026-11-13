import { screen } from "@testing-library/react";
import { renderInUi } from "../../../testing/render.tsx";
import { StateNote } from "./index.ts";

describe("StateNote", () => {
  it("announces loading politely and an error as an alert", () => {
    const { rerender } = renderInUi(<StateNote kind="loading">Loading</StateNote>);
    expect(screen.getByRole("status")).toHaveTextContent("Loading");
    rerender(<StateNote kind="error">Failed</StateNote>);
    expect(screen.getByRole("alert")).toHaveTextContent("Failed");
  });

  it("is plain text for an empty result, with its next step under it", () => {
    renderInUi(<StateNote kind="empty" action={<a href="/x">Next</a>}>None</StateNote>);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.getByText("None")).toBeVisible();
    expect(screen.getByRole("link", { name: "Next" })).toBeVisible();
  });
});
