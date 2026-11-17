import type { ReactNode } from "react";
import { Box } from "../../../atoms/Box/index.ts";
import { color, type } from "../../../theme/tokens.ts";

export interface CountPillProps {
  /** The number, already formatted in the locale ("1,817", "≈ 2.4M"). */
  children: ReactNode;
}

/** A number beside a tab's name in a small pill: ground fill, hairline, round, muted mono 12. Shared by the result tabs and the entity page tabs. */
export function CountPill({ children }: CountPillProps) {
  return (
    <Box
      component="span"
      sx={{ display: "inline-block", px: "7px", py: "1px", backgroundColor: color.bg, border: `1px solid ${color.line}`, borderRadius: "10px", color: color.muted, fontSize: type.meta.size, fontWeight: 400, fontVariantNumeric: "tabular-nums" }}
    >
      {children}
    </Box>
  );
}
