import { describe, expect, it } from "vitest";
import { createGriveiTheme } from "./index.ts";
import { color, font, headerFill, layout, logoShadow, map, radius, shadow, size } from "./tokens.ts";

/** WCAG 2.x relative luminance and contrast ratio of two #rrggbb colours. */
function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
};

const theme = createGriveiTheme();

describe("the theme is built from the tokens", () => {
  it("maps the palette to the token colours", () => {
    const { palette } = theme;
    expect(palette.mode).toBe("dark");
    expect(palette.background.default).toBe(color.bg);
    expect(palette.background.paper).toBe(color.panel);
    expect(palette.primary.main).toBe(color.accent);
    expect(palette.primary.light).toBe(color.accentHover);
    expect(palette.primary.dark).toBe(color.accentPressed);
    expect(palette.secondary.main).toBe(color.text2);
    expect(palette.secondary.contrastText).toBe(color.bg);
    expect(palette.primary.contrastText).toBe(color.onAccent);
    expect(palette.text.primary).toBe(color.text);
    expect(palette.text.secondary).toBe(color.text2);
    expect(palette.text.disabled).toBe(color.muted);
    expect(palette.divider).toBe(color.line);
  });

  it("exposes every named colour, idle among them, equal to its token", () => {
    for (const name of ["bg", "panel", "line", "lineStrong", "text", "text2", "muted", "accent", "idle"] as const) {
      expect(theme.palette.graf[name]).toBe(color[name]);
    }
    expect(Object.keys(theme.palette.graf).sort()).toEqual(Object.keys(color).sort());
  });

  it("has raised and overlay surfaces, named apart from bgDot and the map's none class but of the same values", () => {
    expect(theme.palette.graf.raised).toBe(color.bgDot);
    expect(theme.palette.graf.overlay).toBe(map.none);
    expect(Object.keys(theme.palette.graf)).toEqual(expect.arrayContaining(["raised", "overlay"]));
  });

  it("has the shadow group: panel, raised, overlay, well and header", () => {
    expect(Object.keys(theme.graf.shadow).sort()).toEqual(["header", "overlay", "panel", "raised", "well"]);
    expect(theme.graf.shadow).toEqual(shadow);
    expect(theme.graf.logoShadow).toBe(logoShadow);
    expect(theme.graf.headerFill).toBe(headerFill);
  });

  it("exposes the radii, control heights and font stacks of the tokens", () => {
    expect(theme.graf.radius).toEqual(radius);
    expect(theme.graf.size).toEqual(size);
    expect(theme.graf.font).toEqual(font);
    expect(theme.graf.layout).toEqual(layout);
    expect(theme.graf.radius.filterPill).toBe(20);
    expect(theme.graf.size.badgeChip).toBe(32);
    expect(theme.graf.size.filterChip).toBe(40);
  });

  it("uses Space Grotesk for titles and big numbers, Inter for text, Plex Mono for labels, codes and money", () => {
    const { typography } = theme;
    for (const variant of ["h1", "h2", "h3", "total", "stat"] as const) expect(typography[variant].fontFamily).toBe(font.display);
    for (const variant of ["h1", "h2", "total", "stat"] as const) expect(typography[variant].fontWeight).toBe(600);
    for (const variant of ["body1", "body2", "subtitle1"] as const) expect(typography[variant].fontFamily).toBe(font.body);
    for (const variant of ["label", "meta", "caption", "overline", "button", "money"] as const) expect(typography[variant].fontFamily).toBe(font.mono);
  });

  it("has a money variant in Plex Mono with tabular figures", () => {
    expect(theme.typography.money).toMatchObject({ fontFamily: font.mono, fontVariantNumeric: "tabular-nums" });
  });
});

/** Every `color` value in a nested style object (the component overrides and variants): the text colours of the controls. */
function textColours(node: unknown, path = "components"): [string, string][] {
  if (typeof node !== "object" || node === null) return [];
  return Object.entries(node).flatMap(([key, value]) =>
    key === "color" && typeof value === "string" ? [[path, value] as [string, string]] : textColours(value, `${path}.${key}`),
  );
}

