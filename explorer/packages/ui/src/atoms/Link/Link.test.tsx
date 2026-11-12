import { screen } from "@testing-library/react";
import { expectTypeOf } from "vitest";
import { renderInUi } from "../../testing/render.tsx";
import { sxProbe, sxProbeStyle } from "../../testing/sx.ts";
import { Link, type LinkProps } from "./index.ts";

describe("Link", () => {
  it("passes MUI props (href, underline) and sx through", () => {
    renderInUi(<Link href="/entity/1" underline="always" sx={sxProbe}>Primăria Cluj-Napoca</Link>);
    const link = screen.getByRole("link", { name: "Primăria Cluj-Napoca" });
    expect(link).toHaveAttribute("href", "/entity/1");
    expect(link).toHaveClass("MuiLink-underlineAlways");
    expect(link).toHaveStyle(sxProbeStyle);
  });
  it("adds rel=noopener noreferrer to links that open a new tab", () => {
    renderInUi(<Link href="https://example.org" target="_blank">Sursa</Link>);
    expect(screen.getByRole("link", { name: "Sursa" })).toHaveAttribute("rel", "noopener noreferrer");
  });
  it("keeps a caller-supplied rel and adds the safe tokens", () => {
    renderInUi(<Link href="https://example.org" target="_blank" rel="nofollow">Sursa</Link>);
    expect(screen.getByRole("link", { name: "Sursa" })).toHaveAttribute("rel", "nofollow noopener noreferrer");
  });
  it("leaves rel alone for same-tab links", () => {
    renderInUi(<Link href="/x">Aici</Link>);
    expect(screen.getByRole("link", { name: "Aici" })).not.toHaveAttribute("rel");
  });
  it("accepts MUI props at the type level", () => {
    expectTypeOf<LinkProps>().toHaveProperty("underline");
    expectTypeOf<LinkProps>().toHaveProperty("sx");
    // @ts-expect-error not a Link prop
    <Link nonsense="x" />;
  });
});
