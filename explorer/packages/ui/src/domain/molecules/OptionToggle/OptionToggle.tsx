import { ToggleButton } from "../../../atoms/ToggleButton/index.ts";
import { ToggleButtonGroup } from "../../../atoms/ToggleButtonGroup/index.ts";
import { SegmentedTrack } from "../SegmentedTrack/index.ts";

export interface OptionToggleProps<T extends string> {
  /** The choices, in display order. */
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  /** The text of each choice. */
  labels: Record<T, string>;
  /** The group's accessible name. */
  label: string;
}

/** One of a few choices, as a segmented control on a well track (`SegmentedTrack`), with the chosen one pressed (the shared `selected` state). */
export function OptionToggle<T extends string>({ options, value, onChange, labels, label }: OptionToggleProps<T>) {
  return (
    <SegmentedTrack>
      <ToggleButtonGroup exclusive aria-label={label} value={value} onChange={(_event, next: T | null) => next !== null && onChange(next)}>
        {options.map((option) => (
          <ToggleButton key={option} value={option}>
            {labels[option]}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </SegmentedTrack>
  );
}
