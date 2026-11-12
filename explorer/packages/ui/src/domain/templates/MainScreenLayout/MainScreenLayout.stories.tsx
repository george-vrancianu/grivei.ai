import type { RecordFilter } from "@grivei/contract";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState, type ReactNode } from "react";
import { Box } from "../../../atoms/Box/index.ts";
import { Typography } from "../../../atoms/Typography/index.ts";
import type { Locale } from "../../../theme/index.ts";
import { FilterChips } from "../../molecules/FilterChips/index.ts";
import { MoneyLensMap, type CountySide, type MapArea } from "../../organisms/MoneyLensMap/index.ts";
import { ResultTabs } from "../../organisms/ResultTabs/index.ts";
import { ZoomedCountyMap } from "../../organisms/ZoomedCountyMap/index.ts";
import { localeOf, sampleCopy } from "../../samples/copy.ts";
import { resultSamples } from "../../samples/fixtureData.ts";
import { countiesTopology } from "../../samples/geo/counties.topo.ts";
import { countyUatsTopology } from "../../samples/geo/countyUats.topo.ts";
import { authoritySide, supplierSide } from "../../samples/moneyMaps.ts";
import { typicalCounty } from "../../samples/uatMaps.ts";
import type { Siruta } from "../../types.ts";
import { MainScreenLayout, type MapLens } from "./index.ts";

const meta = { title: "Domain/MainScreenLayout", component: MainScreenLayout, parameters: { layout: "fullscreen" } } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

// Procedure names are source data: Romanian in both languages.
const PROCEDURES = ["Achiziție directă", "Licitație deschisă"];
const ACTIVE: RecordFilter = { from: "2023-01-01", to: "2024-12-31", channel: "DIRECT_PURCHASE", hasSignals: true, procedure: ["Achiziție directă"] };

/** A labelled box standing in for an organism that has not been built (or not been picked) yet. */
function Placeholder({ name, height }: { name: string; height: number }) {
  return (
    <Box sx={{ height, border: "2px dashed", borderColor: "divider", borderRadius: 1, display: "grid", placeItems: "center" }}>
      <Typography color="text.secondary">{name}</Typography>
    </Box>
  );
}

const placeholders = (name: (slot: string) => string): { [slot in "search" | "filters" | "summary" | "results"]: ReactNode } & { maps: Record<MapLens, ReactNode> } => ({
  search: <Placeholder name={name("Search input")} height={48} />,
  filters: <Placeholder name={name("Filter chips")} height={40} />,
  summary: <Placeholder name={name("Total")} height={64} />,
  results: <Placeholder name={name("Result tabs")} height={420} />,
  maps: { money: <Placeholder name={name("Money lens map")} height={420} />, coverage: <Placeholder name={name("Coverage lens map")} height={420} /> },
});

/** The lens lives in the URL in the app; the stories keep it in state so the toggle works. */
function Screen({ locale, initial = "money", slots }: { locale: Locale; initial?: MapLens; slots: ReturnType<typeof placeholders> }) {
  const [lens, setLens] = useState<MapLens>(initial);
  return <MainScreenLayout {...slots} lens={lens} onLensChange={setLens} copy={sampleCopy.mainScreenLayout(locale)} />;
}

const placeholderStory = (initial?: MapLens): Story => ({
  render: (_args, { globals }) => {
    const locale = localeOf(globals["locale"]);
    return <Screen locale={locale} initial={initial} slots={placeholders((slot) => slot)} />;
  },
});

/** Labelled boxes in every slot, Money lens shown. */
export const PlaceholderOrganisms: Story = placeholderStory();
/** The Coverage lens selected; the Coverage lens map is a placeholder until it lands in the screen. */
export const CoverageLensSelected: Story = placeholderStory("coverage");

/** The money slot of the real screen: a county zoom replaces the national map once a county is picked. */
function RealMoney({ locale, zoomed }: { locale: Locale; zoomed: boolean }) {
  const [selected, setSelected] = useState<MapArea | undefined>();
  const [side, setSide] = useState<CountySide>("AUTHORITY");
  const [uat, setUat] = useState<Siruta | undefined>();
  if (zoomed) {
    return (
      <ZoomedCountyMap map={typicalCounty} topology={countyUatsTopology} selected={uat} onSelect={setUat} locale={locale} copy={sampleCopy.zoomedCountyMap(locale)} />
    );
  }
  return (
    <MoneyLensMap
      map={side === "AUTHORITY" ? authoritySide : supplierSide}
      topology={countiesTopology}
      selected={selected}
      onSelect={setSelected}
      side={side}
      onSideChange={setSide}
      locale={locale}
      copy={sampleCopy.moneyLensMap(locale)}
    />
  );
}

function Real({ locale, zoomed }: { locale: Locale; zoomed: boolean }) {
  const [filter, setFilter] = useState<RecordFilter>(ACTIVE);
  const slots = {
    search: <Placeholder name={locale === "ro" ? "Câmp de căutare" : "Search input"} height={48} />,
    filters: <FilterChips filter={filter} onChange={setFilter} procedureOptions={PROCEDURES} lastYear={2025} locale={locale} copy={sampleCopy.filterChips(locale)} />,
    results: (
      <ResultTabs
        {...resultSamples.typical}
        entityHref={(entity, role) => `/explore/${role}/${entity.key}`}
        recordHref={(record) => `/explore/record/${record.code}`}
        locale={locale}
        copy={sampleCopy.resultTabs(locale)}
      />
    ),
    maps: {
      money: <RealMoney locale={locale} zoomed={zoomed} />,
      coverage: <Placeholder name={locale === "ro" ? "Harta lentilei Acoperire" : "Coverage lens map"} height={420} />,
    },
  };
  return <Screen locale={locale} slots={{ ...slots, summary: undefined }} />;
}

const real = (zoomed: boolean): Story => ({ render: (_args, { globals }) => <Real locale={localeOf(globals["locale"])} zoomed={zoomed} /> });

/** Filter chips, the Money lens map (authority side, with its tiles and side toggle) and the result tabs from the samples. */
export const RealOrganisms: Story = real(false);
/** The county zoom in the money slot. */
export const ZoomedCounty: Story = real(true);

/** Below the md breakpoint (900 px) the results stack under the map; the tablet viewport is 834 px wide. */
export const NarrowViewport: Story = { ...real(false), globals: { viewport: { value: "tablet", isRotated: false } } };
