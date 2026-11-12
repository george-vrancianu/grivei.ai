import { useMemo } from "react";
import type { RelationshipsTabProps } from "@grivei/ui";
import { useCopy } from "../../../copy/useCopy.ts";
import { navigate } from "../../../routing/location.tsx";
import { pathFor, type EntityRoute } from "../../../routing/routes.ts";
import { useUrlState } from "../../../urlState/useUrlState.ts";
import { tabHref } from "../entityPage.utils.ts";
import { RECORDS_PAGE_SIZE } from "./useEntityPage.ts";

type Wiring = Omit<RelationshipsTabProps, "entity" | "counterparties" | "timeline" | "selectedTimeline" | "sidePanel" | "sidePanelLoading" | "flowToggle" | "flowMap">;

/**
 * Everything the Relationships tab needs from the app but its data: the picked counterparty (the URL's `counterparty`; picking resets the side panel's
 * page and replaces the history entry like a filter change), links built for the active language, and the copy. The data comes from `useEntityPage`
 * and `usePickedCounterparty`.
 */
export function useRelationshipsTab(locale: Wiring["locale"], entity: EntityRoute, entityKey: string): Wiring {
  const t = useCopy();
  const { filter, page, lens, counterparty, update } = useUrlState();
  return useMemo(() => {
    const own = t.entityPage.relationships;
    const here = (n: number) => tabHref(locale, entity, entityKey, "relationships", { filter, ...(lens ? { lens } : {}), ...(counterparty ? { counterparty } : {}), page: n });
    return {
      role: entity,
      selected: counterparty ?? null,
      onSelect: (key) => update({ counterparty: key ?? undefined, page: undefined }),
      sidePanelPaging: { page: page ?? 1, pageSize: RECORDS_PAGE_SIZE, pageHref: here },
      // a page change is the same screen on another slice: it replaces the history entry like a filter change does
      onNavigate: (href) => navigate(href, "replace"),
      entityHref: (e, role) => pathFor(locale, { name: "entity", entity: role, key: e.key, view: "overview" }),
      recordHref: (record) => pathFor(locale, { name: "record", code: record.code }),
      locale,
      copy: { ...own.tab, entityLink: t.entityLink, recordRow: t.results.recordRow, pagination: t.fullResults.pagination },
    };
  }, [locale, entity, entityKey, filter, page, lens, counterparty, update, t]);
}
