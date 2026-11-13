import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderInUi } from "../../../testing/render.tsx";
import { sampleCopy } from "../../samples/copy.ts";
import { SignalOrderToggle } from "./index.ts";

describe("SignalOrderToggle", () => {
  it("shows by date pressed in a named group, and by RON not", () => {
    renderInUi(<SignalOrderToggle value="DATE_DESC" onChange={() => {}} copy={sampleCopy.signalOrder("en")} />);
    expect(screen.getByRole("group", { name: "Order Signals" })).toBeVisible();
    expect(screen.getByRole("button", { name: "by date", pressed: true })).toBeVisible();
    expect(screen.getByRole("button", { name: "by RON", pressed: false })).toBeVisible();
  });

  it("shows by RON pressed when that is the value, in Romanian too", () => {
    renderInUi(<SignalOrderToggle value="VALUE_DESC" onChange={() => {}} copy={sampleCopy.signalOrder("ro")} />, "ro");
    expect(screen.getByRole("group", { name: "Ordinea Semnalelor" })).toBeVisible();
    expect(screen.getByRole("button", { name: "după RON", pressed: true })).toBeVisible();
    expect(screen.getByRole("button", { name: "după dată", pressed: false })).toBeVisible();
  });

  it("emits the order clicked", async () => {
    const onChange = vi.fn();
    renderInUi(<SignalOrderToggle value="DATE_DESC" onChange={onChange} copy={sampleCopy.signalOrder("en")} />);
    await userEvent.click(screen.getByRole("button", { name: "by RON" }));
    expect(onChange).toHaveBeenCalledExactlyOnceWith("VALUE_DESC");
  });
});
