import { MenuItem } from "../../../../../atoms/MenuItem/index.ts";
import { pickedText } from "../../filterChips.utils.ts";
import { FilterMenu, MenuOption } from "../FilterMenu/index.ts";

export interface MultiChoiceOption<T extends string> {
  value: T;
  label: string;
  /** Shown as the item's tooltip. */
  hint?: string;
}

export interface MultiChoiceMenuProps<T extends string> {
  /** The group name. */
  label: string;
  /** "Any" / "Oricare", shown while nothing is chosen. */
  unsetLabel: string;
  /** In display order. */
  options: readonly MultiChoiceOption<T>[];
  selected: readonly T[] | null | undefined;
  /** Called with the option clicked; the owner adds it or, when already chosen, removes it. The menu stays open. */
  onToggle: (value: T) => void;
  /** "3 picked", for the button once more than one is chosen. */
  picked: (n: number) => string;
  /** The only line, disabled, when there are no options to choose from. */
  emptyText?: string;
  /** Start open (the workbench shows an open menu this way). */
  defaultOpen?: boolean;
}

/** Any number of choices at once (procedure, Record badges): a filter menu of `menuitemcheckbox` items that stays open. The button shows the one pick's name, or the count. */
export function MultiChoiceMenu<T extends string>({ label, unsetLabel, options, selected, onToggle, picked, emptyText, defaultOpen }: MultiChoiceMenuProps<T>) {
  const chosen = selected ?? [];
  const names = options.filter((option) => chosen.includes(option.value)).map((option) => option.label);
  return (
    <FilterMenu label={label} value={pickedText(names, picked)} unsetLabel={unsetLabel} defaultOpen={defaultOpen}>
      {options.length === 0
        ? [<MenuItem key="empty" disabled>{emptyText}</MenuItem>]
        : options.map((option) => (
            <MenuOption key={option.value} role="menuitemcheckbox" checked={chosen.includes(option.value)} hint={option.hint} onChoose={() => onToggle(option.value)}>
              {option.label}
            </MenuOption>
          ))}
    </FilterMenu>
  );
}
