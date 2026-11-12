import { useMemo } from "react";
import type { EntityOverviewProps } from "@grivei/ui";
import { useCopy } from "../../../copy/useCopy.ts";
import { pathFor, type EntityRoute } from "../../../routing/routes.ts";
import { useUrlState } from "../../../urlState/useUrlState.ts";
import { recordsHref } from "../entityPage.utils.ts";

type Wiring = Omit<EntityOverviewProps, "overview" | "aliases" | "signals">;

/** Everything the Overview tab needs from the app but its data: links built for the active language, the suspect Records' list and the copy. The data comes from `useEntityPage`. */
export function useOverviewTab(locale: Wiring["locale"], entity: EntityRoute, entityKey: string): Wiring {
  const t = useCopy();
  const { filter } = useUrlState();
  return useMemo(() => {
    const own = t.entityPage.overview;
    return {
      role: entity,
      entityHref: (e, role) => pathFor(locale, { name: "entity", entity: role, key: e.key, view: "overview" }),
      recordHref: (record) => pathFor(locale, { name: "record", code: record.code }),
      methodologyHref: pathFor(locale, { name: "methodology" }),
      suspectHref: recordsHref(locale, entity, entityKey, { filter: { ...filter, badges: [...(filter.badges ?? []).filter((b) => b !== "SUSPECT_VALUE"), "SUSPECT_VALUE"] } }),
      locale,
      copy: {
        headline: { ...own.headline, totalFigure: t.total },
        signals: own.signals,
        counterparties: { ...own.counterparties, party: t.party },
        procedures: own.procedures,
        consortia: { ...own.consortia, party: t.party },
        frameworks: own.frameworks,
        largest: { ...own.largest, recordRow: t.results.recordRow },
        aliases: { ...own.aliases, badges: t.badges },
      },
    };
  }, [locale, entity, entityKey, filter, t]);
}
