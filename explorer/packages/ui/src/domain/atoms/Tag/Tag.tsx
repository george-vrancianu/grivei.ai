import type { ReactNode } from "react";
import { Box } from "../../../atoms/Box/index.ts";
import { color, radius } from "../../../theme/tokens.ts";

export interface TagProps {
  children: ReactNode;
}

/**
 * The tag: a neutral, outlined label for an attribute of what it sits on (a Record's channel, an ONRC status, "SEAP counterparty"). A 1 px `lineStrong` border, `radius.chip`,
 * the surrounding text's font and the body colour: no fill, no judgement, never amber and never a Record badge. The label wraps instead of being cut off, so a long one stays whole on a narrow screen.
 */
export function Tag({ children }: TagProps) {
  return (
    <Box component="span" sx={{ border: `1px solid ${color.lineStrong}`, borderRadius: `${radius.chip}px`, px: 1, py: 0.25, color: "text.primary", minWidth: 0, overflowWrap: "anywhere" }}>
      {children}
    </Box>
  );
}
