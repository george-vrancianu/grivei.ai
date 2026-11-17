import type { Locale } from "../../../../../../../theme/index.ts";
import { formatCount } from "../../../../../../atoms/ApproxCount/index.ts";
import { ChoiceMenu } from "../../../../../../molecules/ChoiceMenu/index.ts";
import { MultiChoiceMenu } from "../../../../../../molecules/MultiChoiceMenu/index.ts";
import type { FacetGroupData, FacetOptionData } from "../../recordsFilterBar.utils.ts";

export interface FacetMenuProps {
  group: FacetGroupData;
  /** One value at a time (Signal, channel, year, counterparty) or any number (procedure, badges). */
  multiple: boolean;
  /** "Direct purchase (12)": a value and its count, the count already in the locale's number format. */
  optionText: (label: string, count: string) => string;
  /** "Any" / "Oricare". */
  unsetLabel: string;
  picked: (n: number) => string;
  locale: Locale;
}

/** One facet as a filter menu: each value with its count (≈ when estimated); a value that is on is checked. Choosing one calls the option's own toggle. */
export function FacetMenu({ group, multiple, optionText, unsetLabel, picked, locale }: FacetMenuProps) {
  const label = (option: FacetOptionData) => (option.count ? optionText(option.label, formatCount(option.count.records, option.count.estimated, locale)) : option.label);
  const toggle = (id: string) => group.options.find((option) => option.id === id)?.onToggle();
  const options = group.options.map((option) => ({ value: option.id, label: label(option), ...(option.description ? { hint: option.description } : {}) }));
  return multiple ? (
    <MultiChoiceMenu label={group.title} unsetLabel={unsetLabel} options={options} selected={group.options.filter((o) => o.pressed).map((o) => o.id)} onToggle={toggle} picked={picked} />
  ) : (
    <ChoiceMenu label={group.title} unsetLabel={unsetLabel} options={options} selected={group.options.find((o) => o.pressed)?.id} onChoose={toggle} />
  );
}
