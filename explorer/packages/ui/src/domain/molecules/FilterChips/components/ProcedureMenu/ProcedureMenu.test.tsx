import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderInUi } from "../../../../../testing/render.tsx";
import { sampleCopy } from "../../../../samples/copy.ts";
import { ProcedureMenu } from "./index.ts";

const sample = sampleCopy.filterChips("en");
const procedures = ["Achiziție directă", "Licitație deschisă", "Negociere fără publicare prealabilă"];
const setup = (list: string[], selected?: string[], onToggle = vi.fn()) => {
  renderInUi(<ProcedureMenu procedures={list} selected={selected} onToggle={onToggle} copy={sample.procedure} unsetLabel={sample.menuAny} picked={sample.picked} />);
  return onToggle;
};
const button = () => screen.getByRole("button", { name: /Procedure/, hidden: true });

describe("ProcedureMenu", () => {
  it("shows Any, the one pick's name, or the count on the button", () => {
    const { unmount } = renderInUi(<ProcedureMenu procedures={procedures} selected={undefined} onToggle={() => {}} copy={sample.procedure} unsetLabel="Any" picked={sample.picked} />);
    expect(button()).toHaveTextContent("Procedure Any");
    unmount();
    const one = renderInUi(<ProcedureMenu procedures={procedures} selected={["Licitație deschisă"]} onToggle={() => {}} copy={sample.procedure} unsetLabel="Any" picked={sample.picked} />);
    expect(button()).toHaveTextContent("Procedure Licitație deschisă");
    one.unmount();
    renderInUi(<ProcedureMenu procedures={procedures} selected={["Licitație deschisă", "Achiziție directă"]} onToggle={() => {}} copy={sample.procedure} unsetLabel="Any" picked={sample.picked} />);
    expect(button()).toHaveTextContent("Procedure 2 picked");
  });

  it("lists the procedures as published as checkbox items, several chosen at once", async () => {
    setup(procedures, ["Licitație deschisă", "Achiziție directă"]);
    await userEvent.click(button());
    expect(screen.getByRole("menuitemcheckbox", { name: "Licitație deschisă", checked: true })).toBeVisible();
    expect(screen.getByRole("menuitemcheckbox", { name: "Achiziție directă", checked: true })).toBeVisible();
    expect(screen.getByRole("menuitemcheckbox", { name: "Negociere fără publicare prealabilă", checked: false })).toBeVisible();
  });

  it("reports the procedure clicked and stays open", async () => {
    const onToggle = setup(procedures);
    await userEvent.click(button());
    await userEvent.click(screen.getByRole("menuitemcheckbox", { name: "Achiziție directă" }));
    expect(onToggle).toHaveBeenCalledExactlyOnceWith("Achiziție directă");
    expect(screen.getByRole("menu")).toBeVisible();
  });

  it("says so, as the only line and disabled, when there is nothing to choose from", async () => {
    setup([]);
    await userEvent.click(button());
    const line = screen.getByRole("menuitem", { name: "No procedures to choose from." });
    expect(line).toHaveAttribute("aria-disabled", "true");
    expect(screen.getAllByRole("menuitem")).toHaveLength(1);
    expect(screen.queryByRole("menuitemcheckbox")).toBeNull();
  });
});
