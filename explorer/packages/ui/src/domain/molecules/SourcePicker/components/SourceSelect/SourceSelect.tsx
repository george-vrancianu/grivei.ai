import { TextField } from "../../../../../atoms/TextField/index.ts";
import type { SourcePickerOption } from "../../sourcePicker.types.ts";
import { optionText } from "../../sourcePicker.utils.ts";

export interface SourceSelectProps {
  options: readonly SourcePickerOption[];
  selected: string;
  onSelect: (id: string) => void;
  /** The select's accessible name ("Source"). */
  label: string;
}

/** The Source picker as a native, borderless select (a phone's own picker), for a narrow screen where the segments do not fit inside the search box. */
export function SourceSelect({ options, selected, onSelect, label }: SourceSelectProps) {
  return (
    <TextField
      select
      variant="standard"
      value={selected}
      onChange={(event) => event.target.value !== selected && onSelect(event.target.value)}
      slotProps={{ select: { native: true }, htmlInput: { "aria-label": label }, input: { disableUnderline: true } }}
      sx={{ maxWidth: 120, "& .MuiNativeSelect-select": { fontSize: "0.875rem", fontWeight: 600, py: 0.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }}
    >
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {optionText(option)}
        </option>
      ))}
    </TextField>
  );
}
