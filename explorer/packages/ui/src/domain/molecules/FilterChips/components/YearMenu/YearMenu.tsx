import type { RecordFilter } from "@grivei/contract";
import type { FilterChipsCopy } from "../../filterChips.types.ts";
import { yearOf, yearOptions, yearRangeText } from "../../filterChips.utils.ts";
import { FilterMenu, MenuHeading, MenuOption } from "../FilterMenu/index.ts";

export interface YearMenuProps {
  filter: RecordFilter;
  firstYear: number;
  lastYear: number;
  onFromYear: (year: number | undefined) => void;
  onToYear: (year: number | undefined) => void;
  copy: FilterChipsCopy["year"];
  /** "Any" / "Oricare", the button's text while neither end is set. */
  unsetLabel: string;
  /** Start open (the workbench shows an open menu this way). */
  defaultOpen?: boolean;
}

/**
 * The award-date range as a menu of two columns, "From year" and "To year", each starting with "Any" and then the years. The menu stays open while
 * you pick. Picking a year sets Jan 1 (from) or Dec 31 (to); the chosen year again keeps it (the "Any" item clears it). A date that is not a year edge
 * is reflected as its containing year here (the active chip shows the exact date).
 *
 * The items are direct children in column order and the list is a grid that flows by column, so the arrow keys carry on from the end of
 * "From year" into "To year".
 */
export function YearMenu({ filter, firstYear, lastYear, onFromYear, onToYear, copy, unsetLabel, defaultOpen }: YearMenuProps) {
  const years = yearOptions(firstYear, lastYear, filter);
  const column = (heading: string, held: number | undefined, onPick: (year: number | undefined) => void) => [
    <MenuHeading key={`${heading}-heading`} disabled>{heading}</MenuHeading>,
    <MenuOption key={`${heading}-any`} role="menuitemradio" checked={held === undefined} label={`${heading} ${copy.any}`} onChoose={() => onPick(undefined)}>
      {copy.any}
    </MenuOption>,
    ...years.map((year) => (
      <MenuOption key={`${heading}-${year}`} role="menuitemradio" checked={held === year} label={`${heading} ${year}`} onChoose={() => onPick(year)}>
        {year}
      </MenuOption>
    )),
  ];
  return (
    <FilterMenu
      label={copy.group}
      value={yearRangeText(filter, copy.range)}
      unsetLabel={unsetLabel}
      defaultOpen={defaultOpen}
      listSx={{ display: "grid", gridAutoFlow: "column", gridTemplateRows: `repeat(${years.length + 2}, auto)`, columnGap: "4px" }}
    >
      {[...column(copy.from, yearOf(filter.from), onFromYear), ...column(copy.to, yearOf(filter.to), onToYear)]}
    </FilterMenu>
  );
}
