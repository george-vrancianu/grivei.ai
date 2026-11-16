import type { RecordFilter } from "@grivei/contract";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState, type ReactNode } from "react";
import { Box } from "../../../atoms/Box/index.ts";
import { Button } from "../../../atoms/Button/index.ts";
import { Typography } from "../../../atoms/Typography/index.ts";
import type { Locale } from "../../../theme/index.ts";
import { pick } from "../../../workbench/index.ts";
import { FilterChips } from "../../molecules/FilterChips/index.ts";
import { LoadingStatus } from "../../molecules/LoadingStatus/index.ts";
import { TotalFigure } from "../../molecules/TotalFigure/index.ts";
import { TotalSkeleton } from "../../molecules/TotalSkeleton/index.ts";
import { MapSkeleton } from "../../organisms/MapSkeleton/index.ts";
import { MoneyLensMap, type CountySide, type MapArea } from "../../organisms/MoneyLensMap/index.ts";
import { ResultsSkeleton } from "../../organisms/ResultsSkeleton/index.ts";
import { ResultTabs } from "../../organisms/ResultTabs/index.ts";
import { ZoomedCountyMap } from "../../organisms/ZoomedCountyMap/index.ts";
import { localeOf, sampleCopy } from "../../samples/copy.ts";
import { resultSamples, totalWithLeftOut } from "../../samples/fixtureData.ts";
import { countiesTopology } from "../../samples/geo/counties.topo.ts";
import { countyUatsTopology } from "../../samples/geo/countyUats.topo.ts";
import { authoritySide, supplierSide } from "../../samples/moneyMaps.ts";
import { typicalCounty } from "../../samples/uatMaps.ts";
import type { Siruta } from "../../types.ts";
import { MainScreenLayout, type BusyRegions, type MapLens } from "./index.ts";

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

/** The names of the stand-in organisms, in the story's language. */
const names = (locale: unknown) =>
  pick(locale, {
    en: { search: "Search input", filters: "Filter chips", summary: "Total", results: "Result tabs", money: "Money lens map", coverage: "Coverage lens map" },
    ro: { search: "Câmp de căutare", filters: "Filtre", summary: "Total", results: "Filele de rezultate", money: "Harta lentilei Bani", coverage: "Harta lentilei Acoperire" },
  });

const titleOf = (locale: unknown) => (
  <Typography variant="h2" component="h1">
    {pick(locale, { en: "Explore public spending", ro: "Explorează cheltuielile publice" })}
  </Typography>
);

const placeholders = (locale: unknown): { [slot in "title" | "search" | "filters" | "summary" | "results"]: ReactNode } & { maps: Record<MapLens, ReactNode> } => {
  const label = names(locale);
  return {
    title: titleOf(locale),
    search: <Placeholder name={label.search} height={48} />,
    filters: <Placeholder name={label.filters} height={40} />,
    summary: <Placeholder name={label.summary} height={64} />,
    results: <Placeholder name={label.results} height={420} />,
    maps: { money: <Placeholder name={label.money} height={420} />, coverage: <Placeholder name={label.coverage} height={420} /> },
  };
};

/** The lens lives in the URL in the app; the stories keep it in state so the toggle works. */
function Screen({ locale, initial = "money", slots, back, busy }: { locale: Locale; initial?: MapLens; slots: ReturnType<typeof placeholders>; back?: ReactNode; busy?: BusyRegions }) {
  const [lens, setLens] = useState<MapLens>(initial);
  return <MainScreenLayout {...slots} mapBack={back} busy={busy} mapNote={<DataThrough locale={locale} />} lens={lens} onLensChange={setLens} copy={sampleCopy.mainScreenLayout(locale)} />;
}

/** The foot of the map panel: the "data through" dates as a two-column list. */
function DataThrough({ locale }: { locale: Locale }) {
  const rows = pick(locale, {
    en: [["Award notices", "data through 12 November 2026"], ["Contracts", "data through 12 November 2026"], ["Direct purchases", "data through 30 September 2026"], ["Direct purchase award notifications", "data through 30 September 2026"]],
    ro: [["Anunțuri de atribuire", "date până la 12 noiembrie 2026"], ["Contracte", "date până la 12 noiembrie 2026"], ["Achiziții directe", "date până la 30 septembrie 2026"], ["Notificări de atribuire a cumpărării directe", "date până la 30 septembrie 2026"]],
  });
  return (
    <Box component="dl" sx={{ m: 0, display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "8px 16px" }}>
      {rows.map(([kind, date]) => (
        <Box key={kind}>
          <Typography variant="caption" component="dt">{kind}</Typography>
          <Typography variant="caption" component="dd" color="text.secondary" sx={{ m: 0 }}>{date}</Typography>
        </Box>
      ))}
    </Box>
  );
}

