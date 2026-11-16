import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderInUi } from "../../../../../testing/render.tsx";
import { sampleCopy } from "../../../../samples/copy.ts";
import { Breadcrumb } from "./index.ts";

const show = (role: "AUTHORITY" | "SUPPLIER", locale: "en" | "ro" = "en", onNavigate?: (href: string) => void) =>
  renderInUi(<Breadcrumb role={role} homeHref="/explore/" onNavigate={onNavigate} copy={sampleCopy.entityHeader(locale).breadcrumb} />, locale);

describe("Breadcrumb", () => {
  it("links explore to the home and names the role as plain text, in a labelled navigation", () => {
    show("AUTHORITY");
    const nav = screen.getByRole("navigation", { name: "You are here" });
    expect(nav).toHaveTextContent("explore / contracting authority");
    expect(screen.getByRole("link", { name: "explore" })).toHaveAttribute("href", "/explore/");
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("says supplier, and says it in Romanian", () => {
    const { unmount } = show("SUPPLIER");
    expect(screen.getByRole("navigation")).toHaveTextContent("explore / supplier");
    unmount();
    show("AUTHORITY", "ro");
    expect(screen.getByRole("navigation", { name: "Unde te afli" })).toHaveTextContent("explorare / autoritate contractantă");
  });

  it("hands a plain click to onNavigate", async () => {
    const seen: string[] = [];
    show("SUPPLIER", "en", (href) => seen.push(href));
    await userEvent.setup().click(screen.getByRole("link", { name: "explore" }));
    expect(seen).toEqual(["/explore/"]);
  });
});
