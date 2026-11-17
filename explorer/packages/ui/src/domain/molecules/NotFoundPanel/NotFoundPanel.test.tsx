import { fireEvent, screen } from "@testing-library/react";
import { renderInUi } from "../../../testing/render.tsx";
import { NotFoundPanel } from "./index.ts";

const props = {
  title: "Page not found",
  body: "Nothing lives here.",
  primary: { label: "Back to the main screen", href: "/explore/" },
  secondary: { label: "Search", href: "/explore/search" },
};

describe("NotFoundPanel", () => {
  it("shows 404, the title as the page heading, the sentence and the two actions as links", () => {
    renderInUi(<NotFoundPanel {...props} />);
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Page not found" })).toBeVisible();
    expect(screen.getByText("404")).toBeVisible();
    expect(screen.getByText("Nothing lives here.")).toBeVisible();
    expect(screen.getByRole("link", { name: "Back to the main screen" })).toHaveAttribute("href", "/explore/");
    expect(screen.getByRole("link", { name: "Search" })).toHaveAttribute("href", "/explore/search");
  });
  it("hands a plain click to onNavigate and leaves the link alone otherwise", () => {
    const onNavigate = vi.fn();
    renderInUi(<NotFoundPanel {...props} onNavigate={onNavigate} />);
    fireEvent.click(screen.getByRole("link", { name: "Search" }));
    expect(onNavigate).toHaveBeenCalledWith("/explore/search");
    fireEvent.click(screen.getByRole("link", { name: "Search" }), { ctrlKey: true });
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });
});
