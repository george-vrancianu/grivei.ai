import { type Components, type Theme } from "@mui/material/styles";
import { shimmer } from "./motion.ts";
import { focusRing, hover, pressed, selected } from "./states.ts";
import { STRIP_FILL } from "./stripFill.ts";
import { color, font, layout, radius, shadow, size, type } from "./tokens.ts";

/** Taps and clicks under 44 px stay reachable: a transparent pseudo-element grows the hit area to 44 px tall. */
const touchTarget = { position: "relative", "&::after": { content: '""', position: "absolute", top: "50%", left: 0, right: 0, height: 44, transform: "translateY(-50%)" } } as const;


/** The selected treatment, for every control that is "on": a pressed toggle, a selected tab or toggle segment. */
const selectedState = "&[aria-pressed='true'], &.Mui-selected, &[aria-current='true']";

/** What floats over the page (menus, popovers; tooltips take the same in their own slot): the overlay fill, a strong hairline, the card radius and the overlay shadow. */
const overlaySurface = {
  backgroundColor: color.overlay,
  backgroundImage: "none",
  border: `1px solid ${color.lineStrong}`,
  borderRadius: radius.card,
  boxShadow: shadow.overlay,
} as const;

/**
 * Component defaults: every control carries the shared state treatments (focus ring, hover, pressed, selected) and the token
 * radii and heights, so a call site passes its props and nothing else. The fragments live in `states.ts` for components outside MUI.
 */
