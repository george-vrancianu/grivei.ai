import { screen } from "@testing-library/react";
import { expectTypeOf } from "vitest";
import { renderInUi } from "../../testing/render.tsx";
import { sxProbe, sxProbeStyle } from "../../testing/sx.ts";
import { Tooltip, type TooltipProps } from "./index.ts";

describe("Tooltip", () => {
  it("passes MUI props (title, placement) and shows the title on hover", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    renderInUi(
      <Tooltip title="Valoare estimată" placement="bottom">
        <button type="button">Total</button>
      </Tooltip>,
    );
    await userEvent.hover(screen.getByRole("button", { name: "Valoare estimată" }));
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Valoare estimată");
  });
  it("works on a disabled child", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    renderInUi(
      <Tooltip title="Indisponibil momentan">
        <button type="button" disabled>Descarcă</button>
      </Tooltip>,
    );
    await userEvent.hover(screen.getByRole("button", { name: "Descarcă" }).parentElement!);
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Indisponibil momentan");
  });
  it("accepts MUI props at the type level", () => {
    expectTypeOf<TooltipProps>().toHaveProperty("title");
    expectTypeOf<TooltipProps>().toHaveProperty("placement");
    expectTypeOf<TooltipProps>().toHaveProperty("sx");
  });
});
