import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { renderInUi } from "../../../testing/render.tsx";
import { CiteLine } from "./index.ts";

const copy = { label: "Cite this view", copyLink: { label: "Copy link", copied: "Link copied", failed: "Could not copy the link" } };
const url = "https://grivei.ai/explore/search?q=strazi&tab=records";

describe("CiteLine", () => {
  it("shows the address without its scheme and copies the full URL", async () => {
    const user = userEvent.setup();
    renderInUi(<CiteLine url={url} copy={copy} framed />);
    expect(screen.getByText("Cite this view")).toBeVisible();
    expect(screen.getByText("grivei.ai/explore/search?q=strazi&tab=records")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Copy link" }));
    expect(await screen.findByText("Link copied")).toBeVisible();
    expect(await navigator.clipboard.readText()).toBe(url);
  });

  it("keeps the label for screen readers when unframed", () => {
    renderInUi(<CiteLine url={url} copy={copy} />);
    expect(screen.getByText(/Cite this view/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy link" })).toBeVisible();
  });
});
