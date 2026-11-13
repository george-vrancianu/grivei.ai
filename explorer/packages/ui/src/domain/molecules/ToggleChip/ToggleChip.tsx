import { Chip } from "../../../atoms/Chip/index.ts";
import { Tooltip } from "../../../atoms/Tooltip/index.ts";

export interface ToggleChipProps {
  label: string;
  pressed: boolean;
  onToggle: () => void;
  /** Shown as a tooltip and read as the chip's description (a badge's caveat). */
  description?: string;
  /** `medium` is a filter chip (40 px pill, the default); `small` is a badge chip (32 px, with a 44 px hit area). */
  size?: "small" | "medium";
}

/** A filter chip that is on or off: a button with `aria-pressed`, filled when on, outlined when off. */
export function ToggleChip({ label, pressed, onToggle, description, size = "medium" }: ToggleChipProps) {
  const chip = (
    <Chip
      size={size}
      label={label}
      clickable
      aria-pressed={pressed}
      onClick={onToggle}
      variant={pressed ? "filled" : "outlined"}
      color="primary"
    />
  );
  return description ? (
    <Tooltip title={description} describeChild>
      {chip}
    </Tooltip>
  ) : (
    chip
  );
}
