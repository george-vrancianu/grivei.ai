import { useMemo } from "react";
import type { RecordsTabProps } from "@grivei/ui";
import { useCopy } from "../../../copy/useCopy.ts";
import { navigate } from "../../../routing/location.tsx";
import { pathFor, type EntityRoute } from "../../../routing/routes.ts";
import { useUrlState } from "../../../urlState/useUrlState.ts";
import { patchTo, recordsHref } from "../entityPage.utils.ts";
import { RECORDS_PAGE_SIZE } from "./useEntityPage.ts";

type Wiring = Omit<RecordsTabProps, "records">;

/**
 * Everything the Records tab needs from the app but its data: the URL's filter and page, the way to change the filter (history replaced,
 * page reset), links built for the active language, and the copy. The data comes from `useEntityPage`.
 */
export function useRecordsTab(locale: Wiring["locale"], entity: EntityRoute, entityKey: string): Wiring {
  const t = useCopy();
  const { filter, page, order, setFilter } = useUrlState();
  return useMemo(() => {
    const here = (n: number) => recordsHref(locale, entity, entityKey, { filter, ...(order ? { order } : {}), page: n });
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
      methodologyHref: pathFor(locale, { name: "methodology" }),
      suspectHref: recordsHref(locale, entity, entityKey, { filter: { ...filter, badges: ["SUSPECT_VALUE"] } }),
      locale,
      copy: {
        heading: own.heading,
        facets: { ...own.facets, badges: t.badges, channels: t.filterChips.channel.options },
        empty: own.empty,
        total: t.total,
        recordRow: t.results.recordRow,
        pagination: t.fullResults.pagination,
      },
    };
  }, [locale, entity, entityKey, filter, page, order, setFilter, t]);
}
