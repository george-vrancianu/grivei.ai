import { ChipGroup } from "../../../../molecules/ChipGroup/index.ts";
import { ToggleChip } from "../../../../molecules/ToggleChip/index.ts";
import { formatCount } from "../../../../atoms/ApproxCount/index.ts";
import type { Locale } from "../../../../../theme/index.ts";

export interface FacetOptionData {
  /** Unique in its group: the facet's value (a year, a channel, a procedure, an entity key ...). */
  id: string;
  label: string;
  /** The facet's Record count; absent for an active value the facets did not list. */
  count?: { records: number; estimated: boolean };
  pressed: boolean;
  /** A tooltip (a badge's caveat). */
  description?: string;
  onToggle: () => void;
}

export interface FacetGroupProps {
  title: string;
  options: readonly FacetOptionData[];
  /** "Direct purchase (12)": the option's label and its count, already in the locale's number format. */
  optionText: (label: string, count: string) => string;
  locale: Locale;
}

/** One facet: its title and a toggle chip per value, each with its count (≈ when estimated). */
export function FacetGroup({ title, options, optionText, locale }: FacetGroupProps) {
  return (
    <ChipGroup label={title}>
      {options.map((option) => (
        <ToggleChip
          key={option.id}
          label={option.count ? optionText(option.label, formatCount(option.count.records, option.count.estimated, locale)) : option.label}
          pressed={option.pressed}
          onToggle={option.onToggle}
          {...(option.description ? { description: option.description } : {})}
        />
      ))}
    </ChipGroup>
  );
}
