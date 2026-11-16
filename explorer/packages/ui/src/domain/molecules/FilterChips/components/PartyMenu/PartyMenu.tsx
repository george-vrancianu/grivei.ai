import type { FilterChipsCopy } from "../../filterChips.types.ts";
import { ChoiceMenu } from "../../../ChoiceMenu/index.ts";

export interface PartyMenuProps {
  /** The lists to offer, as registered at the election (source data, never translated): parties and alliances under their own names, never "Independent". */
  parties: readonly string[];
  /** The list the filter holds, if any. */
  selected: string | null | undefined;
  /** The list picked, or `undefined` when the chosen one is clicked again. */
  onChoose: (party: string | undefined) => void;
  copy: FilterChipsCopy["party"];
  /** "Any" / "Oricare". */
  unsetLabel: string;
  /** Start open (the workbench shows an open menu this way). */
  defaultOpen?: boolean;
}

/**
 * The Party filter (#181): one list at a time (the filter holds one), picked from a menu of `menuitemradio` items, as there are far too many lists for a chip each.
 * Clicking the chosen list again clears it. The list the filter holds is always among the choices, even when the caller did not offer it (a URL can say anything).
 */
export function PartyMenu({ parties, selected, onChoose, copy, unsetLabel, defaultOpen }: PartyMenuProps) {
  const choices = selected && !parties.includes(selected) ? [selected, ...parties] : parties;
  return (
    <ChoiceMenu
      label={copy.group}
      unsetLabel={unsetLabel}
      options={choices.map((party) => ({ value: party, label: party }))}
      selected={selected}
      onChoose={(party) => onChoose(party === selected ? undefined : party)}
      defaultOpen={defaultOpen}
    />
  );
}
