import {
  chipFieldsOf, DEFAULT_MAP_LENS, DEFAULT_RESULT_TAB, FilterChips, MainScreenLayout, ResultTabs, SearchBar, toMapLens, toResultTab, Typography,
  type CountySide, type Locale, type MapLens, type ResultTab,
} from "@grivei/ui";
import { CoverageLensSection, coverageLensVariables } from "../../components/CoverageLensSection/index.ts";
import { MoneyLensSection } from "../../components/MoneyLensSection/index.ts";
import { uatAfterClick, zoomedCountyOf, zoomVariables, ZoomedCountySection } from "../../components/ZoomedCountySection/index.ts";
import { TotalSummary } from "../../components/TotalSummary/index.ts";
import { useCopy } from "../../copy/useCopy.ts";
import { navigate } from "../../routing/location.tsx";
import { useCountyTopology, useUatTopology } from "../../geo/index.ts";
import { pathFor } from "../../routing/routes.ts";
import { encodeUrlState } from "../../urlState/codec.ts";
import { useUrlState } from "../../urlState/useUrlState.ts";
import { highlightWindow, useCoveragePage } from "../CoveragePage/index.ts";
import { useCoverageLens } from "./hooks/useCoverageLens.ts";
import { useMainScreen } from "./hooks/useMainScreen.ts";
import { useProcedureOptions } from "./hooks/useProcedureOptions.ts";
import { useZoomedCounty } from "./hooks/useZoomedCounty.ts";

/**
 * `/explore/` and `/ro/explore/`: the main screen for the filter in the URL. One `MainScreen` query per filter feeds the
 * Money lens map, the Total and the result tabs, so the three always describe the same matching set. The whole state
 * (query, chips, county, side, tab, lens) lives in the URL through the codec; a change replaces the history entry.
 */
export function MainScreenPage({ locale }: { locale: Locale }) {
  const t = useCopy();
  const { filter, tab, lens, search: currentSearch, update, setFilter } = useUrlState();
  const mapLens = toMapLens(lens);
  const state = useMainScreen({ filter });
  const topology = useCountyTopology();
  // A county on the authority side zooms into its UATs: a second query beside MainScreen for the same filter, and the county's own outlines.
  const zoomed = zoomedCountyOf(filter);
  const zoom = useZoomedCounty(zoomed === null ? null : zoomVariables(filter, zoomed));
  const uatTopology = useUatTopology(zoomed);
  const search = state.status === "ready" ? state.data.seap.search : null;
  const procedureOptions = useProcedureOptions(search ? search.facets.procedure.map((facet) => facet.value) : null, filter.procedure);
  // The Coverage lens asks only while it is shown: the date chip's window for the map, and the whole grid (highlighted by the same window) for the compact grid.
  const coverageShown = mapLens === "coverage";
  const coverage = useCoverageLens(coverageShown ? coverageLensVariables(filter) : null);
  const coverageGrid = useCoveragePage(coverageShown ? {} : null);
  const side: CountySide = filter.countySide ?? "AUTHORITY";

  return (
    <MainScreenLayout
      search={
        <>
          <Typography variant="h4" component="h1" sx={{ mb: 2 }}>
            {t.main.title}
          </Typography>
          <SearchBar copy={t.searchBar} value={filter.q ?? ""} onQueryChange={(q) => setFilter({ q: q || undefined })} loading={state.status === "loading"} />
        </>
      }
      filters={
        <FilterChips
          filter={filter}
          onChange={(next) => setFilter(chipFieldsOf(next))}
          procedureOptions={procedureOptions}
          lastYear={new Date().getFullYear()}
          locale={locale}
          copy={t.filterChips}
        />
      }
      maps={{
        money: (
          zoomed !== null ? (
            <ZoomedCountySection
              county={zoomed}
              data={zoom.status === "ready" ? zoom.data : null}
              loading={zoom.status === "loading"}
              failed={zoom.status === "error"}
              topology={uatTopology}
              uat={filter.uat ?? undefined}
              onSelectUat={(siruta) => setFilter({ uat: uatAfterClick(filter.uat ?? undefined, siruta) })}
              onClearUat={() => setFilter({ uat: undefined })}
              onBack={() => setFilter({ county: undefined, uat: undefined })}
              locale={locale}
              copy={t.zoomedCounty}
              status={{ loading: t.status.loading, unavailable: t.main.mapUnavailable, failed: t.status.failed }}
            />
          ) : (
            <MoneyLensSection
              map={search?.map ?? null}
              loading={state.status === "loading"}
              topology={topology}
              county={filter.county ?? undefined}
              side={side}
              // A UAT belongs to the county it was chosen in (and to the authority side): any other county or side drops it.
              onChange={({ county, side: nextSide }) => setFilter({ county, uat: undefined, ...(nextSide ? { countySide: nextSide === "AUTHORITY" ? undefined : nextSide } : {}) })}
              locale={locale}
              copy={t.moneyLensMap}
              status={{ unavailable: t.main.mapUnavailable, loading: t.status.loading }}
            />
          )
        ),
        coverage: (
          <CoverageLensSection
            lens={coverage.status === "ready" ? coverage.data : null}
            loading={coverage.status === "loading"}
            failed={coverage.status === "error"}
            topology={topology}
            cells={coverageGrid.status === "ready" ? coverageGrid.data.coverage.grid : null}
            dateWindow={highlightWindow(filter)}
            pageHref={`${pathFor(locale, { name: "coverage" })}${currentSearch}`}
            onNavigate={(href) => navigate(href, "push")}
            county={filter.county ?? undefined}
            // The same choice as the Money lens (a click on the chosen county takes it back); a UAT belongs to its county, so it goes with it.
            // Coverage's areas are authority areas (NATIONAL, UNPLACED match no supplier), so the side goes back to the default.
            onSelect={(county) => setFilter({ county, countySide: undefined, uat: undefined })}
            locale={locale}
            copy={{ map: t.coverageLensMap, grid: t.coverage.grid }}
            status={{ loading: t.status.loading, unavailable: t.main.mapUnavailable, failed: t.status.failed }}
          />
        ),
      }}
      summary={search && <TotalSummary total={search.total} copy={{ total: t.main.total, records: t.total.records }} locale={locale} />}
      results={
        <>
          {state.status === "loading" && <Typography role="status">{t.status.loading}</Typography>}
          {state.status === "error" && <Typography role="alert">{t.status.failed}</Typography>}
          {search && (
            <ResultTabs
              authorities={search.authorities}
              suppliers={search.suppliers}
              records={search.records}
              goTo={search.goTo}
              tab={toResultTab(tab)}
              onTabChange={(next: ResultTab) => update({ tab: next === DEFAULT_RESULT_TAB ? undefined : next })}
              entityHref={(entity, role) => pathFor(locale, { name: "entity", entity: role, key: entity.key, view: "overview" })}
              showAllHref={(name) => `${pathFor(locale, { name: "search" })}${encodeUrlState({ filter, ...(name !== DEFAULT_RESULT_TAB ? { tab: name } : {}) })}`}
              recordHref={(record) => pathFor(locale, { name: "record", code: record.code })}
              locale={locale}
              copy={t.results}
            />
          )}
        </>
      }
      lens={mapLens}
      onLensChange={(next: MapLens) => update({ lens: next === DEFAULT_MAP_LENS ? undefined : next })}
      copy={t.mainScreenLayout}
    />
  );
}
