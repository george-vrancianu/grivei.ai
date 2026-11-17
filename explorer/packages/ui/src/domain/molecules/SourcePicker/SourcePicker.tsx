import { ToggleButton } from "../../../atoms/ToggleButton/index.ts";
import { ToggleButtonGroup } from "../../../atoms/ToggleButtonGroup/index.ts";
import { SegmentedTrack } from "../SegmentedTrack/index.ts";
import { SourceSelect } from "./components/SourceSelect/index.ts";
import { useNarrowScreen } from "../../../theme/useNarrowScreen.ts";
import type { SourcePickerCopy, SourcePickerOption } from "./sourcePicker.types.ts";
import { optionText } from "./sourcePicker.utils.ts";

export type { SourcePickerCopy, SourcePickerOption } from "./sourcePicker.types.ts";

export interface SourcePickerProps {
  options: readonly SourcePickerOption[];
  selected: string;
  onSelect: (id: string) => void;
  /** Sits inside the search box (its `endSlot`): small segments with no track of their own (the search field is already a well), and a dropdown on a narrow screen. */
  inline?: boolean;
  copy: SourcePickerCopy;
}

/**
 * One Source out of the explorable ones (ADR 0005), as a segmented control on a well track with the chosen one pressed (the track is left off when `inline`). Each option may carry its own match count
 * for the query: the counts sit side by side and are never summed, ranked or merged. The same control is the Source switch of the Records tab
 * and the Source selector of the Coverage lens and page (without counts there).
 */
export function SourcePicker({ options, selected, onSelect, inline = false, copy }: SourcePickerProps) {
  const narrow = useNarrowScreen();
  if (inline && narrow) return <SourceSelect options={options} selected={selected} onSelect={onSelect} label={copy.label} />;
  const group = (
    <ToggleButtonGroup
      exclusive
      size={inline ? "small" : "medium"}
      aria-label={copy.label}
      value={selected}
      onChange={(_event, next: string | null) => next !== null && onSelect(next)}
      sx={inline ? { "& .MuiToggleButton-root": { py: 0.5, whiteSpace: "nowrap" } } : undefined}
    >
      {options.map((option) => (
        <ToggleButton key={option.id} value={option.id}>
          {optionText(option)}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
  return inline ? group : <SegmentedTrack>{group}</SegmentedTrack>;
}
