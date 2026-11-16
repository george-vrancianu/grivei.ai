import { FilterMenu, MenuOption } from "../../../FilterMenu/index.ts";

export interface StatusMenuProps {
  /** The status codes offered, in order. */
  offered: readonly number[];
  /** The codes ticked. Every one ticked is no status filter. */
  selected: readonly number[];
  /** Called with the code clicked; the owner ticks or unticks it. The menu stays open. */
  onToggle: (code: number) => void;
  /** The name of a code. */
  name: (code: number) => string;
  copy: {
    /** The group name ("Status"). */
    group: string;
    /** The button's value while every status is ticked ("All"). */
    all: string;
    /** "3 picked", once more than one (but not all) is ticked. */
    picked: (n: number) => string;
  };
  /** Start open (the workbench shows an open menu this way). */
  defaultOpen?: boolean;
}

/** ONRC's statuses as a filter menu of ticked items that stays open. Every status is ticked by default; the button names the one ticked, or counts them. */
export function StatusMenu({ offered, selected, onToggle, name, copy, defaultOpen }: StatusMenuProps) {
  const all = offered.every((code) => selected.includes(code));
  const value = all ? undefined : selected.length === 1 ? name(selected[0]!) : copy.picked(selected.length);
  return (
    <FilterMenu label={copy.group} value={value} unsetLabel={copy.all} defaultOpen={defaultOpen}>
      {offered.map((code) => (
        <MenuOption key={code} role="menuitemcheckbox" checked={selected.includes(code)} onChoose={() => onToggle(code)}>
          {name(code)}
        </MenuOption>
      ))}
    </FilterMenu>
  );
}
