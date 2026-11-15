import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { UiProvider } from "@grivei/ui";
import { MapBackLink } from "./index.ts";

describe("MapBackLink", () => {
  it("is a button named by its text (the chevron is decorative) and reports the click", async () => {
    const onClick = vi.fn();
    render(
      <UiProvider locale="en">
        <MapBackLink onClick={onClick}>Back to Romania</MapBackLink>
      </UiProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Back to Romania" }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
