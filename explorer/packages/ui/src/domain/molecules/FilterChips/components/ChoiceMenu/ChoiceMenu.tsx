import { FilterMenu, MenuOption } from "../FilterMenu/index.ts";

export interface ChoiceMenuProps<T extends string> {
  /** The group name. */
  label: string;
  /** "Any" / "Oricare", shown while nothing is chosen. */
  unsetLabel: string;
  /** In display order. */
  options: readonly { value: T; label: string }[];
  selected: T | null | undefined;
  /** Called with the option picked; the owner unsets the field when it is the selected one. The menu closes. */
  onChoose: (value: T) => void;
  /** Start open (the workbench shows an open menu this way). */
  defaultOpen?: boolean;
}

/** One choice among several (channel, value bucket): a filter menu of `menuitemradio` items; picking closes it, and picking the chosen one again clears it (the owner's rule). */
export function ChoiceMenu<T extends string>({ label, unsetLabel, options, selected, onChoose, defaultOpen }: ChoiceMenuProps<T>) {
  const chosen = options.find((option) => option.value === selected);
  return (
    <FilterMenu label={label} value={chosen?.label} unsetLabel={unsetLabel} defaultOpen={defaultOpen}>
      {({ close }) =>
        options.map((option) => (
          <MenuOption
            key={option.value}
            role="menuitemradio"
            checked={option.value === selected}
            onChoose={() => {
              onChoose(option.value);
              close();
            }}
          >
            {option.label}
          </MenuOption>
        ))
      }
    </FilterMenu>
  );
}
