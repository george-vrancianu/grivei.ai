import type { Components, Theme } from "@mui/material/styles";
import { focusRing, hover, pressed, selected } from "./states.ts";
import { color, font, radius, size, type } from "./tokens.ts";

/** Taps and clicks under 44 px stay reachable: a transparent pseudo-element grows the hit area to 44 px tall. */
const touchTarget = { position: "relative", "&::after": { content: '""', position: "absolute", top: "50%", left: 0, right: 0, height: 44, transform: "translateY(-50%)" } } as const;

/** The selected treatment, for every control that is "on": a pressed toggle, a selected tab or toggle segment. */
const selectedState = "&[aria-pressed='true'], &.Mui-selected, &[aria-current='true']";

/**
 * Component defaults: every control carries the shared state treatments (focus ring, hover, pressed, selected) and the token
 * radii and heights, so a call site passes its props and nothing else. The fragments live in `states.ts` for components outside MUI.
 */
export const components: Components<Theme> = {
  MuiCssBaseline: {
    styleOverrides: {
      html: { colorScheme: "dark" },
      body: {
        backgroundColor: color.bg,
        backgroundImage: `radial-gradient(${color.bgDot} 1px, transparent 1px)`,
        backgroundSize: `${size.dotGrid}px ${size.dotGrid}px`,
      },
      "::selection": { backgroundColor: color.accent, color: color.onAccent },
    },
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
      outlined: { borderColor: color.lineStrong },
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
    styleOverrides: { root: { backgroundColor: color.panel, backgroundImage: "none", borderColor: color.line, borderRadius: radius.card } },
  },
  MuiPaper: {
    defaultProps: { elevation: 0 },
    styleOverrides: { root: { backgroundImage: "none" }, outlined: { borderColor: color.line } },
  },
  MuiTable: { defaultProps: { size: "small" } },
  MuiTableCell: {
    styleOverrides: {
      root: { borderBottomColor: color.line, fontSize: type.small.max },
      head: { fontFamily: font.mono, fontSize: type.meta.size, fontWeight: type.meta.weight, color: color.muted, backgroundColor: "transparent" },
    },
  },
  MuiTableRow: {
    styleOverrides: { root: { "&.MuiTableRow-hover:hover": { backgroundColor: color.line }, "&.Mui-selected, &.Mui-selected:hover": { backgroundColor: color.line } } },
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
      tooltip: { backgroundColor: color.bg, border: `1px solid ${color.lineStrong}`, borderRadius: radius.control, fontFamily: font.mono, fontSize: type.meta.size, lineHeight: type.meta.lineHeight, color: color.text2 },
      arrow: { color: color.bg, "&::before": { border: `1px solid ${color.lineStrong}`, boxSizing: "border-box" } },
    },
  },
  MuiTypography: {
    defaultProps: { variantMapping: { total: "p", stat: "p", money: "span", label: "span", meta: "span" } },
  },
};
