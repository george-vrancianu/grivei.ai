import type { ReactNode } from "react";
import { Box } from "../../../../../atoms/Box/index.ts";
import { color } from "../../../../../theme/tokens.ts";

export interface MenuHeadingProps {
  children: ReactNode;
  /**
   * Always true. MUI's list reads `disabled` off its children to pick the one that takes focus first; a heading must never be it.
   * (A heading has no tabindex either, so the arrow keys step over it.)
   */
  disabled?: true;
}

/** A column heading inside a filter menu ("From year"): muted text, not an item. Must be a direct child of the menu. */
export function MenuHeading({ children }: MenuHeadingProps) {
  return (
    <Box component="li" role="presentation" sx={{ padding: "6px 10px 4px", fontSize: 12, color: color.muted, listStyle: "none" }}>
      {children}
    </Box>
  );
}