describe("contrast on the dark ground", () => {
  const readable = [
    ["text", color.text],
    ["text2", color.text2],
    ["muted", color.muted],
  ] as const;

  it.each(readable)("%s reaches 4.5:1 on bg and on panel", (name, value) => {
    expect(contrast(value, color.bg), `${name} on bg`).toBeGreaterThanOrEqual(4.5);
    expect(contrast(value, color.panel), `${name} on panel`).toBeGreaterThanOrEqual(4.5);
  });

  it("reaches 4.5:1 for the accent on bg and on panel (links, the total)", () => {
    expect(contrast(color.accent, color.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(color.accent, color.panel)).toBeGreaterThanOrEqual(4.5);
  });

  it("puts the contrast text of an accent fill on the accent at 4.5:1", () => {
    expect(contrast(theme.palette.primary.contrastText, theme.palette.primary.main)).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps idle for marks: no text colour and no typography variant resolves to it", () => {
    const idle = color.idle.toLowerCase();
    const { palette, typography } = theme;
    const textColours = [palette.text.primary, palette.text.secondary, palette.text.disabled, palette.primary.main, palette.primary.contrastText];
    for (const value of textColours) expect(value.toLowerCase()).not.toBe(idle);
    for (const [name, style] of Object.entries(typography)) {
      if (typeof style !== "object" || style === null) continue;
      const colour = (style as { color?: unknown }).color;
      if (typeof colour === "string") expect(colour.toLowerCase(), `typography.${name}`).not.toBe(idle);
    }
  });

  it("keeps idle off every control's text: no component override colours text with it", () => {
    const found = textColours(theme.components);
    expect(found.length).toBeGreaterThan(5);
    for (const [path, value] of found) expect(value.toLowerCase(), path).not.toBe(color.idle.toLowerCase());
  });

  it("states no hex of its own for text: every typography colour is a token", () => {
    const tokens = new Set(Object.values(color).map((c) => c.toLowerCase()));
    for (const [name, style] of Object.entries(theme.typography)) {
      const colour = typeof style === "object" && style !== null ? (style as { color?: unknown }).color : undefined;
      if (typeof colour === "string") expect(tokens.has(colour.toLowerCase()), `typography.${name} = ${colour}`).toBe(true);
    }
  });
});

describe("the chips on the main screen", () => {
  const chip = theme.components?.MuiChip?.styleOverrides as Record<string, Record<string, unknown>>;
  it("makes filter chips 40 px pills and badge chips flat 32 px chips", () => {
    expect(chip["sizeMedium"]).toMatchObject({ height: size.filterChip, borderRadius: radius.filterPill });
    expect(chip["sizeSmall"]).toMatchObject({ height: size.badgeChip, borderRadius: radius.chip });
    expect(chip["sizeSmall"]).not.toHaveProperty("boxShadow");
  });
  it("gives a badge chip a hit area 44 px tall, beyond its 32 px", () => {
    expect(chip["sizeSmall"]?.["&::after"]).toMatchObject({ height: 44, position: "absolute" });
  });
});

describe("depth", () => {
  const components = theme.components ?? {};
  const root = (name: "MuiCard" | "MuiButton" | "MuiMenu" | "MuiPopover" | "MuiTooltip", slot: string) =>
    ((components[name]?.styleOverrides as Record<string, Record<string, unknown>> | undefined)?.[slot] ?? {}) as Record<string, unknown>;

  it("gives every Card the panel fill, a hairline border, the card radius and the panel shadow", () => {
    expect(root("MuiCard", "root")).toMatchObject({ backgroundColor: color.panel, borderColor: color.line, borderRadius: radius.card, boxShadow: shadow.panel });
  });

  it("gives outlined buttons the raised surface and shadow", () => {
    expect(root("MuiButton", "outlined")).toMatchObject({ backgroundColor: color.raised, boxShadow: shadow.raised });
  });

  it("gives tooltips, menus and popovers the overlay surface and shadow", () => {
    expect(root("MuiTooltip", "tooltip")).toMatchObject({ backgroundColor: color.overlay, boxShadow: shadow.overlay });
    expect(root("MuiTooltip", "arrow")).toMatchObject({ color: color.overlay });
    expect(root("MuiMenu", "paper")).toMatchObject({ backgroundColor: color.overlay, boxShadow: shadow.overlay, borderRadius: radius.card });
    expect(root("MuiPopover", "paper")).toMatchObject({ backgroundColor: color.overlay, boxShadow: shadow.overlay, borderRadius: radius.card });
  });

  it("leaves the selected and focus treatments as they were", () => {
    expect(theme.graf.states.selected).toEqual({ backgroundColor: color.line, color: color.text, boxShadow: `inset 0 0 0 1px ${color.accent}` });
    expect(theme.graf.states.focusRing).toEqual({ outline: `2px solid ${color.text}`, outlineOffset: 2 });
  });
});
