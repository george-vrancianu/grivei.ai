import { Chip } from "../../../../../atoms/Chip/index.ts";
import { Tooltip } from "../../../../../atoms/Tooltip/index.ts";

export interface ToggleChipProps {
  label: string;
  pressed: boolean;
  onToggle: () => void;
  /** Shown as a tooltip and read as the chip's description (a badge's caveat). */
  description?: string;
  tone?: "default" | "primary" | "info" | "warning";
}

/** A filter chip that is on or off: a button with `aria-pressed`, filled when on, outlined when off. */
export function ToggleChip({ label, pressed, onToggle, description, tone = "primary" }: ToggleChipProps) {
  const chip = (
    <Chip
      size="small"
      label={label}
      clickable
      aria-pressed={pressed}
      onClick={onToggle}
      variant={pressed ? "filled" : "outlined"}
      {...(tone === "default" ? {} : { color: tone })}
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
