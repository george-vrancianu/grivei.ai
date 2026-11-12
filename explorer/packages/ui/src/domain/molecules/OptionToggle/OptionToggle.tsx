import { Box } from "../../../atoms/Box/index.ts";
import { Button } from "../../../atoms/Button/index.ts";

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

/** One of a few choices, as a named group of toggle buttons with the chosen one pressed. */
export function OptionToggle<T extends string>({ options, value, onChange, labels, label }: OptionToggleProps<T>) {
  return (
    <Box role="group" aria-label={label} sx={{ display: "inline-flex", gap: 1 }}>
      {options.map((option) => (
        <Button key={option} size="small" variant={value === option ? "contained" : "outlined"} aria-pressed={value === option} onClick={() => onChange(option)}>
          {labels[option]}
        </Button>
      ))}
    </Box>
  );
}
