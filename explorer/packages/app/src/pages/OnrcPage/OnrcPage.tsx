import { useId } from "react";
import {
  Button, DEFAULT_MAP_LENS, LoadingStatus, MainScreenLayout, OnrcFilterChips, OnrcResults, OnrcResultsSkeleton, Panel, SearchBar, SourceEyebrow, SourcePicker, Stack, StateNote, toMapLens, Typography,
  type Locale, type MapLens,
} from "@grivei/ui";
import { AppLink } from "../../components/AppLink/index.ts";
import { OnrcCountLensSection } from "../../components/OnrcCountLensSection/index.ts";
import { OnrcCoverageSection } from "../../components/OnrcCoverageSection/index.ts";
import { OnrcSearch } from "../../graphql/operations.ts";
import { isInFlight, isStale, useHeldQuery } from "../../graphql/useHeldQuery.ts";
import { useCopy } from "../../copy/useCopy.ts";
import { useCountyTopology } from "../../geo/index.ts";
import { navigate } from "../../routing/location.tsx";
import { pathFor } from "../../routing/routes.ts";
import { asSource, NO_COUNTS, pickerOptions } from "../../sources/sourceCounts.ts";
import { coverageSourceHref, searchSourceHref } from "../../sources/sourceLinks.ts";
import { ONRC_PAGE_SIZE, useSourceCounts } from "../../sources/useSourceCounts.ts";
import { encodeOnrcScreen, patchToOnrc, useOnrcUrlState } from "../../urlState/onrcScreen.ts";
import { useOnrcCoverage } from "../CoveragePage/index.ts";

/**
 * `/explore/?source=onrc` (and `/explore/search?source=onrc`): ONRC's screen for the filter in the URL, laid out like the main screen. One `OnrcSearch` query per filter
 * feeds the count, the Organisations tab and the count lens, so the three describe the same matching set. The whole state (query, chips, county, page, lens) lives in the
 * URL through `onrcScreen`; a change replaces the history entry. The results are ONRC's alone: never mixed or ranked with SEAP's (ADR 0005).
 */
export function OnrcPage({ locale }: { locale: Locale }) {
  const t = useCopy();
  const s = t.sources;
  const { filter, page = 1, lens, setFilter, update } = useOnrcUrlState();
  const mapLens = toMapLens(lens);
  // A held answer (`stale`) stays on screen, dimmed, while the next request is in flight; the first load shows skeletons.
  const state = useHeldQuery(OnrcSearch, { filter, limit: ONRC_PAGE_SIZE, offset: (page - 1) * ONRC_PAGE_SIZE });
  const topology = useCountyTopology();
  const search = state.status === "ready" ? state.data.onrc.search : null;
  // Each Source's match count: this screen's own answer for ONRC, SEAP's for the query text alone (what a switch shows)
  const counts = useSourceCounts(filter.q ?? undefined, "ONRC", search ? { n: search.count, estimated: false } : null);
  const coverageShown = mapLens === "coverage";
  const coverage = useOnrcCoverage(coverageShown);
  const retryButton = (retry: () => void) => (
    <Button size="small" onClick={retry}>
      {t.status.retry}
    </Button>
  );
  const eyebrowId = useId();
  const here = pathFor(locale, { name: "main" });
  const q = filter.q ?? undefined;
  const lensState = lens ? { lens } : {};
  const sourceSelector = (
    <SourcePicker
      options={pickerOptions(s, NO_COUNTS, locale)}
      selected="ONRC"
      onSelect={(id) => navigate(searchSourceHref(locale, asSource(id), { q, ...lensState }), "push")}
      copy={s.coverageSwitch}
    />
  );
  return (
    <MainScreenLayout
      title={
        <Typography variant="h2" component="h1">
          {s.onrc.title}
        </Typography>
      }
      search={
        <>
          <SourceEyebrow id={eyebrowId} sources={[]} selected="ONRC" copy={s.onrc.eyebrow} />
          <SearchBar
            describedBy={eyebrowId}
            copy={s.onrc.searchBar}
            value={filter.q ?? ""}
            onQueryChange={(next) => setFilter({ q: next || undefined })}
            loading={isInFlight(state)}
            endSlot={
              <SourcePicker
                inline
                options={pickerOptions(s, counts, locale)}
                selected="ONRC"
                onSelect={(id) => navigate(searchSourceHref(locale, asSource(id), { q, ...lensState }), "push")}
                copy={s.picker}
              />
            }
          />
        </>
      }
      filters={<OnrcFilterChips filter={filter} onChange={(next) => setFilter(patchToOnrc(filter, next))} locale={locale} copy={s.onrc.filterChips} />}
      maps={{
        money: (
          <OnrcCountLensSection
            map={search?.map ?? null}
            loading={state.status === "loading"}
            topology={topology}
            county={filter.county ?? undefined}
            onSelect={(county) => setFilter({ county })}
            locale={locale}
            copy={s.onrc.countMap}
            title={s.onrc.mapTitle}
            status={{ unavailable: t.main.mapUnavailable, loading: t.status.loading }}
          />
        ),
        coverage: (
          <Stack spacing={2}>
            {sourceSelector}
            <OnrcCoverageSection
              coverage={coverage.status === "ready" ? coverage.data : null}
              loading={coverage.status === "loading"}
              failed={coverage.status === "error"}
              onRetry={coverage.status === "error" ? coverage.retry : undefined}
              locale={locale}
              copy={{ ...s.onrc.coverage.snapshots, states: t.coverage.grid.states }}
              status={{ loading: t.status.loading, failed: t.status.failed, retry: t.status.retry }}
            />
            <AppLink href={coverageSourceHref(locale, "ONRC")}>{t.coverage.grid.seePage}</AppLink>
          </Stack>
        ),
      }}
      results={
        <>
          {state.status === "loading" && <OnrcResultsSkeleton title={s.onrc.results.title} status={<LoadingStatus label={t.status.loading} />} />}
          {state.status === "error" && (
            <Panel heading={s.onrc.results.title} level="h2">
              <StateNote kind="error" action={retryButton(state.retry)}>
                {t.status.failed}
              </StateNote>
            </Panel>
          )}
          {search && (
            <OnrcResults
              count={search.organisations.count}
              rows={search.organisations.rows}
              page={page}
              pageSize={ONRC_PAGE_SIZE}
              pageHref={(n) => `${here}${encodeOnrcScreen({ filter, ...(lens ? { lens } : {}), ...(n > 1 ? { page: n } : {}) })}`}
              onNavigate={(href) => navigate(href, href.split("?")[0] === here ? "replace" : "push")}
              entityHref={(entity) => pathFor(locale, { name: "entity", entity: "supplier", key: entity.key, view: "overview" })}
              emptyHref={coverageSourceHref(locale, "ONRC")}
              locale={locale}
              copy={s.onrc.results}
              status={isInFlight(state) ? <LoadingStatus label={t.status.loading} /> : undefined}
              busy={isStale(state)}
            />
          )}
        </>
      }
      busy={{ map: coverageShown ? isStale(coverage) : isStale(state) }}
      lens={mapLens}
      onLensChange={(next: MapLens) => update({ lens: next === DEFAULT_MAP_LENS ? undefined : next })}
      copy={s.onrc.layout}
    />
  );
}
