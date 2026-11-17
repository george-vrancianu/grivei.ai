import { screen } from "@testing-library/react";
import { createRef } from "react";
import { TableBody } from "../../../atoms/TableBody/index.ts";
import { TableHead } from "../../../atoms/TableHead/index.ts";
import { renderInUi } from "../../../testing/render.tsx";
import { rgb } from "../../../testing/color.ts";
import { sxProbe, sxProbeStyle } from "../../../testing/sx.ts";
import { color } from "../../../theme/tokens.ts";
import { NumericCell } from "./index.ts";

const inTable = (cell: React.ReactNode, head = false) =>
  renderInUi(<table>{head ? <TableHead><tr>{cell}</tr></TableHead> : <TableBody><tr>{cell}</tr></TableBody>}</table>);

describe("NumericCell", () => {
  it("right-aligns a body cell in mono with tabular figures", () => {
    inTable(<NumericCell>1.234,50</NumericCell>);
    const cell = screen.getByRole("cell");
    expect(cell).toHaveStyle({ textAlign: "right", fontVariantNumeric: "tabular-nums" });
    expect(getComputedStyle(cell).fontFamily).toContain("IBM Plex Mono");
  });
  it("does the same in the head, which keeps the theme's 12 px muted look", () => {
    inTable(<NumericCell>Valoare</NumericCell>, true);
    const cell = screen.getByRole("columnheader");
    expect(cell).toHaveStyle({ textAlign: "right", fontVariantNumeric: "tabular-nums" });
    expect(getComputedStyle(cell).fontSize).toBe("12px");
    expect(getComputedStyle(cell).color).toBe(rgb(color.muted));
  });
  it("passes MUI props, sx and ref through", () => {
    const ref = createRef<HTMLTableCellElement>();
    renderInUi(<table><tbody><tr><NumericCell ref={ref} sx={sxProbe} colSpan={2}>x</NumericCell></tr></tbody></table>);
    expect(ref.current?.tagName).toBe("TD");
    expect(screen.getByRole("cell")).toHaveStyle(sxProbeStyle);
    expect(screen.getByRole("cell")).toHaveAttribute("colspan", "2");
  });
});
