import { Box } from "../../../../../atoms/Box/index.ts";
import { Button } from "../../../../../atoms/Button/index.ts";
import { Chip } from "../../../../../atoms/Chip/index.ts";
import { ChipGroup } from "../../../ChipGroup/index.ts";
import type { OnrcFilterChipsCopy } from "../../onrcFilterChips.types.ts";
import type { ActiveOnrcChip } from "../../onrcFilterChips.utils.ts";

export interface OnrcActiveChipsProps {
  chips: readonly ActiveOnrcChip[];
  onRemove: (chip: ActiveOnrcChip) => void;
  onClearAll: () => void;
  copy: Pick<OnrcFilterChipsCopy["active"], "group" | "remove" | "clearAll">;
}

/** ONRC's filters that are on, each with a remove action ("Remove <chip>"), and one action that clears them all. */
export function OnrcActiveChips({ chips, onRemove, onClearAll, copy }: OnrcActiveChipsProps) {
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
