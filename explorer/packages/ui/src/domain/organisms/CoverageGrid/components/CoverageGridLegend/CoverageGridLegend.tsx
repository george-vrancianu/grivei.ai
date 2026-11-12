import { Box } from "../../../../../atoms/Box/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";
import type { CoverageGridCopy } from "../../coverageGrid.types.ts";
import { GAP_STATES, RANGE_COLOR, STATE_GLYPHS, stateSx } from "../../coverageGrid.utils.ts";

export interface CoverageGridLegendProps {
  copy: Pick<CoverageGridCopy, "legend" | "states">;
  /** Condensed (compact grid): one wrapped line of small swatches. */
  condensed?: boolean;
  /** Show the date-range swatch (there is an active window). */
  showRange?: boolean;
}

/** The six states with their swatch (colour, glyph and border) and name, and, when a range is active, the range mark. */
export function CoverageGridLegend({ copy, condensed = false, showRange = false }: CoverageGridLegendProps) {
  const size = condensed ? 12 : 18;
  return (
    <Box component="section" aria-label={copy.legend.title} sx={{ mt: 1 }}>
      {!condensed && <Typography variant="caption" component="h3" sx={{ fontWeight: 600 }}>{copy.legend.title}</Typography>}
      <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, display: "flex", flexWrap: "wrap", columnGap: condensed ? 1.5 : 2.5, rowGap: 0.5 }}>
        {GAP_STATES.map((state) => (
          <Box component="li" key={state} data-state={state} sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <Box aria-hidden sx={{ ...stateSx(state), width: size, height: size, display: "grid", placeItems: "center", fontSize: condensed ? 9 : 11, flex: "none" }}>
              {STATE_GLYPHS[state]}
            </Box>
            <Typography variant="caption">{copy.states[state]}</Typography>
          </Box>
        ))}
        {showRange && (
          <Box component="li" data-legend="range" sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <Box aria-hidden sx={{ width: size, height: size, flex: "none", boxShadow: `inset 0 0 0 2px ${RANGE_COLOR}` }} />
            <Typography variant="caption">{copy.legend.range}</Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}
