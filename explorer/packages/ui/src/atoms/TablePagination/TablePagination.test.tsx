import { screen } from "@testing-library/react";
import { expectTypeOf } from "vitest";
import { renderInUi } from "../../testing/render.tsx";
import { sxProbe, sxProbeStyle } from "../../testing/sx.ts";
import { TablePagination, type TablePaginationProps } from "./index.ts";

describe("TablePagination", () => {
  it("passes MUI props (count, page, rowsPerPage) and sx through", () => {
    renderInUi(
      <table><tbody><tr>
        <TablePagination count={95} page={1} rowsPerPage={25} onPageChange={() => {}} rowsPerPageOptions={[25, 50]} sx={sxProbe} data-testid="p" />
      </tr></tbody></table>,
    );
    expect(screen.getByText("26–50 of 95")).toBeVisible();
    expect(screen.getByTestId("p")).toHaveStyle(sxProbeStyle);
  });
  it("shows its built-in strings in Romanian when the provider locale is ro", () => {
    renderInUi(
      <table><tbody><tr>
        <TablePagination count={95} page={0} rowsPerPage={25} onPageChange={() => {}} rowsPerPageOptions={[25, 50]} />
      </tr></tbody></table>,
      "ro",
    );
    expect(screen.getByText(/Rânduri pe pagină/)).toBeVisible();
  });
  it("accepts MUI props at the type level", () => {
    expectTypeOf<TablePaginationProps>().toHaveProperty("sx");
    expectTypeOf<TablePaginationProps>().toHaveProperty("className");
    // @ts-expect-error not a TablePagination prop
    <TablePagination nonsense="x" />;
  });
});
