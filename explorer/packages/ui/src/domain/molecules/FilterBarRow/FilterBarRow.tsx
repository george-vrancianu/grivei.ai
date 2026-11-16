import type { ReactNode } from "react";
import { Box } from "../../../atoms/Box/index.ts";
import { STRIP_FILL_CLEAR, STRIP_FILL_SOLID } from "../FilterStrip/index.ts";

export interface FilterBarRowProps {
  children: ReactNode;
}

/**
 * The row the filter controls sit in, 8 px apart. From `md` up it wraps. Below `md` it is one row that scrolls sideways inside the strip,
 * the first control (Signals) leftmost, with a fade on the right edge that stays put while the row scrolls; the page itself never scrolls sideways.
 */
export function FilterBarRow({ children }: FilterBarRowProps) {
  return (
    <Box data-testid="filter-bar-row" sx={{ position: "relative" }}>
      <Box
        data-testid="filter-bar-scroller"
        sx={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          flexWrap: { xs: "nowrap", md: "wrap" },
          overflowX: { xs: "auto", md: "visible" },
          // Room for the controls' outlines and shadows, which the scroller would clip.
          py: { xs: "4px", md: 0 },
          my: { xs: "-4px", md: 0 },
          // Room so the last control can scroll clear of the fade.
          pr: { xs: 5, md: 0 },
          "& > *": { flex: "none" },
        }}
      >
        {children}
      </Box>
      <Box
        aria-hidden="true"
        data-testid="filter-bar-fade"
        sx={{
          display: { xs: "block", md: "none" },
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          width: 32,
          pointerEvents: "none",
          background: `linear-gradient(to right, ${STRIP_FILL_CLEAR}, ${STRIP_FILL_SOLID})`,
        }}
      />
    </Box>
  );
}
