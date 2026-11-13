import type { RecordFilter } from "@grivei/contract";
import { Box } from "../../../../../atoms/Box/index.ts";
import type { Locale } from "../../../../../theme/index.ts";
import type { EntityRole, RecordFacetData } from "../../../../types.ts";
import { FacetGroup } from "../FacetGroup/index.ts";
import { facetGroups, type FacetPanelCopy } from "./facetPanel.utils.ts";

export interface FacetPanelProps {
  facets: RecordFacetData;
  /** The whole filter: the panel changes only the fields it owns and hands the rest back untouched. */
  filter: RecordFilter;
  /** The page's role: its counterparty facet sets `supplier` on an authority's page and `authority` on a supplier's. */
  role: EntityRole;
  onFilterChange: (next: RecordFilter) => void;
  locale: Locale;
  copy: FacetPanelCopy;
}

/** The Records tab's side panel: facets by Signal, channel, procedure, year, counterparty and badge, each value with its count. Controlled. */
export function FacetPanel({ facets, filter, role, onFilterChange, locale, copy }: FacetPanelProps) {
  return (
    <Box component="aside" aria-label={copy.label} sx={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: "16px 28px" }}>
      {facetGroups(facets, filter, role, copy, onFilterChange).map((group) => (
        <FacetGroup key={group.id} title={group.title} options={group.options} optionText={copy.option} locale={locale} />
      ))}
    </Box>
  );
}
