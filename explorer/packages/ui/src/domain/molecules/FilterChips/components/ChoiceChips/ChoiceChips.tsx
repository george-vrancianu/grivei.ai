import { ChipGroup } from "../ChipGroup/index.ts";
import { ToggleChip } from "../ToggleChip/index.ts";

export interface ChoiceChipsProps<T extends string> {
  label: string;
  /** In display order. */
  options: readonly { value: T; label: string }[];
  selected: T | null | undefined;
  /** Called with the option clicked; the owner unsets the field when it is the selected one. */
  onChoose: (value: T) => void;
}

/** One choice among several (channel, value bucket): toggle chips in a named group; choosing the selected one again clears it. */
export function ChoiceChips<T extends string>({ label, options, selected, onChoose }: ChoiceChipsProps<T>) {
  return (
    <ChipGroup label={label}>
      {options.map((option) => (
        <ToggleChip key={option.value} label={option.label} pressed={selected === option.value} onToggle={() => onChoose(option.value)} />
      ))}
    </ChipGroup>
  );
}
