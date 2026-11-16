import type { ReactNode } from "react";
import { MenuItem } from "../../../../../../../atoms/MenuItem/index.ts";
import { color } from "../../../../../../../theme/tokens.ts";

export interface MenuOptionProps {
  /** `menuitemradio` for a single choice, `menuitemcheckbox` for a multi-select. */
  role: "menuitemradio" | "menuitemcheckbox";
  checked: boolean;
  onChoose: () => void;
  disabled?: boolean;
  /** The accessible name when the visible text is not enough alone (a year in the "From" column: "From year 2023"). */
  label?: string;
  /** A longer explanation, shown as the item's tooltip. */
  hint?: string;
  children: ReactNode;
}

/** One line of a filter menu: the label on the left, an amber check on the right when chosen. Must be a direct child of the menu (MUI's list takes no fragments). */
export function MenuOption({ role, checked, onChoose, disabled, label, hint, children }: MenuOptionProps) {
  return (
    <MenuItem role={role} aria-checked={checked} selected={checked} disabled={disabled} aria-label={label} title={hint} onClick={onChoose}>
      <span>{children}</span>
      <svg
        aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        style={{ flex: "none", opacity: checked ? 1 : 0 }}
      >
        <path d="M5 12l5 5 9-10" />
      </svg>
    </MenuItem>
  );
}
