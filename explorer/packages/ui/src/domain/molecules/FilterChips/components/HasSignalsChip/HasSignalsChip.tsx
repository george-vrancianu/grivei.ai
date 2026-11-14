import type { FilterChipsCopy } from "../../filterChips.types.ts";
import { ChipGroup } from "../../../ChipGroup/index.ts";
import { ToggleChip } from "../../../ToggleChip/index.ts";

export interface HasSignalsChipProps {
  /** The filter's `hasSignals`: only `true` shows as pressed; `false` is the active-chip row's business. */
  hasSignals: boolean | null | undefined;
  onToggle: () => void;
  copy: FilterChipsCopy["signals"];
}

/** "Has Signals": on (`true`) or unset. */
export function HasSignalsChip({ hasSignals, onToggle, copy }: HasSignalsChipProps) {
  return (
    <ChipGroup label={copy.group}>
      <ToggleChip label={copy.has} pressed={hasSignals === true} onToggle={onToggle} />
    </ChipGroup>
  );
}
