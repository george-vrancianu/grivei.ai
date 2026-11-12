// Draft MUI theme options for the A · Graf look.
// Starting point for the UI library (issue #40, ADR 0006). It was written from the
// design, not compiled against @mui/material: pass it to createTheme() there and fix
// what the types reject. Values match tokens.json.

const color = {
  bg: '#0D1014',
  bgDot: '#1A212A',
  panel: '#141920',
  line: '#27303B',
  lineStrong: '#3A4552',
  text: '#E8EBEF',
  text2: '#B8C0CA',
  muted: '#9BA5B1',
  idle: '#6B7683',
  accent: '#F2B33D',
  accentHover: '#FFD27A',
  onAccent: '#0D1014',
} as const;

const font = {
  display: '"Space Grotesk", Inter, system-ui, sans-serif',
  body: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  mono: '"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
} as const;

export const grafThemeOptions = {
  palette: {
    mode: 'dark',
    primary: { main: color.accent, light: color.accentHover, contrastText: color.onAccent },
    background: { default: color.bg, paper: color.panel },
    text: { primary: color.text, secondary: color.text2, disabled: color.muted },
    divider: color.line,
  },
  shape: { borderRadius: 4 },
  typography: {
    fontFamily: font.body,
    fontSize: 15,
    h1: { fontFamily: font.display, fontWeight: 600, fontSize: 'clamp(30px, 3.6vw, 44px)', lineHeight: 1.1, letterSpacing: '-0.02em' },
    h2: { fontFamily: font.display, fontWeight: 600, fontSize: '24px', lineHeight: 1.2 },
    h3: { fontFamily: font.display, fontWeight: 600, fontSize: '19px', lineHeight: 1.25 },
    body1: { fontSize: '15px', lineHeight: 1.45 },
    body2: { fontSize: '13px', lineHeight: 1.45 },
    caption: { fontFamily: font.mono, fontSize: '12px', lineHeight: 1.5 },
    overline: { fontFamily: font.mono, fontSize: '13px', lineHeight: 1.45, textTransform: 'none', letterSpacing: 0 },
    button: { fontFamily: font.mono, fontSize: '13px', fontWeight: 600, textTransform: 'none' },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: color.bg,
          backgroundImage: `radial-gradient(${color.bgDot} 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0, variant: 'outlined' },
      styleOverrides: { root: { backgroundImage: 'none', borderColor: color.line, borderRadius: 6 } },
    },
    MuiLink: { defaultProps: { underline: 'always' }, styleOverrides: { root: { color: color.accent, '&:hover': { color: color.accentHover } } } },
    MuiTabs: { styleOverrides: { indicator: { height: 2, backgroundColor: color.accent } } },
    MuiTab: {
      styleOverrides: {
        root: { minHeight: 48, minWidth: 0, padding: 0, marginRight: 28, fontFamily: font.mono, fontSize: '14px', fontWeight: 400, textTransform: 'none', color: color.muted, '&.Mui-selected': { color: color.text } },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { height: 40, borderRadius: 20, fontFamily: font.mono, fontSize: '13px', backgroundColor: color.panel, border: `1px solid ${color.lineStrong}` },
        sizeSmall: { height: 32, borderRadius: 4, backgroundColor: 'transparent', borderColor: color.line, color: color.text2, fontSize: '12px' },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: { backgroundColor: color.panel, borderRadius: 6, fontFamily: font.mono, '& .MuiOutlinedInput-notchedOutline': { borderColor: color.lineStrong } },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: { minHeight: 36, padding: '0 14px', border: 0, borderRadius: 3, fontFamily: font.mono, fontSize: '13px', textTransform: 'none', color: color.text2, '&.Mui-selected': { backgroundColor: color.line, color: color.text } },
      },
    },
    MuiTooltip: {
      styleOverrides: { tooltip: { backgroundColor: color.bg, border: `1px solid ${color.lineStrong}`, borderRadius: 4, fontFamily: font.mono, fontSize: '12px', lineHeight: 1.5, color: color.text2 } },
    },
  },
} as const;

export const grafColor = color;
export const grafFont = font;
