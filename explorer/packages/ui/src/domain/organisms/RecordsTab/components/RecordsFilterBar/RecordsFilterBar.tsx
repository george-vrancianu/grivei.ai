import { Fragment, type ReactNode } from "react";
import type { RecordFilter } from "@grivei/contract";
import { Box } from "../../../../../atoms/Box/index.ts";
import { Card } from "../../../../../atoms/Card/index.ts";
import type { Locale } from "../../../../../theme/index.ts";
import { ActiveChips } from "../../../../molecules/FilterChips/index.ts";
import { FilterBarDivider } from "../../../../molecules/FilterBarDivider/index.ts";
import { FilterBarRow } from "../../../../molecules/FilterBarRow/index.ts";
import { FilterStrip } from "../../../../molecules/FilterStrip/index.ts";
import type { EntityRole, RecordFacetData } from "../../../../types.ts";
import { FacetMenu } from "./components/FacetMenu/index.ts";
import { clearRecordFilters, facetGroups, recordChips, type RecordsFilterBarCopy } from "./recordsFilterBar.utils.ts";

export interface RecordsFilterBarProps {
  facets: RecordFacetData;
  /** The whole filter: a menu or chip changes only its own fields and hands the rest back untouched. */
  filter: RecordFilter;
  /** The page's role: its counterparty menu sets `supplier` on an authority's page and `authority` on a supplier's. */
  role: EntityRole;
  onFilterChange: (next: RecordFilter) => void;
  /** One extra control that changes the filter, after the menus in the same row. */
  extras?: ReactNode;
  locale: Locale;
  copy: RecordsFilterBarCopy;
}

/** Facets that take any number of values at once; every other one is a single choice. */
const MULTIPLE = new Set(["procedure", "badge"]);

/**
 * The Records tab's filter bar, in its own panel: a menu per facet (Signal first, a divider, then channel, procedure, year, counterparty and badges), each value with its count (≈ when estimated),
 * the `extras` after them; under the row, when a filter is on, one chip per parameter that is set and a Clear filters action. Controlled.
 */
export function RecordsFilterBar({ facets, filter, role, onFilterChange, extras, locale, copy }: RecordsFilterBarProps) {
  const groups = facetGroups(facets, filter, role, copy, onFilterChange);
  const chips = recordChips(filter, role, facets, copy, locale);
  return (
    <Card sx={{ p: 0, minWidth: 0, overflow: "hidden" }}>
      <Box component="section" aria-label={copy.label}>
        <FilterStrip>
          <FilterBarRow>
            {groups.map((group) => (
              <Fragment key={group.id}>
                <FacetMenu group={group} multiple={MULTIPLE.has(group.id)} optionText={copy.option} unsetLabel={copy.any} picked={copy.picked} locale={locale} />
                {group.id === "signal" && groups.length > 1 && <FilterBarDivider />}
              </Fragment>
            ))}
            {extras}
          </FilterBarRow>
        </FilterStrip>
        {/* Guard here: an empty list must drop the strip too. */}
        {chips.length > 0 && (
          <FilterStrip>
            <ActiveChips chips={chips} onRemove={(chip) => onFilterChange(chip.remove(filter))} onClearAll={() => onFilterChange(clearRecordFilters(filter))} copy={copy.active} />
          </FilterStrip>
        )}
      </Box>
    </Card>
  );
}
