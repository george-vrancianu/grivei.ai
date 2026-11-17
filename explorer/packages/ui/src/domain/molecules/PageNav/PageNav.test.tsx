import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { sampleCopy } from "../../samples/copy.ts";
import { PageNav } from "./index.ts";

const copy = sampleCopy.fullResults("en").pagination;
const nav = (page: number, onNavigate?: (href: string) => void) =>
  render(<PageNav page={page} pages={5} pageHref={(n) => `/p?page=${n}`} onNavigate={onNavigate} locale="en" copy={copy} />);

describe("PageNav", () => {
  it("links the neighbours and marks the current page", () => {
    nav(3);
    expect(screen.getByRole("link", { name: "Page 3" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Next" })).toHaveAttribute("href", "/p?page=4");
    expect(screen.getByRole("link", { name: "Previous" })).toHaveAttribute("href", "/p?page=2");
  });
  it("shows Previous disabled on the first page", () => {
    nav(1);
    const previous = screen.getByRole("link", { name: "Previous" });
    expect(previous).toHaveAttribute("aria-disabled", "true");
    expect(previous).not.toHaveAttribute("href");
    expect(screen.getByRole("link", { name: "Next" })).not.toHaveAttribute("aria-disabled");
  });
  it("shows Next disabled on the last page", () => {
    nav(5);
    expect(screen.getByRole("link", { name: "Next" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("link", { name: "Previous" })).not.toHaveAttribute("aria-disabled");
  });
  it("hands a plain click to onNavigate", async () => {
    const onNavigate = vi.fn();
    nav(1, onNavigate);
    await userEvent.setup().click(screen.getByRole("link", { name: "Page 2" }));
    expect(onNavigate).toHaveBeenCalledWith("/p?page=2");
  });
});
