import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderInUi } from "../../../testing/render.tsx";
import { sampleCopy } from "../../samples/copy.ts";
import { frameworkOverrunSignal, overCapSignal } from "../../samples/signals.ts";
import { SignalList } from "./index.ts";

const copy = sampleCopy.fullResults("en").pagination;
const show = (pages: number) =>
  renderInUi(
    <SignalList
      signals={[overCapSignal, frameworkOverrunSignal, { ...frameworkOverrunSignal }]}
      locale="en"
      renderItem={(s) => <span>{s.rule}</span>}
      pagination={{ page: 1, pages, pageHref: (n) => `?page=${n}`, copy }}
    />,
  );

describe("SignalList", () => {
  it("lists each Signal in the order given, even two that share rule, date and filter", () => {
    show(1);
    expect(screen.getAllByRole("listitem").map((li) => li.textContent)).toEqual(["OVER_CAP", "FRAMEWORK_OVERRUN", "FRAMEWORK_OVERRUN"]);
  });

  it("shows page links only when there is more than one page", () => {
    show(1);
    expect(screen.queryByRole("navigation")).toBeNull();
  });

  it("links the pages under the list", () => {
    show(3);
    expect(screen.getByRole("link", { name: "Page 2" })).toHaveAttribute("href", "?page=2");
  });
});
