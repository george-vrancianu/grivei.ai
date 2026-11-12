import { DEFAULT_RESULT_TAB, FullResults, SearchBar, Stack, toResultTab, Typography } from "@grivei/ui";
import { useCopy } from "../../copy/useCopy.ts";
import { navigate, useLocation } from "../../routing/location.tsx";
import { pathFor } from "../../routing/routes.ts";
import { encodeUrlState } from "../../urlState/codec.ts";
import { useUrlState } from "../../urlState/useUrlState.ts";
import { FULL_RESULTS_PAGE_SIZE, useFullResults } from "./hooks/useFullResults.ts";

/** `/explore/search`: one tab's rows (`tab`, Suppliers by default) for the filter, a page at a time (`page`), plus the search box. */
export function SearchPage() {
  const t = useCopy();
  const { locale } = useLocation();
  const { filter, tab: tabParam, page = 1, order, setFilter } = useUrlState();
  const tab = toResultTab(tabParam);
  const state = useFullResults({ tab, filter, page, order });
  const here = pathFor(locale, { name: "search" });
  // The page links keep the whole URL state and change only `page`; page 1 is the default and drops out of the URL.
  // The tab is the canonical one, so a spelling the page falls back from never makes a second URL for the same view.
  const tabState = tab !== DEFAULT_RESULT_TAB ? { tab } : {};
  const pageHref = (target: number) =>
    `${here}${encodeUrlState({ filter, ...tabState, ...(order ? { order } : {}), ...(target > 1 ? { page: target } : {}) })}`;
  const backHref = `${pathFor(locale, { name: "main" })}${encodeUrlState({ filter, ...tabState })}`;
  return (
    <Stack component="main" spacing={2} sx={{ p: 3, maxWidth: 1200, mx: "auto" }}>
      <Typography variant="h4" component="h1">
        {t.pages.search.title}
      </Typography>
      <SearchBar copy={t.searchBar} value={filter.q ?? ""} onQueryChange={(q) => setFilter({ q: q || undefined })} loading={state.status === "loading"} />
      {state.status === "loading" && <Typography role="status">{t.status.loading}</Typography>}
      {state.status === "error" && <Typography role="alert">{t.status.failed}</Typography>}
      {state.status === "ready" && (
        <FullResults
          results={state.results}
          page={page}
          pageSize={FULL_RESULTS_PAGE_SIZE}
          pageHref={pageHref}
          // Page links change state within this page (replace); leaving it, as "Back to results" does, is a step of its own (push).
          onNavigate={(href) => navigate(href, href.split("?")[0] === here ? "replace" : "push")}
          backHref={backHref}
          entityHref={(entity, role) => pathFor(locale, { name: "entity", entity: role, key: entity.key, view: "overview" })}
          recordHref={(record) => pathFor(locale, { name: "record", code: record.code })}
          locale={locale}
          copy={{ ...t.fullResults, heading: t.results.tabs, empty: t.results.empty, entityRow: t.results.entityRow, recordRow: t.results.recordRow }}
        />
      )}
    </Stack>
  );
}
