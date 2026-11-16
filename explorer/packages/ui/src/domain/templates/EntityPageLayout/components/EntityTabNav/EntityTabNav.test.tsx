import { screen } from "@testing-library/react";
import { renderInUi } from "../../../../../testing/render.tsx";
import { color } from "../../../../../theme/tokens.ts";
import { selected } from "../../../../../theme/states.ts";
import { sampleCopy } from "../../../../samples/copy.ts";
import { EntityTabNav } from "./index.ts";

const hrefs = { overview: "/a", records: "/a/records", relationships: "/a/relationships" };
const show = (view: "overview" | "records" | "relationships", counts?: { records: string }) =>
  renderInUi(<EntityTabNav view={view} hrefs={hrefs} counts={counts} copy={sampleCopy.entityPageLayout("en")} />);

describe("EntityTabNav", () => {
  it("draws the open tab in the selected state with aria-current, and the others plain", () => {
    show("records");
    const open = screen.getByRole("link", { name: "Records" });
    expect(open).toHaveAttribute("aria-current", "page");
    expect(open).toHaveStyle({ backgroundColor: selected.backgroundColor as string, color: color.text });
    expect(getComputedStyle(open).boxShadow).toContain("inset");
    const other = screen.getByRole("link", { name: "Overview" });
    expect(other).not.toHaveAttribute("aria-current");
    expect(other).not.toHaveStyle({ backgroundColor: selected.backgroundColor as string });
  });

  it("has no underline on any tab and no border on the navigation", () => {
    show("overview");
    for (const link of screen.getAllByRole("link")) {
      expect(getComputedStyle(link).borderBottomWidth).not.toBe("2px");
      expect(getComputedStyle(link).textDecorationLine).toBe("none");
    }
    expect(getComputedStyle(screen.getByRole("navigation")).borderBottomWidth).toBe("0px");
  });

  it("shows a count as a pill beside the tab's name", () => {
    show("overview", { records: "1,817" });
    const pill = screen.getByText("1,817");
    expect(getComputedStyle(pill).borderRadius).toBe("10px");
    expect(getComputedStyle(pill).borderTopWidth).toBe("1px");
    expect(screen.getByRole("link", { name: "Records 1,817" })).toContainElement(pill);
  });
});
