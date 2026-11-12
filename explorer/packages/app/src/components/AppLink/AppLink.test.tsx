import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { AppLink } from "./index.ts";

afterEach(() => window.history.replaceState(null, "", "/"));

describe("AppLink", () => {
  it("follows a plain click without a page load, adding a history entry", async () => {
    const before = window.history.length;
    render(<AppLink href="/explore/coverage?q=a">Coverage</AppLink>);
    await userEvent.click(screen.getByRole("link", { name: "Coverage" }));
    expect(window.location.pathname + window.location.search).toBe("/explore/coverage?q=a");
    expect(window.history.length).toBe(before + 1);
  });

  it("leaves a modified click to the browser", async () => {
    render(<AppLink href="/explore/coverage">Coverage</AppLink>);
    const user = userEvent.setup();
    await user.keyboard("{Control>}");
    await user.click(screen.getByRole("link", { name: "Coverage" }));
    expect(window.location.pathname).toBe("/");
  });
});
