import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { renderInUi } from "../../../../../testing/render.tsx";
import { ResultTabPanel } from "./index.ts";

const props = { id: "p", tabId: "t", count: 10, emptyText: "Nothing." };

describe("ResultTabPanel", () => {
  it("renders its rows only when selected, and stays in the DOM hidden otherwise", () => {
    const { rerender } = renderInUi(<ResultTabPanel {...props} selected={false} shown={2}><p>rows</p></ResultTabPanel>);
    expect(document.getElementById("p")).toHaveAttribute("hidden");
    expect(screen.queryByText("rows")).toBeNull();
    rerender(<ResultTabPanel {...props} selected shown={2}><p>rows</p></ResultTabPanel>);
    expect(screen.getByText("rows")).toBeVisible();
  });

  it("says so when there are no rows, and offers no 'show all' link", () => {
    renderInUi(<ResultTabPanel {...props} selected shown={0} count={0} showAll={{ href: "/all", text: "Show all" }}><p>rows</p></ResultTabPanel>);
    expect(screen.getByText("Nothing.")).toBeVisible();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("links an empty panel to emptyLink, handing a plain click to onNavigate, and not when the panel has rows", async () => {
    const onNavigate = vi.fn();
    const emptyLink = { href: "/explore/?lens=coverage", text: "Check what has been harvested" };
    const { rerender } = renderInUi(<ResultTabPanel {...props} selected shown={0} count={0} emptyLink={emptyLink} onNavigate={onNavigate}><p>rows</p></ResultTabPanel>);
    const link = screen.getByRole("link", { name: emptyLink.text });
    expect(link).toHaveAttribute("href", emptyLink.href);
    await userEvent.setup().click(link);
    expect(onNavigate).toHaveBeenCalledWith(emptyLink.href);
    rerender(<ResultTabPanel {...props} selected shown={2} emptyLink={emptyLink}><p>rows</p></ResultTabPanel>);
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("links 'show all' only when there are more results than shown", () => {
    const { rerender } = renderInUi(<ResultTabPanel {...props} selected shown={3} showAll={{ href: "/all", text: "Show all 10" }}><p>rows</p></ResultTabPanel>);
    expect(screen.getByRole("link", { name: "Show all 10" })).toHaveAttribute("href", "/all");
    rerender(<ResultTabPanel {...props} selected shown={10} showAll={{ href: "/all", text: "Show all 10" }}><p>rows</p></ResultTabPanel>);
    expect(screen.queryByRole("link")).toBeNull();
  });
});
