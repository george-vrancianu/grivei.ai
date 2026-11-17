import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CountyList } from "./index.ts";

const rows = [
  { key: "RO-CJ", name: "Cluj", awarded: "75000" },
  { key: "RO-BV", name: "Brașov", awarded: "25000" },
];

describe("CountyList", () => {
  it("lists every row with its amount and its share of the total, in the order given", () => {
    render(<CountyList rows={rows} total="100000" locale="en" label="Money by county" />);
    const items = within(screen.getByRole("list", { name: "Money by county" })).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("Cluj");
    expect(items[0]).toHaveTextContent("75%");
    expect(items[1]).toHaveTextContent("Brașov");
    expect(items[1]).toHaveTextContent("25%");
  });

  it("formats the share in the locale", () => {
    render(<CountyList rows={[{ key: "RO-CJ", name: "Cluj", awarded: "1" }, { key: "RO-BV", name: "Brașov", awarded: "7" }]} total="8" locale="ro" label="Banii pe județe" />);
    expect(screen.getByRole("list", { name: "Banii pe județe" })).toHaveTextContent(/87,5\s*%/);
  });
});
