import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Box } from "../../../atoms/Box/index.ts";
import { localeOf, sampleCopy } from "../../samples/copy.ts";
import { countiesTopology } from "../../samples/geo/counties.topo.ts";
import { authoritySide, authoritySideNoUnplaced, supplierSide } from "../../samples/moneyMaps.ts";
import type { MoneyMap } from "../../types.ts";
import { MoneyLensMap, type CountySide, type MapArea } from "./index.ts";

const meta = { title: "Domain/MoneyLensMap" } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj<Record<string, unknown>>;

/** The side and the selection live in the URL in the app; the stories hold them in state so clicking works. */
function Lens({ locale, map, selected: initial }: { locale: "en" | "ro"; map: MoneyMap; selected?: MapArea }) {
  const [selected, setSelected] = useState<MapArea | undefined>(initial);
  const [side, setSide] = useState<CountySide>(map.side);
  return (
    <Box sx={{ maxWidth: 820 }}>
      <MoneyLensMap map={map} topology={countiesTopology} selected={selected} onSelect={setSelected} side={side} onSideChange={setSide} locale={locale} copy={sampleCopy.moneyLensMap(locale)} />
    </Box>
  );
}

const story = (map: MoneyMap, selected?: MapArea): Story => ({
  render: (_args, { globals }) => <Lens locale={localeOf(globals["locale"])} map={map} selected={selected} />,
});

export const AuthoritySide: Story = story(authoritySide);
export const SupplierSide: Story = story(supplierSide);
export const SelectedCounty: Story = story(authoritySide, "RO-CJ");
export const SelectedTile: Story = story(authoritySide, "UNPLACED");
export const UnplacedPresent: Story = story(authoritySide);
export const UnplacedAbsent: Story = story(authoritySideNoUnplaced);
