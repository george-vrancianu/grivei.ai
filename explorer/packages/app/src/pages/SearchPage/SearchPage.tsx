import { DEFAULT_RESULT_TAB, FullResults, Stack, toResultTab, Typography } from "@grivei/ui";
import { useCopy } from "../../copy/useCopy.ts";
import { SearchField } from "../../components/SearchField/index.ts";
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
  const pageHref = (target: number) =>
    `${here}${encodeUrlState({ filter, ...(tabParam ? { tab: tabParam } : {}), ...(order ? { order } : {}), ...(target > 1 ? { page: target } : {}) })}`;
  const backHref = `${pathFor(locale, { name: "main" })}${encodeUrlState({ filter, ...(tab !== DEFAULT_RESULT_TAB ? { tab } : {}) })}`;
  return (
    <Stack component="main" spacing={2} sx={{ p: 3, maxWidth: 1200, mx: "auto" }}>
      <Typography variant="h4" component="h1">
        {t.pages.search.title}
      </Typography>
      <SearchField copy={t.searchField} value={filter.q ?? ""} onChange={(q) => setFilter({ q })} />
      {state.status === "loading" && <Typography role="status">{t.status.loading}</Typography>}
      {state.status === "error" && <Typography role="alert">{t.status.failed}</Typography>}
      {state.status === "ready" && (
        <FullResults
          results={state.results}
          page={page}
          pageSize={FULL_RESULTS_PAGE_SIZE}
          pageHref={pageHref}
          onNavigate={(href) => navigate(href, "replace")}
          backHref={backHref}
          entityHref={(entity, role) => pathFor(locale, { name: "entity", entity: role, key: entity.key, view: "overview" })}
          recordHref={(record) => pathFor(locale, { name: "record", code: record.code })}
          locale={locale}
          copy={{ ...t.fullResults, entityRow: t.results.entityRow, recordRow: t.results.recordRow }}
        />
      )}
    </Stack>
  );
}
