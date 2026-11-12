import { Box } from "../../../../../atoms/Box/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";
import type { GraphLegendCopy } from "../../relationshipsTab.types.ts";
import { CENTRE_COLOR, CONTRACT_COLOR, DIRECT_PURCHASE_COLOR, NEUTRAL_MARK_COLOR, SIGNAL_RING_COLOR, WON_TOGETHER_DASH } from "../../relationshipsTab.utils.ts";

export interface GraphLegendProps {
  copy: GraphLegendCopy;
  /** Only explain what the graph can show: a dashed edge only when some counterparty won together with the entity. */
  hasWonTogether: boolean;
  hasSignals: boolean;
}

const item = { display: "flex", alignItems: "center", gap: 1, mt: 0.5 } as const;
const icon = { flex: "none" } as const;

/** What the graph's marks mean: the centre, node size, the two channel colours, the dashed edge and the Signal ring. */
export function GraphLegend({ copy, hasWonTogether, hasSignals }: GraphLegendProps) {
  const edge = (color: string, dash?: string) => (
    <Box component="svg" aria-hidden width={28} height={10} sx={icon}>
      <line x1={0} y1={5} x2={28} y2={5} stroke={color} strokeWidth={3} strokeDasharray={dash} />
    </Box>
  );
  return (
    <Box component="section" aria-label={copy.title} sx={{ maxWidth: 420 }}>
      <Typography variant="caption" component="h3" sx={{ fontWeight: 600 }}>{copy.title}</Typography>
      <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
        <Box component="li" data-legend="centre" sx={item}>
          <Box component="svg" aria-hidden width={28} height={22} sx={icon}><circle cx={14} cy={11} r={9} fill={CENTRE_COLOR} /></Box>
          <Typography variant="caption">{copy.centre}</Typography>
        </Box>
        <Box component="li" data-legend="size" sx={item}>
          <Box component="svg" aria-hidden width={28} height={22} sx={icon}>
            <circle cx={7} cy={14} r={4} fill={NEUTRAL_MARK_COLOR} />
            <circle cx={19} cy={11} r={9} fill={NEUTRAL_MARK_COLOR} />
          </Box>
          <Typography variant="caption">{copy.size}</Typography>
        </Box>
        <Box component="li" data-legend="contract" sx={item}>{edge(CONTRACT_COLOR)}<Typography variant="caption">{copy.contract}</Typography></Box>
        <Box component="li" data-legend="direct-purchase" sx={item}>{edge(DIRECT_PURCHASE_COLOR)}<Typography variant="caption">{copy.directPurchase}</Typography></Box>
        {hasWonTogether && (
          <Box component="li" data-legend="won-together" sx={item}>{edge(NEUTRAL_MARK_COLOR, WON_TOGETHER_DASH)}<Typography variant="caption">{copy.wonTogether}</Typography></Box>
        )}
        {hasSignals && (
          <Box component="li" data-legend="signals" sx={item}>
            <Box component="svg" aria-hidden width={28} height={24} sx={icon}>
              <circle cx={14} cy={12} r={10} fill="none" stroke={SIGNAL_RING_COLOR} strokeWidth={3} />
              <circle cx={14} cy={12} r={5} fill={NEUTRAL_MARK_COLOR} />
            </Box>
            <Typography variant="caption">{copy.signals}</Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}
