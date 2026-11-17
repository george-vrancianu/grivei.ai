import type { ReactNode } from "react";
import { Box } from "../../../atoms/Box/index.ts";

export interface PanelPairProps {
  /** The wider panel (about 60%): it sits first. Absent, the narrow panel takes the full width. */
  wide?: ReactNode;
  /** The narrower panel (about 40%). Absent, the wide panel takes the full width. */
  narrow?: ReactNode;
}

/** Two panels side by side from `md` up, tops aligned, and stacked below it; a lone panel takes the full width. */
export function PanelPair({ wide, narrow }: PanelPairProps) {
  const both = wide != null && narrow != null;
  return (
    <Box
      sx={{
        display: "grid",
        gap: 3,
        alignItems: "start",
        gridTemplateColumns: { xs: "minmax(0, 1fr)", md: both ? "minmax(0, 3fr) minmax(0, 2fr)" : "minmax(0, 1fr)" },
      }}
    >
      {wide}
      {narrow}
    </Box>
  );
}
