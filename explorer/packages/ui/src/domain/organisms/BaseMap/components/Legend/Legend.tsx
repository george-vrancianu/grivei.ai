import { Box } from "../../../../../atoms/Box/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";
import { NO_DATA_COLOR, type ColorScale } from "../../baseMap.utils.ts";

export type LegendProps = {
  title: string;
  noDataLabel: string;
  scale: ColorScale;
  /** Formats the two ends of the scale. */
  formatValue: (value: number) => string;
  /** Labels the low end of a log scale that holds zeros ("up to ..."). */
  atMost: (valueText: string) => string;
};

/** The colour bar with its smallest and largest value, and the grey no-data swatch with its label. */
export function Legend({ title, noDataLabel, scale, formatValue, atMost }: LegendProps) {
  const gradient = `linear-gradient(to right, ${scale.ramp(9).join(", ")})`;
  return (
    <Box component="section" aria-label={title} sx={{ minWidth: 200, maxWidth: 320 }}>
      <Typography variant="caption" component="h3" sx={{ fontWeight: 600 }}>
        {title}
      </Typography>
      {scale.domain && (
        <>
          <Box aria-hidden sx={{ height: 10, borderRadius: 0.5, backgroundImage: gradient, mt: 0.5 }} />
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="caption">{scale.hasNonPositive ? atMost(formatValue(scale.domain[0])) : formatValue(scale.domain[0])}</Typography>
            <Typography variant="caption">{formatValue(scale.domain[1])}</Typography>
          </Box>
        </>
      )}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}>
        <Box role="img" aria-label={noDataLabel} sx={{ width: 14, height: 14, borderRadius: 0.5, backgroundColor: NO_DATA_COLOR }} />
        <Typography variant="caption">{noDataLabel}</Typography>
      </Box>
    </Box>
  );
}