export const components: Components<Theme> = {
  MuiCssBaseline: {
    styleOverrides: (theme) => ({
      // The sticky header (md up) covers the top of the viewport: an in-page anchor scrolls to just below it (the header's height plus a gap each side of the target).
      html: { colorScheme: "dark", [theme.breakpoints.up("md")]: { scrollPaddingTop: layout.headerScrollPadding } },
      body: {
        backgroundColor: color.bg,
        backgroundImage: `radial-gradient(${color.bgDot} 1px, transparent 1px)`,
        backgroundSize: `${size.dotGrid}px ${size.dotGrid}px`,
      },
      "::selection": { backgroundColor: color.accent, color: color.onAccent },
    }),
  },
  MuiButtonBase: {
    styleOverrides: { root: { "&.Mui-focusVisible": focusRing } },
  },
  MuiButton: {
    defaultProps: { disableElevation: true },
    styleOverrides: {
      root: {
        minHeight: size.primaryAction,
        borderRadius: radius.control,
        "&:hover": hover,
        "&:active": pressed,
        [selectedState]: selected,
        "&.MuiButton-containedPrimary": {
          "&:hover": { backgroundColor: color.accentHover, color: color.onAccent },
          "&:active": { backgroundColor: color.accentPressed, color: color.onAccent },
          [selectedState]: { backgroundColor: color.accent, color: color.onAccent, boxShadow: `inset 0 0 0 2px ${color.text}` },
        },
      },
      sizeSmall: { minHeight: size.toggle, padding: "0 12px" },
      outlined: { borderColor: color.lineStrong, backgroundColor: color.raised, boxShadow: shadow.raised, "&.Mui-disabled": { boxShadow: "none" } },
    },
  },
  MuiIconButton: {
    styleOverrides: { root: { borderRadius: radius.control, "&:hover": hover, "&:active": pressed, [selectedState]: selected } },
  },
  MuiToggleButton: {
    styleOverrides: {
      root: {
        minHeight: size.toggle,
        padding: "0 14px",
        borderRadius: radius.chip,
        border: 0,
        color: color.text2,
        "&:hover": hover,
        "&:active": pressed,
        "&.Mui-selected, &.Mui-selected:hover": selected,
      },
    },
  },
  MuiToggleButtonGroup: {
    styleOverrides: {
      root: { gap: 2, padding: 2, border: `1px solid ${color.lineStrong}`, borderRadius: radius.control },
      grouped: { border: 0, borderRadius: radius.chip, "&:not(:first-of-type), &:not(:last-of-type)": { borderRadius: radius.chip, margin: 0 } },
    },
  },
  MuiLink: {
    defaultProps: { underline: "always" },
    styleOverrides: {
      root: {
        color: color.accent,
        textDecorationColor: "currentColor",
        textUnderlineOffset: "0.2em",
        borderRadius: radius.cell,
        "&:hover": { color: color.accentHover },
        "&:active": { color: color.accentPressed },
        "&:focus-visible": focusRing,
      },
    },
  },
  MuiChip: {
    defaultProps: {},
    styleOverrides: {
      root: {
        fontFamily: font.mono,
        fontSize: type.label.size,
        "&.MuiChip-clickable:hover": { backgroundColor: color.line },
        "&.MuiChip-clickable:active": { backgroundColor: color.lineStrong },
        "&.MuiChip-clickable.MuiChip-colorPrimary:hover": { backgroundColor: color.accentHover },
        "&.MuiChip-clickable.MuiChip-colorPrimary:active": { backgroundColor: color.accentPressed },
        "&.MuiChip-sizeSmall .MuiChip-label": { paddingLeft: 10, paddingRight: 10 },
        "&.MuiChip-sizeSmall.MuiChip-outlined": { borderColor: color.line, color: color.text2 },
        "&.MuiChip-root[aria-pressed='true']": selected,
      },
      sizeMedium: { height: size.filterChip, borderRadius: radius.filterPill },
      sizeSmall: { height: size.badgeChip, borderRadius: radius.chip, fontSize: type.meta.size, ...touchTarget },
      outlined: { borderColor: color.lineStrong, color: color.text },
      label: { paddingLeft: 14, paddingRight: 14 },
    },
    variants: [
      {
        props: { variant: "filled", color: "default" },
        style: { backgroundColor: color.panel, border: `1px solid ${color.lineStrong}`, color: color.text },
      },
    ],
  },
  MuiTabs: {
    defaultProps: { variant: "scrollable", scrollButtons: "auto" },
    styleOverrides: {
      root: { minHeight: size.tab, borderBottom: `1px solid ${color.line}` },
      indicator: { height: 2, backgroundColor: color.accent },
    },
  },
  MuiTab: {
    styleOverrides: {
      root: {
        minHeight: size.tab,
        minWidth: 0,
        padding: "0 2px",
        marginRight: 28,
        fontFamily: font.mono,
        fontSize: type.tab.size,
        fontWeight: type.tab.weight,
        color: color.muted,
        "&:hover": { color: color.text },
        "&:active": { color: color.text, backgroundColor: color.line },
        "&.Mui-selected": { color: color.text },
        "&.Mui-focusVisible": { ...focusRing, outlineOffset: -2 },
      },
    },
  },
  MuiCard: {
    defaultProps: { variant: "outlined" },
    styleOverrides: { root: { backgroundColor: color.panel, backgroundImage: "none", borderColor: color.line, borderRadius: radius.card, boxShadow: shadow.panel } },
  },
  MuiPaper: {
    defaultProps: { elevation: 0 },
    styleOverrides: { root: { backgroundImage: "none" }, outlined: { borderColor: color.line } },
  },
  MuiTable: { defaultProps: { size: "small" } },
  MuiTableCell: {
    styleOverrides: {
      root: { borderBottomColor: color.line, fontSize: type.small.max, padding: "12px 14px" },
      // The denser paddings keep their own (the root padding would otherwise reach them: overrides apply after MUI's variants).
      paddingNone: { padding: 0 },
      paddingCheckbox: { padding: "0 0 0 4px" },
      head: { fontFamily: font.mono, fontSize: type.meta.size, fontWeight: type.meta.weight, color: color.muted, backgroundColor: STRIP_FILL },
    },
  },
  MuiTableRow: {
    styleOverrides: { root: { "&.MuiTableRow-hover:hover": { backgroundColor: color.raised }, "&.Mui-selected, &.Mui-selected:hover": { backgroundColor: color.line } } },
  },
  MuiTextField: { defaultProps: { size: "small", variant: "outlined" } },
  MuiOutlinedInput: {
    styleOverrides: {
      root: {
        backgroundColor: color.panel,
        borderRadius: radius.card,
        fontFamily: font.mono,
        "& .MuiOutlinedInput-notchedOutline": { borderColor: color.lineStrong },
        "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: color.muted },
        "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: color.accent, borderWidth: 2 },
      },
    },
  },
  MuiTooltip: {
    defaultProps: { arrow: true },
    styleOverrides: {
      tooltip: { backgroundColor: color.overlay, boxShadow: shadow.overlay, border: `1px solid ${color.lineStrong}`, borderRadius: radius.control, fontFamily: font.mono, fontSize: type.meta.size, lineHeight: type.meta.lineHeight, color: color.text2 },
      arrow: { color: color.overlay, "&::before": { border: `1px solid ${color.lineStrong}`, boxSizing: "border-box" } },
    },
  },
  // The menu sits 8 px below its anchor, with 6 px of padding and 2 px between items.
  MuiMenu: { styleOverrides: { paper: { ...overlaySurface, marginTop: 8 }, list: { padding: 6, display: "flex", flexDirection: "column", gap: 2 } } },
  // An item is 40 px tall with a 4 px radius: text2 unchosen, text when chosen (its check mark is the owner's, amber).
  MuiMenuItem: {
    styleOverrides: {
      root: {
        minHeight: size.menuItem,
        borderRadius: radius.control,
        padding: "0 10px",
        gap: 16,
        justifyContent: "space-between",
        whiteSpace: "nowrap",
        color: color.text2,
        "&:hover": hover,
        "&:active": pressed,
        "&.Mui-focusVisible": { ...hover, ...focusRing },
        "&[aria-checked='true'], &.Mui-selected": { backgroundColor: "transparent", color: color.text, "&:hover": hover, "&.Mui-focusVisible": { ...hover, ...focusRing } },
      },
    },
  },
  MuiPopover: { styleOverrides: { paper: overlaySurface } },
  // A placeholder block: the `raised` fill with a `line` band sweeping across it. Both the sweep and MUI's own motion stop under reduced motion.
  MuiSkeleton: {
    defaultProps: { animation: "wave" },
    styleOverrides: {
      root: { backgroundColor: color.raised },
      wave: {
        "&::after": { background: `linear-gradient(90deg, transparent, ${color.line}, transparent)`, animation: `${shimmer} 1.6s linear infinite`, "@media (prefers-reduced-motion: reduce)": { animation: "none" } },
      },
    },
  },
  MuiTypography: {
    defaultProps: { variantMapping: { lead: "p", total: "p", stat: "p", money: "span", label: "span", meta: "span" } },
  },
};
