import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderInUi } from "../../../../../testing/render.tsx";
import { sampleCopy } from "../../../../samples/copy.ts";
import { PersonBreadcrumb } from "./index.ts";

const show = (locale: "en" | "ro" = "en", onNavigate?: (href: string) => void) =>
  renderInUi(<PersonBreadcrumb homeHref="/explore/" onNavigate={onNavigate} copy={sampleCopy.personDetail(locale).breadcrumb} />, locale);

describe("PersonBreadcrumb", () => {
  it("links explore to the home and names the page as plain text, in a labelled navigation", () => {
    show();
    expect(screen.getByRole("navigation", { name: "You are here" })).toHaveTextContent("explore / person");
    expect(screen.getByRole("link", { name: "explore" })).toHaveAttribute("href", "/explore/");
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("says it in Romanian", () => {
    show("ro");
    expect(screen.getByRole("navigation", { name: "Unde te afli" })).toHaveTextContent("explorare / persoană");
  });

  it("hands a plain click to onNavigate", async () => {
    const go = vi.fn();
    show("en", go);
    await userEvent.setup().click(screen.getByRole("link", { name: "explore" }));
    expect(go).toHaveBeenCalledWith("/explore/");
  });
});