const placeholderStory = (initial?: MapLens): Story => ({
  render: (_args, { globals }) => {
    const locale = localeOf(globals["locale"]);
    return <Screen locale={locale} initial={initial} slots={placeholders(locale)} />;
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

function Real({ locale, zoomed, refreshing = false }: { locale: Locale; zoomed: boolean; refreshing?: boolean }) {
  const [filter, setFilter] = useState<RecordFilter>(ACTIVE);
  const label = names(locale);
  const copy = sampleCopy.total(locale);
  const slots = {
    title: titleOf(locale),
    search: <Placeholder name={label.search} height={48} />,
    filters: <FilterChips filter={filter} onChange={setFilter} procedureOptions={PROCEDURES} lastYear={2025} locale={locale} copy={sampleCopy.filterChips(locale)} />,
    summary: (
      <TotalFigure
        total={totalWithLeftOut}
        locale={locale}
        copy={copy}
        methodologyHref="/methodology/"
        suspectHref="/explore/?badge=SUSPECT_VALUE"
        inset={{ heading: <Typography variant="meta" component="h2">{pick(locale, { en: "Total awarded", ro: "Total atribuit" })}</Typography> }}
      />
    ),
    results: (
      <ResultTabs
        {...resultSamples.typical}
        entityHref={(entity, role) => `/explore/${role}/${entity.key}`}
        recordHref={(record) => `/explore/record/${record.code}`}
        locale={locale}
        copy={sampleCopy.resultTabs(locale)}
        status={refreshing && <LoadingStatus label={pick(locale, { en: "Loading…", ro: "Se încarcă…" })} />}
        busy={refreshing}
      />
    ),
    maps: {
      money: <RealMoney locale={locale} zoomed={zoomed} />,
      coverage: <Placeholder name={label.coverage} height={420} />,
    },
  };
  const back = zoomed ? <Button size="small" color="inherit">{pick(locale, { en: "Back to Romania", ro: "Înapoi la România" })}</Button> : undefined;
  return <Screen locale={locale} slots={slots} back={back} busy={refreshing ? { summary: true, map: true } : undefined} />;
}

/** First load, no answer yet: skeletons shaped like the content, and no dimmed answer. `outlines` is whether the map's outlines have loaded (the areas pulse) or not (a map-sized block). */
function FirstLoad({ locale, outlines }: { locale: Locale; outlines: boolean }) {
  const label = names(locale);
  const copy = sampleCopy.total(locale);
  const resultTabs = sampleCopy.resultTabs(locale);
  const loading = pick(locale, { en: "Loading…", ro: "Se încarcă…" });
  const slots = {
    title: titleOf(locale),
    search: <Placeholder name={label.search} height={48} />,
    filters: <FilterChips filter={ACTIVE} onChange={() => undefined} procedureOptions={PROCEDURES} lastYear={2025} locale={locale} copy={sampleCopy.filterChips(locale)} />,
    summary: <TotalSkeleton labels={copy.figures} heading={<Typography variant="meta" component="h2">{pick(locale, { en: "Total awarded", ro: "Total atribuit" })}</Typography>} />,
    results: <ResultsSkeleton copy={resultTabs} head={sampleCopy.entityRow(locale).head} status={<LoadingStatus label={loading} />} />,
    maps: { money: <MapSkeleton label={loading} topology={outlines ? countiesTopology : undefined} />, coverage: <Placeholder name={label.coverage} height={420} /> },
  };
  return <Screen locale={locale} slots={slots} />;
}

const firstLoad = (outlines: boolean): Story => ({ render: (_args, { globals }) => <FirstLoad locale={localeOf(globals["locale"])} outlines={outlines} /> });

/** First load, outlines in: the Total, tab counts and rows are blocks (the labels are real), the map's areas pulse in a neutral fill under a "Loading…" chip. */
export const FirstLoadWide: Story = firstLoad(true);
/** First load before the outlines arrive: a map-sized block under the same chip. */
export const FirstLoadOutlinesPending: Story = firstLoad(false);
/** First load below the md breakpoint (tablet, 834 px). */
export const FirstLoadNarrow: Story = { ...firstLoad(true), globals: { viewport: { value: "tablet", isRotated: false } } };
/** First load on a phone: the row's chip and amount wrap under the name. */
export const FirstLoadPhone: Story = { ...firstLoad(true), globals: { viewport: { value: "mobile2", isRotated: false } } };

const real = (zoomed: boolean, refreshing = false): Story => ({ render: (_args, { globals }) => <Real locale={localeOf(globals["locale"])} zoomed={zoomed} refreshing={refreshing} /> });

/** Filter chips, the Money lens map (authority side, with its tiles and side toggle) and the result tabs from the samples. */
export const RealOrganisms: Story = real(false);
/** The county zoom in the money slot. */
export const ZoomedCounty: Story = real(true);
/** A filter changed: the previous Total, map and rows stay at 60% with `aria-busy="true"` (the lens toggle and the filters stay at full strength), and the results header says Loading… until the new answer lands. */
export const Refreshing: Story = real(false, true);
/** The same for a zoomed county. */
export const RefreshingZoomedCounty: Story = real(true, true);

/** Below the md breakpoint (900 px) the panels stack and the results sit under the map; the tablet viewport is 834 px wide. */
export const NarrowViewport: Story = { ...real(false), globals: { viewport: { value: "tablet", isRotated: false } } };
/** A phone: one column, the Total's figures wrap under the amount, and the page never scrolls sideways (check by hand: no horizontal scrollbar). */
export const PhoneViewport: Story = { ...real(true), globals: { viewport: { value: "mobile2", isRotated: false } } };
