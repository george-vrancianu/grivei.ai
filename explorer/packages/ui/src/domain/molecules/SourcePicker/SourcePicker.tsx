import { ToggleButton } from "../../../atoms/ToggleButton/index.ts";
import { ToggleButtonGroup } from "../../../atoms/ToggleButtonGroup/index.ts";

export interface SourcePickerOption {
  /** The Source's id (`SEAP`, `ONRC`). */
  id: string;
  /** The Source's name, from the API. */
  label: string;
  /** What the Source has for the current query, already worded and formatted ("1,204 Records"); absent = none shown (no query, still loading, or failed). */
  count?: string | undefined;
}

export interface SourcePickerCopy {
  /** The group's accessible name ("Source"). */
  label: string;
}

export interface SourcePickerProps {
  options: readonly SourcePickerOption[];
  selected: string;
  onSelect: (id: string) => void;
  copy: SourcePickerCopy;
}

/**
 * One Source out of the explorable ones (ADR 0005), as a segmented control with the chosen one pressed. Each option may carry its own match count
 * for the query: the counts sit side by side and are never summed, ranked or merged. The same control is the Source switch of the Records tab
 * and the Source selector of the Coverage lens and page (without counts there).
 */
export function SourcePicker({ options, selected, onSelect, copy }: SourcePickerProps) {
  return (
    <ToggleButtonGroup exclusive aria-label={copy.label} value={selected} onChange={(_event, next: string | null) => next !== null && onSelect(next)}>
      {options.map((option) => (
        <ToggleButton key={option.id} value={option.id}>
          {option.count === undefined ? option.label : `${option.label} · ${option.count}`}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
