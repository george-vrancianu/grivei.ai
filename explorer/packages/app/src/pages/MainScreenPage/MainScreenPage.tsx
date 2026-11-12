import {
  chipFieldsOf, DEFAULT_MAP_LENS, DEFAULT_RESULT_TAB, FilterChips, MainScreenLayout, ResultTabs, SearchBar, toMapLens, toResultTab, Typography,
  type CountySide, type Locale, type MapLens, type ResultTab,
} from "@grivei/ui";
import { MoneyLensSection } from "../../components/MoneyLensSection/index.ts";
import { TotalSummary } from "../../components/TotalSummary/index.ts";
import { useCopy } from "../../copy/useCopy.ts";
import { useCountyTopology } from "../../geo/index.ts";
import { pathFor } from "../../routing/routes.ts";
import { encodeUrlState } from "../../urlState/codec.ts";
import { useUrlState } from "../../urlState/useUrlState.ts";
import { useMainScreen } from "./hooks/useMainScreen.ts";
import { useProcedureOptions } from "./hooks/useProcedureOptions.ts";

/**
 * `/explore/` and `/ro/explore/`: the main screen for the filter in the URL. One `MainScreen` query per filter feeds the
 * Money lens map, the Total and the result tabs, so the three always describe the same matching set. The whole state
 * (query, chips, county, side, tab, lens) lives in the URL through the codec; a change replaces the history entry.
 */
export function MainScreenPage({ locale }: { locale: Locale }) {
  const t = useCopy();
  const { filter, tab, lens, update, setFilter } = useUrlState();
  const state = useMainScreen({ filter });
  const topology = useCountyTopology();
  const search = state.status === "ready" ? state.data.seap.search : null;
  const procedureOptions = useProcedureOptions(search ? search.facets.procedure.map((facet) => facet.value) : null, filter.procedure);
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
          <MoneyLensSection
            map={search?.map ?? null}
            loading={state.status === "loading"}
            topology={topology}
            county={filter.county ?? undefined}
            side={side}
            onChange={({ county, side: nextSide }) => setFilter({ county, ...(nextSide ? { countySide: nextSide === "AUTHORITY" ? undefined : nextSide } : {}) })}
            locale={locale}
            copy={t.moneyLensMap}
            status={{ unavailable: t.main.mapUnavailable, loading: t.status.loading }}
          />
        ),
        // The Coverage lens is wired by its own page (#90); until then its slot says so.
        coverage: <Typography>{t.pages.placeholder}</Typography>,
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
      lens={toMapLens(lens)}
      onLensChange={(next: MapLens) => update({ lens: next === DEFAULT_MAP_LENS ? undefined : next })}
      copy={t.mainScreenLayout}
    />
  );
}
