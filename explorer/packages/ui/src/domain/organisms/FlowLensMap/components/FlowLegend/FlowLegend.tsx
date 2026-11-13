import { Box } from "../../../../../atoms/Box/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";
import type { EntityRole } from "../../../../types.ts";
import type { FlowLegendCopy } from "../../flowLensMap.types.ts";
import { ARC_COLOR, ARC_OPACITY, ARROWHEAD_OPACITY, BUBBLE_FILL, BUBBLE_OUTLINE, HOME_COLOR, MAX_ARC_WIDTH, OTHER_COLOR } from "../../flowLensMap.utils.ts";

export interface FlowLegendProps {
  role: EntityRole;
  /** Whether the entity's county is known: only then are there arcs, a home swatch and an arrow to explain. */
  hasHome: boolean;
  copy: FlowLegendCopy;
}

const swatch = { width: 14, height: 14, borderRadius: 0.5, flex: "none" } as const;
const row = { display: "flex", alignItems: "center", gap: 1, mt: 0.5 } as const;

/** What the marks mean: bubble area, arc width and direction, the home county's fill and the other counties'. */
export function FlowLegend({ role, hasHome, copy }: FlowLegendProps) {
  return (
    <Box component="section" aria-label={copy.title} sx={{ minWidth: 200, maxWidth: 360, mt: 1 }}>
      <Typography variant="caption" component="h3" sx={{ fontWeight: 600 }}>{copy.title}</Typography>
      <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
        <Box component="li" data-legend="bubble" sx={row}>
          <Box component="svg" aria-hidden width={22} height={22} sx={{ flex: "none" }}>
            <circle cx={11} cy={11} r={4} fill={BUBBLE_FILL} fillOpacity={0.55} stroke={BUBBLE_OUTLINE} strokeWidth={1.25} />
            <circle cx={11} cy={11} r={10} fill="none" stroke={BUBBLE_OUTLINE} strokeWidth={1} strokeDasharray="2 2" />
          </Box>
          <Typography variant="caption">{copy.bubbleSize}</Typography>
        </Box>
        {hasHome && (
          <Box component="li" data-legend="arc" sx={row}>
            <Box component="svg" aria-hidden width={22} height={22} sx={{ flex: "none" }}>
              <path d="M2,18 Q8,4 14,8" fill="none" stroke={ARC_COLOR} strokeOpacity={ARC_OPACITY} strokeWidth={MAX_ARC_WIDTH / 4} strokeLinecap="round" />
              <polygon points="20,8 12,4 12,12" fill={ARC_COLOR} fillOpacity={ARROWHEAD_OPACITY} />
            </Box>
            <Typography variant="caption">{copy.arcWidth}</Typography>
          </Box>
        )}
        {hasHome && (
          <Box component="li" data-legend="direction" sx={row}>
            <Box component="svg" aria-hidden width={22} height={14} sx={{ flex: "none" }}>
              <polygon points="21,7 13,2 13,12" fill={ARC_COLOR} fillOpacity={ARROWHEAD_OPACITY} />
              <line x1={1} y1={7} x2={13} y2={7} stroke={ARC_COLOR} strokeOpacity={ARC_OPACITY} strokeWidth={2} />
            </Box>
            <Typography variant="caption">{copy.arrow[role]}</Typography>
          </Box>
        )}
        {hasHome && (
          <Box component="li" data-legend="home" sx={row}>
            <Box aria-hidden sx={{ ...swatch, backgroundColor: HOME_COLOR }} />
            <Typography variant="caption">{copy.homeCounty}</Typography>
          </Box>
        )}
        <Box component="li" data-legend="other" sx={row}>
          <Box aria-hidden sx={{ ...swatch, backgroundColor: OTHER_COLOR }} />
          <Typography variant="caption">{copy.otherCounty}</Typography>
        </Box>
      </Box>
    </Box>
  );
}
