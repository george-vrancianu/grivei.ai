import { TextField } from "../../../../../atoms/TextField/index.ts";
import type { FilterChipsCopy } from "../../filterChips.types.ts";
import { ChipGroup } from "../../../ChipGroup/index.ts";

export interface PartyChipsProps {
  /** The lists to offer, as registered at the election (source data, never translated): parties and alliances under their own names, never "Independent". */
  parties: readonly string[];
  /** The list the filter holds, if any. */
  selected: string | null | undefined;
  onChoose: (party: string | undefined) => void;
  copy: FilterChipsCopy["party"];
}

/**
 * The Party filter (#181): one list at a time, picked from a select (there are far too many lists for a chip each). The list the filter holds is always
 * among the choices, even when the caller did not offer it (a URL can say anything).
 */
export function PartyChips({ parties, selected, onChoose, copy }: PartyChipsProps) {
  const choices = selected && !parties.includes(selected) ? [selected, ...parties] : parties;
  return (
    <ChipGroup label={copy.group}>
      <TextField
        select
        size="small"
        label={copy.select}
        value={selected ?? ""}
        onChange={(event) => onChoose(event.target.value === "" ? undefined : event.target.value)}
        slotProps={{ select: { native: true }, inputLabel: { shrink: true } }}
        sx={{ minWidth: 220, maxWidth: "100%" }}
      >
        <option value="">{copy.any}</option>
        {choices.map((party) => (
          <option key={party} value={party}>
            {party}
          </option>
        ))}
      </TextField>
    </ChipGroup>
  );
}
