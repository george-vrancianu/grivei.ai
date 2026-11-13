import { useMemo } from "react";
import type { RecordsTabProps } from "@grivei/ui";
import { useCopy } from "../../../copy/useCopy.ts";
import { navigate } from "../../../routing/location.tsx";
import { pathFor, type EntityRoute } from "../../../routing/routes.ts";
import { OnlyMatchingLink } from "../../../components/OnlyMatchingLink/index.ts";
import { methodologyHref } from "../../../methodology/methodologyLinks.ts";
import { withSuspectBadge } from "../../../urlState/suspect.ts";
import { useUrlState } from "../../../urlState/useUrlState.ts";
import { onlyMatchingHref, patchTo, recordsHref } from "../entityPage.utils.ts";
import { RECORDS_PAGE_SIZE } from "./useEntityPage.ts";

type Wiring = Omit<RecordsTabProps, "records">;

/**
 * Everything the Records tab needs from the app but its data: the URL's filter and page, the way to change the filter (history replaced,
 * page reset), links built for the active language, and the copy. The data comes from `useEntityPage`.
 */
export function useRecordsTab(locale: Wiring["locale"], entity: EntityRoute, entityKey: string): Wiring {
  const t = useCopy();
  const { filter, page, order, carried, setFilter } = useUrlState();
  return useMemo(() => {
    const here = (n: number) => recordsHref(locale, entity, entityKey, { filter, ...(order ? { order } : {}), ...(carried ? { carried } : {}), page: n });
    const own = t.entityPage.recordsTab;
    return {
      filter,
      onFilterChange: (next) => setFilter(patchTo(filter, next)),
      role: entity,
      page: page ?? 1,
      pageSize: RECORDS_PAGE_SIZE,
      pageHref: here,
      // a page change is the same screen on another slice: it replaces the history entry like a filter change does
      onNavigate: (href) => navigate(href, "replace"),
      entityHref: (e, role) => pathFor(locale, { name: "entity", entity: role, key: e.key, view: "overview" }),
      recordHref: (record) => pathFor(locale, { name: "record", code: record.code }),
      methodologyHref: methodologyHref(locale, "awardedValue"),
      suspectHref: recordsHref(locale, entity, entityKey, { filter: withSuspectBadge(filter), ...(carried ? { carried } : {}) }),
      locale,
      // offered only to a reader who came from a search; following it applies the search and the parameter goes (see `onlyMatchingHref`)
      filterExtras: carried
        ? <OnlyMatchingLink carried={carried} href={onlyMatchingHref(locale, entity, entityKey, { filter, carried, ...(order ? { order } : {}) })} copy={own.onlyMatching} />
        : undefined,
      copy: {
        heading: own.heading,
        facets: { ...own.facets, badges: t.badges, channels: t.filterChips.channel.options },
        empty: own.empty,
        total: t.total,
        recordRow: t.results.recordRow,
        table: own.table,
        pagination: t.fullResults.pagination,
      },
    };
  }, [locale, entity, entityKey, filter, page, order, carried, setFilter, t]);
}
