import type { ReactNode } from "react";
import { Box } from "../../../atoms/Box/index.ts";
import { color } from "../../../theme/tokens.ts";

export interface FilterStripProps {
  children: ReactNode;
}

/**
 * A strip inside a panel: the ground colour at 35% over the panel, between hairlines, edge to edge, with its own padding.
 * The main screen's filter slot sits in a panel with no padding, so whatever fills it wraps itself in a strip.
 */
export function FilterStrip({ children }: FilterStripProps) {
  return <Box sx={{ px: 2.5, py: 1.5, borderTop: 1, borderColor: color.line, backgroundColor: "rgba(13, 16, 20, 0.35)" }}>{children}</Box>;
}
