import type { FilterChipsCopy } from "../../filterChips.types.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";
import { ChipGroup } from "../ChipGroup/index.ts";
import { ToggleChip } from "../ToggleChip/index.ts";

export interface ProcedureChipsProps {
  /** Procedure names as SEAP publishes them (Romanian, in both languages). */
  procedures: readonly string[];
  selected: readonly string[] | null | undefined;
  onToggle: (procedure: string) => void;
  copy: FilterChipsCopy["procedure"];
}

/** Several procedures at once, one toggle chip each; names are shown as published, never translated. */
export function ProcedureChips({ procedures, selected, onToggle, copy }: ProcedureChipsProps) {
  return (
    <ChipGroup label={copy.group}>
      {procedures.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {copy.empty}
        </Typography>
      ) : (
        procedures.map((name) => <ToggleChip key={name} label={name} pressed={(selected ?? []).includes(name)} onToggle={() => onToggle(name)} />)
      )}
    </ChipGroup>
  );
}
