import { chipFieldsOf, DEFAULT_RESULT_TAB, FilterChips, ResultTabs, Stack, toResultTab, Typography, type Locale, type ResultTab } from "@grivei/ui";
import { useCopy } from "../../copy/useCopy.ts";
import { SearchField } from "../../components/SearchField/index.ts";
import { TotalSummary } from "../../components/TotalSummary/index.ts";
import { pathFor } from "../../routing/routes.ts";
import { useUrlState } from "../../urlState/useUrlState.ts";
import { useMainScreen } from "./hooks/useMainScreen.ts";
import { useProcedureOptions } from "./hooks/useProcedureOptions.ts";

/** `/explore/` and `/ro/explore/`: the Total and the result tabs for the filter in the URL. */
export function MainScreenPage({ locale }: { locale: Locale }) {
  const t = useCopy();
  const { filter, tab, update, setFilter } = useUrlState();
  const state = useMainScreen({ filter });
  const search = state.status === "ready" ? state.data.seap.search : null;
  const procedureOptions = useProcedureOptions(search ? search.facets.procedure.map((facet) => facet.value) : null);
  return (
    <Stack component="main" spacing={3} sx={{ p: 3, maxWidth: 1200, mx: "auto" }}>
      <Typography variant="h4" component="h1">
        {t.main.title}
      </Typography>
      <SearchField copy={t.searchField} value={filter.q ?? ""} onChange={(q) => setFilter({ q })} />
      <FilterChips
        filter={filter}
        onChange={(next) => setFilter(chipFieldsOf(next))}
        procedureOptions={procedureOptions}
        lastYear={new Date().getFullYear()}
        locale={locale}
        copy={t.filterChips}
      />
      {state.status === "loading" && <Typography role="status">{t.status.loading}</Typography>}
      {state.status === "error" && <Typography role="alert">{t.status.failed}</Typography>}
      {search && (
        <>
          <TotalSummary total={search.total} copy={{ total: t.main.total, records: t.total.records }} locale={locale} />
          <ResultTabs
            authorities={search.authorities}
            suppliers={search.suppliers}
            records={search.records}
            goTo={search.goTo}
            tab={toResultTab(tab)}
            onTabChange={(next: ResultTab) => update({ tab: next === DEFAULT_RESULT_TAB ? undefined : next })}
            entityHref={(entity, role) => pathFor(locale, { name: "entity", entity: role, key: entity.key, view: "overview" })}
            recordHref={(record) => pathFor(locale, { name: "record", code: record.code })}
            locale={locale}
            copy={t.results}
          />
        </>
      )}
    </Stack>
  );
}
