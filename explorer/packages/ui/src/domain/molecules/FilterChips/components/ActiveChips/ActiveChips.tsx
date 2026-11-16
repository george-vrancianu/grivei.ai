import { Box } from "../../../../../atoms/Box/index.ts";
import { Button } from "../../../../../atoms/Button/index.ts";
import { Chip } from "../../../../../atoms/Chip/index.ts";
import type { FilterChipsCopy } from "../../filterChips.types.ts";
import type { ActiveChip } from "../../filterChips.utils.ts";
import { ChipGroup } from "../../../ChipGroup/index.ts";

export interface ActiveChipsProps {
  chips: readonly ActiveChip[];
  onRemove: (chip: ActiveChip) => void;
  onClearAll: () => void;
  copy: Pick<FilterChipsCopy["active"], "group" | "remove" | "clearAll">;
}

/** The chips that are on, each with a remove action ("Remove <chip>"), and one action that clears them all. With none on, the strip is absent. */
export function ActiveChips({ chips, onRemove, onClearAll, copy }: ActiveChipsProps) {
  if (chips.length === 0) return null;
  return (
    <ChipGroup label={copy.group}>
      {chips.map((chip) => (
        <Chip key={chip.id} color="primary" label={chip.label} aria-label={copy.remove(chip.label)} onClick={() => onRemove(chip)} onDelete={() => onRemove(chip)} />
      ))}
      <Box>
        <Button size="small" onClick={onClearAll}>
          {copy.clearAll}
        </Button>
      </Box>
    </ChipGroup>
  );
}
