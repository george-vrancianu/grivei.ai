import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Box } from "../../../../../atoms/Box/index.ts";
import { localeOf, sampleCopy } from "../../../../samples/copy.ts";
import { authoritySide, authoritySideNoUnplaced, authoritySideSuspectLeftOut, supplierSide, supplierSideSuspectLeftOut } from "../../../../samples/moneyMaps.ts";
import type { MoneyMap } from "../../../../types.ts";
import type { MapArea } from "../../moneyLensMap.types.ts";
import { OffMapTiles } from "./index.ts";

const meta = { title: "Domain/MoneyLensMap/OffMapTiles" } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj<Record<string, unknown>>;

function Tiles({ locale, map, selected: initial }: { locale: "en" | "ro"; map: MoneyMap; selected?: MapArea }) {
  const [selected, setSelected] = useState<MapArea | undefined>(initial);
  return (
    <Box sx={{ maxWidth: 280, display: "flex", flexDirection: "column", gap: 1 }}>
      <OffMapTiles map={map} selected={selected} onSelect={setSelected} locale={locale} copy={sampleCopy.moneyLensMap(locale).tiles} />
    </Box>
  );
}

const story = (map: MoneyMap, selected?: MapArea): Story => ({
  render: (_args, { globals }) => <Tiles locale={localeOf(globals["locale"])} map={map} selected={selected} />,
});

export const NationalOnly: Story = story(authoritySideNoUnplaced);
export const NationalAndUnplaced: Story = story(authoritySide);
export const NationalAndUnknownSupplierCounty: Story = story(supplierSide);
export const SelectedTile: Story = story(authoritySide, "UNPLACED");
export const SuspectLeftOut: Story = story(supplierSideSuspectLeftOut);
export const SuspectLeftOutOnUnplaced: Story = story(authoritySideSuspectLeftOut);
