import { Button, chipFieldsOf, DEFAULT_RESULT_TAB, FilterChips, FullResults, FullResultsSkeleton, LoadingStatus, Panel, SearchBar, SearchPanel, StateNote, toResultTab, Typography } from "@grivei/ui";
import { useTypedQuerySpinner } from "../../graphql/useTypedQuerySpinner.ts";
import { AppLink } from "../../components/AppLink/index.ts";
import { PageShell } from "../../components/PageShell/index.ts";
import { countyChipName, useCountyTopology } from "../../geo/index.ts";
import { useCopy } from "../../copy/useCopy.ts";
import { navigate, useLocation } from "../../routing/location.tsx";
import { currentUrl } from "../../routing/currentUrl.ts";
import { pathFor } from "../../routing/routes.ts";
import { encodeUrlState } from "../../urlState/codec.ts";
import { entityHrefFrom } from "../../urlState/carriedSearch.ts";
import { coverageLensHref } from "../../urlState/coverageLens.ts";
import { useUrlState } from "../../urlState/useUrlState.ts";
import { FULL_RESULTS_PAGE_SIZE, useFullResults } from "./hooks/useFullResults.ts";

/** Full results, `/explore/search`: the heading for the kind, the search box, the active filter chips and one tab's rows (`tab`, Suppliers by default) for the filter, a page at a time (`page`). */
export function SearchPage() {
  const t = useCopy();
  const { locale } = useLocation();
  const { filter, tab: tabParam, page = 1, order, setFilter, update } = useUrlState();
  const tab = toResultTab(tabParam);
  const state = useFullResults({ tab, filter, page, order });
  const topology = useCountyTopology();
  const typing = useTypedQuerySpinner(filter.q, state);
  const here = pathFor(locale, { name: "search" });
  // The page links keep the whole URL state and change only `page`; page 1 is the default and drops out of the URL.
  // The tab is the canonical one, so a spelling the page falls back from never makes a second URL for the same view.
  const tabState = tab !== DEFAULT_RESULT_TAB ? { tab } : {};
  const pageHref = (target: number) =>
    `${here}${encodeUrlState({ filter, ...tabState, ...(order ? { order } : {}), ...(target > 1 ? { page: target } : {}) })}`;
  const backHref = `${pathFor(locale, { name: "main" })}${encodeUrlState({ filter, ...tabState })}`;
  return (
    <PageShell>
      <Typography variant="h1" sx={(theme) => ({ maxWidth: theme.graf.layout.titleMaxWidth })}>
        {t.pages.search.title[tab]}
      </Typography>
      <SearchPanel label={t.mainScreenLayout.regions.search}>
        <SearchBar copy={t.searchBar} value={filter.q ?? ""} onQueryChange={(q) => setFilter({ q: q || undefined })} loading={typing} />
      </SearchPanel>
      <FilterChips
        menus={false}
        filter={filter}
        // The chips' fields plus the county and its UAT, as on the main screen; a changed filter drops `page` and keeps `tab` and `order`.
        onChange={(next) => setFilter({ ...chipFieldsOf(next), county: next.county ?? undefined, uat: next.uat ?? undefined })}
        {...(filter.county ? { countyName: countyChipName(filter.county, topology, t.moneyLensMap.tiles) } : {})}
        locale={locale}
        copy={t.filterChips}
      />
      <AppLink href={backHref} sx={{ alignSelf: "flex-start" }}>
        {t.fullResults.back}
      </AppLink>
      {state.status === "loading" && (
        <FullResultsSkeleton tab={tab} copy={{ heading: t.results.tabs[tab], head: t.results.entityRow.head }} status={<LoadingStatus label={t.status.loading} />} />
      )}
      {state.status === "error" && (
        <Panel heading={t.results.tabs[tab]} level="h2">
          <StateNote
            kind="error"
            action={
              <Button size="small" onClick={state.retry}>
                {t.status.retry}
              </Button>
            }
          >
            {t.status.failed}
          </StateNote>
        </Panel>
      )}
      {state.status === "ready" && (
        <FullResults
          results={state.results}
          page={state.page}
          pageSize={FULL_RESULTS_PAGE_SIZE}
          pageHref={pageHref}
          // Page links change state within this page (replace); leaving it, as "Back to results" does, is a step of its own (push).
          onNavigate={(href) => navigate(href, href.split("?")[0] === here ? "replace" : "push")}
          emptyHref={coverageLensHref(locale, filter)}
          citeUrl={currentUrl()}
          order={order}
          // a different order is a different list: it starts at page 1 (the codec drops `page`)
          onOrderChange={(next) => update({ order: next, page: undefined })}
          entityHref={entityHrefFrom(locale, filter)}
          recordHref={(record) => pathFor(locale, { name: "record", code: record.code })}
          status={state.stale ? <LoadingStatus label={t.status.loading} /> : undefined}
          busy={state.stale}
          locale={locale}
          copy={{ ...t.fullResults, heading: t.results.tabs, empty: t.results.empty, emptyLink: t.results.emptyLink, entityRow: t.results.entityRow, recordRow: t.results.recordRow }}
        />
      )}
    </PageShell>
  );
}
