import type { ReactNode } from "react";
import { Box } from "../../../atoms/Box/index.ts";
import { color, font, type } from "../../../theme/tokens.ts";

export interface DefinitionListProps {
  /** `dt` / `dd` pairs, or `Box sx={{ display: "contents" }}` wrappers around them. */
  children: ReactNode;
  /** A tight gap, and the label stays beside its value on a narrow screen (a card's parties). Default: a roomy gap, and the label stands above its value below `sm` (a panel's facts). */
  compact?: boolean;
  /** The values' size: `body` inherits the surrounding text, `small` is 13 px (the `body2` size). */
  valueSize?: "body" | "small";
}

/** A definition list laid out as label / value pairs: a muted mono label, then the value. Shared by the Signal card's parties, the supplier facts and the panels of the Record page. */
export function DefinitionList({ children, compact = false, valueSize = "body" }: DefinitionListProps) {
  return (
    <Box
      component="dl"
      sx={{
        display: "grid",
        gridTemplateColumns: compact ? "max-content minmax(0, 1fr)" : { xs: "minmax(0, 1fr)", sm: "max-content minmax(0, 1fr)" },
        columnGap: compact ? 2 : 3,
        rowGap: compact ? 0.5 : { xs: 0, sm: 1 },
        m: 0,
        "& dt": { color: color.muted, fontFamily: font.mono, fontSize: type.meta.size, lineHeight: type.body.lineHeight },
        "& dd": { m: 0, ...(compact ? {} : { mb: { xs: 1, sm: 0 } }), minWidth: 0, overflowWrap: "anywhere", ...(valueSize === "small" ? { fontSize: type.small.min } : {}) },
      }}
    >
      {children}
    </Box>
  );
}
