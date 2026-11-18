import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderInUi } from "../../../testing/render.tsx";
import { sampleCopy } from "../../samples/copy.ts";
import { Breadcrumb } from "./index.ts";

const show = (current: string, locale: "en" | "ro" = "en", onNavigate?: (href: string) => void) =>
  renderInUi(<Breadcrumb current={current} homeHref="/explore/" onNavigate={onNavigate} copy={sampleCopy.entityHeader(locale).breadcrumb} />, locale);

describe("Breadcrumb", () => {
  it("links explore to the home and shows the current segment as plain text, in a labelled navigation", () => {
    show("contracting authority");
    expect(screen.getByRole("navigation", { name: "You are here" })).toHaveTextContent("explore / contracting authority");
    expect(screen.getByRole("link", { name: "explore" })).toHaveAttribute("href", "/explore/");
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("takes any current label (the person page's), and says it in Romanian", () => {
    show("persoană", "ro");
    expect(screen.getByRole("navigation", { name: "Unde te afli" })).toHaveTextContent("explorare / persoană");
  });

  it("hands a plain click to onNavigate", async () => {
    const seen: string[] = [];
    show("supplier", "en", (href) => seen.push(href));
    await userEvent.setup().click(screen.getByRole("link", { name: "explore" }));
    expect(seen).toEqual(["/explore/"]);
  });
});
