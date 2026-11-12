import { render, screen } from "@testing-library/react";
import { DataThroughDate } from "./index.ts";

const entry = { kind: "CONTRACT", date: "2024-09-30" };

describe("DataThroughDate", () => {
  it("shows the record kind and the date in English", () => {
    render(<DataThroughDate dataThrough={entry} locale="en" copy={{ through: "data through" }} />);
    expect(screen.getByText(/^CONTRACT: data through/)).toBeVisible();
    const time = screen.getByText("30 September 2024");
    expect(time).toHaveAttribute("datetime", "2024-09-30");
  });
  it("shows the date in Romanian", () => {
    render(<DataThroughDate dataThrough={entry} locale="ro" copy={{ through: "date până la" }} />);
    expect(screen.getByText("30 septembrie 2024")).toBeVisible();
  });
  it("does not shift the day with the reader's time zone", () => {
    render(<DataThroughDate dataThrough={{ kind: "DA", date: "2024-01-01" }} locale="en" copy={{ through: "through" }} />);
    expect(screen.getByText("1 January 2024")).toBeVisible();
  });
  it("prefers a supplied kind label", () => {
    render(<DataThroughDate dataThrough={entry} locale="en" copy={{ through: "through" }} kindLabel="Contracts" />);
    expect(screen.getByText(/^Contracts: through/)).toBeVisible();
    expect(screen.queryByText(/CONTRACT:/)).toBeNull();
  });
});
