import { rgb } from "../../../testing/color.ts";
import { screen } from "@testing-library/react";
import { renderInUi } from "../../../testing/render.tsx";
import { sxProbe, sxProbeStyle } from "../../../testing/sx.ts";
import { color } from "../../../theme/tokens.ts";
import { STRIP_FILL } from "../../../theme/stripFill.ts";
import { TableBody } from "../../../atoms/TableBody/index.ts";
import { TableCell } from "../../../atoms/TableCell/index.ts";
import { TableHead } from "../../../atoms/TableHead/index.ts";
import { TableRow } from "../../../atoms/TableRow/index.ts";
import { NumericCell } from "../../atoms/NumericCell/index.ts";
import { Panel } from "../Panel/index.ts";
import { PanelTable } from "./index.ts";


const table = (props: Partial<React.ComponentProps<typeof PanelTable>> = {}) =>
  renderInUi(
    <Panel heading="Înregistrări" flush>
      <PanelTable label="Tabel" {...props}>
        <TableHead><TableRow><TableCell>Titlu</TableCell><NumericCell>Valoare</NumericCell></TableRow></TableHead>
        <TableBody><TableRow hover><TableCell>Achiziție</TableCell><NumericCell>1.234,50</NumericCell></TableRow></TableBody>
      </PanelTable>
    </Panel>,
  );

describe("PanelTable", () => {
  it("is a named, focusable region that scrolls sideways by itself and never grows past its panel", () => {
    table();
    const box = screen.getByRole("region", { name: "Tabel" });
    expect(box).toHaveAttribute("tabindex", "0");
    expect(box).toHaveStyle({ overflowX: "auto", maxWidth: "100%", minWidth: "0" });
  });
  it("gives the table a minimum width, so a wide one scrolls instead of squeezing", () => {
    table({ minWidth: 720 });
    expect(screen.getByRole("table")).toHaveStyle({ minWidth: "720px" });
  });
  it("styles the head row as a strip: fill, mono 12 muted, a hairline below, 12 px 14 px cells", () => {
    table();
    const head = getComputedStyle(screen.getByRole("columnheader", { name: "Titlu" }));
    expect(head.backgroundColor).toBe(STRIP_FILL);
    expect(head.fontSize).toBe("12px");
    expect(head.color).toBe(rgb(color.muted));
    expect(head.borderBottomColor).toBe(rgb(color.line));
    expect(head.borderBottomWidth).toBe("1px");
    expect(head.padding).toBe("12px 14px");
    expect(getComputedStyle(screen.getByRole("cell", { name: "Achiziție" })).padding).toBe("12px 14px");
  });
  it("fills a hovered row with raised through the theme's rule", () => {
    table();
    const row = screen.getByRole("cell", { name: "Achiziție" }).closest("tr")!;
    expect(row).toHaveClass("MuiTableRow-hover");
    const rules = [...document.querySelectorAll("style")].map((s) => s.textContent ?? "").join("");
    expect(rules).toContain(`.MuiTableRow-hover:hover{background-color:${color.raised};}`);
  });
  it("lets the table carry its own name beside the box's", () => {
    table({ "aria-label": "Achiziții" });
    expect(screen.getByRole("table", { name: "Achiziții" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Tabel" })).toBeInTheDocument();
  });
  it("leaves the denser cell paddings alone", () => {
    renderInUi(<table><tbody><tr><TableCell padding="none">a</TableCell><TableCell padding="checkbox" size="medium">b</TableCell></tr></tbody></table>);
    expect(getComputedStyle(screen.getByText("a")).padding).toBe("0px");
    expect(getComputedStyle(screen.getByText("b")).padding).toBe("0px 0px 0px 4px");
  });
  it("keeps MUI's own checkbox padding for a small cell, against the root padding", () => {
    renderInUi(<table><tbody><tr><TableCell padding="checkbox" size="small">c</TableCell><TableCell size="small">d</TableCell></tr></tbody></table>);
    const cell = getComputedStyle(screen.getByText("c"));
    expect(cell.padding).toBe("0px 12px 0px 16px");
    expect(cell.width).toBe("24px");
    expect(getComputedStyle(screen.getByText("d")).padding).toBe("12px 14px");
  });
  it("passes Table props and sx through", () => {
    table({ sx: sxProbe, size: "medium" });
    expect(screen.getByRole("table")).toHaveStyle(sxProbeStyle);
  });
});
