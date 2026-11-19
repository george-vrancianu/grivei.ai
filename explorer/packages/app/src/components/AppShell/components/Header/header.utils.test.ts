import { createGriveiTheme } from "@grivei/ui";
import { describe, expect, it } from "vitest";
import { footerSx } from "../Footer/footer.utils.ts";
import { headerSx } from "./header.utils.ts";

const theme = createGriveiTheme();
const md = theme.breakpoints.up("md");

describe("the header's frame", () => {
  const sx = headerSx(theme) as Record<string, unknown>;
  it("scrolls away below md: the base style has no position", () => {
    expect(sx).not.toHaveProperty("position");
    expect(sx).not.toHaveProperty("backdropFilter");
  });
  it("is sticky, translucent, blurred and shadowed from md up, above the modal layer", () => {
    expect(sx[md]).toMatchObject({
      position: "sticky",
      top: 0,
      bgcolor: theme.graf.headerFill,
      backdropFilter: "blur(10px)",
      boxShadow: theme.graf.shadow.header,
    });
    expect((sx[md] as { zIndex: number }).zIndex).toBeGreaterThan(theme.zIndex.modal);
  });
  it("is as tall as the header-height token the sticky offsets are derived from", () => {
    expect(sx[md]).toMatchObject({ minHeight: theme.graf.layout.headerHeight });
  });
});

describe("the footer's frame", () => {
  it("takes the header's translucent fill and blur", () => {
    expect(footerSx(theme)).toMatchObject({ bgcolor: theme.graf.headerFill, backdropFilter: "blur(10px)" });
  });
});
