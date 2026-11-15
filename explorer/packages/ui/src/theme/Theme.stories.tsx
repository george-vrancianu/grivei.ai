import type { Meta, StoryObj } from "@storybook/react-vite";
import { useTheme } from "@mui/material/styles";
import { Box } from "../atoms/Box/index.ts";
import { Button } from "../atoms/Button/index.ts";
import { Chip } from "../atoms/Chip/index.ts";
import { Link } from "../atoms/Link/index.ts";
import { Stack } from "../atoms/Stack/index.ts";
import { Tab } from "../atoms/Tab/index.ts";
import { Tabs } from "../atoms/Tabs/index.ts";
import { ToggleButton } from "../atoms/ToggleButton/index.ts";
import { ToggleButtonGroup } from "../atoms/ToggleButtonGroup/index.ts";
import { Typography } from "../atoms/Typography/index.ts";
import { pick } from "../workbench/index.ts";
import type { ColorName, shadow as grafShadow } from "./tokens.ts";

const meta: Meta = { title: "Theme/A · Graf" };
export default meta;
type Story = StoryObj;

function Swatches() {
  const { palette } = useTheme();
  return (
    <Stack direction="row" useFlexGap sx={{ flexWrap: "wrap", gap: 1.5 }}>
      {Object.entries(palette.graf).map(([name, value]) => (
        <Stack key={name} sx={{ width: 120, gap: 0.5 }}>
          <Box aria-hidden sx={{ height: 40, bgcolor: value, border: 1, borderColor: "divider", borderRadius: 1 }} />
          <Typography variant="label">{name}</Typography>
          <Typography variant="meta">{value}</Typography>
        </Stack>
      ))}
    </Stack>
  );
}

/** Every colour token, by name. `idle` is for marks and dashed lines only. */
export const Colours: Story = { render: () => <Swatches /> };

const SHADOW_NAMES = ["panel", "raised", "overlay", "well", "header"] as const satisfies readonly (keyof typeof grafShadow)[];
/** The colour each shadow is drawn on: the surface that takes it. */
const SHADOW_SURFACE = { panel: "panel", raised: "raised", overlay: "overlay", well: "bg", header: "bg" } as const satisfies Record<(typeof SHADOW_NAMES)[number], ColorName>;

function ShadowSamples({ locale }: { locale: unknown }) {
  const { graf, palette: { graf: palette } } = useTheme();
  return (
    <Stack direction="row" useFlexGap sx={{ flexWrap: "wrap", gap: 3, p: 2 }}>
      {SHADOW_NAMES.map((name) => (
        <Stack key={name} sx={{ width: 180, gap: 1 }}>
          <Box aria-hidden sx={{ height: 80, bgcolor: palette[SHADOW_SURFACE[name]], border: 1, borderColor: "divider", borderRadius: `${graf.radius.card}px`, boxShadow: graf.shadow[name] }} />
          <Typography variant="label">{name}</Typography>
          <Typography variant="meta" sx={{ overflowWrap: "anywhere" }}>{graf.shadow[name]}</Typography>
        </Stack>
      ))}
      <Typography variant="meta">{pick(locale, { en: "Logo disc shadow: ", ro: "Umbra discului logo: " })}{graf.logoShadow}</Typography>
    </Stack>
  );
}

/** The shadow group on the surface that takes each: panel (a Card), raised (an outlined button), overlay (menus, popovers, tooltips), well (inset areas), header (the sticky header). */
export const Shadows: Story = { render: (_args, { globals }) => <ShadowSamples locale={globals["locale"]} /> };

/** Every type variant, in its own face. */
export const Typographic: Story = {
  render: (_args, { globals }) => (
    <Stack sx={{ gap: 1.5 }}>
      <Typography variant="h1">{pick(globals["locale"], { en: "Explore public spending", ro: "Explorează cheltuielile publice" })}</Typography>
      <Typography variant="h2">{pick(globals["locale"], { en: "Section title", ro: "Titlu de secțiune" })}</Typography>
      <Typography variant="total">{pick(globals["locale"], { en: "RON 30.83 bn", ro: "30,83 mld. RON" })}</Typography>
      <Typography variant="stat">{pick(globals["locale"], { en: "148,220 Records", ro: "148.220 de contracte" })}</Typography>
      <Typography variant="body1">{pick(globals["locale"], { en: "Body text in Inter, 15 px.", ro: "Text de corp în Inter, 15 px, cu diacritice: ăâîșț." })}</Typography>
      <Typography variant="label">{pick(globals["locale"], { en: "label: nav, chips, toggles", ro: "etichetă: navigare, chipuri, comutatoare" })}</Typography>
      <Typography variant="meta">CAN1145000 · 2026-11-12</Typography>
      <Typography variant="money">{pick(globals["locale"], { en: "RON 503,740,000.00", ro: "503.740.000,00 RON" })}</Typography>
      <Typography variant="money">{pick(globals["locale"], { en: "RON 1,111,111.11", ro: "1.111.111,11 RON" })}</Typography>
    </Stack>
  ),
};

/** Focus (Tab to a control), hover and selected, on every control family. Press Tab to see the focus ring. */
export const States: Story = {
  render: (_args, { globals }) => (
    <Stack sx={{ gap: 3, alignItems: "flex-start" }}>
      <Stack direction="row" sx={{ gap: 1.5, flexWrap: "wrap" }}>
        <Button variant="contained">{pick(globals["locale"], { en: "Primary action", ro: "Acțiune principală" })}</Button>
        <Button variant="outlined">{pick(globals["locale"], { en: "Outlined", ro: "Contur" })}</Button>
        <Button variant="outlined" aria-pressed="true">{pick(globals["locale"], { en: "Pressed on", ro: "Apăsat" })}</Button>
        <Link href="#states">{pick(globals["locale"], { en: "A link", ro: "Un link" })}</Link>
      </Stack>
      <Stack direction="row" sx={{ gap: 1, flexWrap: "wrap" }}>
        <Chip clickable variant="outlined" label={pick(globals["locale"], { en: "Filter chip", ro: "Filtru" })} />
        <Chip clickable variant="outlined" aria-pressed="true" label={pick(globals["locale"], { en: "Selected filter", ro: "Filtru ales" })} />
        <Chip clickable size="small" variant="outlined" label={pick(globals["locale"], { en: "Badge chip", ro: "Insignă" })} />
      </Stack>
      <ToggleButtonGroup exclusive value="a" aria-label={pick(globals["locale"], { en: "Toggle", ro: "Comutator" })}>
        <ToggleButton value="a">{pick(globals["locale"], { en: "Selected", ro: "Ales" })}</ToggleButton>
        <ToggleButton value="b">{pick(globals["locale"], { en: "Other", ro: "Altul" })}</ToggleButton>
      </ToggleButtonGroup>
      <Tabs value="a" aria-label={pick(globals["locale"], { en: "Tabs", ro: "File" })}>
        <Tab value="a" label={pick(globals["locale"], { en: "Suppliers", ro: "Furnizori" })} />
        <Tab value="b" label={pick(globals["locale"], { en: "Records", ro: "Contracte" })} />
      </Tabs>
    </Stack>
  ),
};
