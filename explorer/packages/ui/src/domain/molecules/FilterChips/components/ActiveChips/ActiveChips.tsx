import { Box } from "../../../../../atoms/Box/index.ts";
import { Button } from "../../../../../atoms/Button/index.ts";
import { Chip } from "../../../../../atoms/Chip/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";
import type { FilterChipsCopy } from "../../filterChips.types.ts";
import type { ActiveChip } from "../../filterChips.utils.ts";
import { ChipGroup } from "../ChipGroup/index.ts";

export interface ActiveChipsProps {
  chips: readonly ActiveChip[];
  onRemove: (chip: ActiveChip) => void;
  onClearAll: () => void;
  copy: FilterChipsCopy["active"];
}

/** The chips that are on, each with a remove action ("Remove <chip>"), and one action that clears them all. */
export function ActiveChips({ chips, onRemove, onClearAll, copy }: ActiveChipsProps) {
  return (
    <ChipGroup label={copy.group}>
      {chips.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {copy.none}
        </Typography>
      ) : (
        <>
          {chips.map((chip) => (
            <Chip
              key={chip.id}
              size="small"
              color="primary"
              label={chip.label}
              aria-label={copy.remove(chip.label)}
              onClick={() => onRemove(chip)}
              onDelete={() => onRemove(chip)}
            />
          ))}
          <Box>
            <Button size="small" onClick={onClearAll}>
              {copy.clearAll}
            </Button>
          </Box>
        </>
      )}
    </ChipGroup>
  );
}
